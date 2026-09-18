import { defineConfig, devices } from '@playwright/test';
import { cpus } from 'os';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // On CI keep a small fixed worker count; locally choose a safe value based
  // on available CPU cores but allow override via PLAYWRIGHT_WORKERS env var.
  workers: process.env.CI
    ? 4
    : process.env.PLAYWRIGHT_WORKERS
    ? Number(process.env.PLAYWRIGHT_WORKERS)
    : Math.max(2, Math.min(8, Math.max(1, cpus().length - 1))),
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['line'],
  ],

  use: {
    baseURL: process.env.BASE_URL ?? `http://localhost:${process.env.DEV_PORT ?? 8081}`,
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
      testMatch: /e2e\/smoke\.spec\.ts/,
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
  ],

  webServer: {
    // Force Vite to run on a predictable port for tests (use DEV_PORT override if set)
    command: `DEV_PORT=${process.env.DEV_PORT ?? 8081} npm run dev`,
    url: `http://localhost:${process.env.DEV_PORT ?? 8081}`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
