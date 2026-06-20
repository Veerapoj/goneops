const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './specs',
  globalSetup: require.resolve('./global-setup'),
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['line']],
  outputDir: './artifacts',
  use: {
    baseURL: process.env.GONEOPS_BASE_URL || 'http://localhost:13000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        viewport: { width: 1536, height: 960 },
      },
    },
  ],
});
