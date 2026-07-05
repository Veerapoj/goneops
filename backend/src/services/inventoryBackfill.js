const { query } = require('../lib/db');

async function runBackfill() {
  await query(`UPDATE projects SET data_source = 'seed' WHERE id = 1`);
  await query(`UPDATE projects SET data_source = 'sandbox' WHERE id != 1`);

  await query(`UPDATE environments SET data_source = 'seed' WHERE project_id = 1`);
  await query(`UPDATE environments SET data_source = 'sandbox' WHERE project_id != 1`);

  await query(`
    UPDATE services SET data_source = 'seed'
    WHERE environment_id IN (SELECT id FROM environments WHERE project_id = 1)
  `);
  await query(`
    UPDATE services SET data_source = 'sandbox'
    WHERE environment_id NOT IN (SELECT id FROM environments WHERE project_id = 1)
  `);

  await query(`
    INSERT INTO applications (name, project_id, data_source)
    VALUES ('goneops-demo', 1, 'seed')
    ON CONFLICT (name) DO NOTHING
  `);

  const appRes = await query(`SELECT id FROM applications WHERE name = 'goneops-demo'`);
  const appId = appRes.rows[0]?.id;

  await query(`
    UPDATE providers SET data_source = 'sandbox'
    WHERE id NOT IN (
      SELECT p.id FROM providers p
      JOIN proxmox_providers pp ON pp.name = p.name
      WHERE pp.status = 'connected'
      AND EXISTS (SELECT 1 FROM sync_jobs sj WHERE sj.provider_id = p.id AND sj.status = 'success')
    )
    AND data_source IS DISTINCT FROM 'sandbox'
  `);
  await query(`
    UPDATE providers SET data_source = 'discovered'
    WHERE id IN (
      SELECT p.id FROM providers p
      JOIN proxmox_providers pp ON pp.name = p.name
      WHERE pp.status = 'connected'
      AND EXISTS (SELECT 1 FROM sync_jobs sj WHERE sj.provider_id = p.id AND sj.status = 'success')
    )
    AND data_source IS DISTINCT FROM 'discovered'
  `);

  await query(`UPDATE hosts SET data_source = 'sandbox' WHERE data_source IS DISTINCT FROM 'sandbox'`);
  await query(`
    UPDATE hosts SET data_source = 'discovered'
    WHERE provider_id IN (SELECT id FROM providers WHERE data_source = 'discovered')
    AND data_source IS DISTINCT FROM 'discovered'
  `);

  await query(`UPDATE vms SET data_source = 'sandbox' WHERE data_source IS DISTINCT FROM 'sandbox'`);
  await query(`
    UPDATE vms SET data_source = 'discovered'
    WHERE provider_id IN (SELECT id FROM providers WHERE data_source = 'discovered')
    AND data_source IS DISTINCT FROM 'discovered'
  `);

  await query(`UPDATE containers SET data_source = 'sandbox' WHERE data_source IS DISTINCT FROM 'sandbox'`);
  await query(`
    UPDATE containers SET data_source = 'discovered'
    WHERE provider_id IN (SELECT id FROM providers WHERE data_source = 'discovered')
    AND data_source IS DISTINCT FROM 'discovered'
  `);

  await query(`UPDATE applications SET data_source = 'seed' WHERE project_id = 1 AND data_source IS DISTINCT FROM 'seed'`);
  await query(`UPDATE applications SET data_source = 'sandbox' WHERE (project_id IS NULL OR project_id != 1) AND data_source IS DISTINCT FROM 'sandbox'`);

  if (appId) {
    const dockerHost = await query(`
      SELECT c.id, c.container_id, c.name, c.provider_id, c.host_id, c.status
      FROM containers c
      JOIN providers p ON p.id = c.provider_id
      WHERE c.name ILIKE '%docker-host%' AND c.data_source = 'discovered'
      LIMIT 1
    `);

    if (dockerHost.rows.length > 0) {
      const dh = dockerHost.rows[0];

      await query(`
        UPDATE containers SET
          environment_id = 1,
          application_id = $1
        WHERE id = $2
      `, [appId, dh.id]);

      await query(`
        UPDATE environments SET
          lxc_vmid = $1,
          lxc_node = (SELECT hostname FROM hosts WHERE id = (SELECT host_id FROM containers WHERE id = $2)),
          lxc_provider_id = (SELECT provider_id FROM containers WHERE id = $2),
          lxc_ip = (SELECT ip_address FROM hosts WHERE id = (SELECT host_id FROM containers WHERE id = $2)),
          lxc_status = 'ready'
        WHERE id = 1
      `, [dh.container_id ? parseInt(dh.container_id) : null, dh.id]);
    }
  }

  await query(`
    UPDATE containers c SET
      environment_id = e.id,
      application_id = $1
    FROM environments e
    WHERE e.lxc_vmid IS NOT NULL
      AND c.container_id = e.lxc_vmid::text
      AND c.provider_id = e.lxc_provider_id
      AND COALESCE(c.environment_id, c.application_id) IS NULL
  `, [appId]);

  await query(`
    INSERT INTO asset_relationships (source_type, source_id, target_type, target_id, relationship_type)
    SELECT 'vm', v.id, 'host', v.host_id, 'runs_on'
    FROM vms v WHERE v.host_id IS NOT NULL
    ON CONFLICT (source_type, source_id, target_type, target_id, relationship_type) DO NOTHING
  `);

  await query(`
    INSERT INTO asset_relationships (source_type, source_id, target_type, target_id, relationship_type)
    SELECT 'host', h.id, 'provider', h.provider_id, 'belongs_to'
    FROM hosts h WHERE h.provider_id IS NOT NULL
    ON CONFLICT (source_type, source_id, target_type, target_id, relationship_type) DO NOTHING
  `);

  await query(`
    INSERT INTO asset_relationships (source_type, source_id, target_type, target_id, relationship_type)
    SELECT 'container', c.id, 'host', c.host_id, 'runs_on'
    FROM containers c WHERE c.host_id IS NOT NULL
    ON CONFLICT (source_type, source_id, target_type, target_id, relationship_type) DO NOTHING
  `);

  await query(`
    INSERT INTO asset_relationships (source_type, source_id, target_type, target_id, relationship_type)
    SELECT 'container', c.id, 'provider', c.provider_id, 'belongs_to'
    FROM containers c WHERE c.provider_id IS NOT NULL
    ON CONFLICT (source_type, source_id, target_type, target_id, relationship_type) DO NOTHING
  `);

  await query(`
    INSERT INTO asset_relationships (source_type, source_id, target_type, target_id, relationship_type)
    SELECT 'provider', h.provider_id, 'host', h.id, 'provider_contains_host'
    FROM hosts h WHERE h.provider_id IS NOT NULL
    ON CONFLICT (source_type, source_id, target_type, target_id, relationship_type) DO NOTHING
  `);

  await query(`
    INSERT INTO asset_relationships (source_type, source_id, target_type, target_id, relationship_type)
    SELECT 'host', v.host_id, 'vm', v.id, 'host_contains_vm'
    FROM vms v WHERE v.host_id IS NOT NULL
    ON CONFLICT (source_type, source_id, target_type, target_id, relationship_type) DO NOTHING
  `);

  await query(`
    INSERT INTO asset_relationships (source_type, source_id, target_type, target_id, relationship_type)
    SELECT 'host', c.host_id, 'container', c.id, 'host_contains_container'
    FROM containers c WHERE c.host_id IS NOT NULL
    ON CONFLICT (source_type, source_id, target_type, target_id, relationship_type) DO NOTHING
  `);

  await query(`
    INSERT INTO asset_relationships (source_type, source_id, target_type, target_id, relationship_type)
    SELECT 'vm', vm.id, 'container', c.id, 'vm_runs_container'
    FROM vms vm
    JOIN hosts h ON h.id = vm.host_id
    JOIN containers c ON c.host_id = h.id
    WHERE c.environment_id IS NOT NULL
    ON CONFLICT (source_type, source_id, target_type, target_id, relationship_type) DO NOTHING
  `);

  console.log('[goneops] Inventory backfill (classification + runtime link + relationships) completed');
}

module.exports = { runBackfill };
