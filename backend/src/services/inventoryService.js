const { query } = require('../lib/db');

async function getResourcesAggregate() {
  const h = await query(`
    SELECT
      SUM(cpu_cores)::int AS total_cpu_cores,
      ROUND(AVG(cpu_usage_pct)::numeric, 1) AS avg_cpu_pct,
      SUM(memory_total_gb)::numeric AS total_memory_gb,
      ROUND(AVG(memory_usage_pct)::numeric, 1) AS avg_mem_pct,
      SUM(disk_total_gb)::numeric AS total_disk_gb,
      ROUND(AVG(disk_usage_pct)::numeric, 1) AS avg_disk_pct
    FROM hosts
    WHERE data_source = 'discovered'
  `);
  const row = h.rows[0] || {};
  const totalCpu = row.total_cpu_cores || 0;
  const totalMem = parseFloat(row.total_memory_gb || 0);
  const totalDisk = parseFloat(row.total_disk_gb || 0);
  const cpuPct = parseFloat(row.avg_cpu_pct || 0);
  const memPct = parseFloat(row.avg_mem_pct || 0);
  const diskPct = parseFloat(row.avg_disk_pct || 0);

  const cpuUsed = totalCpu > 0 ? Math.round(totalCpu * cpuPct / 100) : 0;
  const memUsed = totalMem > 0 ? Math.round(totalMem * memPct / 100 * 100) / 100 : 0;
  const diskUsed = totalDisk > 0 ? Math.round(totalDisk * diskPct / 100 * 100) / 100 : 0;

  return [
    { name: 'CPU Allocation', used: cpuUsed, total: totalCpu, unit: 'Core', percent: Math.round(cpuPct * 10) / 10 },
    { name: 'Memory', used: memUsed, total: totalMem, unit: 'GB', percent: Math.round(memPct * 10) / 10 },
    { name: 'Storage', used: diskUsed, total: totalDisk, unit: 'GB', percent: Math.round(diskPct * 10) / 10 },
  ];
}

async function getDashboardStats() {
  const hosts = await query("SELECT COUNT(*)::int AS count FROM hosts WHERE data_source = 'discovered'");
  const vms = await query("SELECT COUNT(*)::int AS count FROM vms WHERE data_source = 'discovered'");
  const containers = await query("SELECT COUNT(*)::int AS count FROM containers WHERE data_source = 'discovered'");
  const applications = await query("SELECT COUNT(*)::int AS count FROM applications WHERE data_source = 'discovered'");
  const providers = await query("SELECT COUNT(*)::int AS count FROM providers WHERE data_source = 'discovered'");
  const connectedProviders = await query("SELECT COUNT(*)::int AS count FROM providers WHERE status = 'connected' AND data_source = 'discovered'");
  const criticalCerts = await query("SELECT COUNT(*)::int AS count FROM certificates WHERE status IN ('critical', 'expired')");
  const syncJobs = await query('SELECT COUNT(*)::int AS count FROM sync_jobs');
  const resources = await getResourcesAggregate();

  return {
    hosts: hosts.rows[0]?.count || 0,
    vms: vms.rows[0]?.count || 0,
    containers: containers.rows[0]?.count || 0,
    applications: applications.rows[0]?.count || 0,
    providers: providers.rows[0]?.count || 0,
    connected_providers: connectedProviders.rows[0]?.count || 0,
    critical_certs: criticalCerts.rows[0]?.count || 0,
    sync_jobs: syncJobs.rows[0]?.count || 0,
    resources,
  };
}

async function listProviders() {
  const result = await query(`
    SELECT p.*,
      (SELECT COUNT(*)::int FROM hosts WHERE provider_id = p.id AND host_type = 'host' AND data_source = 'discovered') AS nodes_count,
      (SELECT COUNT(*)::int FROM containers WHERE provider_id = p.id AND data_source = 'discovered') AS containers_count,
      (SELECT ROUND(AVG(cpu_usage_pct)::numeric, 1) FROM hosts WHERE provider_id = p.id AND host_type = 'host' AND data_source = 'discovered') AS cpu_usage_pct,
      (SELECT ROUND(AVG(memory_usage_pct)::numeric, 1) FROM hosts WHERE provider_id = p.id AND host_type = 'host' AND data_source = 'discovered') AS memory_usage_pct
    FROM providers p
    WHERE p.data_source = 'discovered'
    ORDER BY p.created_at DESC
  `);
  return result.rows;
}

