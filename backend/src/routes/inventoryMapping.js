const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');

router.get('/mapping/:app', async (req, res, next) => {
  try {
    const appName = req.params.app;
    const appRes = await query(
      `SELECT a.*, p.name AS project_name
       FROM applications a
       JOIN projects p ON p.id = a.project_id
       WHERE a.name = $1`,
      [appName]
    );
    if (!appRes.rows.length) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Application not found' } });
    }
    const application = appRes.rows[0];

    const envsRes = await query(
      `SELECT e.* FROM environments e WHERE e.project_id = $1 ORDER BY e.name`,
      [application.project_id]
    );

    const environments = [];
    for (const env of envsRes.rows) {
      const servicesRes = await query(
        `SELECT * FROM services WHERE environment_id = $1 ORDER BY id`,
        [env.id]
      );

      const services = [];
      for (const svc of servicesRes.rows) {
        const runtimeRes = await query(`
          SELECT
            c.id AS container_id,
            c.name AS container_name,
            c.container_id AS container_cid,
            c.status AS container_status,
            c.image AS container_image,
            v.id AS vm_id,
            v.name AS vm_name,
            v.vmid AS vm_vmid,
            v.status AS vm_status,
            v.ip_address AS vm_ip,
            h.id AS host_id,
            h.hostname AS host_name,
            h.ip_address AS host_ip,
            h.status AS host_status,
            pr.id AS provider_id,
            pr.name AS provider_name,
            pr.type AS provider_type,
            pr.status AS provider_status
          FROM services s
          LEFT JOIN containers c ON c.environment_id = s.environment_id
          LEFT JOIN vms v ON v.environment_id = s.environment_id
          LEFT JOIN hosts h ON (h.id = c.host_id OR h.id = v.host_id)
          LEFT JOIN providers pr ON (
            pr.id = c.provider_id OR pr.id = v.provider_id
            OR pr.id = (SELECT provider_id FROM hosts WHERE id = c.host_id)
            OR pr.id = (SELECT provider_id FROM hosts WHERE id = v.host_id)
          )
          WHERE s.id = $1
          LIMIT 1
        `, [svc.id]);

        const runtime = runtimeRes.rows[0] || null;

        let container = null;
        let vm = null;
        let host = null;
        let provider = null;

        if (runtime) {
          if (runtime.container_id) {
            container = { id: runtime.container_id, name: runtime.container_name, container_id: runtime.container_cid, status: runtime.container_status, image: runtime.container_image };
          }
          if (runtime.vm_id) {
            vm = { id: runtime.vm_id, name: runtime.vm_name, vmid: runtime.vm_vmid, status: runtime.vm_status, ip: runtime.vm_ip };
          }
          if (runtime.host_id) {
            host = { id: runtime.host_id, hostname: runtime.host_name, ip: runtime.host_ip, status: runtime.host_status };
          }
          if (runtime.provider_id) {
            provider = { id: runtime.provider_id, name: runtime.provider_name, type: runtime.provider_type, status: runtime.provider_status };
          }
        }

        services.push({
          ...svc,
          runtime: { container, vm, host, provider },
        });
      }

      environments.push({ ...env, services });
    }

    res.json({ application, environments });
  } catch (e) { next(e); }
});

router.get('/assets', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT 'provider' AS asset_type, id, name,
             status, NULL::int AS provider_id, NULL::int AS parent_id
      FROM providers
      UNION ALL
      SELECT 'host' AS asset_type, id, hostname AS name,
             status, provider_id, provider_id AS parent_id
      FROM hosts
      UNION ALL
      SELECT 'vm' AS asset_type, id, name,
             status, provider_id, host_id AS parent_id
      FROM vms
      UNION ALL
      SELECT 'container' AS asset_type, id, name,
             status, provider_id, host_id AS parent_id
      FROM containers
      ORDER BY asset_type, id
    `);
    res.json({ assets: result.rows });
  } catch (e) { next(e); }
});

module.exports = router;
