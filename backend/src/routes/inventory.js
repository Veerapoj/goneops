const express = require('express');
const router = express.Router();
const { query } = require('../lib/db');
const {
  getDashboardStats,
  listProviders,
  listHosts,
  listVMs,
  listContainers,
  listApplications,
  listCertificates,
  listSyncJobs,
  getServiceMap,
  getCapacity,
  getPlatformOverview,
  getRuntimeHealth,
} = require('../services/inventoryService');
const { writeAuditLog } = require('../lib/audit');

router.get('/platform/dashboard', async (req, res, next) => {
  try {
    res.json(await getDashboardStats());
  } catch (e) {
    next(e);
  }
});

router.get('/platform/providers', async (req, res, next) => {
  try {
    res.json(await listProviders());
  } catch (e) {
    next(e);
  }
});

router.get('/platform/hosts', async (req, res, next) => {
  try {
    res.json(await listHosts());
  } catch (e) {
    next(e);
  }
});

router.get('/platform/containers', async (req, res, next) => {
  try {
    res.json(await listContainers());
  } catch (e) {
    next(e);
  }
});

router.get('/platform/vms', async (req, res, next) => {
  try {
    res.json(await listVMs());
  } catch (e) {
    next(e);
  }
});

router.get('/platform/applications', async (req, res, next) => {
  try {
    res.json(await listApplications());
  } catch (e) {
    next(e);
  }
});

 router.post('/platform/applications', async (req, res, next) => {
   try {
     const { name, project_id, owner, team, description } = req.body;
     if (!name || !project_id) {
       return res.status(400).json({ error: { code: 'validation_error', message: 'name and project_id required' } });
     }
     const result = await query(
       `INSERT INTO applications (name, project_id, owner, team, description, data_source)
        VALUES ($1, $2, $3, $4, $5, 'discovered') RETURNING *`,
       [name, project_id, owner || null, team || null, description || null]
     );
     res.status(201).json(result.rows[0]);
   } catch (e) {
     next(e);
   }
 });

 router.get('/platform/certificates', async (req, res, next) => {
  try {
    res.json(await listCertificates());
  } catch (e) {
    next(e);
  }
});

router.get('/platform/sync-jobs', async (req, res, next) => {
  try {
    res.json(await listSyncJobs());
  } catch (e) {
    next(e);
  }
});

router.get('/platform/service-map', async (req, res, next) => {
  try {
    res.json(await getServiceMap());
  } catch (e) {
    next(e);
  }
});

router.get('/platform/capacity', async (req, res, next) => {
  try {
    res.json(await getCapacity());
  } catch (e) {
    next(e);
  }
});

router.get('/platform/overview', async (req, res, next) => {
  try {
    res.json(await getPlatformOverview());
  } catch (e) {
    next(e);
  }
});

router.get('/platform/runtime-health', async (req, res, next) => {
  try {
    const healthRows = await getRuntimeHealth();
    for (const row of healthRows) {
      await query(
        `UPDATE services SET status = $1, updated_at = NOW()
         WHERE id = $2`,
        [row.status, row.service_id]
      );
    }
    res.json(healthRows);
  } catch (e) {
    next(e);
  }
});

router.post('/platform/containers/:id/link', async (req, res, next) => {
  try {
    const { application_id, environment_id, service_id } = req.body;
    const containerId = req.params.id;
    if (!application_id || !environment_id || !service_id) {
      return res.status(400).json({ error: { code: 'validation_error', message: 'application_id, environment_id, and service_id required' } });
    }
    const app = await query('SELECT id, project_id FROM applications WHERE id = $1', [application_id]);
    if (!app.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Application not found' } });
    const env = await query('SELECT id FROM environments WHERE id = $1 AND project_id = $2', [environment_id, app.rows[0].project_id]);
    if (!env.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Environment not found or not in same project' } });
    const svc = await query('SELECT id FROM services WHERE id = $1 AND environment_id = $2', [service_id, environment_id]);
    if (!svc.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Service not found or not in same environment' } });
    const container = await query(
      "SELECT * FROM containers WHERE id = $1 AND data_source = 'discovered'",
      [containerId]
    );
    if (!container.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Discovered container not found' } });
    await query(
      `UPDATE containers SET application_id = $1, environment_id = $2, service_id = $3, updated_at = NOW()
       WHERE id = $4`,
      [application_id, environment_id, service_id, containerId]
    );
    await writeAuditLog({
      actor: req.goneopsActor || 'system',
      action: 'container_link',
      resource_type: 'container',
      resource_id: parseInt(containerId),
      result: 'success',
      message: `Container ${container.rows[0].name} linked to app ${application_id} env ${environment_id} svc ${service_id}`,
    });
    res.json({ linked: true, container_id: parseInt(containerId), application_id, environment_id, service_id });
  } catch (e) {
    next(e);
  }
});

router.get('/platform/audit-logs', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    const result = await query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1', [limit]);
    res.json(result.rows);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
