const { test, expect, request } = require('@playwright/test');

const apiBase = process.env.GONEOPS_API_URL || 'http://localhost:14000/api';
const requiredFiles = [
  'README.md',
  'package.json',
  'Dockerfile',
  'docker-compose.yml',
  '.env.example',
  'src/index.js',
];

let api;
let apiContext;
let project;
let environment;

async function selectFixture(page) {
  await page.addInitScript(
    ({ projectId, environmentId }) => {
      localStorage.setItem('selectedProjectId', projectId);
      localStorage.setItem('selectedEnvironmentId', environmentId);
    },
    { projectId: project.id, environmentId: environment.id },
  );
}

async function pollEnvironment(expected, timeout = 120_000) {
  const deadline = Date.now() + timeout;
  let detail;
  while (Date.now() < deadline) {
    const response = await api.get(`/projects/${project.id}`);
    expect(response.ok()).toBeTruthy();
    detail = await response.json();
    const current = detail.environments.find((item) => item.id === environment.id);
    if (current?.status === expected) return current;
    if (current?.status === 'failed' && expected !== 'failed') {
      throw new Error(`Environment entered failed state while waiting for ${expected}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error(`Timed out waiting for environment status ${expected}: ${JSON.stringify(detail)}`);
}

test.beforeAll(async () => {
  const parsedApiBase = new URL(apiBase);
  const apiPrefix = parsedApiBase.pathname.replace(/\/$/, '');
  apiContext = await request.newContext({ baseURL: parsedApiBase.origin });
  api = {
    get: (path, options) => apiContext.get(`${apiPrefix}${path}`, options),
    post: (path, options) => apiContext.post(`${apiPrefix}${path}`, options),
    delete: (path, options) => apiContext.delete(`${apiPrefix}${path}`, options),
  };
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const projectResponse = await api.post('/projects', {
    data: { name: `goneops-e2e-${suffix}` },
  });
  expect(projectResponse.status()).toBe(201);
  project = await projectResponse.json();

  const environmentResponse = await api.post(`/projects/${project.id}/environments`, {
    data: { name: 'dev' },
  });
  expect(environmentResponse.status()).toBe(201);
  environment = await environmentResponse.json();
});

test.afterAll(async () => {
  await apiContext?.dispose();
});

test('API health and project endpoints return valid data', async () => {
  const healthResponse = await api.get('/health');
  expect(healthResponse.status()).toBe(200);
  await expect(healthResponse.json()).resolves.toMatchObject({ status: 'ok' });

  const projectsResponse = await api.get('/projects');
  expect(projectsResponse.status()).toBe(200);
  const projects = await projectsResponse.json();
  expect(Array.isArray(projects)).toBeTruthy();
  expect(projects.some((item) => item.id === project.id)).toBeTruthy();

  const detailResponse = await api.get(`/projects/${project.id}`);
  expect(detailResponse.status()).toBe(200);
  const detail = await detailResponse.json();
  expect(detail.name).toBe(project.name);
  expect(detail.environments.some((item) => item.id === environment.id)).toBeTruthy();
});

test('API validation and not-found errors use correct status codes', async () => {
  expect((await api.post('/projects', { data: {} })).status()).toBe(400);
  expect((await api.get('/projects/not-a-real-project')).status()).toBe(404);
  expect((await api.post(`/projects/${project.id}/generate-sandbox`, { data: {} })).status()).toBe(400);
  expect((await api.get(`/projects/${project.id}/files`)).status()).toBe(400);
});

const pages = [
  ['/', 'Overview', 'Overview'],
  ['/environments', 'Environments', 'Environments'],
  ['/services', 'Services', 'Services'],
  ['/databases', 'Databases', 'Databases'],
  ['/pipelines', 'Pipelines', 'Pipelines'],
  ['/deployments', 'Deployments', 'Deployments'],
  ['/sandbox', 'Sandbox', 'Sandbox'],
  ['/files', 'File Browser', 'File Browser'],
  ['/terminal', 'Terminal', 'Terminal'],
  ['/logs', 'Logs', 'Container Logs'],
  ['/secrets', 'Secrets', 'Secrets'],
  ['/settings', 'Settings', 'Settings'],
];

for (const [path, navLabel, heading] of pages) {
  test(`${navLabel} page loads without a browser runtime error`, async ({ page }) => {
    await selectFixture(page);
    const runtimeErrors = [];
    page.on('pageerror', (error) => runtimeErrors.push(error.message));
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
    await expect(page.locator('aside').first()).toBeVisible();
    expect(runtimeErrors).toEqual([]);
  });
}

test('sidebar navigation routes to all 12 pages and marks the active item', async ({ page }) => {
  await selectFixture(page);
  await page.goto('/');

  for (const [path, navLabel, heading] of pages) {
    const link = page.getByRole('link', { name: navLabel, exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${path === '/' ? '/$' : `${path}$`}`));
    await expect(page.getByRole('heading', { name: heading, exact: true }).first()).toBeVisible();
    await expect(link).toHaveAttribute('aria-current', 'page');
  }
});

