const crypto = require('crypto');
const { query } = require('../lib/db');
const proxmoxClient = require('../lib/proxmoxClient');
const { writeAuditLog } = require('../lib/audit');

const ENC_ALGO = 'aes-256-gcm';

function getEncKey() {
  const raw = process.env.PROXMOX_TOKEN_ENC_KEY;
  if (!raw) {
    throw Object.assign(new Error('PROXMOX_TOKEN_ENC_KEY environment variable is not set — cannot encrypt/decrypt provider credentials'), { code: 'config_error', status: 500 });
  }
  return crypto.createHash('sha256').update(raw).digest();
}

function encrypt(plaintext) {
  const key = getEncKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ENC_ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(ciphertext) {
  const key = getEncKey();
  const parts = ciphertext.split(':');
  if (parts.length !== 3) {
    throw Object.assign(new Error('Invalid encrypted token format'), { code: 'decrypt_error', status: 500 });
  }
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = Buffer.from(parts[2], 'hex');
  const decipher = crypto.createDecipheriv(ENC_ALGO, key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

function buildClientFromProvider(provider) {
  const secret = decrypt(provider.token_secret_encrypted);
  return proxmoxClient.createClient({
    host: provider.host,
    port: provider.port,
    tokenUser: provider.token_user,
    tokenId: provider.token_id,
    tokenSecret: secret,
    verifySsl: provider.verify_ssl,
  });
}

async function createProvider({ name, host, port, token_user, token_id, token_secret }) {
  const encrypted = encrypt(token_secret);
  const res = await query(
    `INSERT INTO proxmox_providers (name, host, port, token_user, token_id, token_secret_encrypted)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, name, host, port, token_user, token_id, verify_ssl, status, last_tested_at, last_synced_at, created_at, updated_at`,
    [name, host, port || 8006, token_user, token_id, encrypted]
  );
  const provider = res.rows[0];
  await writeAuditLog({ actor: 'system', action: 'provider_create', resource_type: 'proxmox_provider', resource_id: provider.id, provider_id: provider.id, result: 'success', message: `Provider ${name} created` });
  return provider;
}

async function listProviders() {
  const res = await query(
    `SELECT id, name, host, port, token_user, token_id, verify_ssl, status, last_tested_at, last_synced_at, created_at, updated_at
     FROM proxmox_providers ORDER BY created_at DESC`
  );
  return res.rows;
}

async function getProvider(id) {
  const res = await query(
    `SELECT id, name, host, port, token_user, token_id, verify_ssl, status, last_tested_at, last_synced_at, created_at, updated_at
     FROM proxmox_providers WHERE id = $1`,
    [id]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0];
}

async function getProviderWithSecret(id) {
  const res = await query(
    `SELECT * FROM proxmox_providers WHERE id = $1`,
    [id]
  );
  if (res.rows.length === 0) return null;
  return res.rows[0];
}

async function testProviderConnection(id) {
  const provider = await getProviderWithSecret(id);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  let result = 'failure';
  let message = '';
  try {
    const client = buildClientFromProvider(provider);
    const version = await proxmoxClient.testConnection(client);
    result = 'success';
    message = `Connection successful (version: ${version.data.release || 'unknown'})`;

    await query(
      `UPDATE proxmox_providers SET status = 'connected', last_tested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  } catch (e) {
    message = `Connection failed: ${e.response ? `HTTP ${e.response.status}` : e.code || e.message}`;

    await query(
      `UPDATE proxmox_providers SET status = 'error', last_tested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
  }

  await writeAuditLog({ actor: 'system', action: 'provider_test', resource_type: 'proxmox_provider', resource_id: provider.id, provider_id: provider.id, result, message });

  return { result, message };
}

async function listNodes(id) {
  const provider = await getProviderWithSecret(id);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  const client = buildClientFromProvider(provider);
  const nodes = await proxmoxClient.getNodes(client);

  for (const node of nodes) {
    node.provider_id = provider.id;
    node.provider_name = provider.name;
  }

  return nodes;
}

async function listVMs(id) {
  const provider = await getProviderWithSecret(id);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  const client = buildClientFromProvider(provider);
  const nodes = await proxmoxClient.getNodes(client);
  const allVMs = [];

  for (const node of nodes) {
    const [qemuVMs, lxcContainers] = await Promise.all([
      proxmoxClient.getNodeVMs(client, node.node).catch(() => []),
      proxmoxClient.getNodeLXC(client, node.node).catch(() => []),
    ]);
    for (const vm of qemuVMs) {
      allVMs.push({ ...vm, type: 'qemu', node: node.node, provider_id: provider.id, provider_name: provider.name });
    }
    for (const lxc of lxcContainers) {
      allVMs.push({ ...lxc, type: 'lxc', node: node.node, provider_id: provider.id, provider_name: provider.name });
    }
  }

  return allVMs;
}

async function getVMDetail(id, vmid) {
  const provider = await getProviderWithSecret(id);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  const client = buildClientFromProvider(provider);
  const nodes = await proxmoxClient.getNodes(client);

  let found = null;
  for (const node of nodes) {
    try {
      const detail = await proxmoxClient.getVM(client, node.node, vmid);
      found = { ...detail, node: node.node, vmid, type: 'qemu', provider_id: provider.id, provider_name: provider.name };
      break;
    } catch (e) {
      try {
        const lxcDetail = await proxmoxClient.getLXC(client, node.node, vmid);
        found = { ...lxcDetail, node: node.node, vmid, type: 'lxc', provider_id: provider.id, provider_name: provider.name };
        break;
      } catch (e2) {
        continue;
      }
    }
  }

  if (!found) {
    throw Object.assign(new Error(`VM ${vmid} not found on any node`), { code: 'not_found', status: 404 });
  }

  return found;
}

async function syncInventory(id) {
  const provider = await getProviderWithSecret(id);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  const client = buildClientFromProvider(provider);

  const bridgeRes = await query(
    `INSERT INTO providers (name, type, status, config) VALUES ($1, 'proxmox', 'connected', $2::jsonb)
     ON CONFLICT (name) DO UPDATE SET status = 'connected', config = $2::jsonb, updated_at = CURRENT_TIMESTAMP
     RETURNING id, name`,
    [provider.name, JSON.stringify({ host: provider.host, port: provider.port, proxmox_provider_id: provider.id })]
  );
  const bridgeProviderId = bridgeRes.rows[0].id;

  const nodes = await proxmoxClient.getNodes(client);
  let foundCount = 0;

  for (const node of nodes) {
    const cpuCores = parseInt(node.maxcpu) || 0;
    const memoryGb = node.maxmem ? Math.round(parseInt(node.maxmem) / 1073741824 * 100) / 100 : 0;
    const diskGb = node.maxdisk ? Math.round(parseInt(node.maxdisk) / 1073741824 * 100) / 100 : 0;
    const cpuPct = node.cpu ? Math.round(parseFloat(node.cpu) * 10000) / 100 : 0;
    const memPct = node.maxmem && node.mem ? Math.round(parseInt(node.mem) / parseInt(node.maxmem) * 10000) / 100 : 0;
    const diskPct = node.maxdisk && node.disk ? Math.round(parseInt(node.disk) / parseInt(node.maxdisk) * 10000) / 100 : 0;

    await query(
      `INSERT INTO hosts (provider_id, hostname, host_type, ip_address, status, cpu_cores, cpu_usage_pct, memory_total_gb, memory_usage_pct, disk_total_gb, disk_usage_pct)
       VALUES ($1, $2, 'host', $3, 'running', $4, $5, $6, $7, $8, $9)
       ON CONFLICT (hostname, provider_id) DO UPDATE SET
         host_type = 'host', status = 'running',
         cpu_cores = $4, cpu_usage_pct = $5,
         memory_total_gb = $6, memory_usage_pct = $7,
         disk_total_gb = $8, disk_usage_pct = $9,
         updated_at = CURRENT_TIMESTAMP`,
      [bridgeProviderId, node.node, node.ip || null, cpuCores, cpuPct, memoryGb, memPct, diskGb, diskPct]
    );
    foundCount++;
  }

  for (const node of nodes) {
    const [qemuVMs, lxcContainers] = await Promise.all([
      proxmoxClient.getNodeVMs(client, node.node).catch(() => []),
      proxmoxClient.getNodeLXC(client, node.node).catch(() => []),
    ]);

    for (const vm of qemuVMs) {
      const status = vm.status === 'running' ? 'running' : 'stopped';
      await query(
        `INSERT INTO vms (name, vmid, provider_id, status, cpu_cores, memory_gb, disk_gb)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (name, provider_id) DO UPDATE SET
           vmid = $2, status = $4, cpu_cores = $5, memory_gb = $6, disk_gb = $7, updated_at = CURRENT_TIMESTAMP`,
        [vm.name || `vm-${vm.vmid}`, String(vm.vmid), bridgeProviderId, status, vm.cpus || 0, vm.maxmem ? Math.round(vm.maxmem / 1073741824 * 100) / 100 : 0, vm.maxdisk ? Math.round(vm.maxdisk / 1073741824 * 100) / 100 : 0]
      );
      foundCount++;
    }

    for (const lxc of lxcContainers) {
      const status = lxc.status === 'running' ? 'running' : 'stopped';
      await query(
        `INSERT INTO containers (name, container_id, provider_id, status, cpu_usage_pct, memory_usage_mb)
         VALUES ($1, $2, $3, $4, 0, 0)
         ON CONFLICT (provider_id, container_id) DO UPDATE SET status = $4, updated_at = CURRENT_TIMESTAMP`,
        [lxc.name || `ct-${lxc.vmid}`, String(lxc.vmid), bridgeProviderId, status]
      );
      foundCount++;
    }
  }

  const syncJobRes = await query(
    `INSERT INTO sync_jobs (provider_id, job_type, status, found_count, removed_count, message, started_at, completed_at)
     VALUES ($1, 'proxmox_sync', 'success', $2, 0, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`,
    [bridgeProviderId, foundCount, `Synced ${nodes.length} nodes and ${foundCount - nodes.length} VMs/containers from Proxmox`]
  );

  await query(
    `UPDATE proxmox_providers SET last_synced_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
    [id]
  );

  await writeAuditLog({
    actor: 'system',
    action: 'sync_inventory',
    resource_type: 'proxmox_provider',
    resource_id: provider.id,
    provider_id: provider.id,
    result: 'success',
    message: `Inventory sync completed: ${nodes.length} nodes, ${foundCount - nodes.length} VMs/containers discovered`,
  });

  return {
    provider_id: provider.id,
    bridge_provider_id: bridgeProviderId,
    nodes_count: nodes.length,
    items_count: foundCount,
    sync_job_id: syncJobRes.rows[0].id,
  };
}

async function listAuditLogs(limit = 50) {
  const res = await query(
    `SELECT al.*
     FROM audit_logs al
     ORDER BY al.created_at DESC
     LIMIT $1`,
    [limit]
  );
  return res.rows;
}

async function locateVM(client, vmid) {
  const nodes = await proxmoxClient.getNodes(client);
  for (const node of nodes) {
    try {
      await proxmoxClient.getVM(client, node.node, vmid);
      return { node: node.node, type: 'qemu' };
    } catch (e) {
      try {
        await proxmoxClient.getLXC(client, node.node, vmid);
        return { node: node.node, type: 'lxc' };
      } catch (e2) {
        continue;
      }
    }
  }
  throw Object.assign(new Error(`VM ${vmid} not found on any node`), { code: 'not_found', status: 404 });
}

async function insertTask({ upid, providerId, node, vmid, type, action }) {
  await query(
    `INSERT INTO proxmox_tasks (upid, provider_id, node, vmid, type, action)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (upid) DO UPDATE SET status = 'running', last_polled_at = CURRENT_TIMESTAMP`,
    [upid, providerId, node, String(vmid), type, action]
  );
}

async function powerAction(providerId, vmid, action) {
  const provider = await getProviderWithSecret(providerId);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  const client = buildClientFromProvider(provider);
  const { node, type } = await locateVM(client, vmid);

  let res;
  try {
    if (action === 'start') res = await proxmoxClient.startVM(client, node, vmid, type);
    else if (action === 'stop') res = await proxmoxClient.stopVM(client, node, vmid, type);
    else if (action === 'reboot') res = await proxmoxClient.rebootVM(client, node, vmid, type);

    const upid = (res && res.data) || null;
    if (upid) {
      await insertTask({ upid, providerId: provider.id, node, vmid, type, action: `vm_${action}` });
    }

    await writeAuditLog({
      actor: 'system',
      action: `vm_${action}`,
      resource_type: 'vm',
      resource_id: vmid,
      provider_id: provider.id,
      result: 'success',
      message: `VM ${vmid} ${action} on node ${node}`,
      metadata: { upid, node, type },
    });

    return { upid, node, type, message: `VM ${vmid} ${action} submitted` };
  } catch (e) {
    await writeAuditLog({
      actor: 'system',
      action: `vm_${action}`,
      resource_type: 'vm',
      resource_id: vmid,
      provider_id: provider.id,
      result: 'failure',
      message: `VM ${vmid} ${action} failed: ${e.response ? `HTTP ${e.response.status}` : e.code || e.message}`,
      metadata: { node, type },
    });
    throw e;
  }
}

async function getTaskStatus(providerId, upid) {
  const provider = await getProviderWithSecret(providerId);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  const match = upid.match(/^UPID:(.+?):/);
  const node = match ? match[1] : 'localhost';

  const client = buildClientFromProvider(provider);
  const taskData = await proxmoxClient.getTaskStatus(client, node, upid);

  await query(
    `UPDATE proxmox_tasks SET status = $1, exit_status = $2, last_polled_at = CURRENT_TIMESTAMP
     WHERE upid = $3`,
    [taskData.status || 'unknown', taskData.exitstatus !== undefined ? String(taskData.exitstatus) : null, upid]
  );

  return taskData;
}

async function listTemplates(providerId) {
  const provider = await getProviderWithSecret(providerId);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  const client = buildClientFromProvider(provider);
  const nodes = await proxmoxClient.getNodes(client);
  const templates = [];

  for (const node of nodes) {
    const qemuVMs = await proxmoxClient.getNodeVMs(client, node.node).catch(() => []);
    for (const vm of qemuVMs) {
      if (vm.template === 1) {
        templates.push({ ...vm, type: 'qemu', node: node.node, provider_id: provider.id, provider_name: provider.name });
      }
    }
  }

  return templates;
}

async function cloneTemplate(providerId, templateVmid, { name, targetNode }, actor) {
  const provider = await getProviderWithSecret(providerId);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  if (provider.quota_max_vms !== null && provider.quota_max_vms !== undefined) {
    const countRes = await query(
      `SELECT DISTINCT vmid FROM proxmox_tasks WHERE provider_id = $1 AND action = 'template_clone' AND status = 'OK'`,
      [provider.id]
    );
    const currentCount = countRes.rows.length;

    if (currentCount >= provider.quota_max_vms) {
      await writeAuditLog({
        actor: actor || 'system',
        action: 'template_clone',
        resource_type: 'template',
        resource_id: templateVmid,
        provider_id: provider.id,
        result: 'failure',
        message: `Clone rejected: quota exceeded (${currentCount}/${provider.quota_max_vms})`,
      });
      throw Object.assign(new Error(`Quota exceeded: max ${provider.quota_max_vms} VMs per provider`), { code: 'quota_exceeded', status: 422 });
    }
  }

  const client = buildClientFromProvider(provider);
  const nodes = await proxmoxClient.getNodes(client);

  let sourceNode = targetNode;
  let foundTemplate = false;
  for (const node of nodes) {
    try {
      const qemuVMs = await proxmoxClient.getNodeVMs(client, node.node).catch(() => []);
      const found = qemuVMs.find((vm) => String(vm.vmid) === String(templateVmid) && vm.template === 1);
      if (found) {
        sourceNode = node.node;
        foundTemplate = true;
        break;
      }
    } catch (e) {
      continue;
    }
  }

  if (!foundTemplate) {
    throw Object.assign(new Error(`Template ${templateVmid} not found`), { code: 'not_found', status: 404 });
  }

  const nextIdData = await proxmoxClient.getNextId(client);
  const newid = (nextIdData && nextIdData.nextid) || nextIdData;

  if (!newid) {
    throw Object.assign(new Error('Could not obtain next VM ID from cluster'), { code: 'proxmox_error', status: 500 });
  }

  let res;
  try {
    res = await proxmoxClient.cloneVM(client, sourceNode, templateVmid, { newid, name, target: targetNode || undefined });
    const upid = (res && res.data) || null;

    if (upid) {
      await insertTask({ upid, providerId: provider.id, node: sourceNode, vmid: newid, type: 'qemu', action: 'template_clone' });
    }

    await writeAuditLog({
      actor: actor || 'system',
      action: 'template_clone',
      resource_type: 'template',
      resource_id: templateVmid,
      provider_id: provider.id,
      result: 'success',
      message: `Template ${templateVmid} cloned to VM ${newid} (${name}) on node ${targetNode || sourceNode}`,
      metadata: { upid, newid, name, sourceNode, targetNode },
    });

    return { upid, newid, name, node: targetNode || sourceNode, message: `Clone submitted, new VM ID: ${newid}` };
  } catch (e) {
    await writeAuditLog({
      actor: actor || 'system',
      action: 'template_clone',
      resource_type: 'template',
      resource_id: templateVmid,
      provider_id: provider.id,
      result: 'failure',
      message: `Template ${templateVmid} clone failed: ${e.response ? `HTTP ${e.response.status}` : e.code || e.message}`,
    });
    throw e;
  }
}

async function createSnapshotAction(providerId, vmid, { snapname, description }, actor) {
  const provider = await getProviderWithSecret(providerId);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  const client = buildClientFromProvider(provider);
  const { node, type } = await locateVM(client, vmid);

  let res;
  try {
    res = await proxmoxClient.createSnapshot(client, node, vmid, type, snapname, description);
    const upid = (res && res.data) || null;

    if (upid) {
      await insertTask({ upid, providerId: provider.id, node, vmid, type, action: 'snapshot_create' });
    }

    await writeAuditLog({
      actor: actor || 'system',
      action: 'snapshot_create',
      resource_type: 'vm',
      resource_id: vmid,
      provider_id: provider.id,
      result: 'success',
      message: `Snapshot ${snapname} created for VM ${vmid}`,
      metadata: { upid, snapname, node, type },
    });

    return { upid, snapname, node, type, message: `Snapshot ${snapname} creation submitted` };
  } catch (e) {
    await writeAuditLog({
      actor: actor || 'system',
      action: 'snapshot_create',
      resource_type: 'vm',
      resource_id: vmid,
      provider_id: provider.id,
      result: 'failure',
      message: `Snapshot ${snapname} creation failed: ${e.response ? `HTTP ${e.response.status}` : e.code || e.message}`,
    });
    throw e;
  }
}

async function listSnapshotsAction(providerId, vmid) {
  const provider = await getProviderWithSecret(providerId);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  const client = buildClientFromProvider(provider);
  const { node, type } = await locateVM(client, vmid);
  return await proxmoxClient.listSnapshots(client, node, vmid, type);
}

async function rollbackSnapshotAction(providerId, vmid, snapname, actor) {
  const provider = await getProviderWithSecret(providerId);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  const client = buildClientFromProvider(provider);
  const { node, type } = await locateVM(client, vmid);

  let res;
  try {
    res = await proxmoxClient.rollbackSnapshot(client, node, vmid, type, snapname);
    const upid = (res && res.data) || null;

    if (upid) {
      await insertTask({ upid, providerId: provider.id, node, vmid, type, action: 'snapshot_rollback' });
    }

    await writeAuditLog({
      actor: actor || 'system',
      action: 'snapshot_rollback',
      resource_type: 'vm',
      resource_id: vmid,
      provider_id: provider.id,
      result: 'success',
      message: `Rollback to snapshot ${snapname} for VM ${vmid} submitted`,
      metadata: { upid, snapname, node, type },
    });

    return { upid, snapname, node, type, message: `Rollback to ${snapname} submitted` };
  } catch (e) {
    await writeAuditLog({
      actor: actor || 'system',
      action: 'snapshot_rollback',
      resource_type: 'vm',
      resource_id: vmid,
      provider_id: provider.id,
      result: 'failure',
      message: `Rollback to ${snapname} failed: ${e.response ? `HTTP ${e.response.status}` : e.code || e.message}`,
    });
    throw e;
  }
}

const ROLE_ORDER = { viewer: 0, operator: 1, admin: 2 };
const VALID_ROLES = Object.keys(ROLE_ORDER);

function getRole(req) {
  const role = (req.headers['x-goneops-role'] || '').toLowerCase();
  return VALID_ROLES.includes(role) ? role : 'viewer';
}

function getActor(req) {
  return req.headers['x-goneops-actor'] || getRole(req);
}

function requireRole(minRole) {
  return (req, res, next) => {
    const role = getRole(req);
    const minRank = ROLE_ORDER[minRole] || 0;
    const currentRank = ROLE_ORDER[role] || 0;
    if (currentRank < minRank) {
      const err = new Error(`Role '${role}' is not authorized for this action (requires ${minRole})`);
      err.status = 403;
      err.code = 'forbidden';
      return next(err);
    }
    req.goneopsRole = role;
    req.goneopsActor = getActor(req);
    next();
  };
}

async function createApprovalRequest({ requestedBy, action, resourceType, resourceId, providerId, payload }) {
  const res = await query(
    `INSERT INTO approval_requests (requested_by, action, resource_type, resource_id, provider_id, payload)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, status, created_at`,
    [requestedBy || 'system', action, resourceType, String(resourceId), providerId, JSON.stringify(payload)]
  );
  const approval = res.rows[0];

  await writeAuditLog({
    actor: requestedBy || 'system',
    action: `${action.replace(/^template_clone$/, 'clone_requested').replace(/^snapshot_rollback$/, 'rollback_requested')}`,
    resource_type: resourceType,
    resource_id: resourceId,
    provider_id: providerId,
    result: 'success',
    message: `Approval requested for ${action} on ${resourceType} ${resourceId}`,
    metadata: { approval_id: approval.id, payload },
  });

  return approval;
}

async function listApprovalRequests() {
  const res = await query(
    `SELECT * FROM approval_requests ORDER BY created_at DESC`
  );
  return res.rows;
}

async function approveRequest(approvalId, approvedBy) {
  const reqRes = await query(`SELECT * FROM approval_requests WHERE id = $1`, [approvalId]);
  if (reqRes.rows.length === 0) {
    throw Object.assign(new Error('Approval request not found'), { code: 'not_found', status: 404 });
  }
  const ar = reqRes.rows[0];
  if (ar.status !== 'pending') {
    throw Object.assign(new Error(`Approval request is already ${ar.status}`), { code: 'invalid_state', status: 409 });
  }

  await query(
    `UPDATE approval_requests SET status = 'approved', approved_by = $1, decided_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [approvedBy || 'system', approvalId]
  );

  let result;
  try {
    if (ar.action === 'template_clone') {
      const p = ar.payload || {};
      result = await cloneTemplate(ar.provider_id, ar.resource_id, { name: p.name, targetNode: p.target_node }, approvedBy);
    } else if (ar.action === 'snapshot_rollback') {
      const p = ar.payload || {};
      result = await rollbackSnapshotAction(ar.provider_id, ar.resource_id, p.snapname, approvedBy);
    }

    await query(`UPDATE approval_requests SET status = 'executed' WHERE id = $1`, [approvalId]);

    await writeAuditLog({
      actor: approvedBy || 'system',
      action: 'approval_approve',
      resource_type: 'approval_request',
      resource_id: approvalId,
      provider_id: ar.provider_id,
      result: 'success',
      message: `Approval #${approvalId} approved and executed`,
    });

    return { approved: true, executed: true, ...result };
  } catch (e) {
    await query(`UPDATE approval_requests SET status = 'failed' WHERE id = $1`, [approvalId]);
    throw e;
  }
}

async function rejectRequest(approvalId, rejectedBy) {
  const reqRes = await query(`SELECT * FROM approval_requests WHERE id = $1`, [approvalId]);
  if (reqRes.rows.length === 0) {
    throw Object.assign(new Error('Approval request not found'), { code: 'not_found', status: 404 });
  }
  const ar = reqRes.rows[0];
  if (ar.status !== 'pending') {
    throw Object.assign(new Error(`Approval request is already ${ar.status}`), { code: 'invalid_state', status: 409 });
  }

  await query(
    `UPDATE approval_requests SET status = 'rejected', approved_by = $1, decided_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [rejectedBy || 'system', approvalId]
  );

  await writeAuditLog({
    actor: rejectedBy || 'system',
    action: 'approval_reject',
    resource_type: 'approval_request',
    resource_id: approvalId,
    provider_id: ar.provider_id,
    result: 'success',
    message: `Approval #${approvalId} rejected`,
  });

  return { approved: false, rejected: true };
}

async function deleteInstance(providerId, vmid, actor, typeHint) {
  const provider = await getProviderWithSecret(providerId);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  const client = buildClientFromProvider(provider);
  let node, type;

  if (typeHint && typeHint === 'lxc') {
    const nodes = await proxmoxClient.getNodes(client);
    let found = false;
    for (const n of nodes) {
      try {
        await proxmoxClient.getLXC(client, n.node, vmid);
        node = n.node;
        type = 'lxc';
        found = true;
        break;
      } catch (e) { continue; }
    }
    if (!found) throw Object.assign(new Error(`LXC ${vmid} not found on any node`), { code: 'not_found', status: 404 });
  } else {
    ({ node, type } = await locateVM(client, vmid));
  }

  const actionKey = type === 'lxc' ? 'lxc_delete' : 'vm_delete';

  try {
    let res;
    if (type === 'lxc') {
      res = await proxmoxClient.deleteLXC(client, node, vmid);
    } else {
      res = await proxmoxClient.deleteVM(client, node, vmid);
    }

    const upid = (res && res.data) || null;
    if (upid) {
      await insertTask({ upid, providerId: provider.id, node, vmid, type, action: actionKey });
    }

    await writeAuditLog({
      actor: actor || 'system',
      action: actionKey,
      resource_type: type === 'lxc' ? 'lxc' : 'vm',
      resource_id: vmid,
      provider_id: provider.id,
      result: 'success',
      message: `${type === 'lxc' ? 'LXC' : 'VM'} ${vmid} deleted from node ${node}`,
      metadata: { upid, node, type },
    });

    return { upid, node, type, message: `${type === 'lxc' ? 'LXC' : 'VM'} ${vmid} deletion submitted` };
  } catch (e) {
    await writeAuditLog({
      actor: actor || 'system',
      action: actionKey,
      resource_type: type === 'lxc' ? 'lxc' : 'vm',
      resource_id: vmid,
      provider_id: provider.id,
      result: 'failure',
      message: `${type === 'lxc' ? 'LXC' : 'VM'} ${vmid} deletion failed: ${e.response ? `HTTP ${e.response.status}` : e.code || e.message}`,
      metadata: { node, type },
    });
    throw e;
  }
}

async function provisionInfrastructure(providerId, spec, actor) {
  const provider = await getProviderWithSecret(providerId);
  if (!provider) throw Object.assign(new Error('Provider not found'), { code: 'not_found', status: 404 });

  const client = buildClientFromProvider(provider);
  const nodes = await proxmoxClient.getNodes(client);
  if (nodes.length === 0) {
    throw Object.assign(new Error('No nodes available on provider'), { code: 'proxmox_error', status: 500 });
  }
  const targetNode = spec.node || nodes[0].node;

  const results = [];

  if (spec.items) {
    for (const item of spec.items) {
      const nextIdData = await proxmoxClient.getNextId(client);
      const vmid = (nextIdData && nextIdData.nextid) || nextIdData;

      if (!vmid) {
        throw Object.assign(new Error('Could not obtain next VM ID from cluster'), { code: 'proxmox_error', status: 500 });
      }

      let res;
      if (item.type === 'lxc') {
        const oaTemplate = item.ostemplate || 'local:vztmpl/ubuntu-24.04-standard_24.04-1_amd64.tar.zst';
        const config = {
          ostemplate: oaTemplate,
          vmid,
          hostname: item.name,
          storage: item.storage || 'local-lvm',
          cores: item.cores || 2,
          memory: item.memory || 1024,
          swap: item.swap || 512,
          rootfs: `${item.storage || 'local-lvm'}:${item.disk || 8}`,
          net0: `name=eth0,bridge=vmbr0,ip=dhcp`,
          password: item.password || 'changeme',
          start: item.start !== false,
          unprivileged: item.unprivileged !== false ? 1 : 0,
          ...(item.extra || {}),
        };
        res = await proxmoxClient.createLXC(client, targetNode, config);
      } else {
        const config = {
          vmid,
          name: item.name,
          memory: item.memory || 2048,
          cores: item.cores || 2,
          sockets: item.sockets || 1,
          storage: item.storage || 'local-lvm',
          ide2: `${item.storage || 'local-lvm'}:iso/${item.iso || 'ubuntu-24.04-live-server-amd64.iso'},media=cdrom`,
          net0: 'virtio,bridge=vmbr0',
          ostype: item.ostype || 'l26',
          scsihw: 'virtio-scsi-pci',
          ...(item.extra || {}),
        };
        res = await proxmoxClient.createVM(client, targetNode, config);
      }

      const upid = (res && res.data) || null;
      if (upid) {
        await insertTask({ upid, providerId: provider.id, node: targetNode, vmid, type: item.type, action: item.type === 'lxc' ? 'lxc_create' : 'vm_create' });
      }

      await writeAuditLog({
        actor: actor || 'system',
        action: item.type === 'lxc' ? 'lxc_create' : 'vm_create',
        resource_type: item.type === 'lxc' ? 'lxc' : 'vm',
        resource_id: vmid,
        provider_id: provider.id,
        result: 'success',
        message: `${item.type === 'lxc' ? 'LXC' : 'VM'} ${item.name} (vmid ${vmid}) creation submitted on node ${targetNode}`,
        metadata: { upid, vmid, name: item.name, node: targetNode, type: item.type },
      });

      results.push({ vmid, name: item.name, type: item.type, upid, node: targetNode });
    }
  }

  return { results, node: targetNode, message: `${results.length} instances provisioned on node ${targetNode}` };
}

async function listTasks(limit = 100) {
  const res = await query(
    `SELECT * FROM proxmox_tasks ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return res.rows;
}

module.exports = {
  createProvider,
  listProviders,
  getProvider,
  testProviderConnection,
  listNodes,
  listVMs,
  getVMDetail,
  syncInventory,
  listAuditLogs,
  writeAuditLog,
  locateVM,
  powerAction,
  deleteInstance,
  provisionInfrastructure,
  getTaskStatus,
  listTemplates,
  cloneTemplate,
  createSnapshotAction,
  listSnapshotsAction,
  rollbackSnapshotAction,
  requireRole,
  getRole,
  getActor,
  createApprovalRequest,
  listApprovalRequests,
  approveRequest,
  rejectRequest,
  listTasks,
  getProviderWithSecret,
  buildClientFromProvider,
  insertTask,
};
