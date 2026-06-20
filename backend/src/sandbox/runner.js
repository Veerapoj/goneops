const { execFile } = require('child_process');
const { query } = require('../lib/db');
const { updateEnvironmentStatus } = require('../services/environmentService');

const MAX_OUTPUT_BYTES = 1024 * 1024;

function execCommand(file, args, cwd) {
  return new Promise((resolve, reject) => {
    execFile(file, args, {
      cwd,
      timeout: 120000,
      maxBuffer: MAX_OUTPUT_BYTES,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function preflightCheck() {
  const result = await execCommand('docker', ['info'], '/');
  if (result.error) {
    return { available: false, error: result.stderr || result.error.message };
  }
  return { available: true };
}

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

  const workingDir = env.rows[0].working_dir;
  if (!workingDir) throw Object.assign(new Error('No sandbox generated. Run generate-sandbox first.'), { status: 400, code: 'validation_error' });

  const check = await preflightCheck();
  if (!check.available) {
    throw Object.assign(new Error('Docker daemon is unavailable'), { status: 503, code: 'docker_unavailable', details: { docker_error: check.error } });
  }

  await claimTransitionalState(environmentId, projectId, 'starting', ['stopped', 'failed']);

  setImmediate(async () => {
    try {
      const result = await execCommand('docker', ['compose', 'up', '-d', '--wait'], workingDir);
      if (result.error) {
        await updateEnvironmentStatus(environmentId, 'failed', null);
        console.error(`[runner] up failed: ${result.stderr}`);
      } else {
        const ports = await query(
          'SELECT host_port FROM sandbox_ports WHERE environment_id = $1 AND role = $2',
          [environmentId, 'web']
        );
        const previewUrl = ports.rows.length ? `http://localhost:${ports.rows[0].host_port}` : '';
        await updateEnvironmentStatus(environmentId, 'running', previewUrl);
        await query(
          "UPDATE services SET status = 'healthy' WHERE environment_id = $1",
          [environmentId]
        );
      }
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

  const workingDir = env.rows[0].working_dir;
  if (!workingDir) throw Object.assign(new Error('No sandbox directory found'), { status: 400, code: 'validation_error' });

  const check = await preflightCheck();
  if (!check.available) {
    throw Object.assign(new Error('Docker daemon is unavailable'), { status: 503, code: 'docker_unavailable', details: { docker_error: check.error } });
  }

  await claimTransitionalState(environmentId, projectId, 'stopping', ['running', 'failed']);
  setImmediate(async () => {
    const result = await execCommand('docker', ['compose', 'down'], workingDir);
    if (result.error) {
      await updateEnvironmentStatus(environmentId, 'failed', null);
      console.error(`[runner] down failed: ${result.stderr}`);
      return;
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

  const workingDir = env.rows[0].working_dir;
  if (!workingDir) throw Object.assign(new Error('No sandbox directory found'), { status: 400, code: 'validation_error' });

  const check = await preflightCheck();
  if (!check.available) {
    throw Object.assign(new Error('Docker daemon is unavailable'), { status: 503, code: 'docker_unavailable', details: { docker_error: check.error } });
  }

  await claimTransitionalState(environmentId, projectId, 'restarting', ['running', 'failed']);

  setImmediate(async () => {
    try {
      await execCommand('docker', ['compose', 'down'], workingDir);
      const result = await execCommand('docker', ['compose', 'up', '-d', '--wait'], workingDir);
      if (result.error) {
        await updateEnvironmentStatus(environmentId, 'failed', null);
      } else {
        const ports = await query(
          'SELECT host_port FROM sandbox_ports WHERE environment_id = $1 AND role = $2',
          [environmentId, 'web']
        );
        const previewUrl = ports.rows.length ? `http://localhost:${ports.rows[0].host_port}` : '';
        await updateEnvironmentStatus(environmentId, 'running', previewUrl);
        await query(
          "UPDATE services SET status = 'healthy' WHERE environment_id = $1",
          [environmentId]
        );
      }
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

  const workingDir = env.rows[0].working_dir;
  if (!workingDir) throw Object.assign(new Error('No sandbox directory found'), { status: 400, code: 'validation_error' });

  const boundedTail = Number.isInteger(tail) ? Math.min(Math.max(tail, 1), 1000) : 100;
  const result = await execCommand(
    'docker',
    ['compose', 'logs', '--tail', String(boundedTail), '--no-color'],
    workingDir
  );
  return { logs: result.stdout, error: result.stderr, timestamp: new Date().toISOString() };
}

async function testApi(projectId, environmentId) {
  const target = await query(
    `SELECT p.name AS project_name, e.name AS environment_name, sp.host_port
       FROM sandbox_ports sp
       JOIN environments e ON e.id = sp.environment_id
       JOIN projects p ON p.id = e.project_id
      WHERE sp.environment_id = $1 AND e.project_id = $2 AND sp.role = $3`,
    [environmentId, projectId, 'web']
  );
  if (!target.rows.length) throw Object.assign(new Error('No web port allocated'), { status: 400, code: 'validation_error' });

  const webPort = target.rows[0].host_port;
  const safeProject = target.rows[0].project_name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeEnvironment = target.rows[0].environment_name.replace(/[^a-zA-Z0-9_-]/g, '_');
  const sandboxHost = `${safeProject}_${safeEnvironment}_web`;
  const http = require('http');

  return new Promise((resolve) => {
    const request = http.get({
      host: sandboxHost,
      port: 8080,
      path: '/api/test',
      timeout: 10000,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), port: webPort });
        } catch {
          resolve({ status: res.statusCode, body: data, port: webPort });
        }
      });
    });
    request.on('timeout', () => request.destroy(new Error('Sandbox API request timed out')));
    request.on('error', (err) => {
      resolve({ status: 0, body: { error: err.message }, port: webPort });
    });
  });
}

module.exports = { runSandbox, stopSandbox, restartSandbox, getSandboxLogs, testApi, preflightCheck };
