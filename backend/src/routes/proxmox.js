const express = require('express');
const router = express.Router();
const {
  createProvider,
  listProviders,
  testProviderConnection,
  listNodes,
  listVMs,
  getVMDetail,
  syncInventory,
  listAuditLogs,
} = require('../services/proxmoxService');

router.post('/providers', async (req, res, next) => {
  try {
    const { name, host, port, token_user, token_id, token_secret } = req.body;
    if (!name || !host || !token_user || !token_id || !token_secret) {
      const err = new Error('Missing required fields: name, host, token_user, token_id, token_secret');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const provider = await createProvider({ name, host, port, token_user, token_id, token_secret });
    res.status(201).json(provider);
  } catch (e) {
    next(e);
  }
});

router.get('/providers', async (req, res, next) => {
  try {
    const providers = await listProviders();
    res.json(providers);
  } catch (e) {
    next(e);
  }
});

router.post('/providers/:id/test', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await testProviderConnection(id);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/providers/:id/nodes', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const nodes = await listNodes(id);
    res.json(nodes);
  } catch (e) {
    next(e);
  }
});

router.get('/providers/:id/vms', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const vms = await listVMs(id);
    res.json(vms);
  } catch (e) {
    next(e);
  }
});

router.get('/vms/:id', async (req, res, next) => {
  try {
    const vmid = parseInt(req.params.id, 10);
    const providerId = parseInt(req.query.provider_id, 10);
    if (!providerId) {
      const err = new Error('provider_id query parameter is required');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const vm = await getVMDetail(providerId, vmid);
    res.json(vm);
  } catch (e) {
    next(e);
  }
});

router.post('/sync-inventory', async (req, res, next) => {
  try {
    const { provider_id } = req.body;
    if (!provider_id) {
      const err = new Error('provider_id is required');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const result = await syncInventory(parseInt(provider_id, 10));
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.get('/audit-logs', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 50;
    const logs = await listAuditLogs(limit);
    res.json(logs);
  } catch (e) {
    next(e);
  }
});

module.exports = router;
