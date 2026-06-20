const { query } = require('../lib/db');

async function listProjects() {
  const result = await query(`
    SELECT p.*,
      json_agg(json_build_object(
        'id', e.id, 'name', e.name, 'status', e.status,
        'preview_url', e.preview_url, 'working_dir', e.working_dir
      ) ORDER BY e.name) FILTER (WHERE e.id IS NOT NULL) AS environments
    FROM projects p
    LEFT JOIN environments e ON e.project_id = p.id
    GROUP BY p.id
    ORDER BY p.created_at DESC
  `);
  return result.rows;
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
    environments: envs.rows,
    services: services.rows,
    latest_deployment: latestDeployment.rows[0] || null,
    last_pipeline: lastPipeline.rows[0] || null,
  };
}

async function createProject(name) {
  const existing = await query('SELECT id FROM projects WHERE name = $1', [name]);
  if (existing.rows.length) {
    const err = new Error('Project name already exists');
    err.status = 409;
    err.code = 'conflict';
    throw err;
  }
  const result = await query(
    'INSERT INTO projects (name) VALUES ($1) RETURNING *', [name]
  );
  return result.rows[0];
}

module.exports = { listProjects, getProject, createProject };
