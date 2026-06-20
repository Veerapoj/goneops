const { Pool } = require('pg');

let pool = null;

const DB_CONFIG = {
  host: process.env.PGHOST || 'postgres',
  port: parseInt(process.env.PGPORT || '5432'),
  database: process.env.PGDATABASE || 'goneops',
  user: process.env.PGUSER || 'goneops',
  password: process.env.PGPASSWORD || 'goneops',
  max: 10,
  idleTimeoutMillis: 30000,
};

async function createPool(maxRetries = 15, baseDelayMs = 1000) {
  pool = new Pool(DB_CONFIG);
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      return pool;
    } catch (err) {
      console.error(`[goneops] PG connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt === maxRetries) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

function getPool() {
  if (!pool) throw new Error('Database pool not initialized');
  return pool;
}

async function query(sql, params) {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

module.exports = { createPool, getPool, query };
