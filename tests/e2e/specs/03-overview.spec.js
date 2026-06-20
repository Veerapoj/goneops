const { test, expect } = require('@playwright/test');
const { fixture, openFixturePage } = require('./helpers');

test('overview follows the reference dashboard structure and project data', async ({ page }) => {
  const { projectName } = fixture();
  await openFixturePage(page);

  await expect(page.locator('aside')).toHaveCSS('width', '268px');
  await expect(page.locator('aside')).toHaveCSS('background-color', 'rgb(7, 20, 39)');
  await expect(page.locator('header')).toHaveCSS('height', '72px');
  await expect(page.getByText(projectName, { exact: true }).first()).toBeVisible();

  for (const text of [
    'Environment', 'Status', 'Preview URL', 'Service Types', 'Runtime Services',
    'CI/CD Pipeline', 'Live App', 'README', 'Project Info', 'Quick Actions',
  ]) {
    await expect(page.getByText(text, { exact: true }).first()).toBeVisible();
  }

  await expect(page.getByText('Node.js Runtime', { exact: true })).toBeVisible();
  await expect(page.getByText('PostgreSQL Database', { exact: true })).toBeVisible();
  await expect(page.getByText('Redis Cache', { exact: true })).toBeVisible();
  await expect(page.getByText('RabbitMQ Queue', { exact: true })).toBeVisible();
});
