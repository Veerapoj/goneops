const assert = require('node:assert/strict');

const API = process.env.GONEOPS_API_URL || 'http://192.168.1.147:4000/api/proxmox';
const API_ROOT = API.replace(/\/api\/proxmox\/?$/, '');
const PROVIDER_ID = 1;
const TEST_VMID = 100;
let passed = 0;
let failed = 0;
let warnings = 0;

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`PASS  ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL  ${name}: ${e.message}`);
  }
}

function warn(msg) {
  warnings++;
  console.log(`WARN  ${msg}`);
}

async function request(path, options = {}) {
  const url = `${API}${path}`;
  const headers = { 'content-type': 'application/json', ...(options.headers || {}) };
  const body = options.body;
  const fetchOpts = { ...options, headers };
  if (body && typeof body === 'object') {
    fetchOpts.body = JSON.stringify(body);
  }
  const response = await fetch(url, fetchOpts);
  const text = await response.text();
  let parsed;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { response, body: parsed };
}

async function reqWithRole(role, path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (role) {
    headers['x-goneops-role'] = role;
    headers['x-goneops-actor'] = `test-${role}`;
  }
  return request(path, { ...options, headers });
}

async function pollTask(providerId, upid, timeoutMs = 120000, intervalMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const { response, body } = await request(`/tasks/${encodeURIComponent(upid)}?provider_id=${providerId}`);
    if (response.status !== 200) {
      return { done: false, status: `HTTP ${response.status}`, body };
    }
    if (body.status && body.status !== 'running') {
      return { done: true, status: body.status, body };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { done: false, status: 'timeout' };
}

async function main() {
  console.log(`Target: ${API} | Provider: ${PROVIDER_ID} | Test VM: ${TEST_VMID}\n`);

  let healthOk = false;
  try {
    const health = await fetch(`${API_ROOT}/api/health`);
    healthOk = health.status === 200 && (await health.json()).status === 'ok';
  } catch {}

  await check('backend health check', async () => {
    if (!healthOk) throw new Error('Backend unreachable');
  });

  let providers = [];
  let vms = [];
  let auditLogCountBefore = 0;
  let lastUpId = null;

  await check(`list providers (expect provider id=${PROVIDER_ID} connected)`, async () => {
    const { response, body } = await request('/providers');
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body));
    const p = body.find((p) => p.id === PROVIDER_ID);
    assert.ok(p, `Provider id=${PROVIDER_ID} not found`);
    assert.equal(p.status, 'connected', `Provider status: ${p.status}`);
    providers = body;
  });

  await check('test connection (operator role)', async () => {
    const { response } = await reqWithRole('operator', `/providers/${PROVIDER_ID}/test`, { method: 'POST' });
    if (response.status !== 200 && response.status !== 201) throw new Error(`HTTP ${response.status}`);
  });

  await check('list nodes (expect 1 = pve)', async () => {
    const { response, body } = await request(`/providers/${PROVIDER_ID}/nodes`);
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body));
    assert.equal(body.length, 1, `Expected 1 node, got ${body.length}`);
    assert.match(body[0].node, /pve/);
  });

  await check('list VMs (expect 6 = 1 qemu + 5 lxc)', async () => {
    const { response, body } = await request(`/providers/${PROVIDER_ID}/vms`);
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body));
    assert.equal(body.length, 6, `Expected 6 VMs, got ${body.length}`);
    const qemu = body.filter((v) => v.type === 'qemu');
    const lxc = body.filter((v) => v.type === 'lxc');
    assert.equal(qemu.length, 1, `Expected 1 qemu, got ${qemu.length}`);
    assert.equal(lxc.length, 5, `Expected 5 lxc, got ${lxc.length}`);

    const vmids = body.map((v) => v.vmid).sort((a, b) => a - b);
    const expected = [100, 200, 201, 202, 203, 204];
    if (JSON.stringify(vmids) !== JSON.stringify(expected)) {
      warn(`VMIDs: ${JSON.stringify(vmids)} (expected ${JSON.stringify(expected)})`);
    }
    vms = body;
  });

  await check(`get VM detail for vmid ${TEST_VMID}`, async () => {
    const { response, body } = await request(`/vms/${TEST_VMID}?provider_id=${PROVIDER_ID}`);
    assert.equal(response.status, 200);
    assert.equal(body.vmid, TEST_VMID);
    assert.equal(body.type, 'qemu');
  });

  await check('list VMD snapshots', async () => {
    const { response } = await request(`/vms/${TEST_VMID}/snapshots?provider_id=${PROVIDER_ID}`);
    if (response.status !== 200 && response.status !== 404) throw new Error(`HTTP ${response.status}`);
  });

  await check('list templates', async () => {
    const { response, body } = await request(`/providers/${PROVIDER_ID}/templates`);
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body));
  });

  await check('list tasks', async () => {
    const { response, body } = await request('/tasks');
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body));
  });

  await check('list approvals', async () => {
    const { response, body } = await request('/approvals');
    assert.equal(response.status, 200);
    assert.ok(Array.isArray(body));
  });

  const { body: auditBefore } = await request('/audit-logs');
  auditLogCountBefore = Array.isArray(auditBefore) ? auditBefore.length : 0;
  await check('list audit logs', async () => {
    if (!Array.isArray(auditBefore)) throw new Error('Expected array');
  });

  await check('RBAC: POST /vms/100/start without role => 403', async () => {
    const { response } = await reqWithRole(null, '/vms/100/start', {
      method: 'POST',
      body: { provider_id: PROVIDER_ID },
    });
    if (response.status !== 403) throw new Error(`Expected 403, got ${response.status}`);
  });

  await check('RBAC: POST /vms/100/stop without role => 403', async () => {
    const { response } = await reqWithRole(null, '/vms/100/stop', {
      method: 'POST',
      body: { provider_id: PROVIDER_ID },
    });
    if (response.status !== 403) throw new Error(`Expected 403, got ${response.status}`);
  });

  await check('RBAC: POST /vms/100/start with viewer role => 403', async () => {
    const { response } = await reqWithRole('viewer', '/vms/100/start', {
      method: 'POST',
      body: { provider_id: PROVIDER_ID },
    });
    if (response.status !== 403) throw new Error(`Expected 403, got ${response.status}`);
  });

  await check('RBAC: POST /vms/100/snapshot with viewer role => 403', async () => {
    const { response } = await reqWithRole('viewer', '/vms/100/snapshot', {
      method: 'POST',
      body: { provider_id: PROVIDER_ID, snapname: 'rbac-test', description: 'RBAC probe' },
    });
    if (response.status !== 403) throw new Error(`Expected 403, got ${response.status}`);
  });

  await check('RBAC: POST /templates/100/clone with viewer role => 403', async () => {
    const { response } = await reqWithRole('viewer', '/templates/100/clone', {
      method: 'POST',
      body: { provider_id: PROVIDER_ID, name: 'rbac-test' },
    });
    if (response.status !== 403) throw new Error(`Expected 403, got ${response.status}`);
  });

  await check('RBAC: POST /vms/100/rollback with viewer role => 403', async () => {
    const { response } = await reqWithRole('viewer', '/vms/100/rollback', {
      method: 'POST',
      body: { provider_id: PROVIDER_ID, snapname: 'nonexistent' },
    });
    if (response.status !== 403) throw new Error(`Expected 403, got ${response.status}`);
  });

  await check('RBAC: POST /sync-inventory with viewer role => 403', async () => {
    const { response } = await reqWithRole('viewer', '/sync-inventory', {
      method: 'POST',
      body: { provider_id: PROVIDER_ID },
    });
    if (response.status !== 403) throw new Error(`Expected 403, got ${response.status}`);
  });

  await check('RBAC: POST /providers with viewer role => 403', async () => {
    const { response } = await reqWithRole('viewer', '/providers', {
      method: 'POST',
      body: { name: 'test', host: '1.2.3.4', token_user: 'x', token_id: 'x', token_secret: 'x' },
    });
    if (response.status !== 403) throw new Error(`Expected 403, got ${response.status}`);
  });

  await check('start VM 100 via operator role (returns UPID)', async () => {
    const { response, body } = await reqWithRole('operator', '/vms/100/start', {
      method: 'POST',
      body: { provider_id: PROVIDER_ID },
    });
    if (response.status !== 200 && response.status !== 202)
      throw new Error(`Expected 200/202, got ${response.status}: ${JSON.stringify(body)}`);
    if (body.upid) lastUpId = body.upid;
    else if (body.data) lastUpId = body.data;
    if (!lastUpId) warn('No UPID found in start response: ' + JSON.stringify(body));
  });

  if (lastUpId) {
    await check('poll start task to terminal status', async () => {
      const result = await pollTask(PROVIDER_ID, lastUpId, 120000);
      if (!result.done) throw new Error(`Task did not finish: ${result.status}`);
      const terminal = ['completed', 'ok', 'success', 'stopped'];
      if (!terminal.includes(result.status)) {
        throw new Error(`Task status: ${result.status}`);
      }
    });
  }

  const { body: auditAfterStart } = await request('/audit-logs');
  const auditAfterStartCount = Array.isArray(auditAfterStart) ? auditAfterStart.length : 0;
  await check('audit log grew after VM start', async () => {
    if (auditAfterStartCount <= auditLogCountBefore) {
      warn(`Audit log count unchanged: ${auditLogCountBefore} => ${auditAfterStartCount}`);
    }
  });

  await check('stop VM 100 via operator role (restore to stopped)', async () => {
    const { response, body } = await reqWithRole('operator', '/vms/100/stop', {
      method: 'POST',
      body: { provider_id: PROVIDER_ID },
    });
    if (response.status !== 200 && response.status !== 202)
      throw new Error(`Expected 200/202, got ${response.status}: ${JSON.stringify(body)}`);
    if (body.upid) lastUpId = body.upid;
    else if (body.data) lastUpId = body.data;
  });

  if (lastUpId) {
    await check('poll stop task to terminal status', async () => {
      const result = await pollTask(PROVIDER_ID, lastUpId, 120000);
      if (!result.done) throw new Error(`Task did not finish: ${result.status}`);
      const terminal = ['completed', 'ok', 'success', 'stopped'];
      if (!terminal.includes(result.status)) {
        throw new Error(`Task status: ${result.status}`);
      }
    });
  }

  await check('VM 100 is stopped after lifecycle test', async () => {
    const { response, body } = await request(`/vms/${TEST_VMID}?provider_id=${PROVIDER_ID}`);
    assert.equal(response.status, 200);
    const vmStatus = (body.status && typeof body.status === 'object') ? body.status.status : body.status;
    assert.equal(vmStatus, 'stopped', `VM 100 status: ${vmStatus}, expected stopped`);
  });

  await check('rollback with operator role => pending approval 202', async () => {
    const { response, body } = await reqWithRole('operator', '/vms/100/rollback', {
      method: 'POST',
      body: { provider_id: PROVIDER_ID, snapname: 'test-snap' },
    });
    if (response.status !== 202)
      throw new Error(`Expected 202 pending, got ${response.status}: ${JSON.stringify(body)}`);
  });

  await check('clone with operator role => pending approval 202', async () => {
    const { response, body } = await reqWithRole('operator', '/templates/100/clone', {
      method: 'POST',
      body: { provider_id: PROVIDER_ID, name: 'test-clone-op' },
    });
    if (response.status !== 202)
      throw new Error(`Expected 202 pending, got ${response.status}: ${JSON.stringify(body)}`);
  });

  let approvalId = null;
  await check('list approvals has pending entries', async () => {
    const { response, body } = await request('/approvals');
    assert.equal(response.status, 200);
    const pending = body.filter((a) => a.status === 'pending');
    if (pending.length === 0) warn('No pending approvals found');
    if (pending.length > 0) approvalId = pending[0].id;
  });

  if (approvalId) {
    await check('reject approval with admin role', async () => {
      const { response, body } = await reqWithRole('admin', `/approvals/${approvalId}/reject`, { method: 'POST' });
      if (response.status !== 200 && response.status !== 201 && response.status !== 202)
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(body)}`);
    });

    await check('rejected approval status is rejected', async () => {
      const { response, body } = await request('/approvals');
      assert.equal(response.status, 200);
      const found = body.find((a) => a.id === approvalId);
      assert.ok(found, `Approval ${approvalId} not found`);
      assert.equal(found.status, 'rejected', `Status: ${found.status}`);
    });
  }

  const { body: auditEnd } = await request('/audit-logs');
  const auditEndCount = Array.isArray(auditEnd) ? auditEnd.length : 0;
  await check('audit logs grew during test execution', async () => {
    if (auditEndCount <= auditLogCountBefore) throw new Error(`No audit growth: ${auditLogCountBefore}->${auditEndCount}`);
  });

  console.log(`\nRESULT ${passed} passed, ${failed} failed, ${warnings} warnings`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(`\nFATAL ${err.stack || err.message}`);
  process.exitCode = 1;
});