test('Overview follows the reference dashboard structure and styling', async ({ page }) => {
  await selectFixture(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();

  const sidebar = page.locator('aside').first();
  const sidebarBox = await sidebar.boundingBox();
  expect(sidebarBox?.width).toBeGreaterThanOrEqual(267);
  expect(sidebarBox?.width).toBeLessThanOrEqual(269);
  expect(await sidebar.evaluate((node) => getComputedStyle(node).backgroundColor)).toBe('rgb(7, 20, 39)');

  await expect(page.getByText('Environment', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Status', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Preview URL', { exact: true })).toBeVisible();
  await expect(page.getByText('Service Types', { exact: true })).toBeVisible();
  await expect(page.getByText('Runtime Services', { exact: true })).toBeVisible();
  await expect(page.getByText('CI/CD Pipeline', { exact: true })).toBeVisible();
  await expect(page.getByText('Live App', { exact: true })).toBeVisible();
  await expect(page.getByText('README', { exact: true })).toBeVisible();
  await expect(page.getByText('Quick Actions', { exact: true })).toBeVisible();
  await expect(page.locator('iframe')).toHaveCount(1);

  for (const service of ['Web Service', 'Database', 'Redis', 'Message Queue', 'Storage', 'Other']) {
    await expect(page.getByText(service, { exact: true }).first()).toBeVisible();
  }
  for (const step of ['Checkout', 'Install', 'Lint & Test', 'Build', 'Deploy', 'Smoke Test']) {
    await expect(page.getByText(step, { exact: true })).toBeVisible();
  }
});

test('Overview exposes a loading state while project APIs are pending', async ({ page }) => {
  await selectFixture(page);
  await page.route('**/api/projects', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.continue();
  });
  await page.goto('/');
  await expect(page.locator('.animate-spin').first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Overview', exact: true })).toBeVisible();
});

test('Overview exposes a recoverable error state for a failed project detail request', async ({ page }) => {
  await selectFixture(page);
  await page.route(`**/api/projects/${project.id}`, async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Synthetic E2E outage' }),
    });
  });
  await page.goto('/');
  await expect(page.getByText('Synthetic E2E outage', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});

test('Sandbox UI generates real project files', async ({ page }) => {
  await selectFixture(page);
  await page.goto('/sandbox');
  await page.getByRole('button', { name: 'Generate Sandbox' }).click();
  await expect(page.getByText('Generate Sandbox Result')).toBeVisible();
  await expect(page.locator('pre').filter({ hasText: 'docker-compose.yml' })).toBeVisible();

  const filesResponse = await api.get(`/projects/${project.id}/files`, {
    params: { environment_id: environment.id },
  });
  expect(filesResponse.status()).toBe(200);
  const payload = await filesResponse.json();
  const flatten = (nodes) => nodes.flatMap((node) => node.children ? [node.path, ...flatten(node.children)] : [node.path]);
  const paths = flatten(payload.files);
  for (const file of requiredFiles) expect(paths).toContain(file);
});

