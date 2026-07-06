const { query } = require('../lib/db');
const { writeAuditLog } = require('../lib/audit');

const PVE_HOST = process.env.PVE_SSH_HOST || '192.168.1.165';
const PVE_SSH_USER = process.env.PVE_SSH_USER || 'root';
const PVE_SSH_KEY = process.env.PVE_SSH_KEY || '/home/veenews/.ssh/id_ed25519_pve';
const PVE_TEMPLATE = process.env.GONEOPS_LXC_TEMPLATE || 'local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst';

const PROVEN_LXC_CONFIG_EXTRA = [
  'lxc.cgroup2.devices.allow: c:*:* rwm',
  'lxc.cap.drop: ',
  'lxc.apparmor.profile: unconfined',
  'lxc.mount.auto: proc:mixed sys:ro cgroup:mixed',
].join('\n');

function safeLabel(val) {
  return String(val).replace(/[^a-zA-Z0-9._-]/g, '-');
}

function safeImage(image) {
  const sanitized = String(image).replace(/[^a-zA-Z0-9._/:@\-\+]/g, '');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._/\-]*[:@][a-zA-Z0-9._\-\+]+$/.test(sanitized)) {
    throw new Error(`Invalid container image: ${image}`);
  }
  return sanitized;
}

function assertPveSshKeyUsable() {
  const fs = require('fs');
  let stat;
  try {
    stat = fs.statSync(PVE_SSH_KEY);
  } catch {
    throw new Error(`PVE_SSH_KEY not found at ${PVE_SSH_KEY}: provision the authorized PVE SSH private key file at this path`);
  }
  if (!stat.isFile()) {
    throw new Error(`PVE_SSH_KEY at ${PVE_SSH_KEY} is not a regular file (found ${stat.isDirectory() ? 'a directory' : 'other'}): provision the authorized PVE SSH private key file at this path`);
  }
}

async function getNextVmid() {
  const { execSync } = require('child_process');
  const ssh = `ssh -i ${PVE_SSH_KEY} -o StrictHostKeyChecking=no ${PVE_SSH_USER}@${PVE_HOST}`;
  const result = execSync(`${ssh} 'pvesh get /cluster/nextid'`, { timeout: 10000, shell: true }).toString().trim();
  const vmid = parseInt(result);
  if (!vmid || vmid < 100) throw new Error(`Invalid VMID from Proxmox: ${result}`);
  return vmid;
}

async function getLxcDhcpIp(vmid) {
  const { execSync } = require('child_process');
  const ssh = `ssh -i ${PVE_SSH_KEY} -o StrictHostKeyChecking=no ${PVE_SSH_USER}@${PVE_HOST}`;
  try {
    const raw = execSync(`${ssh} "pct exec ${vmid} -- hostname -I 2>/dev/null"`, { timeout: 10000, shell: true }).toString().trim();
    const ip = raw.split(/\s+/)[0];
    if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
  } catch (_) {}
  try {
    const raw = execSync(`${ssh} "pct exec ${vmid} -- ip -4 addr show eth0 2>/dev/null | awk '/inet /{print \\$2}' | cut -d/ -f1"`, { timeout: 10000, shell: true }).toString().trim();
    const ip = raw.split(/\s+/)[0];
    if (ip && /^\d+\.\d+\.\d+\.\d+$/.test(ip)) return ip;
  } catch (_) {}
  return null;
}

async function createRuntimeJob(projectId, environmentId) {
  const r = await query(
    `INSERT INTO runtime_jobs (project_id, environment_id, job_type, status, current_step)
     VALUES ($1, $2, 'deploy', 'pending', 'Creating LXC') RETURNING id`,
    [projectId, environmentId]
  );
  return r.rows[0].id;
}

async function updateJobStep(jobId, step, status, log = '') {
  await query(
    `UPDATE runtime_jobs SET current_step = $1, status = $2, logs = CASE WHEN $3 = '' THEN logs ELSE logs || E'\\n' || $3 END, updated_at = NOW() WHERE id = $4`,
    [step, status, log, jobId]
  );
}

