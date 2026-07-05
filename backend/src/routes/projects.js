const express = require('express');
const router = express.Router();
const { listProjects, getProject, createProject } = require('../services/projectService');
const { createEnvironment } = require('../services/environmentService');
const { listPipelineRuns, runPipeline } = require('../services/pipelineService');
const { generateSandbox } = require('../sandbox/generator');
const { runSandbox, stopSandbox, restartSandbox, getSandboxLogs, testApi } = require('../sandbox/runner');
const { query } = require('../lib/db');
const { requireRole, writeAuditLog } = require('../services/proxmoxService');
const { writeAuditLog: audit } = require('../lib/audit');
const fs = require('fs');
const path = require('path');
const ALLOWED_FILES = new Set([
  'README.md',
  'package.json',
  'Dockerfile',
  'docker-compose.yml',
  '.env',
  '.env.example',
  path.join('src', 'index.js'),
]);
const MAX_FILE_SIZE = 256 * 1024;

// GET /api/projects
router.get('/projects', async (req, res, next) => {
  try {
    const includeTest = req.query.include_test === 'true';
    res.json(await listProjects(includeTest));
  } catch (e) { next(e); }
});

// POST /api/projects
router.post('/projects', async (req, res, next) => {
  try {
    const { name, is_test } = req.body;
    if (!name) return res.status(400).json({ error: { code: 'validation_error', message: 'Project name required' } });
    res.status(201).json(await createProject(name, !!is_test));
  } catch (e) { next(e); }
});

// GET /api/projects/:id
router.get('/projects/:id', async (req, res, next) => {
  try {
    const project = await getProject(req.params.id);
    if (!project) return res.status(404).json({ error: { code: 'not_found', message: 'Project not found' } });
    res.json(project);
  } catch (e) { next(e); }
});

// POST /api/projects/:id/environments
router.post('/projects/:id/environments', async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: { code: 'validation_error', message: 'Environment name required' } });
    const env = await createEnvironment(req.params.id, name);
    res.status(201).json(env);
  } catch (e) { next(e); }
});

// POST /api/projects/:id/generate-sandbox
router.post('/projects/:id/generate-sandbox', requireRole('operator'), async (req, res, next) => {
  try {
    const { environment_id } = req.body;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id required' } });

    const maxQuota = parseInt(process.env.SANDBOX_MAX_PER_PROJECT || '5');
    const count = await query(
      `SELECT COUNT(*)::int AS cnt FROM environments
        WHERE project_id = $1 AND lxc_vmid IS NOT NULL AND lxc_status NOT IN ('destroyed','error')`,
      [req.params.id]
    );
    if (count.rows[0].cnt >= maxQuota) {
      return res.status(429).json({ error: { code: 'quota_exceeded', message: `Maximum ${maxQuota} sandboxes per project reached` } });
    }

    const result = await generateSandbox(req.params.id, environment_id);
    res.json(result);
  } catch (e) { next(e); }
});

// POST /api/projects/:id/run
router.post('/projects/:id/run', requireRole('operator'), async (req, res, next) => {
  try {
    const { environment_id } = req.body;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id required' } });
    const result = await runSandbox(req.params.id, environment_id);
    await audit({ actor: req.goneopsActor || 'system', action: 'sandbox_run', resource_type: 'environment', resource_id: environment_id, result: 'success', message: `Sandbox run for project ${req.params.id} env ${environment_id}` });
    res.status(202).json(result);
  } catch (e) {
    await audit({ actor: req.goneopsActor || 'system', action: 'sandbox_run', resource_type: 'environment', resource_id: req.body?.environment_id, result: 'failure', message: e.message }).catch(() => {});
    next(e);
  }
});

// POST /api/projects/:id/stop
router.post('/projects/:id/stop', requireRole('operator'), async (req, res, next) => {
  try {
    const { environment_id } = req.body;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id required' } });
    const result = await stopSandbox(req.params.id, environment_id);
    await audit({ actor: req.goneopsActor || 'system', action: 'sandbox_stop', resource_type: 'environment', resource_id: environment_id, result: 'success', message: `Sandbox stop for project ${req.params.id} env ${environment_id}` });
    res.status(202).json(result);
  } catch (e) {
    await audit({ actor: req.goneopsActor || 'system', action: 'sandbox_stop', resource_type: 'environment', resource_id: req.body?.environment_id, result: 'failure', message: e.message }).catch(() => {});
    next(e);
  }
});

