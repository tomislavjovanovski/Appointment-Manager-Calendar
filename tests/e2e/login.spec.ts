// tests/e2e/login.spec.ts
// Login page behaviour with the auth API mocked (no backend or credentials needed).

import { test, expect, type BrowserContext } from '@playwright/test';
import { E2E_USER } from '../utils/authHelper';

const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) });

async function mockApp(ctx: BrowserContext) {
  await ctx.route('**/api/patients', (route) => route.fulfill(json([])));
  await ctx.route('**/api/appointments', (route) => route.fulfill(json([])));
  await ctx.route('**/api/settings', (route) => route.fulfill(json({ startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30 })));
}

test.describe('Login', () => {
  test('shows the login page when there is no session and blocks the app', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill(json({ error: 'Authentication required.' }, 401)));
    await page.goto('/');
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page.getByTestId('nav-patients')).toHaveCount(0);
  });

  test('keeps the sign-in form usable on mobile and shows the schedule panel on desktop', async ({ page }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill(json({ error: 'Authentication required.' }, 401)));
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    await expect(page.getByTestId('login-form')).toBeVisible();
    await expect(page.getByTestId('login-submit')).toBeVisible();
    await expect(page.locator('main > section > aside')).toBeHidden();

    const mobileWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(mobileWidth).toBeLessThanOrEqual(375);

    await page.setViewportSize({ width: 1280, height: 900 });
    await expect(page.locator('main > section > aside')).toBeVisible();
  });

  test('validates input, shows a generic error, then signs in and out', async ({ page, context }) => {
    await mockApp(context);
    let loggedIn = false;
    let loginBody: Record<string, string> | null = null;
    await page.route('**/api/auth/me', (route) =>
      route.fulfill(loggedIn ? json({ user: E2E_USER, csrfToken: 't' }) : json({ error: 'Authentication required.' }, 401)));
    await page.route('**/api/auth/login', async (route) => {
      loginBody = route.request().postDataJSON();
      if (loginBody?.password !== 'correct password') {
        await route.fulfill(json({ error: 'Invalid email or password.' }, 401));
        return;
      }
      loggedIn = true;
      await route.fulfill(json({ user: E2E_USER, csrfToken: 't' }));
    });
    let logoutCsrf: string | null = null;
    await page.route('**/api/auth/logout', async (route) => {
      logoutCsrf = route.request().headers()['x-csrf-token'] ?? null;
      loggedIn = false;
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto('/');
    const email = page.getByLabel(/email/i);
    const password = page.locator('#login-password');

    await page.getByTestId('login-submit').click();
    await expect(email).toHaveAttribute('aria-invalid', 'true');
    await expect(email).toBeFocused();

    await email.fill('not-an-email');
    await password.fill('x');
    await page.getByTestId('login-submit').click();
    await expect(email).toHaveAttribute('aria-invalid', 'true');

    await email.fill(E2E_USER.email);
    await password.fill('wrong password');
    await page.getByRole('button', { name: /show password/i }).click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toHaveText('Invalid email or password.');
    await expect(password).toHaveValue('');

    await password.fill('correct password');
    await password.press('Enter');
    await expect(page.getByTestId('nav-patients').first()).toBeVisible();
    expect(loginBody).toEqual({ email: E2E_USER.email, password: 'correct password' });

    await page.getByTestId('logout-button').first().click();
    await expect(page.getByTestId('login-form')).toBeVisible();
    expect(logoutCsrf).toBe('t');
  });

  test('returns to the login page with a notice when the session expires', async ({ page, context }) => {
    await mockApp(context);
    await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: E2E_USER, csrfToken: 't' })));
    await page.goto('/');
    await expect(page.getByTestId('nav-patients').first()).toBeVisible();

    await page.unroute('**/api/auth/me');
    await page.route('**/api/auth/me', (route) => route.fulfill(json({ error: 'Authentication required.' }, 401)));
    await context.unroute('**/api/patients');
    await context.route('**/api/patients', (route) => route.fulfill(json({ error: 'Authentication required.' }, 401)));
    await page.getByTestId('nav-patients').first().click();

    await expect(page.getByTestId('login-error')).toContainText(/session has expired/i);
  });
});
