const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './specs',
  testMatch: '*09-proxmox-manager*',
  timeout: 45000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['line']],
  outputDir: './artifacts',
  use: {
    baseURL: process.env.GONEOPS_BASE_URL || 'http://192.168.1.147:3000',
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