// POST /api/projects/:id/restart
router.post('/projects/:id/restart', requireRole('operator'), async (req, res, next) => {
  try {
    const { environment_id } = req.body;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id required' } });
    const result = await restartSandbox(req.params.id, environment_id);
    await audit({ actor: req.goneopsActor || 'system', action: 'sandbox_restart', resource_type: 'environment', resource_id: environment_id, result: 'success', message: `Sandbox restart for project ${req.params.id} env ${environment_id}` });
    res.status(202).json(result);
  } catch (e) {
    await audit({ actor: req.goneopsActor || 'system', action: 'sandbox_restart', resource_type: 'environment', resource_id: req.body?.environment_id, result: 'failure', message: e.message }).catch(() => {});
    next(e);
  }
});

// POST /api/projects/:id/test-api
router.post('/projects/:id/test-api', async (req, res, next) => {
  try {
    const { environment_id } = req.body;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id required' } });
    res.json(await testApi(req.params.id, environment_id));
  } catch (e) { next(e); }
});

// GET /api/projects/:id/files
router.get('/projects/:id/files', async (req, res, next) => {
  try {
    const { environment_id } = req.query;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id query param required' } });
    const env = await query(
      'SELECT working_dir FROM environments WHERE id = $1 AND project_id = $2',
      [environment_id, req.params.id]
    );
    if (!env.rows.length || !env.rows[0].working_dir) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Environment or working directory not found' } });
    }
    const workingDir = env.rows[0].working_dir;
    const files = listFilesRecursive(workingDir, workingDir);
    res.json({ files, working_dir: workingDir });
  } catch (e) { next(e); }
});

// GET /api/projects/:id/files/content
router.get('/projects/:id/files/content', async (req, res, next) => {
  try {
    const { environment_id, file_path } = req.query;
    if (!environment_id || !file_path) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id and file_path required' } });
    const env = await query(
      'SELECT working_dir FROM environments WHERE id = $1 AND project_id = $2',
      [environment_id, req.params.id]
    );
    if (!env.rows.length || !env.rows[0].working_dir) {
      return res.status(404).json({ error: { code: 'not_found', message: 'Environment or working directory not found' } });
    }
    const workingDir = env.rows[0].working_dir;
    const resolvedWorking = fs.realpathSync(workingDir);
    const normalizedPath = path.normalize(file_path);
    if (!ALLOWED_FILES.has(normalizedPath)) {
      return res.status(403).json({ error: { code: 'path_forbidden', message: 'File is not in the generated-file allowlist' } });
    }
    const requestedPath = path.resolve(workingDir, file_path);

    let resolvedRequested;
    try {
      resolvedRequested = fs.realpathSync(requestedPath);
    } catch {
      return res.status(404).json({ error: { code: 'not_found', message: 'File not found' } });
    }

    if (!resolvedRequested.startsWith(resolvedWorking + path.sep) && resolvedRequested !== resolvedWorking) {
      return res.status(403).json({ error: { code: 'path_forbidden', message: 'Path traversal denied' } });
    }
    const stat = fs.statSync(resolvedRequested);
    if (stat.isDirectory()) {
      return res.status(400).json({ error: { code: 'validation_error', message: 'Path is a directory' } });
    }
    if (stat.size > MAX_FILE_SIZE) {
      return res.status(413).json({ error: { code: 'validation_error', message: 'File exceeds the 256 KiB read limit' } });
    }
    const content = fs.readFileSync(resolvedRequested, 'utf-8');
    res.json({ file_path, content, size: content.length });
  } catch (e) { next(e); }
});

// GET /api/projects/:id/logs
router.get('/projects/:id/logs', async (req, res, next) => {
  try {
    const { environment_id, tail } = req.query;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id query param required' } });
    res.json(await getSandboxLogs(req.params.id, environment_id, parseInt(tail) || 100));
  } catch (e) { next(e); }
});

// GET /api/projects/:id/pipelines
router.get('/projects/:id/pipelines', async (req, res, next) => {
  try {
    const { environment_id } = req.query;
    res.json(await listPipelineRuns(req.params.id, environment_id || null));
  } catch (e) { next(e); }
});

// POST /api/projects/:id/pipelines/run
router.post('/projects/:id/pipelines/run', async (req, res, next) => {
  try {
    const { environment_id } = req.body;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id required' } });
    const result = await runPipeline(req.params.id, environment_id);
    res.status(202).json(result);
  } catch (e) { next(e); }
});

