const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

const PVE_SSH_HOST = process.env.PVE_SSH_HOST || '';
const PVE_SSH_USER = process.env.PVE_SSH_USER || 'root';
const PVE_SSH_KEY = process.env.PVE_SSH_KEY || '';
const PVE_SSH_PORT = process.env.PVE_SSH_PORT || '22';
const MAX_OUTPUT_BYTES = 1024 * 1024;

function buildSshArgs() {
  const args = ['-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10', '-p', PVE_SSH_PORT];
  if (PVE_SSH_KEY) args.push('-i', PVE_SSH_KEY);
  args.push(`${PVE_SSH_USER}@${PVE_SSH_HOST}`);
  return args;
}

function execSsh(args, options = {}) {
  return new Promise((resolve, reject) => {
    const allArgs = [...buildSshArgs(), ...args];
    execFile('ssh', allArgs, {
      timeout: options.timeout || 120000,
      maxBuffer: options.maxBuffer || MAX_OUTPUT_BYTES,
      windowsHide: true,
    }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function preflightCheck() {
  if (!PVE_SSH_HOST) {
    return { available: false, error: 'PVE_SSH_HOST not configured' };
  }
  const result = await execSsh(['echo', 'ok'], { timeout: 15000 });
  if (result.error) {
    return { available: false, error: result.stderr || result.error.message };
  }
  return { available: true };
}

async function pctExec(vmid, command, options = {}) {
  if (!PVE_SSH_HOST) {
    throw Object.assign(new Error('PVE_SSH_HOST not configured — cannot execute remote commands'), { status: 503, code: 'proxmox_unavailable' });
  }
  const result = await execSsh(['pct', 'exec', String(vmid), '--', 'bash', '-c', command], options);
  if (result.error) {
    const err = new Error(result.stderr || result.error.message);
    err.status = 503;
    err.code = 'remote_exec_error';
    err.stdout = result.stdout;
    err.stderr = result.stderr;
    throw err;
  }
  return result.stdout;
}

async function pctPush(vmid, localDir, remotePath) {
  if (!PVE_SSH_HOST) {
    throw Object.assign(new Error('PVE_SSH_HOST not configured'), { status: 503, code: 'proxmox_unavailable' });
  }
  const files = fs.readdirSync(localDir, { withFileTypes: true });
  for (const entry of files) {
    const localFile = path.join(localDir, entry.name);
    if (entry.isDirectory()) {
      await pctPush(vmid, localFile, `${remotePath}/${entry.name}`);
    } else {
      const tmpPath = `/tmp/goneops-push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const scpArgs = [
        '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10',
        '-P', PVE_SSH_PORT,
      ];
      if (PVE_SSH_KEY) scpArgs.push('-i', PVE_SSH_KEY);
      scpArgs.push(localFile, `${PVE_SSH_USER}@${PVE_SSH_HOST}:${tmpPath}`);

      await new Promise((resolve, reject) => {
        execFile('scp', scpArgs, { timeout: 60000, maxBuffer: MAX_OUTPUT_BYTES }, (error, stdout, stderr) => {
          if (error) return reject(new Error(`scp to host failed: ${stderr || error.message}`));
          resolve();
        });
      });

      await pctExec(vmid, `mkdir -p '${remotePath}' && mv '${tmpPath}' '${remotePath}/${entry.name}'`);
    }
  }
}

async function bootstrapLxc(vmid, workingDir) {
  await pctExec(vmid, 'apt-get update && apt-get install -y docker.io docker-compose-v2 2>/dev/null || (apt-get update && apt-get install -y docker.io docker-compose)');
  await pctExec(vmid, 'systemctl enable docker && systemctl start docker || true');
  const remoteDir = '/opt/sandbox';
  await pctExec(vmid, `mkdir -p '${remoteDir}'`);
  await pctPush(vmid, workingDir, remoteDir);
  await pctExec(vmid, `cd '${remoteDir}' && docker network create goneops_net 2>/dev/null || true`);
  return remoteDir;
}

async function getLxcIp(vmid) {
  try {
    const stdout = await pctExec(vmid, "ip -4 addr show eth0 | grep -oP 'inet \\K[\\d.]+' || ip -4 addr show | grep -oP 'inet \\K[\\d.]+' | head -1");
    return stdout.trim();
  } catch {
    return null;
  }
}

module.exports = { preflightCheck, pctExec, pctPush, bootstrapLxc, getLxcIp };
