const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: '{{PREFIX}}-app' });
});

app.get('/api/test', async (req, res) => {
  const results = { pg: 'not_tested', redis: 'not_tested', mq: 'not_tested' };

  try {
    const { Pool } = require('pg');
    const pgPool = new Pool({
      host: process.env.PGHOST || 'db',
      port: parseInt(process.env.PGPORT || '5432'),
      database: process.env.PGDATABASE || '{{DB_NAME}}',
      user: process.env.PGUSER || '{{DB_USER}}',
      password: process.env.PGPASSWORD || '{{DB_PASS}}',
      connectionTimeoutMillis: 3000,
    });
    await pgPool.query('SELECT 1');
    results.pg = 'connected';
    await pgPool.end();
  } catch (e) { results.pg = 'failed: ' + e.message; }

  try {
    const Redis = require('ioredis');
    const redis = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      lazyConnect: true,
      connectTimeout: 3000,
    });
    await redis.connect();
    await redis.ping();
    results.redis = 'connected';
    redis.disconnect();
  } catch (e) { results.redis = 'failed: ' + e.message; }

  try {
    const amqp = require('amqplib');
    const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://guest:guest@mq:5672', { timeout: 3000 });
    const ch = await conn.createChannel();
    results.mq = 'connected';
    await ch.close();
    await conn.close();
  } catch (e) { results.mq = 'failed: ' + e.message; }

  res.json({ results, timestamp: new Date().toISOString() });
});

app.listen(PORT, () => console.log(`[{{PREFIX}}-app] Listening on port ${PORT}`));
