import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, '.fixture.json'), 'utf8'));
const browser = await chromium.launch();
const page = await browser.newPage();

const logs = [];
page.on('console', msg => { if (msg.type() === 'error') logs.push(msg.text()); });
page.on('pageerror', err => logs.push(err.message));

await page.addInitScript(({ projectId, environmentId }) => {
  localStorage.setItem('selectedProjectId', String(projectId));
  localStorage.setItem('selectedEnvironmentId', String(environmentId));
}, { projectId: fixture.project.id, environmentId: fixture.environment.id });

await page.goto('http://192.168.1.147:3000/');
await page.waitForTimeout(3000);

const body = await page.textContent('body').catch(() => 'ERROR_READING');
console.log('DNSX INDEX body (first 2000 chars):', typeof body === 'string' ? body.slice(0, 2000) : body);
const asideCount = await page.locator('aside').count();
console.log('Aside count:', asideCount);
const mainCount = await page.locator('main').count();
console.log('Main count:', mainCount);
console.log('Page title:', await page.title());
console.log('URL:', page.url());
console.log('JS errors:', logs.length, logs);

const html = await page.content();
console.log('HTML snippet (first 1000):', html.slice(0, 1000));

await page.screenshot({ path: path.join(__dirname, 'artifacts', 'investigate-dx-index.png'), fullPage: true });
console.log('Screenshot saved');

await browser.close();
