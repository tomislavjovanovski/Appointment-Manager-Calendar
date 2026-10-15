// tests/utils/authHelper.ts
// The app now requires a session. Tests either log in for real (when credentials are supplied)
// or mock the session endpoints so UI tests stay independent of the backend.

import type { BrowserContext } from '@playwright/test';

export const E2E_USER = { id: 'usr_e2e', email: 'e2e@clinic.test', role: 'admin', accountId: 'default' };
const E2E_CSRF = 'e2e-csrf-token';

/**
 * Real backend: set E2E_AUTH_EMAIL / E2E_AUTH_PASSWORD (a test account, never production credentials)
 * and the context logs in through the API. Otherwise /api/auth/* is mocked.
 */
export async function prepareAuth(ctx: BrowserContext, baseURL?: string) {
  const email = process.env.E2E_AUTH_EMAIL;
  const password = process.env.E2E_AUTH_PASSWORD;

  if (email && password) {
    const base = baseURL ?? process.env.BASE_URL ?? `http://localhost:${process.env.DEV_PORT ?? 8081}`;
    const response = await ctx.request.post(`${base}/api/auth/login`, { data: { email, password } });
    if (!response.ok()) throw new Error(`E2E login failed with status ${response.status()}`);
    return;
  }

  await ctx.route('**/api/auth/me', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: E2E_USER, csrfToken: E2E_CSRF }) }));
  await ctx.route('**/api/auth/logout', (route) => route.fulfill({ status: 204, body: '' }));
}
