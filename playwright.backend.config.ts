import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: [['line'], ['html', { outputFolder: 'playwright-report/backend', open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? `http://localhost:${process.env.DEV_PORT ?? 8081}`,
    ...devices['Desktop Chrome'],
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },
  testMatch: /e2e\/backend-core\.spec\.ts/,
  webServer: {
    command: `DEV_PORT=${process.env.DEV_PORT ?? 8081} npm run dev`,
    url: `http://localhost:${process.env.DEV_PORT ?? 8081}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
