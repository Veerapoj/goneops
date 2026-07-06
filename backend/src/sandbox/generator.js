const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { query } = require('../lib/db');
const { allocatePorts } = require('./ports');
const { generateReadme } = require('./readme');
const proxmoxClient = require('../lib/proxmoxClient');
const { listProviders: listProxmoxProviders, getProviderWithSecret, buildClientFromProvider, insertTask, writeAuditLog } = require('../services/proxmoxService');

const SANDBOX_BASE = process.env.SANDBOX_BASE_DIR || '/tmp/goneops-sandboxes';
const { resolveRuntimeHost } = require('./runtimeLocation');

async function generateSandbox(projectId, environmentId) {
  const project = await query('SELECT * FROM projects WHERE id = $1', [projectId]);
  if (!project.rows.length) throw Object.assign(new Error('Project not found'), { status: 404, code: 'not_found' });

  const env = await query('SELECT * FROM environments WHERE id = $1 AND project_id = $2', [environmentId, projectId]);
  if (!env.rows.length) throw Object.assign(new Error('Environment not found'), { status: 404, code: 'not_found' });

  const projectName = project.rows[0].name;
  const envName = env.rows[0].name;
  const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeEnv = envName.replace(/[^a-zA-Z0-9_-]/g, '_');
  const prefix = `${safeName}_${safeEnv}`;

  const workingDir = path.join(SANDBOX_BASE, `${prefix}-sandbox`);

  const ports = await allocatePorts(environmentId);
  const [webPort, dbPort, redisPort, mqPort] = ports;

  const dbName = `${prefix}_db`.replace(/-/g, '_');
  const dbUser = 'goneops';
  const dbPass = generatePassword(16);
  const redisName = `${prefix}_redis`;
  const mqUser = 'goneops';
  const mqPass = generatePassword(16);

  const config = {
    projectName, envName, prefix, workingDir,
    webPort, dbPort, redisPort, mqPort,
    dbName, dbUser, dbPass,
    redisName,
    mqUser, mqPass,
  };

  const templateDir = path.join(__dirname, '..', '..', '..', 'sandbox-template');
  const useTemplates = fs.existsSync(path.join(templateDir, 'package.json'));

  const operationId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const tmpDir = `${workingDir}.tmp-${operationId}`;

  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });

    if (useTemplates) {
      writeFileFromTemplate(templateDir, 'package.json', tmpDir, 'package.json', config);
      writeFileFromTemplate(path.join(templateDir, 'src'), 'index.js', path.join(tmpDir, 'src'), 'index.js', config);
      writeFileFromTemplate(templateDir, 'Dockerfile', tmpDir, 'Dockerfile', config);
      writeFileFromTemplate(templateDir, 'docker-compose.yml', tmpDir, 'docker-compose.yml', config);
      writeFileFromTemplate(templateDir, '.env', tmpDir, '.env', config);
      writeFileFromTemplate(templateDir, '.env.example', tmpDir, '.env.example', config);
      const readmeTemplate = fs.readFileSync(path.join(templateDir, 'README.md'), 'utf-8');
      const readme = applyTemplate(readmeTemplate, config);
      fs.writeFileSync(path.join(tmpDir, 'README.md'), readme);
    } else {
      writePackageJson(tmpDir, config);
      writeSrcIndex(tmpDir, config);
      writeDockerfile(tmpDir, config);
      writeDockerCompose(tmpDir, config);
      writeEnvFile(tmpDir, config);
      writeEnvExampleFile(tmpDir, config);
      const readme = generateReadme(config);
      fs.writeFileSync(path.join(tmpDir, 'README.md'), readme);
    }

    if (fs.existsSync(workingDir)) {
      const backupDir = `${workingDir}.backup-${operationId}`;
      fs.renameSync(workingDir, backupDir);
      try {
        fs.renameSync(tmpDir, workingDir);
        const removeBackup = () => {
          try { fs.rmSync(backupDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
        };
        setImmediate(removeBackup);
      } catch (renameErr) {
        fs.renameSync(backupDir, workingDir);
        throw renameErr;
      }
    } else {
      fs.renameSync(tmpDir, workingDir);
    }

    await query(
      'UPDATE environments SET working_dir = $1, preview_url = $2, updated_at = NOW() WHERE id = $3',
      [workingDir, `http://${resolveRuntimeHost()}:${webPort}`, environmentId]
    );

    await provisionSandboxLxc(environmentId, projectId, projectName, envName, prefix, workingDir);
  } catch (genErr) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch (e) { /* ignore */ }
    throw genErr;
  }

  await query('DELETE FROM services WHERE environment_id = $1', [environmentId]);
  await query(
    `INSERT INTO services (environment_id, name, type, status, port, config)
     VALUES ($1, 'Node.js Runtime', 'runtime', 'unhealthy', $2, '{"version":"20-alpine"}'::jsonb)`,
    [environmentId, webPort]
  );
  await query(
    `INSERT INTO services (environment_id, name, type, status, port, config)
     VALUES ($1, 'PostgreSQL Database', 'database', 'unhealthy', $2, $3::jsonb)`,
    [environmentId, dbPort, JSON.stringify({ database: dbName, username: dbUser })]
  );
  await query(
    `INSERT INTO services (environment_id, name, type, status, port, config)
     VALUES ($1, 'Redis Cache', 'cache', 'unhealthy', $2, $3::jsonb)`,
    [environmentId, redisPort, JSON.stringify({ host: redisName })]
  );
  await query(
    `INSERT INTO services (environment_id, name, type, status, port, config)
     VALUES ($1, 'RabbitMQ Queue', 'queue', 'unhealthy', $2, $3::jsonb)`,
    [environmentId, mqPort, JSON.stringify({ username: mqUser })]
  );

  await query('DELETE FROM secrets WHERE environment_id = $1', [environmentId]);
  await query(
    `INSERT INTO secrets (project_id, environment_id, key, value) VALUES ($1, $2, 'DATABASE_URL', $3)`,
    [projectId, environmentId, `postgresql://${dbUser}:${dbPass}@localhost:${dbPort}/${dbName}`]
  );
  await query(
    `INSERT INTO secrets (project_id, environment_id, key, value) VALUES ($1, $2, 'REDIS_URL', $3)`,
    [projectId, environmentId, `redis://localhost:${redisPort}`]
  );
  await query(
    `INSERT INTO secrets (project_id, environment_id, key, value) VALUES ($1, $2, 'RABBITMQ_URL', $3)`,
    [projectId, environmentId, `amqp://${mqUser}:${mqPass}@localhost:${mqPort}`]
  );

  const fileList = listGeneratedFiles(workingDir);
  return {
    config: {
      projectName,
      envName,
      prefix,
      workingDir,
      webPort,
      dbPort,
      redisPort,
      mqPort,
      dbName,
      dbUser,
      redisName,
      mqUser,
    },
    files: fileList,
    ports: { web: webPort, db: dbPort, redis: redisPort, mq: mqPort },
    path: workingDir,
  };
}

