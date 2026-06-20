const { test, expect } = require('@playwright/test');

test('API health endpoint reports an operational backend', async ({ request }) => {
  const response = await request.get('/api/health');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.status).toBe('ok');
  expect(body.timestamp).toBeTruthy();
  expect(body.uptime).toBeGreaterThan(0);
});
