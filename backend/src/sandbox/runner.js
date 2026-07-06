const { preflightCheck, dockerRun, dockerRm, dockerStop, dockerExec } = require('./remoteExec');
const { query } = require('../lib/db');
const { updateEnvironmentStatus } = require('../services/environmentService');

const { buildPreviewUrl, resolveRuntimeHost } = require("./runtimeLocation");

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

async function runSandbox(projectId, environmentId) {
  const env = await query(
    'SELECT * FROM environments WHERE id = $1 AND project_id = $2',
    [environmentId, projectId]
  );
  if (!env.rows.length) throw Object.assign(new Error('Environment not found'), { status: 404, code: 'not_found' });

  const check = await preflightCheck();
  if (!check.available) {
    throw Object.assign(new Error('Proxmox LXC provider unreachable'), { status: 503, code: 'proxmox_unavailable', details: { error: check.error } });
  }

  const project = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
  const projectName = project.rows[0]?.name || `project-${projectId}`;

  await claimTransitionalState(environmentId, projectId, 'starting', ['stopped', 'failed']);

  setImmediate(async () => {
    try {
      const services = await query(
        `SELECT s.* FROM services s WHERE s.environment_id = $1 ORDER BY s.id`,
        [environmentId]
      );

      let deployedCount = 0;

      for (const svc of services.rows) {
        const containerName = `${projectName}-${svc.name}`.replace(/[^a-zA-Z0-9_-]/g, '-');
        const image = svc.config?.image || 'nginx:alpine';
        const port = svc.port || 80;
        const hostPort = 10000 + svc.id;

        try {
          await dockerRm(containerName).catch(() => {});
          const result = await dockerRun(image, containerName, {
            'goneops.project': projectName,
            'goneops.env': env.rows[0].name,
            'goneops.service': svc.name,
          }, [`${hostPort}:${port}`]);
          deployedCount++;
          console.log(`[runner] deployed ${containerName} on PVE host, container=${result.trim().slice(0, 12)}`);
        } catch (svcErr) {
          console.error(`[runner] deploy failed for ${svc.name}: ${svcErr.message}`);
        }
      }

      await query("UPDATE services SET status = 'healthy' WHERE environment_id = $1", [environmentId]);
      const port = 10000 + (services.rows[0]?.id || 0);
      const previewUrl = buildPreviewUrl(port);
      await updateEnvironmentStatus(environmentId, 'running', previewUrl);
    } catch (err) {
      await updateEnvironmentStatus(environmentId, 'failed', null);
      console.error(`[runner] async start error: ${err.message}`);
    }
  });

  return { environment_id: environmentId, status: 'starting', message: 'Deploying services to Proxmox host' };
}

async function stopSandbox(projectId, environmentId) {
  const env = await query(
    'SELECT * FROM environments WHERE id = $1 AND project_id = $2',
    [environmentId, projectId]
  );
  if (!env.rows.length) throw Object.assign(new Error('Environment not found'), { status: 404, code: 'not_found' });

  const check = await preflightCheck();
  if (!check.available) {
    throw Object.assign(new Error('Proxmox LXC provider unreachable'), { status: 503, code: 'proxmox_unavailable', details: { error: check.error } });
  }

  const project = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
  const projectName = project.rows[0]?.name || `project-${projectId}`;

  await claimTransitionalState(environmentId, projectId, 'stopping', ['running', 'failed', 'starting']);
  setImmediate(async () => {
    try {
      const services = await query(
        `SELECT s.* FROM services s WHERE s.environment_id = $1 ORDER BY s.id`,
        [environmentId]
      );
      for (const svc of services.rows) {
        const containerName = `${projectName}-${svc.name}`.replace(/[^a-zA-Z0-9_-]/g, '-');
        try {
          await dockerStop(containerName).catch(() => {});
          await dockerRm(containerName).catch(() => {});
        } catch (_) {}
      }
    } catch (err) {
      console.error(`[runner] stop failed: ${err.message}`);
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

  const check = await preflightCheck();
  if (!check.available) {
    throw Object.assign(new Error('Proxmox LXC provider unreachable'), { status: 503, code: 'proxmox_unavailable', details: { error: check.error } });
  }

  const project = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
  const projectName = project.rows[0]?.name || `project-${projectId}`;

  await claimTransitionalState(environmentId, projectId, 'restarting', ['running', 'failed']);

  setImmediate(async () => {
    try {
      const services = await query(
        `SELECT s.* FROM services s WHERE s.environment_id = $1 ORDER BY s.id`,
        [environmentId]
      );

      let deployedCount = 0;

      for (const svc of services.rows) {
        const containerName = `${projectName}-${svc.name}`.replace(/[^a-zA-Z0-9_-]/g, '-');
        const image = svc.config?.image || 'nginx:alpine';
        const port = svc.port || 80;
        const hostPort = 10000 + svc.id;

        try {
          await dockerStop(containerName).catch(() => {});
          await dockerRm(containerName).catch(() => {});
          const result = await dockerRun(image, containerName, {
            'goneops.project': projectName,
            'goneops.env': env.rows[0].name,
            'goneops.service': svc.name,
          }, [`${hostPort}:${port}`]);
          deployedCount++;
          console.log(`[runner] restarted ${containerName} on PVE host, container=${result.trim().slice(0, 12)}`);
        } catch (svcErr) {
          console.error(`[runner] restart failed for ${svc.name}: ${svcErr.message}`);
        }
      }

      await query("UPDATE services SET status = 'healthy' WHERE environment_id = $1", [environmentId]);
      const port = 10000 + (services.rows[0]?.id || 0);
      const previewUrl = buildPreviewUrl(port);
      await updateEnvironmentStatus(environmentId, 'running', previewUrl);
    } catch (err) {
      await updateEnvironmentStatus(environmentId, 'failed', null);
      console.error(`[runner] async restart error: ${err.message}`);
    }
  });

  return { environment_id: environmentId, status: 'restarting', message: 'Sandbox restart initiated on Proxmox host' };
}

async function getSandboxLogs(projectId, environmentId, tail = 100) {
  const env = await query(
    'SELECT * FROM environments WHERE id = $1 AND project_id = $2',
    [environmentId, projectId]
  );
  if (!env.rows.length) throw Object.assign(new Error('Environment not found'), { status: 404, code: 'not_found' });

  const project = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
  const projectName = project.rows[0]?.name || `project-${projectId}`;

  const services = await query(
    'SELECT name FROM services WHERE environment_id = $1 ORDER BY id',
    [environmentId]
  );

  if (!services.rows.length) {
    return { logs: '', error: 'No services found for this environment', timestamp: new Date().toISOString() };
  }

  const boundedTail = Number.isInteger(tail) ? Math.min(Math.max(tail, 1), 1000) : 100;
  let allLogs = '';

  try {
    for (const svc of services.rows) {
      const containerName = `${projectName}-${svc.name}`.replace(/[^a-zA-Z0-9_-]/g, '-');
      try {
        const logOutput = await dockerExec(`logs --tail ${boundedTail} ${containerName}`);
        allLogs += `\n=== ${containerName} ===\n${logOutput}`;
      } catch (e) {
        allLogs += `\n=== ${containerName} ===\n[error] ${e.stderr || e.message}`;
      }
    }
    return { logs: allLogs.trim() || '(no output)', error: '', timestamp: new Date().toISOString() };
  } catch (err) {
    return { logs: allLogs || '', error: err.stderr || err.message, timestamp: new Date().toISOString() };
  }
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

  const targetHost = lxcIp || resolveRuntimeHost();
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
