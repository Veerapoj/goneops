const { test, expect } = require('@playwright/test');
const { openFixturePage } = require('./helpers');

const pages = [
  ['Overview', '/', 'Overview'],
  ['Environments', '/environments', 'Environments'],
  ['Services', '/services', 'Services'],
  ['Databases', '/databases', 'Databases'],
  ['Secrets', '/secrets', 'Secrets'],
  ['Settings', '/settings', 'Settings'],
  ['Pipelines', '/pipelines', 'Pipelines'],
  ['Deployments', '/deployments', 'Deployments'],
  ['Sandbox', '/sandbox', 'Sandbox'],
  ['File Browser', '/files', 'File Browser'],
  ['Terminal', '/terminal', 'Terminal'],
  ['Logs', '/logs', 'Container Logs'],
];

test('sidebar exposes all 12 required pages and navigates to each route', async ({ page }) => {
  await openFixturePage(page);
  const nav = page.locator('aside nav');

  for (const [label, route, heading] of pages) {
    const link = nav.getByRole('link', { name: label, exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(new RegExp(`${route === '/' ? '/$' : `${route}$`}`));
    await expect(page.getByRole('heading', { name: heading, exact: true }).last()).toBeVisible();
  }
});