async function listHosts() {
  const result = await query(`
    SELECT h.*, p.name AS provider_name, p.type AS provider_type
    FROM hosts h
    LEFT JOIN providers p ON p.id = h.provider_id AND p.data_source = 'discovered'
    WHERE h.data_source = 'discovered'
    ORDER BY h.hostname
  `);
  return result.rows;
}

async function listVMs() {
  const result = await query(`
    SELECT v.*, h.hostname AS hostname, p.name AS provider_name
    FROM vms v
    LEFT JOIN hosts h ON h.id = v.host_id AND h.data_source = 'discovered'
    LEFT JOIN providers p ON p.id = v.provider_id AND p.data_source = 'discovered'
    WHERE v.data_source = 'discovered'
    ORDER BY v.name
  `);
  return result.rows;
}

async function listContainers() {
  const result = await query(`
    SELECT c.*, h.hostname AS host_name, p.name AS provider_name
    FROM containers c
    LEFT JOIN hosts h ON h.id = c.host_id AND h.data_source = 'discovered'
    LEFT JOIN providers p ON p.id = c.provider_id AND p.data_source = 'discovered'
    WHERE c.data_source = 'discovered'
    ORDER BY c.name
  `);
  return result.rows;
}

async function listApplications() {
  const result = await query(`
    SELECT a.*, pj.name AS project_name
    FROM applications a
    LEFT JOIN projects pj ON pj.id = a.project_id
    WHERE a.data_source = 'discovered'
    ORDER BY a.name
  `);
  return result.rows;
}

async function listCertificates() {
  const result = await query(`
    SELECT cert.*, a.name AS application_name
    FROM certificates cert
    LEFT JOIN applications a ON a.id = cert.application_id
    ORDER BY cert.expires_at ASC
  `);
  return result.rows;
}

async function listSyncJobs() {
  const result = await query(`
    SELECT sj.*, p.name AS provider_name, p.type AS provider_type
    FROM sync_jobs sj
    LEFT JOIN providers p ON p.id = sj.provider_id
    ORDER BY sj.created_at DESC
    LIMIT 50
  `);
  return result.rows;
}

async function getServiceMap() {
  const hostsRes = await query(`
    SELECT h.*, p.name AS provider_name, p.type AS provider_type
    FROM hosts h
    LEFT JOIN providers p ON p.id = h.provider_id AND p.data_source = 'discovered'
    WHERE h.data_source = 'discovered'
    ORDER BY h.hostname
  `);

  const containersRes = await query(`
    SELECT c.*, h.hostname AS host_name, p.name AS provider_name
    FROM containers c
    LEFT JOIN hosts h ON h.id = c.host_id AND h.data_source = 'discovered'
    LEFT JOIN providers p ON p.id = c.provider_id AND p.data_source = 'discovered'
    WHERE c.data_source = 'discovered'
    ORDER BY c.name
  `);

  const vmsRes = await query(`
    SELECT v.*, h.hostname AS hostname, p.name AS provider_name
    FROM vms v
    LEFT JOIN hosts h ON h.id = v.host_id AND h.data_source = 'discovered'
    LEFT JOIN providers p ON p.id = v.provider_id AND p.data_source = 'discovered'
    WHERE v.data_source = 'discovered'
    ORDER BY v.name
  `);

  const appsRes = await listApplications();
  const certsRes = await listCertificates();

  const hosts = hostsRes.rows;
  const containers = containersRes.rows;
  const vms = vmsRes.rows;

  const dependencyTree = [];
  const infraTree = [];
  const envData = {};

  for (const host of hosts) {
    const hostVMs = vms.filter((v) => v.provider_id === host.provider_id || v.host_id === host.id);
    const hostContainers = containers.filter((c) => c.provider_id === host.provider_id || c.host_id === host.id);

    for (const vm of hostVMs) {
      infraTree.push({
        indent: 0,
        name: vm.name,
        color: 'text-indigo-500',
      });
      infraTree.push({
        indent: 1,
        name: `VM: ${vm.vmid || vm.name}`,
      });
      infraTree.push({
        indent: 2,
        name: `Host: ${host.hostname}`,
      });
      if (host.provider_name) {
        infraTree.push({
          indent: 3,
          name: `Provider: ${host.provider_name}`,
        });
      }
    }

    for (const c of hostContainers) {
      dependencyTree.push({
        indent: 0,
        name: c.name,
        type: 'service',
      });
      if (c.image) {
        dependencyTree.push({
          indent: 1,
          name: `image: ${c.image}`,
          type: c.image_tag ? c.image_tag : undefined,
        });
      }
      dependencyTree.push({
        indent: 1,
        name: `host: ${host.hostname}`,
        type: 'container',
      });
    }
  }

  const compareRows = [
    { component: 'Hosts', dev: String(hosts.length), uat: String(hosts.length), prod: String(hosts.length), drift: false },
    { component: 'VMs', dev: String(vms.length), uat: String(vms.length), prod: String(vms.length), drift: false },
    { component: 'Containers', dev: String(containers.length), uat: String(containers.length), prod: String(containers.length), drift: false },
    { component: 'Applications', dev: String(appsRes.length), uat: String(appsRes.length), prod: String(appsRes.length), drift: false },
    { component: 'Certificates', dev: String(certsRes.length), uat: String(certsRes.length), prod: String(certsRes.length), drift: false },
  ];

  return {
    dependencyTree,
    infraTree,
    envData: Object.keys(envData).map((env) => ({ env, services: envData[env] })),
    compareRows,
    applicationCount: appsRes.length,
  };
}

