const { test, expect } = require('@playwright/test');
const { openFixturePage } = require('./helpers');

test('pipeline page displays run history and all six required stages', async ({ page }) => {
  await openFixturePage(page, '/pipelines');
  await expect(page.getByText('Latest Run', { exact: true })).toBeVisible();
  await expect(page.getByText('Run History', { exact: true })).toBeVisible();

  for (const stage of ['Checkout', 'Install', 'Lint & Test', 'Build', 'Deploy', 'Smoke Test']) {
    await expect(page.getByText(stage, { exact: true }).first()).toBeVisible();
  }

  await expect(page.getByRole('button', { name: /Run Pipeline|Triggering/ })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: /Run #1/ })).toBeVisible();
});
