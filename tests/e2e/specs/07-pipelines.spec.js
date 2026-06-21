const { test, expect } = require('@playwright/test');
const { openFixturePage } = require('./helpers');

test('pipeline page displays run history and all six required stages', async ({ page }) => {
  await openFixturePage(page, '/pipelines');
  await expect(page.locator('body')).toContainText('Pipelines');
  await expect(page.locator('body')).toContainText('Run History');

  for (const stage of ['Checkout', 'Install', 'Lint & Test', 'Build', 'Deploy', 'Smoke Test']) {
    await expect(page.locator('body')).toContainText(stage);
  }

  await expect(page.getByRole('button', { name: /Run Pipeline|Triggering|Refresh/ })).toBeVisible();
});
