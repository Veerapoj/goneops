const { spawn } = require('child_process');
const { query } = require('../lib/db');

const PVE_SSH_HOST = process.env.PVE_SSH_HOST || '';
const PVE_SSH_USER = process.env.PVE_SSH_USER || 'root';
const PVE_SSH_KEY = process.env.PVE_SSH_KEY || '';
const PVE_SSH_PORT = process.env.PVE_SSH_PORT || '22';
const WS_SESSION_TIMEOUT = parseInt(process.env.TERMINAL_SESSION_TIMEOUT || '600000', 10);
const WS_MAX_BUFFER = parseInt(process.env.TERMINAL_MAX_BUFFER || '524288', 10);

function buildSshArgs() {
  const args = ['ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10', '-p', PVE_SSH_PORT];
  if (PVE_SSH_KEY) args.push('-i', PVE_SSH_KEY);
  return args;
}

function handleTerminal(ws, req) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const segments = url.pathname.split('/').filter(Boolean);
  const projectId = segments[2];
  const environmentId = url.searchParams.get('environment_id');

  let terminated = false;
  let child = null;
  let sessionTimer = null;

  function close(code = 1000, reason = 'Session closed') {
    if (terminated) return;
    terminated = true;
    if (sessionTimer) clearTimeout(sessionTimer);
    if (child && !child.killed) {
      child.kill('SIGKILL');
    }
    try { ws.close(code, reason); } catch (e) { /* ignore */ }
  }

  function send(data) {
    if (!terminated && ws.readyState === ws.OPEN) {
      try { ws.send(typeof data === 'string' ? data : JSON.stringify(data)); } catch (e) { /* ignore */ }
    }
  }

  sessionTimer = setTimeout(() => close(1001, 'Session timeout'), WS_SESSION_TIMEOUT);

  (async () => {
    try {
      if (!projectId || !environmentId) {
        return close(4001, 'project_id and environment_id required');
      }

      const env = await query(
        'SELECT * FROM environments WHERE id = $1 AND project_id = $2',
        [environmentId, projectId]
      );
      if (!env.rows.length) {
        return close(4004, 'Environment not found');
      }

      const row = env.rows[0];
      if (!row.working_dir && !row.lxc_vmid) {
        return close(4000, 'No sandbox generated. Run generate-sandbox first.');
      }
      if (row.status !== 'running') {
        return close(4000, 'Sandbox is not running. Start it before opening a terminal.');
      }

      if (row.lxc_vmid && PVE_SSH_HOST) {
        send(JSON.stringify({ type: 'connected', message: `Terminal session established (LXC vmid ${row.lxc_vmid})` }));

        const cmd = 'docker exec -it $(docker ps -q | head -1) sh 2>/dev/null || docker exec -it $(docker ps -a -q | head -1) sh 2>/dev/null || bash';
        const sshArgs = [
          ...buildSshArgs(),
          `${PVE_SSH_USER}@${PVE_SSH_HOST}`,
          '--',
          'pct', 'exec', String(row.lxc_vmid), '--', 'bash', '-c', cmd,
        ];

        child = spawn(sshArgs[0], sshArgs.slice(1), {
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, TERM: 'xterm-256color', LINES: '24', COLUMNS: '80' },
        });
      } else {
        const safeProject = row.project_name || row.name;
        const safeEnv = row.name;
        const safeProjectName = safeProject.replace(/[^a-zA-Z0-9_-]/g, '_');
        const safeEnvName = safeEnv.replace(/[^a-zA-Z0-9_-]/g, '_');
        const composeProject = `${safeProjectName}_${safeEnvName}-sandbox`;

        send(JSON.stringify({ type: 'connected', message: 'Terminal session established (local Docker)' }));

        child = spawn('docker', ['exec', '-it', 'web', 'sh'], {
          cwd: row.working_dir,
          stdio: ['pipe', 'pipe', 'pipe'],
          env: { ...process.env, TERM: 'xterm-256color', LINES: '24', COLUMNS: '80' },
        });
      }

      let outputBuffer = '';

      child.stdout.on('data', (data) => {
        outputBuffer += data.toString();
        if (outputBuffer.length > WS_MAX_BUFFER) {
          outputBuffer = outputBuffer.slice(-WS_MAX_BUFFER);
        }
        send(data.toString());
      });

      child.stderr.on('data', (data) => {
        send(data.toString());
      });

      child.on('close', (code) => {
        send(JSON.stringify({ type: 'exited', code: code || 0 }));
        close(1000, `Process exited with code ${code}`);
      });

      child.on('error', (err) => {
        send(JSON.stringify({ type: 'error', message: err.message }));
        close(4000, 'Process error');
      });

      ws.on('message', (data) => {
        if (terminated || !child || child.killed) return;
        try {
          child.stdin.write(data.toString());
        } catch (e) {
          close(4000, 'Write error');
        }
      });

      ws.on('close', () => {
        close(1000, 'Client disconnected');
      });

      ws.on('error', () => {
        close(4000, 'WebSocket error');
      });
    } catch (err) {
      console.error('[terminal] Session setup error:', err.message);
      close(4000, err.message || 'Internal error');
    }
  })();
}

module.exports = { handleTerminal };