// POST /api/projects/:id/services
router.post('/projects/:id/services', async (req, res, next) => {
  try {
    const { environment_id, name, type, port, config } = req.body;
    if (!environment_id || !name || !type) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id, name, and type required' } });
    const env = await query(
      'SELECT id FROM environments WHERE id = $1 AND project_id = $2',
      [environment_id, req.params.id]
    );
    if (!env.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Environment not found' } });
    const result = await query(
      `INSERT INTO services (environment_id, name, type, status, port, config)
       VALUES ($1, $2, $3, 'healthy', $4, $5)
       RETURNING *`,
      [environment_id, name, type, port || 0, JSON.stringify(config || {})]
    );
    await audit({ actor: req.goneopsActor || 'system', action: 'service_create', resource_type: 'service', resource_id: result.rows[0].id, result: 'success', message: `Service ${name} created in env ${environment_id}` });
    res.status(201).json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: { code: 'duplicate', message: `Service "${req.body.name}" already exists in this environment` } });
    next(e);
  }
});

// GET /api/projects/:id/services
router.get('/projects/:id/services', async (req, res, next) => {
  try {
    const { environment_id } = req.query;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id query param required' } });
    const env = await query(
      'SELECT id FROM environments WHERE id = $1 AND project_id = $2',
      [environment_id, req.params.id]
    );
    if (!env.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Environment not found' } });
    const { getEnvironmentServices } = require('../services/environmentService');
    res.json(await getEnvironmentServices(environment_id));
  } catch (e) { next(e); }
});

// GET /api/projects/:id/databases
router.get('/projects/:id/databases', async (req, res, next) => {
  try {
    const { environment_id } = req.query;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id query param required' } });
    const env = await query(
      'SELECT * FROM environments WHERE id = $1 AND project_id = $2',
      [environment_id, req.params.id]
    );
    if (!env.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Environment not found' } });
    const services = await query(
      "SELECT * FROM services WHERE environment_id = $1 AND type = 'database' ORDER BY id",
      [environment_id]
    );
    const secrets = await query(
      'SELECT * FROM secrets WHERE environment_id = $1 ORDER BY key',
      [environment_id]
    );
    const ports = await query(
      "SELECT * FROM sandbox_ports WHERE environment_id = $1 AND role = 'db'",
      [environment_id]
    );
    const dbPort = ports.rows.length ? ports.rows[0].host_port : null;
    const databaseUrl = secrets.rows.find((secret) => secret.key === 'DATABASE_URL')?.value || null;
    const maskedDatabaseUrl = databaseUrl
      ? databaseUrl.replace(/(postgres(?:ql)?:\/\/[^:]+:)[^@]+(@)/, '$1••••••••$2')
      : null;
    res.json({
      databases: services.rows.map((service) => ({
        ...service,
        host: 'localhost',
        port: dbPort || service.port,
        database: service.config?.database,
        username: service.config?.username,
        password: '••••••••',
        connection_string_masked: maskedDatabaseUrl,
      })),
      secrets: secrets.rows.map(({ key, updated_at }) => ({ key, updated_at })),
      db_port: dbPort,
      environment: env.rows[0],
    });
  } catch (e) { next(e); }
});

// GET /api/projects/:id/deployments
router.get('/projects/:id/deployments', async (req, res, next) => {
  try {
    const { environment_id } = req.query;
    let rows;
    if (environment_id) {
      rows = await query(
        'SELECT * FROM deployments WHERE project_id = $1 AND environment_id = $2 ORDER BY created_at DESC',
        [req.params.id, environment_id]
      );
    } else {
      rows = await query(
        'SELECT * FROM deployments WHERE project_id = $1 ORDER BY created_at DESC',
        [req.params.id]
      );
    }
    res.json({ deployments: rows.rows });
  } catch (e) { next(e); }
});

// GET /api/projects/:id/secrets
router.get('/projects/:id/secrets', async (req, res, next) => {
  try {
    const { environment_id } = req.query;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id query param required' } });
    const env = await query(
      'SELECT id FROM environments WHERE id = $1 AND project_id = $2',
      [environment_id, req.params.id]
    );
    if (!env.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Environment not found' } });
    const { getEnvironmentSecrets } = require('../services/environmentService');
    res.json(await getEnvironmentSecrets(environment_id));
  } catch (e) { next(e); }
});

// POST /api/projects/:id/secrets
router.post('/projects/:id/secrets', async (req, res, next) => {
  try {
    const { environment_id, key, value } = req.body;
    if (!environment_id || !key || value === undefined) {
      return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id, key, and value required' } });
    }
    const env = await query(
      'SELECT id FROM environments WHERE id = $1 AND project_id = $2',
      [environment_id, req.params.id]
    );
    if (!env.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Environment not found' } });
    const result = await query(
      `INSERT INTO secrets (project_id, environment_id, key, value)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (environment_id, key) DO UPDATE SET value = $4, updated_at = NOW()
       RETURNING *`,
      [req.params.id, environment_id, key, value]
    );
    const { value: _value, ...secret } = result.rows[0];
    await audit({ actor: req.goneopsActor || 'system', action: 'secret_create', resource_type: 'secret', resource_id: result.rows[0].id, result: 'success', message: `Secret ${key} created for env ${environment_id}` });
    res.status(201).json({ ...secret, value: '••••••••' });
  } catch (e) { next(e); }
});

// DELETE /api/projects/:id/secrets/:key
router.delete('/projects/:id/secrets/:key', async (req, res, next) => {
  try {
    const { environment_id } = req.query;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id query param required' } });
    const result = await query(
      `DELETE FROM secrets s
        USING environments e
        WHERE s.environment_id = e.id
          AND s.environment_id = $1
          AND e.project_id = $2
          AND s.key = $3
      RETURNING s.id`,
      [environment_id, req.params.id, req.params.key]
    );
    if (!result.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Secret not found' } });
    await audit({ actor: req.goneopsActor || 'system', action: 'secret_delete', resource_type: 'secret', resource_id: result.rows[0].id, result: 'success', message: `Secret ${req.params.key} deleted from env ${environment_id}` });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

// GET /api/projects/:id/stale-sandboxes
router.get('/projects/:id/stale-sandboxes', requireRole('admin'), async (req, res, next) => {
  try {
    const ttlHours = parseInt(process.env.SANDBOX_TTL_HOURS || '48');
    const stale = await query(
      `SELECT e.* FROM environments e
        WHERE e.project_id = $1
          AND e.lxc_vmid IS NOT NULL
          AND e.lxc_status NOT IN ('destroyed', 'error')
          AND e.updated_at < NOW() - INTERVAL '1 hour' * $2
        ORDER BY e.updated_at`,
      [req.params.id, ttlHours]
    );
    res.json({ stale: stale.rows, ttl_hours: ttlHours, count: stale.rows.length });
  } catch (e) { next(e); }
});

// POST /api/projects/:id/cleanup-stale
router.post('/projects/:id/cleanup-stale', requireRole('admin'), async (req, res, next) => {
  try {
    const ttlHours = parseInt(process.env.SANDBOX_TTL_HOURS || '48');
    const stale = await query(
      `SELECT e.* FROM environments e
        WHERE e.project_id = $1
          AND e.lxc_vmid IS NOT NULL
          AND e.lxc_status NOT IN ('destroyed', 'error')
          AND e.updated_at < NOW() - INTERVAL '1 hour' * $2`,
      [req.params.id, ttlHours]
    );

    const results = [];
    for (const env of stale.rows) {
      try {
        if (env.lxc_provider_id) {
          const proxmoxService = require('../services/proxmoxService');
          await proxmoxService.deleteInstance(env.lxc_provider_id, env.lxc_vmid, req.goneopsActor || 'system');
        }
        await query(
          "UPDATE environments SET lxc_status = 'destroyed', updated_at = NOW() WHERE id = $1",
          [env.id]
        );
        await writeAuditLog({
          actor: req.goneopsActor || 'system',
          action: 'sandbox_cleanup',
          resource_type: 'lxc',
          resource_id: env.lxc_vmid,
          provider_id: env.lxc_provider_id,
          result: 'success',
          message: `Stale sandbox env ${env.id} (LXC vmid ${env.lxc_vmid}) cleaned up`,
          metadata: { environment_id: env.id, vmid: env.lxc_vmid, project_id: req.params.id },
        });
        results.push({ environment_id: env.id, vmid: env.lxc_vmid, status: 'destroyed' });
      } catch (err) {
        results.push({ environment_id: env.id, vmid: env.lxc_vmid, status: 'error', error: err.message });
      }
    }

    res.json({ cleaned: results.length, results });
  } catch (e) { next(e); }
});

// PUT /api/projects/:id/services/:serviceId
router.put('/projects/:id/services/:serviceId', async (req, res, next) => {
  try {
    const { environment_id, name, type, port, config } = req.body;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id required' } });
    const env = await query(
      'SELECT id FROM environments WHERE id = $1 AND project_id = $2',
      [environment_id, req.params.id]
    );
    if (!env.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Environment not found' } });
    const existing = await query(
      'SELECT * FROM services WHERE id = $1 AND environment_id = $2',
      [req.params.serviceId, environment_id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Service not found' } });
    const updates = [];
    const values = [];
    let idx = 1;
    if (name !== undefined) { updates.push(`name = $${idx++}`); values.push(name); }
    if (type !== undefined) { updates.push(`type = $${idx++}`); values.push(type); }
    if (port !== undefined) { updates.push(`port = $${idx++}`); values.push(port); }
    if (config !== undefined) { updates.push(`config = $${idx++}`); values.push(JSON.stringify(config)); }
    updates.push(`updated_at = NOW()`);
    values.push(req.params.serviceId);
    const result = await query(
      `UPDATE services SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    );
    await audit({ actor: req.goneopsActor || 'system', action: 'service_update', resource_type: 'service', resource_id: result.rows[0].id, result: 'success', message: `Service ${result.rows[0].name} updated in env ${environment_id}` });
    res.json(result.rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: { code: 'duplicate', message: 'Service name conflict' } });
    next(e);
  }
});

// DELETE /api/projects/:id/services/:serviceId
router.delete('/projects/:id/services/:serviceId', async (req, res, next) => {
  try {
    const { environment_id } = req.query;
    if (!environment_id) return res.status(400).json({ error: { code: 'validation_error', message: 'environment_id query param required' } });
    const existing = await query(
      'SELECT s.* FROM services s JOIN environments e ON s.environment_id = e.id WHERE s.id = $1 AND e.project_id = $2 AND s.environment_id = $3',
      [req.params.serviceId, req.params.id, environment_id]
    );
    if (!existing.rows.length) return res.status(404).json({ error: { code: 'not_found', message: 'Service not found' } });
    await query('DELETE FROM services WHERE id = $1', [req.params.serviceId]);
    await audit({ actor: req.goneopsActor || 'system', action: 'service_delete', resource_type: 'service', resource_id: req.params.serviceId, result: 'success', message: `Service ${existing.rows[0].name} deleted from env ${environment_id}` });
    res.json({ deleted: true });
  } catch (e) { next(e); }
});

// GET /api/projects/:id/runtime
router.get('/projects/:id/runtime', async (req, res, next) => {
  try {
    const runtime = await query(`
      SELECT
        s.id AS service_id,
        s.name AS service_name,
        s.type AS service_type,
        s.status AS service_status,
        e.id AS environment_id,
        e.name AS environment_name,
        pr.name AS provider_name,
        pr.type AS provider_type,
        h.hostname AS host,
        COALESCE(v.name, c.name) AS vm_name,
        v.vmid AS vm_vmid,
        v.ip_address AS vm_ip,
        v.status AS vm_status,
        c.name AS container_name,
        c.container_id,
        c.status AS container_status
      FROM services s
      JOIN environments e ON e.id = s.environment_id
      LEFT JOIN containers c ON c.environment_id = e.id AND c.data_source = 'discovered'
      LEFT JOIN providers pr ON (c.provider_id = pr.id OR e.lxc_provider_id = pr.id) AND pr.data_source = 'discovered'
      LEFT JOIN hosts h ON (c.host_id = h.id OR h.provider_id = pr.id) AND h.data_source = 'discovered'
      LEFT JOIN vms v ON v.provider_id = pr.id AND (e.lxc_vmid IS NOT NULL AND v.vmid = e.lxc_vmid::text) AND v.data_source = 'discovered'
      WHERE e.project_id = $1
      ORDER BY s.id
    `, [req.params.id]);
    res.json({ services: runtime.rows });
  } catch (e) { next(e); }
});

function listFilesRecursive(currentDir, baseDir) {
  const files = [];
  try {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relative = path.relative(baseDir, fullPath);
      if (entry.isDirectory()) {
        const children = listFilesRecursive(fullPath, baseDir);
        if (children.length) {
          files.push({ name: entry.name, path: relative, type: 'directory', children });
        }
      } else {
        if (!ALLOWED_FILES.has(relative)) continue;
        const stat = fs.statSync(fullPath);
        files.push({ name: entry.name, path: relative, type: 'file', size: stat.size, modified: stat.mtime });
      }
    }
  } catch (e) { /* ignore unreadable dirs */ }
  return files.sort((a, b) => a.type === b.type ? a.name.localeCompare(b.name) : a.type === 'directory' ? -1 : 1);
}

module.exports = router;
