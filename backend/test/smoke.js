const assert = require('node:assert/strict');

const API = process.env.GONEOPS_API_URL || 'http://localhost:4000/api';
const FRONTEND = process.env.GONEOPS_FRONTEND_URL || 'http://localhost:3000';
const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const projectName = `smoke-${suffix}`;
let projectId;
let environmentId;
let sandboxStarted = false;
let passed = 0;

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, {
    headers: { 'content-type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

async function check(name, fn) {
  await fn();
  passed += 1;
  console.log(`PASS ${name}`);
}

async function waitFor(description, fn, timeoutMs = 180000, intervalMs = 2000) {
  const deadline = Date.now() + timeoutMs;
  let lastValue;
  while (Date.now() < deadline) {
    lastValue = await fn();
    if (lastValue?.done) return lastValue.value;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`Timed out waiting for ${description}; last value: ${JSON.stringify(lastValue)}`);
}

async function main() {
  await waitFor('backend readiness', async () => {
    try {
      const { response } = await request('/health');
      return { done: response.status === 200, value: response.status };
    } catch (error) {
      return { done: false, value: error.message };
    }
  }, 90000, 1000);

  await check('backend health', async () => {
    const { response, body } = await request('/health');
    assert.equal(response.status, 200);
    assert.equal(body.status, 'ok');
  });

  await check('seeded project is available', async () => {
    const { response, body } = await request('/projects');
    assert.equal(response.status, 200);
    assert.ok(body.some((project) => project.name === 'goneops-demo'));
  });

  await check('frontend serves the SPA and nested route fallback', async () => {
    for (const path of ['/', '/pipelines']) {
      const response = await fetch(`${FRONTEND}${path}`);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /<div id="root"><\/div>/);
    }
  });

  await check('project and environment creation', async () => {
    let result = await request('/projects', {
      method: 'POST',
      body: JSON.stringify({ name: projectName }),
    });
    assert.equal(result.response.status, 201);
    projectId = result.body.id;

    result = await request(`/projects/${projectId}/environments`, {
      method: 'POST',
      body: JSON.stringify({ name: 'dev' }),
    });
    assert.equal(result.response.status, 201);
    environmentId = result.body.id;
    assert.equal(result.body.status, 'stopped');
  });

  await check('cross-project environment access is rejected', async () => {
    const { response } = await request(`/projects/1/services?environment_id=${environmentId}`);
    assert.equal(response.status, 404);
  });

  await check('sandbox generation creates required files and four ports', async () => {
    const { response, body } = await request(`/projects/${projectId}/generate-sandbox`, {
      method: 'POST',
      body: JSON.stringify({ environment_id: environmentId }),
    });
    assert.equal(response.status, 200);
    assert.deepEqual(Object.keys(body.ports).sort(), ['db', 'mq', 'redis', 'web']);
    const generatedNames = body.files.map((file) => file.name);
    assert.ok(generatedNames.includes('README.md'));
    assert.ok(generatedNames.includes('.env.example'));
    assert.ok(generatedNames.includes('src/index.js'));
  });

  await check('file browser reads allowlisted files and blocks traversal', async () => {
    let result = await request(`/projects/${projectId}/files?environment_id=${environmentId}`);
    assert.equal(result.response.status, 200);
    assert.ok(JSON.stringify(result.body.files).includes('docker-compose.yml'));

    result = await request(`/projects/${projectId}/files/content?environment_id=${environmentId}&file_path=README.md`);
    assert.equal(result.response.status, 200);
    assert.match(result.body.content, new RegExp(projectName));

    result = await request(`/projects/${projectId}/files/content?environment_id=${environmentId}&file_path=..%2F..%2Fetc%2Fpasswd`);
    assert.equal(result.response.status, 403);
    assert.equal(result.body.error.code, 'path_forbidden');
  });

  await check('secrets API never returns plaintext values', async () => {
    const { response, body } = await request(`/projects/${projectId}/secrets?environment_id=${environmentId}`);
    assert.equal(response.status, 200);
    assert.equal(body.length, 3);
    for (const secret of body) assert.equal(secret.value, '••••••••');
    assert.doesNotMatch(JSON.stringify(body), /postgresql:\/\/|amqp:\/\//);
  });

  await check('database API masks credentials and omits plaintext connection strings', async () => {
    const { response, body } = await request(`/projects/${projectId}/databases?environment_id=${environmentId}`);
    assert.equal(response.status, 200);
    assert.equal(body.databases.length, 1);
    const database = body.databases[0];
    assert.equal(database.password, '••••••••');
    assert.equal(database.connection_string, undefined);
    assert.match(database.connection_string_masked, /^postgresql:\/\/goneops:••••••••@localhost:/);
    assert.doesNotMatch(JSON.stringify(body), /postgresql:\/\/goneops:[^•]/);
  });

  await check('sandbox starts and reaches running state', async () => {
    const result = await request(`/projects/${projectId}/run`, {
      method: 'POST',
      body: JSON.stringify({ environment_id: environmentId }),
    });
    assert.equal(result.response.status, 202);
    sandboxStarted = true;

    await waitFor('sandbox running', async () => {
      const current = await request(`/projects/${projectId}`);
      const environment = current.body.environments.find((item) => item.id === environmentId);
      if (environment.status === 'failed') throw new Error('Sandbox entered failed state');
      return { done: environment.status === 'running', value: environment };
    });
  });

  await check('sandbox API connects to PostgreSQL, Redis, and RabbitMQ', async () => {
    const { response, body } = await request(`/projects/${projectId}/test-api`, {
      method: 'POST',
      body: JSON.stringify({ environment_id: environmentId }),
    });
    assert.equal(response.status, 200);
    assert.equal(body.status, 200);
    assert.deepEqual(body.body.results, { pg: 'connected', redis: 'connected', mq: 'connected' });
  });

  await check('sandbox logs are available', async () => {
    const { response, body } = await request(`/projects/${projectId}/logs?environment_id=${environmentId}&tail=20`);
    assert.equal(response.status, 200);
    assert.match(body.logs, /Listening on port 8080/);
  });

  await check('sandbox restarts and returns to running state', async () => {
    const result = await request(`/projects/${projectId}/restart`, {
      method: 'POST',
      body: JSON.stringify({ environment_id: environmentId }),
    });
    assert.equal(result.response.status, 202);

    await waitFor('sandbox restart', async () => {
      const current = await request(`/projects/${projectId}`);
      const environment = current.body.environments.find((item) => item.id === environmentId);
      if (environment.status === 'failed') throw new Error('Sandbox restart entered failed state');
      return { done: environment.status === 'running', value: environment };
    });
  });

  await check('pipeline executes all six persisted steps', async () => {
    const start = await request(`/projects/${projectId}/pipelines/run`, {
      method: 'POST',
      body: JSON.stringify({ environment_id: environmentId }),
    });
    assert.equal(start.response.status, 202);

    const run = await waitFor('pipeline success', async () => {
      const current = await request(`/projects/${projectId}/pipelines?environment_id=${environmentId}`);
      const latest = current.body[0];
      if (latest?.status === 'failed') throw new Error('Pipeline entered failed state');
      return { done: latest?.status === 'success', value: latest };
    }, 120000);
    assert.equal(run.steps.length, 6);
    assert.ok(run.steps.every((step) => step.status === 'success' && step.duration_ms > 0 && step.logs));
  });

  await check('sandbox stops and reaches stopped state', async () => {
    const result = await request(`/projects/${projectId}/stop`, {
      method: 'POST',
      body: JSON.stringify({ environment_id: environmentId }),
    });
    assert.equal(result.response.status, 202);

    await waitFor('sandbox stopped', async () => {
      const current = await request(`/projects/${projectId}`);
      const environment = current.body.environments.find((item) => item.id === environmentId);
      return { done: environment.status === 'stopped', value: environment };
    });
    sandboxStarted = false;
  });

  console.log(`RESULT ${passed} passed, 0 failed`);
}

main().catch(async (error) => {
  console.error(`FAIL ${error.stack || error.message}`);
  if (sandboxStarted && projectId && environmentId) {
    try {
      await request(`/projects/${projectId}/stop`, {
        method: 'POST',
        body: JSON.stringify({ environment_id: environmentId }),
      });
    } catch {}
  }
  console.error(`RESULT ${passed} passed, 1 failed`);
  process.exitCode = 1;
});
