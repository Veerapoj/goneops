const { test, expect } = require('@playwright/test');
const { fixture, openFixturePage } = require('./helpers');

test('secrets remain masked and a user can add and delete a secret', async ({ page }) => {
  const { project, environment } = fixture();
  await openFixturePage(page, '/secrets');
  await expect(page.getByText('DATABASE_URL', { exact: true })).toBeVisible();
  await expect(page.getByText('••••••••', { exact: true }).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText('postgresql://goneops:');

  const key = `E2E_TOKEN_${Date.now()}`;
  await page.getByRole('button', { name: 'Add Secret' }).click();
  await page.getByLabel('Key').fill(key);
  await page.getByLabel('Value').fill('super-secret-e2e-value');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText(key, { exact: true })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('super-secret-e2e-value');

  const api = await page.request.get(
    `/api/projects/${project.id}/secrets?environment_id=${environment.id}`
  );
  const secret = (await api.json()).find((item) => item.key === key);
  expect(secret.value).toBe('••••••••');

  const row = page.getByRole('row').filter({ hasText: key });
  page.once('dialog', (dialog) => dialog.accept());
  await row.hover();
  await row.getByRole('button').last().click();
  await expect(page.getByText(key, { exact: true })).toHaveCount(0);
});
