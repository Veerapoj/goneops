const { test, expect } = require('@playwright/test');
const { fixture, openFixturePage } = require('./helpers');

test('project API supports create, list, read, validation, and duplicate protection', async ({ request }) => {
  const name = `crud-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const create = await request.post('/api/projects', { data: { name } });
  expect(create.status()).toBe(201);
  const project = await create.json();
  expect(project.name).toBe(name);

  const list = await request.get('/api/projects');
  expect(list.status()).toBe(200);
  expect((await list.json()).some((item) => item.id === project.id && item.name === name)).toBeTruthy();

  const read = await request.get(`/api/projects/${project.id}`);
  expect(read.status()).toBe(200);
  expect((await read.json()).name).toBe(name);

  const missingName = await request.post('/api/projects', { data: {} });
  expect(missingName.status()).toBe(400);
  const duplicate = await request.post('/api/projects', { data: { name } });
  expect(duplicate.status()).toBe(409);
});

test('user can create a named environment from the Environments page', async ({ page }) => {
  const { project } = fixture();
  const envName = `qa-${Date.now()}`;
  await openFixturePage(page, '/environments');
  await page.waitForTimeout(2000);
  await expect(page.locator('body')).toContainText('Environments');
  await page.getByRole('button', { name: 'New Environment' }).click();
  await page.getByPlaceholder('e.g. staging, production').fill(envName);

  const responsePromise = page.waitForResponse(
    (response) => response.url().includes(`/api/projects/${project.id}/environments`) &&
      response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Create' }).click();
  expect((await responsePromise).status()).toBe(201);
});
