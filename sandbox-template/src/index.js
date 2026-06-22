const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const app = express();
const PORT = process.env.PORT || 8080;

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: '{{PREFIX}}-app',
      version: '1.0.0',
      description: 'GoneOps Sandbox API',
    },
    servers: [{ url: '/' }],
  },
  apis: [__filename],
});

/**
 * @openapi
 * /:
 *   get:
 *     summary: Swagger UI documentation
 *     description: Serves the interactive API documentation page.
 *     responses:
 *       200:
 *         description: HTML Swagger UI page
 */
app.use(swaggerUi.serve);
app.get('/', swaggerUi.setup(swaggerSpec));

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns service health status. Used by docker-compose healthcheck.
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 timestamp:
 *                   type: string
 *                 service:
 *                   type: string
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: '{{PREFIX}}-app' });
});

/**
 * @openapi
 * /api/test:
 *   get:
 *     summary: Database connection test
 *     description: Tests connectivity to PostgreSQL, Redis, and RabbitMQ.
 *     responses:
 *       200:
 *         description: Connection test results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: object
 *                   properties:
 *                     pg:
 *                       type: string
 *                     redis:
 *                       type: string
 *                     mq:
 *                       type: string
 *                 timestamp:
 *                   type: string
 */
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
