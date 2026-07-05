const express = require('express');
const router = express.Router();
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
} = require('../services/inventoryService');

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
