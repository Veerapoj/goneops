const { preflightCheck, pctExec, bootstrapLxc, getLxcIp } = require('./remoteExec');
const { query } = require('../lib/db');
const { updateEnvironmentStatus } = require('../services/environmentService');

const PUBLIC_HOST = process.env.PUBLIC_HOST || 'localhost';

async function claimTransitionalState(environmentId, projectId, nextStatus, allowedPrevious) {
  const result = await query(
    `UPDATE environments
     SET status = $1, updated_at = NOW()
     WHERE id = $2 AND project_id = $3 AND status = ANY($4::varchar[])
     RETURNING *`,
    [nextStatus, environmentId, projectId, allowedPrevious]
  );
  if (!result.rows.length) {
    const current = await query(
      'SELECT status FROM environments WHERE id = $1 AND project_id = $2',
      [environmentId, projectId]
    );
    if (!current.rows.length) {
      throw Object.assign(new Error('Environment not found'), { status: 404, code: 'not_found' });
    }
    throw Object.assign(
      new Error(`Cannot transition from ${current.rows[0].status} to ${nextStatus}`),
      { status: 409, code: 'conflict' }
    );
  }
  return result.rows[0];
}

async function ensureLxcReady(environmentId, workingDir) {
  const env = await query(
    'SELECT lxc_vmid, lxc_status, lxc_ip FROM environments WHERE id = $1',
    [environmentId]
  );
  const row = env.rows[0];
  if (!row || !row.lxc_vmid) {
    throw Object.assign(new Error('No LXC provisioned for this sandbox. Run generate-sandbox first.'), { status: 400, code: 'validation_error' });
  }

  let lxcIp = row.lxc_ip;

  if (row.lxc_status !== 'ready') {
    await query(
      "UPDATE environments SET lxc_status = 'provisioning', updated_at = NOW() WHERE id = $1",
      [environmentId]
    );
    const remoteDir = await bootstrapLxc(row.lxc_vmid, workingDir);
    lxcIp = await getLxcIp(row.lxc_vmid);
    await query(
      `UPDATE environments
          SET lxc_status = 'ready', lxc_ip = $1, working_dir = $2, updated_at = NOW()
        WHERE id = $3`,
      [lxcIp, remoteDir, environmentId]
    );
  }

  return { vmid: row.lxc_vmid, ip: lxcIp, workingDir: row.working_dir };
}

async function runSandbox(projectId, environmentId) {
  const env = await query(
    'SELECT * FROM environments WHERE id = $1 AND project_id = $2',
    [environmentId, projectId]
  );
  if (!env.rows.length) throw Object.assign(new Error('Environment not found'), { status: 404, code: 'not_found' });

  const workingDir = env.rows[0].working_dir;
  if (!workingDir) throw Object.assign(new Error('No sandbox generated. Run generate-sandbox first.'), { status: 400, code: 'validation_error' });

  const check = await preflightCheck();
  if (!check.available) {
    throw Object.assign(new Error('Proxmox LXC provider unreachable'), { status: 503, code: 'proxmox_unavailable', details: { error: check.error } });
  }

  await claimTransitionalState(environmentId, projectId, 'starting', ['stopped', 'failed']);

  setImmediate(async () => {
    try {
      const lxc = await ensureLxcReady(environmentId, workingDir);

      const composeDir = lxc.workingDir || workingDir;
      const remoteSandboxDir = composeDir.startsWith('/opt/') ? composeDir : '/opt/sandbox';

      try {
        await pctExec(lxc.vmid, `cd '${remoteSandboxDir}' && docker compose up -d --wait --build`);
      } catch (upErr) {
        console.error(`[runner] up failed: ${upErr.message}`);
        await updateEnvironmentStatus(environmentId, 'failed', null);
        return;
      }

      const ports = await query(
        'SELECT host_port FROM sandbox_ports WHERE environment_id = $1 AND role = $2',
        [environmentId, 'web']
      );
      const lxcIp = lxc.ip;
      const webPort = ports.rows.length ? ports.rows[0].host_port : null;
      const previewUrl = lxcIp && webPort ? `http://${lxcIp}:${webPort}` : (webPort ? `http://${PUBLIC_HOST}:${webPort}` : '');
      await updateEnvironmentStatus(environmentId, 'running', previewUrl);
      await query(
        "UPDATE services SET status = 'healthy' WHERE environment_id = $1",
        [environmentId]
      );
    } catch (err) {
      await updateEnvironmentStatus(environmentId, 'failed', null);
      console.error(`[runner] async start error: ${err.message}`);
    }
  });

  return { environment_id: environmentId, status: 'starting', message: 'Sandbox start initiated' };
}

async function stopSandbox(projectId, environmentId) {
  const env = await query(
    'SELECT * FROM environments WHERE id = $1 AND project_id = $2',
    [environmentId, projectId]
  );
  if (!env.rows.length) throw Object.assign(new Error('Environment not found'), { status: 404, code: 'not_found' });

  const row = env.rows[0];
  const workingDir = row.working_dir;
  if (!workingDir) throw Object.assign(new Error('No sandbox directory found'), { status: 400, code: 'validation_error' });
  if (!row.lxc_vmid) {
    throw Object.assign(new Error('No LXC provisioned for this sandbox'), { status: 400, code: 'validation_error' });
  }

  const check = await preflightCheck();
  if (!check.available) {
    throw Object.assign(new Error('Proxmox LXC provider unreachable'), { status: 503, code: 'proxmox_unavailable', details: { error: check.error } });
  }

  await claimTransitionalState(environmentId, projectId, 'stopping', ['running', 'failed', 'starting']);
  setImmediate(async () => {
    try {
      const composeDir = row.working_dir.startsWith('/opt/') ? row.working_dir : '/opt/sandbox';
      await pctExec(row.lxc_vmid, `cd '${composeDir}' && docker compose down`);
    } catch (err) {
      console.error(`[runner] down failed: ${err.message}`);
    }
    await updateEnvironmentStatus(environmentId, 'stopped', null);
    await query(
      "UPDATE services SET status = 'unhealthy' WHERE environment_id = $1",
      [environmentId]
    );
  });

  return { environment_id: environmentId, status: 'stopping', message: 'Sandbox stop initiated' };
}

