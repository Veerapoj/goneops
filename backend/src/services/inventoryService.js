const { query } = require('../lib/db');

async function getDashboardStats() {
  const hosts = await query('SELECT COUNT(*)::int AS count FROM hosts');
  const containers = await query('SELECT COUNT(*)::int AS count FROM containers');
  const applications = await query('SELECT COUNT(*)::int AS count FROM applications');
  const providers = await query('SELECT COUNT(*)::int AS count FROM providers');
  const connectedProviders = await query("SELECT COUNT(*)::int AS count FROM providers WHERE status = 'connected'");
  const criticalCerts = await query("SELECT COUNT(*)::int AS count FROM certificates WHERE status IN ('critical', 'expired')");
  const syncJobs = await query('SELECT COUNT(*)::int AS count FROM sync_jobs');

  return {
    hosts: hosts.rows[0]?.count || 0,
    vms: 0,
    containers: containers.rows[0]?.count || 0,
    applications: applications.rows[0]?.count || 0,
    providers: providers.rows[0]?.count || 0,
    connected_providers: connectedProviders.rows[0]?.count || 0,
    critical_certs: criticalCerts.rows[0]?.count || 0,
    sync_jobs: syncJobs.rows[0]?.count || 0,
  };
}

async function listProviders() {
  const result = await query(`
    SELECT p.*,
      (SELECT COUNT(*)::int FROM hosts WHERE provider_id = p.id) AS hosts_count,
      (SELECT COUNT(*)::int FROM containers WHERE provider_id = p.id) AS containers_count
    FROM providers p
    ORDER BY p.created_at DESC
  `);
  return result.rows;
}

async function listHosts() {
  const result = await query(`
    SELECT h.*, p.name AS provider_name, p.type AS provider_type
    FROM hosts h
    LEFT JOIN providers p ON p.id = h.provider_id
    ORDER BY h.hostname
  `);
  return result.rows;
}

async function listVMs() {
  const result = await query(`
    SELECT v.*, h.hostname AS hostname, p.name AS provider_name
    FROM vms v
    LEFT JOIN hosts h ON h.id = v.host_id
    LEFT JOIN providers p ON p.id = v.provider_id
    ORDER BY v.name
  `);
  return result.rows;
}

async function listContainers() {
  const result = await query(`
    SELECT c.*, h.hostname AS host_name, p.name AS provider_name
    FROM containers c
    LEFT JOIN hosts h ON h.id = c.host_id
    LEFT JOIN providers p ON p.id = c.provider_id
    ORDER BY c.name
  `);
  return result.rows;
}

async function listApplications() {
  const result = await query(`
    SELECT a.*, pj.name AS project_name
    FROM applications a
    LEFT JOIN projects pj ON pj.id = a.project_id
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

module.exports = {
  getDashboardStats,
  listProviders,
  listHosts,
  listVMs,
  listContainers,
  listApplications,
  listCertificates,
  listSyncJobs,
};
