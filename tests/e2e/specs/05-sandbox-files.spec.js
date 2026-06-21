const { test, expect } = require('@playwright/test');
const { fixture, openFixturePage } = require('./helpers');

test('Generate Sandbox creates the required real files and service metadata', async ({ page }) => {
  const { project, environment, projectName } = fixture();
  await openFixturePage(page, '/sandbox');
  const responsePromise = page.waitForResponse(
    (response) => response.url().endsWith(`/api/projects/${project.id}/generate-sandbox`) &&
      response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Generate Sandbox' }).click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.config.projectName).toBe(projectName);
  expect(body.config.envName).toBe('dev');
  expect(body.config.dbName).toBe(`${projectName.replace(/-/g, '_')}_dev_db`);
  const fileNames = body.files.map((f) => f.name || f);
  expect(fileNames).toEqual(expect.arrayContaining([
    'README.md', 'package.json', 'Dockerfile', 'docker-compose.yml',
    '.env', '.env.example', 'src/index.js',
  ]));

  const services = await page.request.get(
    `/api/projects/${project.id}/services?environment_id=${environment.id}`
  );
  expect(services.status()).toBe(200);
  expect((await services.json()).map((service) => service.type)).toEqual(
    expect.arrayContaining(['runtime', 'database', 'cache', 'queue'])
  );
  await expect(page.getByText('Generate Sandbox Result')).toBeVisible();
});

test('file browser lists generated files and opens their real content', async ({ page }) => {
  await openFixturePage(page, '/files');
  for (const file of ['README.md', 'package.json', 'Dockerfile', 'docker-compose.yml', '.env.example']) {
    await expect(page.getByRole('button', { name: file, exact: true })).toBeVisible();
  }

  await page.getByRole('button', { name: 'src', exact: true }).click();
  await expect(page.getByRole('button', { name: 'index.js', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'index.js', exact: true }).click();
  await expect(page.locator('pre')).toContainText("app.get('/health'");
  await expect(page.locator('pre')).toContainText("app.get('/api/test'");

  await page.getByRole('button', { name: 'README.md', exact: true }).click();
  await expect(page.locator('pre')).toContainText('GoneOps');
});
