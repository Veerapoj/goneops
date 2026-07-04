const { test, expect } = require('@playwright/test');
const { openFixturePage } = require('./helpers');

const dxRoutes = ['/', '/environments', '/sandbox'];
const platformRoutes = [
  '/platform',
  '/platform/providers',
  '/platform/discovery',
  '/platform/inventory',
  '/platform/containers',
  '/platform/applications',
  '/platform/mapping',
  '/platform/operations',
  '/platform/capacity',
  '/platform/governance',
];

async function sidebarWidth(page) {
  return page.locator('aside').evaluate((aside) => Math.round(parseFloat(getComputedStyle(aside).width)));
}

test('DX pages keep the original 268px sidebar without platform groups', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  for (const route of dxRoutes) {
    await openFixturePage(page, route);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `artifacts/screenshot-dx-${route.replace(/\//g, '_') || 'index'}.png`, fullPage: true });

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(await sidebarWidth(page)).toBe(268);

    await expect(sidebar).toContainText('PROJECT');
    await expect(sidebar).toContainText('CI/CD');
    await expect(sidebar).toContainText('SANDBOX');
    await expect(sidebar.getByRole('link', { name: 'Overview', exact: true })).toBeVisible();

    await expect(sidebar).not.toContainText('DISCOVERY');
    await expect(sidebar).not.toContainText('INVENTORY');
    await expect(sidebar).not.toContainText('MAPPING');
    await expect(sidebar).not.toContainText('OPERATIONS');
    await expect(sidebar).not.toContainText('GOVERNANCE');
    await expect(sidebar.getByRole('link', { name: 'Dashboard', exact: true })).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('GoneOps Platform Admin');
  }

  expect(errors).toEqual([]);
});

test('Platform pages use the separate 240px admin sidebar and backlink', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  for (const route of platformRoutes) {
    await openFixturePage(page, route);
    await page.waitForTimeout(500);
    await page.screenshot({ path: `artifacts/screenshot-platform-${route.replace(/\//g, '_')}.png`, fullPage: true });

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(await sidebarWidth(page)).toBe(240);

    for (const group of ['PLATFORM', 'DISCOVERY', 'INVENTORY', 'MAPPING', 'OPERATIONS', 'GOVERNANCE']) {
      await expect(sidebar).toContainText(group);
    }

    await expect(sidebar.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: 'Overview', exact: true })).toHaveCount(0);
    await expect(sidebar).not.toContainText('PROJECT');
    await expect(sidebar).not.toContainText('CI/CD');
    await expect(sidebar).not.toContainText('SANDBOX');

    await expect(page.getByRole('link', { name: 'DX Dashboard' })).toHaveAttribute('href', '/');
    await expect(page.locator('body')).toContainText('GoneOps Platform Admin');
    await expect(page.locator('main, .flex-1.overflow-y-auto').last()).not.toBeEmpty();
  }

  expect(errors).toEqual([]);
});

test('DX Dashboard link navigates to /', async ({ page }) => {
  await openFixturePage(page, '/platform');
  const dashboardLink = page.getByRole('link', { name: 'DX Dashboard' });
  await expect(dashboardLink).toHaveAttribute('href', '/');
  await dashboardLink.click();
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/\/$/);
  await expect(await sidebarWidth(page)).toBe(268);
});

test('all platform sub-routes render non-empty content with correct sidebar', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  for (const route of platformRoutes) {
    await openFixturePage(page, route);
    await page.waitForTimeout(300);

    const sidebar = page.locator('aside');
    await expect(sidebar).toBeVisible();
    await expect(await sidebarWidth(page)).toBe(240);
    await expect(page.getByRole('link', { name: 'DX Dashboard' })).toHaveAttribute('href', '/');
    await expect(page.locator('body')).toContainText('GoneOps Platform Admin');

    const mainEl = page.locator('main, .flex-1.overflow-y-auto').last();
    await expect(mainEl).not.toBeEmpty();
  }

  expect(errors).toEqual([]);
});
