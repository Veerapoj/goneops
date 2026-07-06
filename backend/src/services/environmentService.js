const { query } = require('../lib/db');
const { resolveRuntimeHost } = require('../sandbox/runtimeLocation');

function enrichRuntimeLocation(env, projectName) {
  if (!env) return env;
  const host = resolveRuntimeHost();
  const container = env.name
    ? `${(projectName || 'goneops')}-${env.name}`.replace(/[^a-zA-Z0-9_-]/g, '-')
    : null;
  return {
    ...env,
    runtime_location: {
      provider: 'proxmox',
      host,
      container,
    },
  };
}

async function createEnvironment(projectId, name) {
  const project = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
  if (!project.rows.length) {
    const err = new Error('Project not found');
    err.status = 404;
    err.code = 'not_found';
    throw err;
  }

  const existing = await query(
    'SELECT id FROM environments WHERE project_id = $1 AND name = $2', [projectId, name]
  );
  if (existing.rows.length) {
    const err = new Error('Environment name already exists for this project');
    err.status = 409;
    err.code = 'conflict';
    throw err;
  }

  const result = await query(
    `INSERT INTO environments (project_id, name, status, preview_url, working_dir)
     VALUES ($1, $2, 'stopped', '', '') RETURNING *`,
    [projectId, name]
  );
  return result.rows[0];
}

async function getEnvironment(projectId, envId) {
  const result = await query(
    'SELECT * FROM environments WHERE id = $1 AND project_id = $2', [envId, projectId]
  );
  return result.rows[0] || null;
}

async function updateEnvironmentStatus(envId, status, previewUrl) {
  const fields = [];
  const values = [];
  let idx = 1;

  fields.push(`status = $${idx++}`);
  values.push(status);

  if (previewUrl !== undefined) {
    fields.push(`preview_url = $${idx++}`);
    values.push(previewUrl);
  }

  fields.push(`updated_at = NOW()`);
  values.push(envId);

  const result = await query(
    `UPDATE environments SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
    values
  );
  return result.rows[0];
}

async function updateEnvironmentWorkingDir(envId, workingDir) {
  const result = await query(
    'UPDATE environments SET working_dir = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [workingDir, envId]
  );
  return result.rows[0];
}

async function getEnvironmentServices(envId) {
  const result = await query(
    'SELECT * FROM services WHERE environment_id = $1 ORDER BY id', [envId]
  );
  return result.rows;
}

async function getEnvironmentSecrets(envId) {
  const result = await query(
    `SELECT id, project_id, environment_id, key,
            '••••••••' AS value,
            created_at, updated_at
       FROM secrets
      WHERE environment_id = $1
      ORDER BY key`,
    [envId]
  );
  return result.rows;
}

module.exports = { createEnvironment, getEnvironment, updateEnvironmentStatus, updateEnvironmentWorkingDir, getEnvironmentServices, getEnvironmentSecrets, enrichRuntimeLocation };
