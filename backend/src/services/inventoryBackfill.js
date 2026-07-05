const { query } = require('../lib/db');

async function runBackfill() {
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
    UPDATE containers c SET
      environment_id = e.id,
      application_id = a.id
    FROM environments e
    JOIN projects p ON p.id = e.project_id
    JOIN applications a ON a.project_id = p.id
    WHERE e.lxc_vmid IS NOT NULL
      AND c.container_id = e.lxc_vmid::text
      AND c.provider_id = e.lxc_provider_id
      AND COALESCE(c.environment_id, c.application_id) IS NULL
  `);

  console.log('[goneops] Inventory backfill completed');
}

module.exports = { runBackfill };
