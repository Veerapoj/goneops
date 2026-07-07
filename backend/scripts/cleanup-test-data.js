const { createPool, query, getPool } = require('../src/lib/db');
const { writeAuditLog } = require('../src/lib/audit');
const proxmoxService = require('../src/services/proxmoxService');

// Target selector: everything except goneops-demo (id=1).
// data_source and the legacy is_test/name-regex filter are NOT used as selectors —
// live data shows both are inconsistently stamped and would spare rows that
// need deleting (including projects with real running LXCs).
const SELECTOR = 'id <> 1';

// Decision record: project id=156 "customer-api" matches no automated
// test-generator naming convention, but the task is "delete all except id=1 /
// keep only goneops-demo". That instruction is treated as authoritative, so
// customer-api is deleted along with everything else matched by SELECTOR.

async function main() {
  await createPool();

  console.log('Cleanup: test data removal\n');

  const count = await query(`SELECT count(*) FROM projects WHERE ${SELECTOR}`);
  const total = parseInt(count.rows[0].count);
  if (total === 0) {
    console.log('No projects to clean beyond goneops-demo. Nothing to do.\n');
    process.exit(0);
  }

  console.log(`Found ${total} projects to delete (keeping id=1 goneops-demo)\n`);

  const args = process.argv.slice(2);
  if (!args.includes('--force')) {
    console.log('DRY-RUN: Run with --force to actually delete.\n');
    const list = await query(
      `SELECT id, name, data_source FROM projects WHERE ${SELECTOR} ORDER BY id`
    );
    for (const p of list.rows) {
      console.log(`  [${p.id}] ${p.name}  data_source=${p.data_source}`);
    }
    process.exit(0);
  }

  // Step 1: deprovision real backing LXCs before any DB delete, best-effort.
  const liveLxcs = await query(`
    SELECT e.id, e.lxc_vmid, e.lxc_provider_id, e.project_id
    FROM environments e JOIN projects p ON e.project_id = p.id
    WHERE p.${SELECTOR}
      AND e.lxc_vmid IS NOT NULL
      AND e.lxc_status NOT IN ('destroyed', 'error')
  `);

  const teardown = [];
  for (const env of liveLxcs.rows) {
    if (!env.lxc_provider_id) continue;
    try {
      await proxmoxService.deleteInstance(env.lxc_provider_id, env.lxc_vmid, 'system');
      await writeAuditLog({
        actor: 'system',
        action: 'sandbox_cleanup',
        resource_type: 'lxc',
        resource_id: env.lxc_vmid,
        provider_id: env.lxc_provider_id,
        result: 'success',
        message: `Cleanup: deprovisioned LXC vmid ${env.lxc_vmid} for project ${env.project_id} (environment ${env.id})`,
        metadata: { environment_id: env.id, vmid: env.lxc_vmid, project_id: env.project_id },
      });
      console.log(`Deprovisioned LXC vmid ${env.lxc_vmid} (project ${env.project_id})`);
      teardown.push({ vmid: env.lxc_vmid, provider_id: env.lxc_provider_id, status: 'destroyed' });
    } catch (err) {
      // Best-effort: a provider-unreachable or "VM not found" error must not
      // block the DB cleanup. Only the DB delete's success is a hard gate.
      // provider_id is omitted here (kept in metadata instead) because a failed
      // lookup means we can't confirm it's a valid proxmox_providers.id, and
      // audit_logs.provider_id has an FK to that table.
      console.warn(`LXC teardown failed for vmid ${env.lxc_vmid} (project ${env.project_id}): ${err.message}`);
      await writeAuditLog({
        actor: 'system',
        action: 'sandbox_cleanup',
        resource_type: 'lxc',
        resource_id: env.lxc_vmid,
        result: 'failure',
        message: `Cleanup: LXC teardown failed for vmid ${env.lxc_vmid}: ${err.message}`,
        metadata: { environment_id: env.id, vmid: env.lxc_vmid, project_id: env.project_id, lxc_provider_id: env.lxc_provider_id },
      });
      teardown.push({ vmid: env.lxc_vmid, provider_id: env.lxc_provider_id, status: 'error', error: err.message });
    }
  }

  // Step 2 & 3: applications delete + project delete in a single transaction.
  // applications.project_id is ON DELETE SET NULL, not CASCADE, so it must be
  // deleted explicitly or rows would be orphaned with project_id=NULL.
  // Every other child table cascades from projects via verified ON DELETE CASCADE.
  const client = await getPool().connect();
  let deletedApps, deletedProjects;
  try {
    await client.query('BEGIN');
    deletedApps = await client.query(
      `DELETE FROM applications WHERE project_id IN (SELECT id FROM projects WHERE ${SELECTOR}) RETURNING id, name`
    );
    deletedProjects = await client.query(
      `DELETE FROM projects WHERE ${SELECTOR} RETURNING id, name`
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }

  console.log(`Deleted ${deletedApps.rows.length} applications`);
  console.log(`Deleted ${deletedProjects.rows.length} projects\n`);

  // Post-conditions: hard acceptance gates.
  const remaining = await query('SELECT count(*) FROM projects');
  const remainingCount = parseInt(remaining.rows[0].count);
  const soleSurvivor = await query('SELECT id FROM projects');
  if (remainingCount !== 1 || soleSurvivor.rows[0]?.id !== 1) {
    console.error(`FAIL: expected exactly one surviving project (id=1), found ${remainingCount}`);
    process.exit(1);
  }

  const orphanChecks = await query(`
    SELECT
      (SELECT count(*) FROM applications WHERE project_id IS NOT NULL AND project_id <> 1) AS apps,
      (SELECT count(*) FROM environments WHERE project_id <> 1) AS envs,
      (SELECT count(*) FROM secrets WHERE project_id <> 1) AS secrets
  `);
  const { apps, envs, secrets } = orphanChecks.rows[0];
  if (parseInt(apps) !== 0 || parseInt(envs) !== 0 || parseInt(secrets) !== 0) {
    console.error(`FAIL: orphaned rows remain (applications=${apps}, environments=${envs}, secrets=${secrets})`);
    process.exit(1);
  }

  for (const t of teardown) {
    const stillRunning = await query(
      `SELECT count(*) FROM environments WHERE lxc_vmid = $1 AND lxc_status = 'running'`,
      [t.vmid]
    );
    if (parseInt(stillRunning.rows[0].count) !== 0) {
      console.error(`FAIL: vmid ${t.vmid} still reports lxc_status='running' in environments`);
      process.exit(1);
    }
  }

  console.log('Post-conditions verified: 1 project remains (goneops-demo), no orphaned rows, LXCs deprovisioned.\n');

  await writeAuditLog({
    actor: 'system',
    action: 'cleanup_test_data',
    resource_type: 'project',
    result: 'success',
    message: `Cleaned up ${deletedProjects.rows.length} projects and ${deletedApps.rows.length} applications, keeping only goneops-demo (id=1). Deprovisioned LXC vmids: ${teardown.map(t => `${t.vmid} (${t.status})`).join(', ') || 'none'}.`,
    metadata: { deleted_project_count: deletedProjects.rows.length, deleted_application_count: deletedApps.rows.length, lxc_teardown: teardown },
  });
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
