const { query } = require('../lib/db');

async function reconcileOnStartup() {
  console.log('[goneops] Running startup reconciliation...');

  try {
    const transitionalEnvs = await query(
      `UPDATE environments
       SET status = 'failed', updated_at = NOW()
       WHERE status IN ('generating','starting','stopping','restarting')
       AND updated_at < NOW() - INTERVAL '5 minutes'
       RETURNING id, name, status`
    );
    if (transitionalEnvs.rows.length) {
      console.log(`[goneops] Reconciled ${transitionalEnvs.rows.length} stale environment(s) to failed`);
    }

    const stalePipelines = await query(
      `UPDATE pipeline_runs
       SET status = 'failed', updated_at = NOW()
       WHERE status IN ('pending','running')
       AND updated_at < NOW() - INTERVAL '10 minutes'
       RETURNING id`
    );
    if (stalePipelines.rows.length) {
      for (const run of stalePipelines.rows) {
        await query(
          `UPDATE pipeline_steps
           SET status = CASE WHEN status IN ('pending','running') THEN 'skipped' ELSE status END,
               updated_at = NOW()
           WHERE pipeline_run_id = $1`,
          [run.id]
        );
      }
      console.log(`[goneops] Reconciled ${stalePipelines.rows.length} stale pipeline run(s) to failed`);
    }

    console.log('[goneops] Startup reconciliation complete');
  } catch (err) {
    console.error('[goneops] Reconciliation error:', err.message);
  }
}

module.exports = { reconcileOnStartup };
