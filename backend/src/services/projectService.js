const { query } = require('../lib/db');
const { enrichRuntimeLocation } = require('./environmentService');

async function listProjects(includeTest = false) {
  const whereClause = includeTest ? '' : 'WHERE (p.is_test IS NULL OR p.is_test = false)';
  const result = await query(`
    SELECT p.*,
      json_agg(json_build_object(
        'id', e.id, 'name', e.name, 'status', e.status,
        'preview_url', e.preview_url, 'working_dir', e.working_dir,
        'lxc_vmid', e.lxc_vmid, 'lxc_ip', e.lxc_ip, 'lxc_status', e.lxc_status,
        'created_at', e.created_at, 'updated_at', e.updated_at
      ) ORDER BY e.name) FILTER (WHERE e.id IS NOT NULL) AS environments
    FROM projects p
    LEFT JOIN environments e ON e.project_id = p.id
    ${whereClause}
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);
  return result.rows.map(project => ({
    ...project,
    environments: (project.environments || []).map(env =>
      enrichRuntimeLocation(env, project.name)
    ),
  }));
}

async function getProject(id) {
  const project = await query('SELECT * FROM projects WHERE id = $1', [id]);
  if (!project.rows.length) return null;

  const p = project.rows[0];
  const envs = await query('SELECT * FROM environments WHERE project_id = $1 ORDER BY name', [id]);
  const services = await query(
    'SELECT s.* FROM services s JOIN environments e ON s.environment_id = e.id WHERE e.project_id = $1 ORDER BY s.name', [id]
  );
  const latestDeployment = await query(
    'SELECT * FROM deployments WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1', [id]
  );
  const lastPipeline = await query(
    'SELECT * FROM pipeline_runs WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1', [id]
  );

  return {
    ...p,
    environments: envs.rows.map(env => enrichRuntimeLocation(env, p.name)),
    services: services.rows,
    latest_deployment: latestDeployment.rows[0] || null,
    last_pipeline: lastPipeline.rows[0] || null,
  };
}

async function createProject(name, isTest = false) {
  const existing = await query('SELECT id FROM projects WHERE name = $1', [name]);
  if (existing.rows.length) {
    const err = new Error('Project name already exists');
    err.status = 409;
    err.code = 'conflict';
    throw err;
  }
  const result = await query(
    'INSERT INTO projects (name, is_test, data_source) VALUES ($1, $2, $3) RETURNING *',
    [name, isTest, isTest ? 'sandbox' : 'seed']
  );
  return result.rows[0];
}

module.exports = { listProjects, getProject, createProject };
