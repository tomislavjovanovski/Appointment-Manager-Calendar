import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : 2,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['line'],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:8081',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10_000,
    navigationTimeout: 15_000,
  },

  projects: [
    // ── Functional tests (fast, single browser) ────────────────────────────────
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /e2e\/.+\.spec\.ts/,
    },
    // ── Cross-browser smoke (CI only) ──────────────────────────────────────────
    ...(process.env.CI
      ? ([
          {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
            testMatch: /e2e\/smoke\.spec\.ts/,
          },
          {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
            testMatch: /e2e\/smoke\.spec\.ts/,
          },
        ] as const)
      : []),
    // ── Concurrency / race-condition tests (isolated project) ──────────────────
    {
      name: 'concurrency',
      use: { ...devices['Desktop Chrome'] },
      testMatch: /e2e\/concurrency\.spec\.ts/,
      // Force sequential to make race-condition assertions deterministic
      fullyParallel: false,
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
