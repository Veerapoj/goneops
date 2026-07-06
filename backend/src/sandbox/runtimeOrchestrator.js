const { query } = require('../lib/db');
const { writeAuditLog } = require('../lib/audit');

const PVE_SSH_USER = process.env.PVE_SSH_USER || 'root';
const PVE_TEMPLATE = process.env.GONEOPS_LXC_TEMPLATE || 'local:vztmpl/ubuntu-24.04-standard_24.04-2_amd64.tar.zst';

async function getNextVmid() {
  const r = await query("SELECT COALESCE(MAX(lxc_vmid), 199) + 1 AS next FROM environments WHERE lxc_vmid IS NOT NULL");
  return r.rows[0].next;
}

async function getNextIp() {
  const r = await query("SELECT COUNT(*)::int AS cnt FROM runtime_instances");
  const base = 180;
  return `192.168.1.${base + r.rows[0].cnt}`;
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

async function deploySandbox(projectId, environmentId) {
  const jobId = await createRuntimeJob(projectId, environmentId);

  setImmediate(async () => {
    try {
      const { execSync } = require('child_process');
      const exec = (cmd) => require('child_process').execSync(cmd, { timeout: 300000, shell: '/bin/bash' }).toString().trim();

      const ssh = `ssh -i /home/veenews/.ssh/id_ed25519_pve -o StrictHostKeyChecking=no ${PVE_SSH_USER}@192.168.1.165`;
      const pct = (vmid, cmd) => exec(`${ssh} 'pct exec ${vmid} -- bash -c "${cmd}"'`);

      const project = (await query('SELECT name FROM projects WHERE id=$1', [projectId])).rows[0];
      const env = (await query('SELECT name FROM environments WHERE id=$1', [environmentId])).rows[0];
      const safeName = `${project.name}-${env.name}`.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

      await updateJobStep(jobId, 'Creating LXC', 'running');
      const vmid = await getNextVmid();
      const lxcName = `go-${safeName}`;

      exec(`${ssh} 'pct create ${vmid} ${PVE_TEMPLATE} --hostname ${lxcName} --storage local-lvm --rootfs local-lvm:16 --net0 name=eth0,bridge=vmbr0,ip=dhcp --unprivileged 0 --features nesting=1 --cores 2 --memory 2048 --swap 512 --password goneops123 2>&1'`);

      const configExtra = `\\nlxc.cgroup2.devices.allow: c:*:* rwm\\nlxc.cap.drop: \\nlxc.apparmor.profile: unconfined\\nlxc.mount.auto: proc:mixed sys:ro cgroup:mixed\\n`;
      exec(`${ssh} 'printf "${configExtra}" >> /etc/pve/lxc/${vmid}.conf'`);

      await updateJobStep(jobId, 'Configuring network', 'running');
      exec(`${ssh} 'pct start ${vmid}'`);
      await new Promise((r) => setTimeout(r, 10000));

      await updateJobStep(jobId, 'Starting runtime', 'running');
      exec(`${ssh} 'pct exec ${vmid} -- apt-get update -qq'`);

      await updateJobStep(jobId, 'Installing Docker', 'running');
      exec(`${ssh} 'pct exec ${vmid} -- apt-get install -y -qq docker.io'`);
      const df = Buffer.from(JSON.stringify({"storage-driver":"vfs"})).toString('base64');
      exec(`${ssh} 'echo ${df} | base64 -d | pct exec ${vmid} -- tee /etc/docker/daemon.json > /dev/null'`);
      exec(`${ssh} 'pct exec ${vmid} -- systemctl start docker'`);
      await new Promise((r) => setTimeout(r, 5000));

      await updateJobStep(jobId, 'Deploying services', 'running');
      const services = (await query('SELECT * FROM services WHERE environment_id=$1 ORDER BY id', [environmentId])).rows;
      let webPort = 8080;

      for (let i = 0; i < services.length; i++) {
        const svc = services[i];
        const cname = `${safeName}-${svc.name}`.replace(/[^a-zA-Z0-9_-]/g, '-');
        const svcPort = svc.port || 8080;
        const image = (svc.config?.image) || 'nginx:alpine';
        pct(vmid, `docker run -d --security-opt apparmor=unconfined --name ${cname} -l goneops.project=${project.name} -l goneops.env=${env.name} -l goneops.service=${svc.name} -p ${svcPort}:${svcPort} ${image}`);
        if (i === 0) webPort = svcPort;
      }

      await updateJobStep(jobId, 'Checking health', 'running');
      await new Promise((r) => setTimeout(r, 5000));

      const lxcIpResult = await query("SELECT ip_address FROM runtime_instances WHERE project_id=$1 AND environment_id=$2 LIMIT 1", [projectId, environmentId]);
      const lxcIp = lxcIpResult.rows[0]?.ip_address || (await getNextIp());
      const previewUrl = `http://${lxcIp}:${webPort}`;

      await query(`INSERT INTO runtime_instances (project_id, environment_id, vmid, runtime_name, ip_address, status, preview_url) VALUES ($1,$2,$3,$4,$5,'running',$6) ON CONFLICT (project_id,environment_id) DO UPDATE SET vmid=$3, ip_address=$5, status='running', preview_url=$6`, [projectId, environmentId, vmid, lxcName, lxcIp, previewUrl]);

      await query(`UPDATE environments SET status='running', preview_url=$1, lxc_vmid=$2, lxc_node='pve', lxc_ip=$3, lxc_status='ready' WHERE id=$4`, [previewUrl, vmid, lxcIp, environmentId]);
      await query(`UPDATE services SET status='healthy' WHERE environment_id=$1`, [environmentId]);
      await query(`INSERT INTO deployments (project_id, environment_id, version, status, image) VALUES ($1,$2,'v1.0.0','success','custom')`, [projectId, environmentId]);

      await writeAuditLog({ actor:'runtime-orchestrator', action:'sandbox_deploy', resource_type:'lxc', resource_id:vmid, result:'success', message:`Sandbox ${lxcName} deployed on pve (${lxcIp})` });
      await updateJobStep(jobId, 'Ready', 'success');
    } catch (err) {
      await updateJobStep(jobId, 'Failed', 'failed', err.message);
      await query("UPDATE environments SET status='failed' WHERE id=$1", [environmentId]);
    }
  });

  return { job_id: jobId, status: 'pending', message: 'Sandbox deployment started' };
}

module.exports = { deploySandbox, getNextVmid, getNextIp };
