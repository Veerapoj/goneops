import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '.fixture.json'), 'utf8'));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setViewportSize({ width: 1536, height: 960 });

const allLogs = [];
page.on('console', msg => { if (msg.type() === 'error') allLogs.push(msg.text()); });
page.on('pageerror', err => allLogs.push(err.message));

await page.addInitScript(({ projectId, environmentId }) => {
  localStorage.setItem('selectedProjectId', String(projectId));
  localStorage.setItem('selectedEnvironmentId', String(environmentId));
}, { projectId: fixture.project.id, environmentId: fixture.environment.id });

const checks = [];

// --- Check 1: DX pages ---
const dxRoutes = ['/', '/environments', '/sandbox'];
for (const route of dxRoutes) {
  const routeLogs = [];
  page.on('console', msg => { if (msg.type() === 'error') routeLogs.push(msg.text()); });

  await page.goto(`http://192.168.1.147:3000${route}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);

  const asideCount = await page.locator('aside').count();
  const asideWidth = asideCount > 0 ? await page.locator('aside').evaluate(el => Math.round(parseFloat(getComputedStyle(el).width))) : 0;
  const asideBg = asideCount > 0 ? await page.locator('aside').evaluate(el => getComputedStyle(el).backgroundColor) : '';
  const asideText = asideCount > 0 ? await page.locator('aside').textContent() : '';

  const hasProject = asideText.includes('PROJECT');
  const hasCICD = asideText.includes('CI/CD');
  const hasSandbox = asideText.includes('SANDBOX');
  const hasDiscovery = asideText.includes('DISCOVERY');
  const hasInventory = asideText.includes('INVENTORY');
  const hasMapping = asideText.includes('MAPPING');
  const hasOperations = asideText.includes('OPERATIONS');
  const hasGovernance = asideText.includes('GOVERNANCE');
  const hasOverview = await page.locator('aside').getByRole('link', { name: 'Overview', exact: true }).count() > 0;
  const hasDashboardLink = await page.locator('aside').getByRole('link', { name: 'Dashboard', exact: true }).count() > 0;
  const hasPlatformHeader = (await page.locator('body').textContent() || '').includes('GoneOps Platform Admin');

  const mainContent = await page.locator('main, .flex-1.overflow-y-auto').last().textContent().catch(() => '');

  checks.push({
    route,
    layout: 'DX',
    asideCount,
    asideWidth,
    asideBg,
    hasProject, hasCICD, hasSandbox,
    hasDiscovery, hasInventory, hasMapping, hasOperations, hasGovernance,
    hasOverview, hasDashboardLink, hasPlatformHeader,
    mainChars: (mainContent || '').length,
    jsErrors: routeLogs.length,
  });
}

// --- Check 2: Platform pages ---
const platformRoutes = [
  '/platform', '/platform/providers', '/platform/discovery', '/platform/inventory',
  '/platform/containers', '/platform/applications', '/platform/mapping',
  '/platform/operations', '/platform/capacity', '/platform/governance',
];
for (const route of platformRoutes) {
  const routeLogs = [];
  // (we already have console listener registered above for the global list)
  await page.goto(`http://192.168.1.147:3000${route}`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(1000);

  const asideCount = await page.locator('aside').count();
  const asideWidth = asideCount > 0 ? await page.locator('aside').evaluate(el => Math.round(parseFloat(getComputedStyle(el).width))) : 0;
  const asideText = asideCount > 0 ? await page.locator('aside').textContent() : '';
  const bodyText = await page.locator('body').textContent() || '';

  const hasAllGroups = ['PLATFORM', 'DISCOVERY', 'INVENTORY', 'MAPPING', 'OPERATIONS', 'GOVERNANCE'].every(g => asideText.includes(g));
  const hasDashboard = await page.getByRole('link', { name: 'DX Dashboard' }).count() > 0;
  const dxDashboardHref = hasDashboard > 0 ? await page.getByRole('link', { name: 'DX Dashboard' }).getAttribute('href') : '';
  const hasPlatformHeaderText = bodyText.includes('GoneOps Platform Admin');
  const mainContent = await page.locator('main, .flex-1.overflow-y-auto').last().textContent().catch(() => '');
  const hasNoDxGroups = !asideText.includes('PROJECT') && !asideText.includes('CI/CD') && !asideText.includes('SANDBOX');

  checks.push({
    route,
    layout: 'Platform',
    asideCount,
    asideWidth,
    hasAllGroups, hasDashboard, dxDashboardHref, hasPlatformHeaderText, hasNoDxGroups,
    mainChars: (mainContent || '').length,
    jsErrors: 0,
  });
}

// --- Check 3: DX Dashboard navigation ---
await page.goto('http://192.168.1.147:3000/platform', { waitUntil: 'networkidle' }).catch(() => {});
await page.waitForTimeout(500);
const beforeNavWidth = await page.locator('aside').evaluate(el => Math.round(parseFloat(getComputedStyle(el).width)));
await page.getByRole('link', { name: 'DX Dashboard' }).click();
await page.waitForTimeout(1000);
const afterNavWidth = await page.locator('aside').count() > 0 ? await page.locator('aside').evaluate(el => Math.round(parseFloat(getComputedStyle(el).width))) : 0;
const afterNavUrl = page.url();

console.log('=== CHECK RESULTS ===');
console.log(JSON.stringify({ 
  timestamp: new Date().toISOString(),
  totalJsErrors: allLogs.length,
  errors: allLogs.slice(0, 5),
  dxChecks: checks.filter(c => c.layout === 'DX'),
  platformChecks: checks.filter(c => c.layout === 'Platform'),
  navigationCheck: {
    beforeWidth: beforeNavWidth,
    afterWidth: afterNavWidth,
    afterUrl: afterNavUrl,
    works: afterNavWidth === 268,
  }
}, null, 2));

await browser.close();
