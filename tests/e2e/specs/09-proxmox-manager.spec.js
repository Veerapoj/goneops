const { test, expect } = require('@playwright/test');

const proxmoxRoutes = [
  '/platform/proxmox/providers',
  '/platform/proxmox/nodes',
  '/platform/proxmox/vms',
  '/platform/proxmox/templates',
  '/platform/proxmox/snapshots',
  '/platform/proxmox/tasks',
  '/platform/proxmox/audit-logs',
];

async function sidebarWidth(page) {
  return page.locator('aside').evaluate((aside) => Math.round(parseFloat(getComputedStyle(aside).width)));
}

test('Platform Admin dashboard renders with 240px sidebar and PROXMOX nav group', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.addInitScript(() => {
    localStorage.setItem('selectedProjectId', '1');
    localStorage.setItem('selectedEnvironmentId', '1');
  });
  await page.goto('/platform');
  await page.waitForTimeout(2000);

  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(await sidebarWidth(page)).toBe(240);

  await expect(page.locator('body')).toContainText('GoneOps Platform Admin');
  await expect(sidebar).toContainText('PROXMOX');

  const proxmoxLinks = [
    { href: '/platform/proxmox/providers', name: 'Providers' },
    { href: '/platform/proxmox/nodes', name: 'Nodes' },
    { href: '/platform/proxmox/vms', name: 'Virtual Machines' },
    { href: '/platform/proxmox/templates', name: 'Templates' },
    { href: '/platform/proxmox/snapshots', name: 'Snapshots' },
    { href: '/platform/proxmox/tasks', name: 'Tasks' },
    { href: '/platform/proxmox/audit-logs', name: 'Audit Logs' },
  ];
  for (const { href, name } of proxmoxLinks) {
    const link = sidebar.locator(`a[href="${href}"]`);
    await expect(link).toBeVisible();
    await expect(link).toHaveText(name);
  }

  const mainEl = page.locator('main, .flex-1.overflow-y-auto').last();
  await expect(mainEl).not.toBeEmpty();

  expect(errors).toEqual([]);
});

test('Proxmox Providers page renders', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.addInitScript(() => {
    localStorage.setItem('selectedProjectId', '1');
    localStorage.setItem('selectedEnvironmentId', '1');
  });
  await page.goto('/platform/proxmox/providers');
  await page.waitForTimeout(2000);

  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(await sidebarWidth(page)).toBe(240);
  await expect(page.locator('body')).toContainText('GoneOps Platform Admin');

  const mainEl = page.locator('main, .flex-1.overflow-y-auto').last();
  await expect(mainEl).not.toBeEmpty();

  expect(errors).toEqual([]);
});

test('Proxmox Nodes page renders', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.addInitScript(() => {
    localStorage.setItem('selectedProjectId', '1');
    localStorage.setItem('selectedEnvironmentId', '1');
  });
  await page.goto('/platform/proxmox/nodes');
  await page.waitForTimeout(2000);

  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(await sidebarWidth(page)).toBe(240);
  await expect(page.locator('body')).toContainText('GoneOps Platform Admin');

  const mainEl = page.locator('main, .flex-1.overflow-y-auto').last();
  await expect(mainEl).not.toBeEmpty();

  expect(errors).toEqual([]);
});

test('Proxmox Virtual Machines page renders', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.addInitScript(() => {
    localStorage.setItem('selectedProjectId', '1');
    localStorage.setItem('selectedEnvironmentId', '1');
  });
  await page.goto('/platform/proxmox/vms');
  await page.waitForTimeout(2000);

  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(await sidebarWidth(page)).toBe(240);
  await expect(page.locator('body')).toContainText('GoneOps Platform Admin');

  const mainEl = page.locator('main, .flex-1.overflow-y-auto').last();
  await expect(mainEl).not.toBeEmpty();

  expect(errors).toEqual([]);
});

test('Proxmox Templates page renders', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.addInitScript(() => {
    localStorage.setItem('selectedProjectId', '1');
    localStorage.setItem('selectedEnvironmentId', '1');
  });
  await page.goto('/platform/proxmox/templates');
  await page.waitForTimeout(2000);

  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(await sidebarWidth(page)).toBe(240);
  await expect(page.locator('body')).toContainText('GoneOps Platform Admin');

  const mainEl = page.locator('main, .flex-1.overflow-y-auto').last();
  await expect(mainEl).not.toBeEmpty();

  expect(errors).toEqual([]);
});

test('Proxmox Snapshots page renders', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.addInitScript(() => {
    localStorage.setItem('selectedProjectId', '1');
    localStorage.setItem('selectedEnvironmentId', '1');
  });
  await page.goto('/platform/proxmox/snapshots');
  await page.waitForTimeout(2000);

  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(await sidebarWidth(page)).toBe(240);
  await expect(page.locator('body')).toContainText('GoneOps Platform Admin');

  const mainEl = page.locator('main, .flex-1.overflow-y-auto').last();
  await expect(mainEl).not.toBeEmpty();

  expect(errors).toEqual([]);
});

test('Proxmox Tasks page renders', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.addInitScript(() => {
    localStorage.setItem('selectedProjectId', '1');
    localStorage.setItem('selectedEnvironmentId', '1');
  });
  await page.goto('/platform/proxmox/tasks');
  await page.waitForTimeout(2000);

  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(await sidebarWidth(page)).toBe(240);
  await expect(page.locator('body')).toContainText('GoneOps Platform Admin');

  const mainEl = page.locator('main, .flex-1.overflow-y-auto').last();
  await expect(mainEl).not.toBeEmpty();

  expect(errors).toEqual([]);
});

test('Proxmox Audit Logs page renders', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', (err) => errors.push(err.message));

  await page.addInitScript(() => {
    localStorage.setItem('selectedProjectId', '1');
    localStorage.setItem('selectedEnvironmentId', '1');
  });
  await page.goto('/platform/proxmox/audit-logs');
  await page.waitForTimeout(2000);

  const sidebar = page.locator('aside');
  await expect(sidebar).toBeVisible();
  await expect(await sidebarWidth(page)).toBe(240);
  await expect(page.locator('body')).toContainText('GoneOps Platform Admin');

  const mainEl = page.locator('main, .flex-1.overflow-y-auto').last();
  await expect(mainEl).not.toBeEmpty();

  expect(errors).toEqual([]);
});