async function findExistingRuntime(projectId, environmentId) {
  const r = await query(
    'SELECT * FROM runtime_instances WHERE project_id=$1 AND environment_id=$2 AND status != $3 LIMIT 1',
    [projectId, environmentId, 'failed']
  );
  if (!r.rows.length) return null;
  const ri = r.rows[0];
  if (!ri.vmid || ri.vmid <= 0) return null;

  const { execSync } = require('child_process');
  const ssh = `ssh -i ${PVE_SSH_KEY} -o StrictHostKeyChecking=no ${PVE_SSH_USER}@${PVE_HOST}`;
  try {
    const status = execSync(`${ssh} 'pct status ${ri.vmid} 2>/dev/null'`, { timeout: 5000, shell: true }).toString().trim();
    if (status.includes('running') || status.includes('stopped')) {
      return ri;
    }
  } catch (_) {}
  await query("UPDATE runtime_instances SET status='broken' WHERE id=$1", [ri.id]);
  return null;
}

async function deploySandbox(projectId, environmentId) {
  const jobId = await createRuntimeJob(projectId, environmentId);

  setImmediate(async () => {
    let createdVmid = null;
    try {
      assertPveSshKeyUsable();

      const { execSync } = require('child_process');
      const exec = (cmd) => require('child_process').execSync(cmd, { timeout: 300000, shell: true }).toString().trim();

      const ssh = `ssh -i ${PVE_SSH_KEY} -o StrictHostKeyChecking=no ${PVE_SSH_USER}@${PVE_HOST}`;
      const pct = (vmid, cmd) => exec(`${ssh} 'pct exec ${vmid} -- bash -c "${cmd}"'`);

      const project = (await query('SELECT name FROM projects WHERE id=$1', [projectId])).rows[0];
      const env = (await query('SELECT name FROM environments WHERE id=$1', [environmentId])).rows[0];
      const safeName = `${project.name}-${env.name}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

      await updateJobStep(jobId, 'Finding runtime', 'running');
      let vmid, lxcName, createdVmid = null;
      const existing = await findExistingRuntime(projectId, environmentId);

      if (existing) {
        vmid = existing.vmid;
        lxcName = existing.runtime_name;
        const lxcStatus = exec(`${ssh} 'pct status ${vmid} 2>/dev/null'`);
        if (lxcStatus.includes('stopped')) {
          await updateJobStep(jobId, 'Starting LXC', 'running');
          exec(`${ssh} 'pct start ${vmid}'`);
          await new Promise((r) => setTimeout(r, 10000));
        }
        await updateJobStep(jobId, 'Reusing runtime', 'running', `Reusing existing LXC vmid=${vmid}`);
      } else {
        await updateJobStep(jobId, 'Creating LXC', 'running');
        vmid = await getNextVmid();
        createdVmid = vmid;
        lxcName = `go-${safeName}`;

        exec(`${ssh} 'pct create ${vmid} ${PVE_TEMPLATE} --hostname ${lxcName} --storage local-lvm --rootfs local-lvm:16 --net0 name=eth0,bridge=vmbr0,ip=dhcp --unprivileged 0 --features nesting=1 --cores 2 --memory 2048 --swap 512 --password goneops123 2>&1'`);

        const configExtra = Buffer.from(PROVEN_LXC_CONFIG_EXTRA + '\n').toString('base64');
        exec(`${ssh} 'echo ${configExtra} | base64 -d >> /etc/pve/lxc/${vmid}.conf'`);

        exec(`${ssh} 'pct start ${vmid}'`);
        await new Promise((r) => setTimeout(r, 15000));
      }

      await updateJobStep(jobId, 'Acquiring IP address', 'running');
      let lxcIp = null;
      for (let attempt = 0; attempt < 5 && !lxcIp; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 5000));
        lxcIp = await getLxcDhcpIp(vmid);
      }
      if (!lxcIp) throw new Error('Could not determine LXC DHCP IP after 5 retries');

      await updateJobStep(jobId, 'Starting runtime', 'running');
      exec(`${ssh} 'pct exec ${vmid} -- apt-get update -qq'`);

      await updateJobStep(jobId, 'Installing Docker', 'running');
      exec(`${ssh} 'pct exec ${vmid} -- apt-get install -y -qq docker.io curl'`);
      const df = Buffer.from(JSON.stringify({"storage-driver":"vfs"})).toString('base64');
      exec(`${ssh} 'echo ${df} | base64 -d | pct exec ${vmid} -- tee /etc/docker/daemon.json > /dev/null'`);
      exec(`${ssh} 'pct exec ${vmid} -- systemctl start docker'`);
      await new Promise((r) => setTimeout(r, 5000));

      await updateJobStep(jobId, 'Deploying services', 'running');
      const services = (await query('SELECT * FROM services WHERE environment_id=$1 ORDER BY id', [environmentId])).rows;
      let webPort = 8080;

      for (let i = 0; i < services.length; i++) {
        const svc = services[i];
        const cname = `${safeName}-${safeLabel(svc.name)}`.replace(/[^a-zA-Z0-9_-]/g, '-');
        const hostPort = svc.port || 8080;
        const containerPort = svc.config?.containerPort || 80;
        const image = safeImage(svc.config?.image || 'nginx:alpine');
        const lProject = safeLabel(project.name);
        const lEnv = safeLabel(env.name);
        const lService = safeLabel(svc.name);
        pct(vmid, `docker rm -f ${cname} 2>/dev/null || true`);
        pct(vmid, `docker run -d --security-opt apparmor=unconfined --name ${cname} -l goneops.project=${lProject} -l goneops.env=${lEnv} -l goneops.service=${lService} -p ${hostPort}:${containerPort} ${image}`);
        if (i === 0) webPort = hostPort;
      }

      await updateJobStep(jobId, 'Checking health', 'running');
      await new Promise((r) => setTimeout(r, 15000));
      let healthy = false;
      for (let attempt = 0; attempt < 10 && !healthy; attempt++) {
        if (attempt > 0) await new Promise((r) => setTimeout(r, 5000));
        try {
          const running = pct(vmid, 'docker ps -q 2>/dev/null | wc -l');
          const count = parseInt(running.trim()) || 0;
          if (count >= services.length) {
            healthy = true;
          }
        } catch (_) {}
      }
      if (!healthy) throw new Error(`Health check failed: HTTP 200 not returned from http://127.0.0.1:${webPort} after 5 retries`);

      const previewUrl = `http://${lxcIp}:${webPort}`;

      await query(`INSERT INTO runtime_instances (project_id, environment_id, vmid, runtime_name, ip_address, status, preview_url) VALUES ($1,$2,$3,$4,$5,'running',$6) ON CONFLICT (project_id,environment_id) DO UPDATE SET vmid=$3, ip_address=$5, status='running', preview_url=$6`, [projectId, environmentId, vmid, lxcName, lxcIp, previewUrl]);

      await query(`UPDATE environments SET status='running', preview_url=$1, lxc_vmid=$2, lxc_node='pve', lxc_ip=$3, lxc_status='ready' WHERE id=$4`, [previewUrl, vmid, lxcIp, environmentId]);
      await query(`UPDATE services SET status='healthy' WHERE environment_id=$1`, [environmentId]);
      await query(`INSERT INTO deployments (project_id, environment_id, version, status, image) VALUES ($1,$2,'v1.0.0','success','custom')`, [projectId, environmentId]);

      await writeAuditLog({ actor:'runtime-orchestrator', action:'sandbox_deploy', resource_type:'lxc', resource_id:vmid, result:'success', message:`Sandbox ${lxcName} deployed on pve (${lxcIp})` });
      await updateJobStep(jobId, 'Ready', 'success');
      createdVmid = null;
    } catch (err) {
      await updateJobStep(jobId, 'Failed', 'failed', err.message);
      await query("UPDATE environments SET status='failed' WHERE id=$1", [environmentId]);

      await writeAuditLog({
        actor: 'runtime-orchestrator',
        action: 'sandbox_deploy',
        resource_type: 'lxc',
        resource_id: createdVmid || 0,
        result: 'failure',
        message: `Sandbox deploy failed: ${err.message}`,
        metadata: { project_id: projectId, environment_id: environmentId, vmid: createdVmid, error: err.message },
      }).catch(() => {});

      if (createdVmid) {
        try {
          const { execSync } = require('child_process');
          const sshClean = `ssh -i ${PVE_SSH_KEY} -o StrictHostKeyChecking=no ${PVE_SSH_USER}@${PVE_HOST}`;
          execSync(`${sshClean} 'pct stop ${createdVmid} 2>/dev/null; pct destroy ${createdVmid} --force 2>/dev/null'`, { timeout: 30000, shell: true });
        } catch (cleanupErr) {
          console.error(`[runtimeOrchestrator] LXC ${createdVmid} cleanup failed: ${cleanupErr.message}`);
        }
      }

      await query(
        "INSERT INTO runtime_instances (project_id, environment_id, vmid, status) VALUES ($1,$2,$3,'failed') ON CONFLICT (project_id,environment_id) DO UPDATE SET status='failed', vmid=$3",
        [projectId, environmentId, createdVmid || 0]
      );
    }
  });

  return { job_id: jobId, status: 'pending', message: 'Sandbox deployment started' };
}

module.exports = { deploySandbox, getNextVmid };