async function restartSandbox(projectId, environmentId) {
  const env = await query(
    'SELECT * FROM environments WHERE id = $1 AND project_id = $2',
    [environmentId, projectId]
  );
  if (!env.rows.length) throw Object.assign(new Error('Environment not found'), { status: 404, code: 'not_found' });

  const row = env.rows[0];
  const workingDir = row.working_dir;
  if (!workingDir) throw Object.assign(new Error('No sandbox directory found'), { status: 400, code: 'validation_error' });
  if (!row.lxc_vmid) {
    throw Object.assign(new Error('No LXC provisioned for this sandbox'), { status: 400, code: 'validation_error' });
  }

  const check = await preflightCheck();
  if (!check.available) {
    throw Object.assign(new Error('Proxmox LXC provider unreachable'), { status: 503, code: 'proxmox_unavailable', details: { error: check.error } });
  }

  await claimTransitionalState(environmentId, projectId, 'restarting', ['running', 'failed']);

  setImmediate(async () => {
    try {
      const composeDir = row.working_dir.startsWith('/opt/') ? row.working_dir : '/opt/sandbox';
      await pctExec(row.lxc_vmid, `cd '${composeDir}' && docker compose down`);
      await pctExec(row.lxc_vmid, `cd '${composeDir}' && docker compose up -d --wait --build`);

      const ports = await query(
        'SELECT host_port FROM sandbox_ports WHERE environment_id = $1 AND role = $2',
        [environmentId, 'web']
      );
      const lxcIp = row.lxc_ip;
      const webPort = ports.rows.length ? ports.rows[0].host_port : null;
      const previewUrl = lxcIp && webPort ? `http://${lxcIp}:${webPort}` : (webPort ? `http://${PUBLIC_HOST}:${webPort}` : '');
      await updateEnvironmentStatus(environmentId, 'running', previewUrl);
      await query(
        "UPDATE services SET status = 'healthy' WHERE environment_id = $1",
        [environmentId]
      );
    } catch (err) {
      await updateEnvironmentStatus(environmentId, 'failed', null);
      console.error(`[runner] async restart error: ${err.message}`);
    }
  });

  return { environment_id: environmentId, status: 'restarting', message: 'Sandbox restart initiated' };
}

async function getSandboxLogs(projectId, environmentId, tail = 100) {
  const env = await query(
    'SELECT * FROM environments WHERE id = $1 AND project_id = $2',
    [environmentId, projectId]
  );
  if (!env.rows.length) throw Object.assign(new Error('Environment not found'), { status: 404, code: 'not_found' });

  const row = env.rows[0];
  const workingDir = row.working_dir;
  if (!workingDir) throw Object.assign(new Error('No sandbox directory found'), { status: 400, code: 'validation_error' });

  if (row.lxc_vmid) {
    try {
      const composeDir = workingDir.startsWith('/opt/') ? workingDir : '/opt/sandbox';
      const boundedTail = Number.isInteger(tail) ? Math.min(Math.max(tail, 1), 1000) : 100;
      const stdout = await pctExec(row.lxc_vmid, `cd '${composeDir}' && docker compose logs --tail ${boundedTail} --no-color`);
      return { logs: stdout, error: '', timestamp: new Date().toISOString() };
    } catch (err) {
      return { logs: err.stdout || '', error: err.stderr || err.message, timestamp: new Date().toISOString() };
    }
  }

  const boundedTail = Number.isInteger(tail) ? Math.min(Math.max(tail, 1), 1000) : 100;
  const { execFile } = require('child_process');
  return new Promise((resolve) => {
    execFile('docker', ['compose', 'logs', '--tail', String(boundedTail), '--no-color'], {
      cwd: workingDir,
      timeout: 120000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      resolve({ logs: stdout || '', error: stderr || (error ? error.message : ''), timestamp: new Date().toISOString() });
    });
  });
}

async function testApi(projectId, environmentId) {
  const env = await query(
    `SELECT p.name AS project_name, e.name AS environment_name, sp.host_port, e.lxc_ip
       FROM sandbox_ports sp
       JOIN environments e ON e.id = sp.environment_id
       JOIN projects p ON p.id = e.project_id
      WHERE sp.environment_id = $1 AND e.project_id = $2 AND sp.role = $3`,
    [environmentId, projectId, 'web']
  );
  if (!env.rows.length) throw Object.assign(new Error('No web port allocated'), { status: 400, code: 'validation_error' });

  const webPort = env.rows[0].host_port;
  const lxcIp = env.rows[0].lxc_ip;

  const targetHost = lxcIp || 'localhost';
  const targetPort = lxcIp ? 8080 : webPort;

  const http = require('http');

  return new Promise((resolve) => {
    const request = http.get({
      host: targetHost,
      port: targetPort,
      path: '/api/test',
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), port: webPort, host: targetHost });
        } catch {
          resolve({ status: res.statusCode, body: data, port: webPort, host: targetHost });
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('Sandbox API request timed out')));
    request.on('error', (err) => {
      resolve({ status: 0, body: { error: err.message }, port: webPort, host: targetHost });
    });
  });
}

module.exports = { runSandbox, stopSandbox, restartSandbox, getSandboxLogs, testApi, preflightCheck };
