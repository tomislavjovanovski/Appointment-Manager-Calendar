import { defineConfig } from '@playwright/test';

// Node-only backend startup tests: no browser, no Vite/web server.
export default defineConfig({
  testDir: './tests/server',
  fullyParallel: true,
  reporter: [['line']],
  timeout: 15_000,
});
