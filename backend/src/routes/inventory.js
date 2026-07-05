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

module.exports = router;