function writePackageJson(dir, config) {
  const pkg = {
    name: `${config.prefix}-app`,
    version: '1.0.0',
    description: `Sandbox app for ${config.projectName} (${config.envName})`,
    main: 'src/index.js',
    scripts: {
      start: 'node src/index.js',
      dev: 'node --watch src/index.js'
    },
    dependencies: {
      express: '^4.21.0',
      pg: '^8.13.0',
      ioredis: '^5.4.0',
      amqplib: '^0.10.4',
      'swagger-jsdoc': '^6.2.8',
      'swagger-ui-express': '^5.0.1'
    }
  };
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));
}

function writeSrcIndex(dir, config) {
  const code = `const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const app = express();
const PORT = process.env.PORT || 8080;

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: '${config.prefix}-app',
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
  res.json({ status: 'ok', timestamp: new Date().toISOString(), service: '${config.prefix}-app' });
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
      database: process.env.PGDATABASE || '${config.dbName}',
      user: process.env.PGUSER || '${config.dbUser}',
      password: process.env.PGPASSWORD || '${config.dbPass}',
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

app.listen(PORT, () => console.log(\`[${config.prefix}-app] Listening on port \${PORT}\`));
`;
  fs.writeFileSync(path.join(dir, 'src', 'index.js'), code);
}

