const { query } = require('../lib/db');

const PORT_BASE = parseInt(process.env.SANDBOX_PORT_BASE || '20000');
const BLOCK_SIZE = 4;

async function allocatePorts(environmentId) {
  const client = await require('../lib/db').getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [742006]);

    const existing = await client.query(
      `SELECT role, host_port
         FROM sandbox_ports
        WHERE environment_id = $1
        ORDER BY CASE role
          WHEN 'web' THEN 1 WHEN 'db' THEN 2 WHEN 'redis' THEN 3 WHEN 'mq' THEN 4
        END`,
      [environmentId]
    );
    if (existing.rows.length === BLOCK_SIZE) {
      await client.query('COMMIT');
      return existing.rows.map(r => r.host_port);
    }
    if (existing.rows.length > 0) {
      await client.query('DELETE FROM sandbox_ports WHERE environment_id = $1', [environmentId]);
    }

    const maxPort = await client.query(
      'SELECT COALESCE(MAX(host_port), 0) as mp FROM sandbox_ports'
    );
    let nextPort = Math.max(PORT_BASE, parseInt(maxPort.rows[0].mp) + 1);

    const roles = ['web', 'db', 'redis', 'mq'];
    const containerPorts = [8080, 5432, 6379, 5672];
    const ports = [];

    for (let i = 0; i < BLOCK_SIZE; i++) {
      const hostPort = nextPort + i;
      await client.query(
        `INSERT INTO sandbox_ports (environment_id, role, host_port, container_port)
         VALUES ($1, $2, $3, $4)`,
        [environmentId, roles[i], hostPort, containerPorts[i]]
      );
      ports.push(hostPort);
    }

    await client.query('COMMIT');
    return ports;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function getPorts(environmentId) {
  const result = await query(
    'SELECT role, host_port, container_port FROM sandbox_ports WHERE environment_id = $1 ORDER BY id',
    [environmentId]
  );
  return result.rows;
}

module.exports = { allocatePorts, getPorts };
