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
  powerAction,
  deleteInstance,
  getTaskStatus,
  listTemplates,
  cloneTemplate,
  createSnapshotAction,
  listSnapshotsAction,
  rollbackSnapshotAction,
  requireRole,
  getActor,
  createApprovalRequest,
  listApprovalRequests,
  approveRequest,
  rejectRequest,
  listTasks,
} = require('../services/proxmoxService');

router.post('/providers', requireRole('operator'), async (req, res, next) => {
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

router.post('/providers/:id/test', requireRole('operator'), async (req, res, next) => {
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

router.get('/providers/:id/templates', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const templates = await listTemplates(id);
    res.json(templates);
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

router.get('/vms/:id/snapshots', async (req, res, next) => {
  try {
    const vmid = parseInt(req.params.id, 10);
    const providerId = parseInt(req.query.provider_id, 10);
    if (!providerId) {
      const err = new Error('provider_id query parameter is required');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const snapshots = await listSnapshotsAction(providerId, vmid);
    res.json(snapshots);
  } catch (e) {
    next(e);
  }
});

router.post('/vms/:id/start', requireRole('operator'), async (req, res, next) => {
  try {
    const vmid = parseInt(req.params.id, 10);
    const { provider_id } = req.body;
    if (!provider_id) {
      const err = new Error('provider_id is required');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const result = await powerAction(parseInt(provider_id, 10), vmid, 'start');
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/vms/:id/stop', requireRole('operator'), async (req, res, next) => {
  try {
    const vmid = parseInt(req.params.id, 10);
    const { provider_id } = req.body;
    if (!provider_id) {
      const err = new Error('provider_id is required');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const result = await powerAction(parseInt(provider_id, 10), vmid, 'stop');
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/vms/:id/reboot', requireRole('operator'), async (req, res, next) => {
  try {
    const vmid = parseInt(req.params.id, 10);
    const { provider_id } = req.body;
    if (!provider_id) {
      const err = new Error('provider_id is required');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const result = await powerAction(parseInt(provider_id, 10), vmid, 'reboot');
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.delete('/vms/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const vmid = parseInt(req.params.id, 10);
    const { provider_id } = req.body;
    if (!provider_id) {
      const err = new Error('provider_id is required');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const actor = getActor(req);
    const result = await deleteInstance(parseInt(provider_id, 10), vmid, actor);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.delete('/lxc/:id', requireRole('admin'), async (req, res, next) => {
  try {
    const vmid = parseInt(req.params.id, 10);
    const { provider_id } = req.body;
    if (!provider_id) {
      const err = new Error('provider_id is required');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const actor = getActor(req);
    const result = await deleteInstance(parseInt(provider_id, 10), vmid, actor, 'lxc');
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/vms/:id/snapshot', requireRole('operator'), async (req, res, next) => {
  try {
    const vmid = parseInt(req.params.id, 10);
    const { provider_id, snapname, description } = req.body;
    if (!provider_id || !snapname) {
      const err = new Error('provider_id and snapname are required');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const actor = getActor(req);
    const result = await createSnapshotAction(parseInt(provider_id, 10), vmid, { snapname, description }, actor);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/vms/:id/rollback', requireRole('operator'), async (req, res, next) => {
  try {
    const vmid = parseInt(req.params.id, 10);
    const { provider_id, snapname } = req.body;
    if (!provider_id || !snapname) {
      const err = new Error('provider_id and snapname are required');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const role = req.goneopsRole || 'viewer';
    const actor = getActor(req);

    if (role === 'admin') {
      const result = await rollbackSnapshotAction(parseInt(provider_id, 10), vmid, snapname, actor);
      res.json(result);
    } else {
      const approval = await createApprovalRequest({
        requestedBy: actor,
        action: 'snapshot_rollback',
        resourceType: 'vm',
        resourceId: vmid,
        providerId: parseInt(provider_id, 10),
        payload: { snapname },
      });
      res.status(202).json({ approval_id: approval.id, status: 'pending', message: 'Rollback requires admin approval' });
    }
  } catch (e) {
    next(e);
  }
});

router.post('/templates/:id/clone', requireRole('operator'), async (req, res, next) => {
  try {
    const templateVmid = parseInt(req.params.id, 10);
    const { provider_id, name, target_node } = req.body;
    if (!provider_id || !name) {
      const err = new Error('provider_id and name are required');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const role = req.goneopsRole || 'viewer';
    const actor = getActor(req);

    if (role === 'admin') {
      const result = await cloneTemplate(parseInt(provider_id, 10), templateVmid, { name, targetNode: target_node }, actor);
      res.json(result);
    } else {
      const approval = await createApprovalRequest({
        requestedBy: actor,
        action: 'template_clone',
        resourceType: 'template',
        resourceId: templateVmid,
        providerId: parseInt(provider_id, 10),
        payload: { name, target_node },
      });
      res.status(202).json({ approval_id: approval.id, status: 'pending', message: 'Clone requires admin approval' });
    }
  } catch (e) {
    next(e);
  }
});

router.post('/sync-inventory', requireRole('operator'), async (req, res, next) => {
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

router.get('/tasks', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const tasks = await listTasks(limit);
    res.json(tasks);
  } catch (e) {
    next(e);
  }
});

router.get('/tasks/:upid', async (req, res, next) => {
  try {
    const { upid } = req.params;
    const providerId = parseInt(req.query.provider_id, 10);
    if (!providerId) {
      const err = new Error('provider_id query parameter is required');
      err.status = 400;
      err.code = 'validation_error';
      throw err;
    }
    const status = await getTaskStatus(providerId, upid);
    res.json(status);
  } catch (e) {
    next(e);
  }
});

router.get('/approvals', async (req, res, next) => {
  try {
    const approvals = await listApprovalRequests();
    res.json(approvals);
  } catch (e) {
    next(e);
  }
});

router.post('/approvals/:id/approve', requireRole('admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const actor = getActor(req);
    const result = await approveRequest(id, actor);
    res.json(result);
  } catch (e) {
    next(e);
  }
});

router.post('/approvals/:id/reject', requireRole('admin'), async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    const actor = getActor(req);
    const result = await rejectRequest(id, actor);
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