function writeDockerfile(dir, config) {
  const dockerfile = `FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY src/ ./src/
ENV PORT=8080
EXPOSE 8080
CMD ["node", "src/index.js"]
`;
  fs.writeFileSync(path.join(dir, 'Dockerfile'), dockerfile);
}

function writeDockerCompose(dir, config) {
  const compose = `name: ${config.prefix}-sandbox

services:
  web:
    build: .
    container_name: ${config.prefix}_web
    ports:
      - "${config.webPort}:8080"
    environment:
      - PORT=8080
      - PGHOST=${config.prefix}_db
      - PGPORT=5432
      - PGDATABASE=${config.dbName}
      - PGUSER=${config.dbUser}
      - PGPASSWORD=${config.dbPass}
      - REDIS_HOST=${config.prefix}_redis
      - REDIS_PORT=6379
      - RABBITMQ_URL=amqp://${config.mqUser}:${config.mqPass}@${config.prefix}_mq:5672
    networks:
      goneops_net:
        aliases:
          - ${config.prefix}_web
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
      mq:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:8080/health"]
      interval: 2s
      timeout: 3s
      retries: 30

  db:
    image: postgres:15-alpine
    container_name: ${config.prefix}_db
    ports:
      - "${config.dbPort}:5432"
    environment:
      - POSTGRES_DB=${config.dbName}
      - POSTGRES_USER=${config.dbUser}
      - POSTGRES_PASSWORD=${config.dbPass}
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${config.dbUser} -d ${config.dbName}"]
      interval: 2s
      timeout: 3s
      retries: 30
    networks:
      goneops_net:
        aliases:
          - ${config.prefix}_db

  redis:
    image: redis:7-alpine
    container_name: ${config.prefix}_redis
    ports:
      - "${config.redisPort}:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 3s
      retries: 30
    networks:
      goneops_net:
        aliases:
          - ${config.prefix}_redis

  mq:
    image: rabbitmq:3.12-alpine
    container_name: ${config.prefix}_mq
    ports:
      - "${config.mqPort}:5672"
    environment:
      - RABBITMQ_DEFAULT_USER=${config.mqUser}
      - RABBITMQ_DEFAULT_PASS=${config.mqPass}
    healthcheck:
      test: ["CMD-SHELL", "su-exec rabbitmq rabbitmq-diagnostics -q check_port_connectivity"]
      interval: 2s
      timeout: 5s
      retries: 30
    networks:
      goneops_net:
        aliases:
          - ${config.prefix}_mq

networks:
  goneops_net:
    external: true
`;
  fs.writeFileSync(path.join(dir, 'docker-compose.yml'), compose);
}

function writeEnvFile(dir, config) {
  const envFile = `# ${config.prefix} Sandbox Environment
# Generated by GoneOps
PORT=8080
PGHOST=${config.prefix}_db
PGPORT=5432
PGDATABASE=${config.dbName}
PGUSER=${config.dbUser}
PGPASSWORD=${config.dbPass}
REDIS_HOST=${config.prefix}_redis
REDIS_PORT=6379
RABBITMQ_URL=amqp://${config.mqUser}:${config.mqPass}@${config.prefix}_mq:5672
`;
  fs.writeFileSync(path.join(dir, '.env'), envFile);
}

function writeEnvExampleFile(dir, config) {
  const envExample = `# Copy to .env and replace placeholders for local use
PORT=8080
PGHOST=${config.prefix}_db
PGPORT=5432
PGDATABASE=${config.dbName}
PGUSER=${config.dbUser}
PGPASSWORD=replace-me
REDIS_HOST=${config.prefix}_redis
REDIS_PORT=6379
RABBITMQ_URL=amqp://${config.mqUser}:replace-me@${config.prefix}_mq:5672
`;
  fs.writeFileSync(path.join(dir, '.env.example'), envExample);
}

function generatePassword(length) {
  return crypto.randomBytes(Math.ceil(length * 0.75)).toString('base64url').slice(0, length);
}