async function getCapacity() {
  const resources = await getResourcesAggregate();

  const containersRes = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'running')::int AS running
    FROM containers
    WHERE data_source = 'discovered'
  `);

  const vmsRes = await query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'running')::int AS running
    FROM vms
    WHERE data_source = 'discovered'
  `);

  const capacityData = resources.map((r) => ({
    resource: r.name.replace(' Allocation', ''),
    total: r.total,
    allocated: r.total,
    used: r.used,
    unit: r.unit,
  }));

  const idleResources = [];
  for (const vm of (await query(`SELECT name, cpu_cores, memory_gb, status FROM vms WHERE status = 'stopped' AND data_source = 'discovered' ORDER BY name LIMIT 3`)).rows) {
    idleResources.push({
      id: vm.name,
      name: vm.name,
      type: 'VM',
      cpu: vm.cpu_cores > 0 ? `${vm.cpu_cores} Core` : '0%',
      mem: vm.memory_gb > 0 ? `${vm.memory_gb}G` : '0%',
      action: 'Decommission',
    });
  }

  for (const c of (await query(`SELECT name, cpu_usage_pct, memory_usage_mb, status FROM containers WHERE status = 'stopped' AND data_source = 'discovered' ORDER BY name LIMIT 3`)).rows) {
    idleResources.push({
      id: c.name,
      name: c.name,
      type: 'Container',
      cpu: c.cpu_usage_pct > 0 ? `${c.cpu_usage_pct}%` : '0%',
      mem: c.memory_usage_mb > 0 ? `${c.memory_usage_mb}M` : '0%',
      action: 'Remove',
    });
  }

  return {
    capacityData,
    idleResources: idleResources.slice(0, 6),
    hostCount: (await query("SELECT COUNT(*)::int AS count FROM hosts WHERE data_source = 'discovered'")).rows[0].count || 0,
    vmCount: vmsRes.rows[0].total || 0,
    containerCount: containersRes.rows[0].total || 0,
  };
}

async function getPlatformOverview() {
  const providers = await query("SELECT COUNT(*)::int AS count FROM providers WHERE data_source = 'discovered'");
  const hosts = await query("SELECT COUNT(*)::int AS count FROM hosts WHERE data_source = 'discovered'");
  const vms = await query("SELECT COUNT(*)::int AS count FROM vms WHERE data_source = 'discovered'");
  const containers = await query("SELECT COUNT(*)::int AS count FROM containers WHERE data_source = 'discovered'");
  const applications = await query("SELECT COUNT(*)::int AS count FROM applications WHERE data_source = 'discovered'");
  const lastSync = await query(`
    SELECT GREATEST(
      COALESCE(MAX(sync_jobs.completed_at), '1970-01-01'::timestamptz),
      COALESCE(MAX(proxmox_providers.last_synced_at), '1970-01-01'::timestamptz)
    ) AS last_sync
    FROM sync_jobs
    FULL OUTER JOIN proxmox_providers ON true
  `);

  return {
    providers: providers.rows[0]?.count || 0,
    hosts: hosts.rows[0]?.count || 0,
    vms: vms.rows[0]?.count || 0,
    containers: containers.rows[0]?.count || 0,
    applications: applications.rows[0]?.count || 0,
    last_sync: lastSync.rows[0]?.last_sync || null,
  };
}

module.exports = {
  getDashboardStats,
  listProviders,
  listHosts,
  listVMs,
  listContainers,
  listApplications,
  listCertificates,
  listSyncJobs,
  getServiceMap,
  getCapacity,
  getPlatformOverview,
};
