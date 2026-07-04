const crypto = require('crypto');
const { query } = require('../lib/db');
const proxmoxClient = require('../lib/proxmoxClient');

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

async function writeAuditLog({ actor, action, resource_type, resource_id, provider_id, result, message, metadata }) {
  const res = await query(
    `INSERT INTO audit_logs (actor, action, resource_type, resource_id, provider_id, result, message, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [actor || 'system', action, resource_type || null, resource_id || null, provider_id || null, result, message || null, metadata ? JSON.stringify(metadata) : '{}']
  );
  return res.rows[0];
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
    await query(
      `INSERT INTO hosts (provider_id, hostname, host_type, ip_address, status)
       VALUES ($1, $2, 'host', $3, 'running')
       ON CONFLICT (hostname, provider_id) DO UPDATE SET
         host_type = 'host', status = 'running', updated_at = CURRENT_TIMESTAMP`,
      [bridgeProviderId, node.node, node.ip || null]
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
         ON CONFLICT DO NOTHING`,
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
};
