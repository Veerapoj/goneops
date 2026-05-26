import { defineConfig, devices } from "@playwright/test";

const chromeDevExecutablePath = process.env.PLAYWRIGHT_CHROME_EXECUTABLE_PATH ?? "/home/veenews/.cache/chrome-for-testing/chrome-dev-150.0.7846.4/chrome-linux64/chrome";

export default defineConfig({
  testDir: "./e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3100",
    headless: true,
    launchOptions: {
      executablePath: chromeDevExecutablePath,
      args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
    },
    trace: "on-first-retry"
  },
  webServer: [
    {
      command: "cd ../.. && BACKEND_PORT=4000 npm --workspace apps/backend start",
      url: "http://127.0.0.1:4000/health",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    },
    {
      command: "cd ../.. && FRONTEND_PORT=3100 NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:4100 npm --workspace apps/frontend start",
      url: "http://127.0.0.1:3100/quickstart",
      reuseExistingServer: !process.env.CI,
      timeout: 30_000
    }
  ],
  projects: [
    {
      name: "chrome-dev-headless",
      use: { browserName: "chromium" }
    }
  ]
});
