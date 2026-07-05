const { query } = require('../src/lib/db');
const { writeAuditLog } = require('../src/lib/audit');

async function main() {
  console.log('Cleanup: test data removal\n');

  // Dry-run count first
  const count = await query(
    `SELECT count(*) FROM projects WHERE is_test = true OR name ~ '^(e2e-|crud-)'`
  );
  const total = parseInt(count.rows[0].count);
  if (total === 0) {
    console.log('No test projects found. Nothing to clean.\n');
    process.exit(0);
  }

  console.log(`Found ${total} test projects\n`);

  const args = process.argv.slice(2);
  if (!args.includes('--force')) {
    console.log(`DRY-RUN: Run with --force to actually delete.\n`);
    const list = await query(
      `SELECT id, name, is_test FROM projects WHERE is_test = true OR name ~ '^(e2e-|crud-)' ORDER BY id`
    );
    for (const p of list.rows) {
      console.log(`  [${p.id}] ${p.name}  is_test=${p.is_test}`);
    }
    process.exit(0);
  }

  // FK-safe deletion cascade
  await query(`
    DELETE FROM sandbox_ports WHERE environment_id IN (
      SELECT e.id FROM environments e JOIN projects p ON e.project_id = p.id
      WHERE p.is_test = true OR p.name ~ '^(e2e-|crud-)'
    )
  `);
  await query(`
    DELETE FROM pipeline_runs WHERE environment_id IN (
      SELECT e.id FROM environments e JOIN projects p ON e.project_id = p.id
      WHERE p.is_test = true OR p.name ~ '^(e2e-|crud-)'
    )
  `);
  await query(`
    DELETE FROM services WHERE environment_id IN (
      SELECT e.id FROM environments e JOIN projects p ON e.project_id = p.id
      WHERE p.is_test = true OR p.name ~ '^(e2e-|crud-)'
    )
  `);
  await query(`
    DELETE FROM secrets WHERE project_id IN (
      SELECT id FROM projects WHERE is_test = true OR name ~ '^(e2e-|crud-)'
    )
  `);
  await query(`
    DELETE FROM applications WHERE project_id IN (
      SELECT id FROM projects WHERE is_test = true OR name ~ '^(e2e-|crud-)'
    )
  `);
  await query(`
    DELETE FROM environments WHERE project_id IN (
      SELECT id FROM projects WHERE is_test = true OR name ~ '^(e2e-|crud-)'
    )
  `);
  const deleted = await query(`
    DELETE FROM projects WHERE is_test = true OR name ~ '^(e2e-|crud-)' RETURNING id, name
  `);

  console.log(`Deleted ${deleted.rows.length} test projects\n`);

  const remaining = await query('SELECT count(*) FROM projects');
  console.log(`Remaining projects: ${remaining.rows[0].count}\n`);

  await writeAuditLog({
    actor: 'system',
    action: 'cleanup_test_data',
    resource_type: 'project',
    result: 'success',
    message: `Cleaned up ${deleted.rows.length} test projects`,
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