async function provisionSandboxLxc(environmentId, projectId, projectName, envName, prefix, workingDir) {
  try {
    const providers = await listProxmoxProviders();
    const connected = providers.filter((p) => p.status === 'connected');
    if (!connected.length) {
      console.log(`[generator] No connected Proxmox provider found; LXC provisioning skipped for env ${environmentId}`);
      return;
    }

    const provider = connected[0];
    const fullProvider = await getProviderWithSecret(provider.id);
    const client = buildClientFromProvider(fullProvider);

    const nodes = await proxmoxClient.getNodes(client);
    if (!nodes.length) {
      console.log(`[generator] No nodes available on Proxmox provider ${provider.id}; LXC provisioning skipped`);
      return;
    }
    const targetNode = nodes[0].node;

    const nextIdData = await proxmoxClient.getNextId(client);
    const vmid = (nextIdData && nextIdData.nextid) || nextIdData;
    if (!vmid) {
      console.log(`[generator] Could not obtain next VM ID; LXC provisioning skipped`);
      return;
    }

    const ostemplate = fullProvider.ostemplate || 'local:vztmpl/ubuntu-24.04-standard_24.04-1_amd64.tar.zst';

    const lxcConfig = {
      ostemplate,
      vmid,
      hostname: prefix.replace(/_/g, '-'),
      storage: 'local-lvm',
      cores: 2,
      memory: 2048,
      swap: 1024,
      rootfs: 'local-lvm:8',
      net0: 'name=eth0,bridge=vmbr0,ip=dhcp',
      password: generatePassword(16),
      start: true,
      unprivileged: 1,
      features: 'nesting=1,keyctl=1',
    };

    const result = await proxmoxClient.createLXC(client, targetNode, lxcConfig);
    const upid = (result && result.data) || null;
    if (upid) {
      await insertTask({ upid, providerId: provider.id, node: targetNode, vmid, type: 'lxc', action: 'lxc_create' });
    }

    await query(
      `UPDATE environments
          SET lxc_vmid = $1, lxc_node = $2, lxc_provider_id = $3, lxc_status = 'provisioning', updated_at = NOW()
        WHERE id = $4`,
      [vmid, targetNode, provider.id, environmentId]
    );

    await writeAuditLog({
      actor: 'system',
      action: 'sandbox_lxc_create',
      resource_type: 'lxc',
      resource_id: vmid,
      provider_id: provider.id,
      result: 'success',
      message: `Sandbox LXC ${prefix} (vmid ${vmid}) created on node ${targetNode} for env ${environmentId}`,
      metadata: { upid, vmid, node: targetNode, environment_id: environmentId, project_id: projectId },
    });

    console.log(`[generator] LXC vmid ${vmid} provisioned on node ${targetNode} for sandbox env ${environmentId}`);
  } catch (err) {
    console.error(`[generator] LXC provisioning failed for env ${environmentId}: ${err.message}`);
    await query(
      'UPDATE environments SET lxc_status = $1, updated_at = NOW() WHERE id = $2',
      ['error', environmentId]
    );
  }
}

function applyTemplate(template, config) {
  return template
    .replace(/{{PREFIX}}/g, config.prefix)
    .replace(/{{PROJECT_NAME}}/g, config.projectName)
    .replace(/{{ENV_NAME}}/g, config.envName)
    .replace(/{{WEB_PORT}}/g, config.webPort)
    .replace(/{{DB_PORT}}/g, config.dbPort)
    .replace(/{{REDIS_PORT}}/g, config.redisPort)
    .replace(/{{MQ_PORT}}/g, config.mqPort)
    .replace(/{{DB_NAME}}/g, config.dbName)
    .replace(/{{DB_USER}}/g, config.dbUser)
    .replace(/{{DB_PASS}}/g, config.dbPass)
    .replace(/{{MQ_USER}}/g, config.mqUser)
    .replace(/{{MQ_PASS}}/g, config.mqPass);
}

function writeFileFromTemplate(templateDir, templateName, outputDir, outputName, config) {
  const templatePath = path.join(templateDir, templateName);
  const outputPath = path.join(outputDir, outputName);
  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const rendered = applyTemplate(templateContent, config);
  fs.writeFileSync(outputPath, rendered);
}

function listGeneratedFiles(dir) {
  const files = [];
  function walk(current, base) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      const relative = path.relative(base, fullPath);
      if (entry.isDirectory()) {
        walk(fullPath, base);
      } else {
        const stat = fs.statSync(fullPath);
        files.push({ name: relative, path: fullPath, size: stat.size });
      }
    }
  }
  walk(dir, dir);
  return files.sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = { generateSandbox };
