const { query } = require('../lib/db');

const STEPS = ['Checkout', 'Install', 'Lint & Test', 'Build', 'Deploy', 'Smoke Test'];
const STEP_DURATIONS = [1200, 3400, 5200, 2800, 1900, 800];

async function listPipelineRuns(projectId, environmentId) {
  let runs;
  if (environmentId) {
    runs = await query(
      'SELECT * FROM pipeline_runs WHERE project_id = $1 AND environment_id = $2 ORDER BY created_at DESC LIMIT 20',
      [projectId, environmentId]
    );
  } else {
    runs = await query(
      'SELECT * FROM pipeline_runs WHERE project_id = $1 ORDER BY created_at DESC LIMIT 20', [projectId]
    );
  }
  const result = [];
  for (const run of runs.rows) {
    const steps = await query(
      'SELECT * FROM pipeline_steps WHERE pipeline_run_id = $1 ORDER BY step_order', [run.id]
    );
    result.push({ ...run, steps: steps.rows });
  }
  return result;
}

async function getPipelineRun(runId) {
  const run = await query('SELECT * FROM pipeline_runs WHERE id = $1', [runId]);
  if (!run.rows.length) return null;
  const steps = await query(
    'SELECT * FROM pipeline_steps WHERE pipeline_run_id = $1 ORDER BY step_order', [runId]
  );
  return { ...run.rows[0], steps: steps.rows };
}

async function runPipeline(projectId, environmentId) {
  const environment = await query(
    'SELECT id FROM environments WHERE id = $1 AND project_id = $2',
    [environmentId, projectId]
  );
  if (!environment.rows.length) {
    const err = new Error('Environment not found');
    err.status = 404;
    err.code = 'not_found';
    throw err;
  }

  const existing = await query(
    `SELECT id FROM pipeline_runs
     WHERE environment_id = $1 AND status IN ('pending','running')
     LIMIT 1`,
    [environmentId]
  );
  if (existing.rows.length) {
    const err = new Error('An active pipeline run exists for this environment');
    err.status = 409;
    err.code = 'conflict';
    throw err;
  }

  const run = await query(
    `INSERT INTO pipeline_runs (project_id, environment_id, status)
     VALUES ($1, $2, 'running') RETURNING *`,
    [projectId, environmentId]
  );
  const runId = run.rows[0].id;

  for (let i = 0; i < STEPS.length; i++) {
    await query(
      `INSERT INTO pipeline_steps (pipeline_run_id, name, status, step_order)
       VALUES ($1, $2, 'pending', $3)`,
      [runId, STEPS[i], i + 1]
    );
  }

  executePipelineAsync(runId).catch(err => {
    console.error(`[pipeline] async execution failed for run ${runId}:`, err.message);
  });

  return { ...run.rows[0], status_url: `/api/projects/${projectId}/pipelines` };
}

async function executePipelineAsync(runId) {
  const steps = await query(
    'SELECT * FROM pipeline_steps WHERE pipeline_run_id = $1 ORDER BY step_order', [runId]
  );

  for (let i = 0; i < steps.rows.length; i++) {
    const step = steps.rows[i];
    await query(
      "UPDATE pipeline_steps SET status = 'running', updated_at = NOW() WHERE id = $1", [step.id]
    );

    const duration = STEP_DURATIONS[i] + Math.floor(Math.random() * 1500);
    const logs = generateStepLogs(step.name, duration);

    await new Promise(r => setTimeout(r, duration));

    await query(
      `UPDATE pipeline_steps SET status = 'success', duration_ms = $1, logs = $2, updated_at = NOW() WHERE id = $3`,
      [duration, logs, step.id]
    );
  }

  await query(
    `UPDATE pipeline_runs SET
       status = 'success',
       duration_ms = (SELECT SUM(duration_ms) FROM pipeline_steps WHERE pipeline_run_id = $1),
       updated_at = NOW()
     WHERE id = $1`,
    [runId]
  );
}

function generateStepLogs(stepName, durationMs) {
  const lines = [
    '[SIMULATED PIPELINE] No checkout, build, deployment, or smoke test command was executed.',
    `[${new Date().toISOString()}] Starting: ${stepName}`,
    `[${new Date().toISOString()}] ... processing ...`,
    `[${new Date().toISOString()}] Completed in ${(durationMs / 1000).toFixed(1)}s`
  ];
  if (stepName === 'Checkout') {
    lines.push(`[${new Date().toISOString()}] Simulating repository checkout`);
    lines.push(`[${new Date().toISOString()}] Simulated branch: main`);
  }
  if (stepName === 'Install') {
    lines.push(`[${new Date().toISOString()}] Simulating dependency installation`);
  }
  if (stepName === 'Lint & Test') {
    lines.push(`[${new Date().toISOString()}] Simulating lint and test checks`);
  }
  if (stepName === 'Build') {
    lines.push(`[${new Date().toISOString()}] Simulating application build`);
  }
  if (stepName === 'Deploy') {
    lines.push(`[${new Date().toISOString()}] Simulating deployment`);
  }
  if (stepName === 'Smoke Test') {
    lines.push(`[${new Date().toISOString()}] Simulating smoke test`);
  }
  return lines.join('\n');
}

module.exports = { listPipelineRuns, getPipelineRun, runPipeline };