test('File Browser reads generated README and source code', async ({ page }) => {
  await selectFixture(page);
  await page.goto('/files');
  await page.getByRole('button', { name: 'README.md' }).click();
  await expect(page.locator('pre')).toContainText(project.name);
  await page.getByRole('button', { name: 'src' }).click();
  await page.getByRole('button', { name: 'index.js' }).click();
  await expect(page.locator('pre')).toContainText('/api/test');
});

test('Generated file API rejects path traversal', async () => {
  const response = await api.get(`/projects/${project.id}/files/content`, {
    params: { environment_id: environment.id, file_path: '../../etc/passwd' },
  });
  expect(response.status()).toBe(403);
});

test('Sandbox can run and its real API connects to PostgreSQL, Redis, and RabbitMQ', async ({ page }) => {
  await selectFixture(page);
  await page.goto('/sandbox');
  await page.getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.getByText('Run Result')).toBeVisible();
  await pollEnvironment('running');

  await page.reload();
  await page.getByRole('button', { name: 'Test API' }).click();
  const result = page.locator('pre').filter({ hasText: '"pg": "connected"' });
  await expect(result).toContainText('"redis": "connected"');
  await expect(result).toContainText('"mq": "connected"');
});

test('Runtime service, database, log, and secret APIs expose live sandbox data safely', async () => {
  const params = { environment_id: environment.id };
  const servicesResponse = await api.get(`/projects/${project.id}/services`, { params });
  expect(servicesResponse.status()).toBe(200);
  expect((await servicesResponse.json()).length).toBe(4);

  const databasesResponse = await api.get(`/projects/${project.id}/databases`, { params });
  expect(databasesResponse.status()).toBe(200);
  const databases = await databasesResponse.json();
  expect(databases.databases[0].password).toBe('••••••••');
  expect(databases.databases[0].connection_string_masked).not.toMatch(/postgres(?:ql)?:\/\/[^:]+:[^•]/);

  const secretsResponse = await api.get(`/projects/${project.id}/secrets`, { params });
  expect(secretsResponse.status()).toBe(200);
  const secrets = await secretsResponse.json();
  expect(secrets.length).toBeGreaterThanOrEqual(3);
  expect(secrets.every((item) => item.value === '••••••••')).toBeTruthy();

  const logsResponse = await api.get(`/projects/${project.id}/logs`, { params: { ...params, tail: 100 } });
  expect(logsResponse.status()).toBe(200);
  expect((await logsResponse.json()).logs).toContain('Listening on port');
});

test('Pipeline runs all six required stages and persists the result', async () => {
  const trigger = await api.post(`/projects/${project.id}/pipelines/run`, {
    data: { environment_id: environment.id },
  });
  expect(trigger.status()).toBe(202);

  const deadline = Date.now() + 120_000;
  let runs = [];
  while (Date.now() < deadline) {
    const response = await api.get(`/projects/${project.id}/pipelines`, {
      params: { environment_id: environment.id },
    });
    expect(response.status()).toBe(200);
    runs = await response.json();
    if (runs[0]?.status === 'success' || runs[0]?.status === 'failed') break;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  expect(runs[0]?.status).toBe('success');
  expect(runs[0]?.steps.map((step) => step.name)).toEqual([
    'Checkout', 'Install', 'Lint & Test', 'Build', 'Deploy', 'Smoke Test',
  ]);
  expect(runs[0]?.steps.every((step) => step.status === 'success')).toBeTruthy();
});

test('Sandbox restart and stop lifecycle completes', async () => {
  const restart = await api.post(`/projects/${project.id}/restart`, {
    data: { environment_id: environment.id },
  });
  expect(restart.status()).toBe(202);
  await pollEnvironment('running');

  const stop = await api.post(`/projects/${project.id}/stop`, {
    data: { environment_id: environment.id },
  });
  expect(stop.status()).toBe(202);
  await pollEnvironment('stopped');
});
