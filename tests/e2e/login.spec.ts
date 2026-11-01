// tests/e2e/login.spec.ts
// Login page behaviour with the auth API mocked (no backend or credentials needed).

import { test, expect, type BrowserContext } from '@playwright/test';
import { E2E_USER } from '../utils/authHelper';
import brand from '../../src/config/brand.json' with { type: 'json' };

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

  for (const locale of ['mk', 'en'] as const) {
    test(`presents nine verified dental features from login in ${locale} on mobile, tablet and desktop`, async ({ page }) => {
      await page.addInitScript((language) => localStorage.setItem('medical.locale', language), locale);
      await page.route('**/api/auth/me', (route) => route.fulfill(json({ error: 'Authentication required.' }, 401)));
      const protectedRequests: string[] = [];
      page.on('request', (request) => {
        if (/\/api\/(patients|appointments|settings)/.test(request.url())) protectedRequests.push(request.url());
      });
      await page.setViewportSize({ width: 375, height: 812 });
      await page.goto('/app/');
      const label = locale === 'mk' ? 'За нас и можности' : 'About & features';
      await page.getByRole('link', { name: label, exact: true }).last().click();
      await expect(page).toHaveURL(/\/app\/about$/);
      await expect(page.getByRole('heading', { level: 1 })).toContainText(
        locale === 'mk' ? 'Едноставно управување со модерна стоматолошка ординација.' : 'Simple management for a modern dental practice.',
      );
      const grid = page.getByTestId('about-feature-grid');
      await expect(grid.locator('li')).toHaveCount(9);
      await expect(grid).toContainText('.xls');
      await expect(grid).toContainText('.xml');
      await expect(grid).not.toContainText(/reminder|notification|потсет|известува/i);
      const image = page.getByTestId('about-features').locator('img');
      await expect(image).toHaveAttribute('src', '/app/about-calendar.png');
      await expect.poll(() => image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(1262);
      await expect(page.locator('figcaption')).toContainText(locale === 'mk' ? 'измислени демо податоци' : 'fictional demo data');
      for (const width of [375, 390, 768, 1024, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        const columns = await grid.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length);
        expect(columns).toBe(width < 640 ? 1 : width < 1024 ? 2 : 3);
      }
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.getByRole('link', { name: locale === 'mk' ? 'Назад на најава' : 'Back to sign in', exact: true }).last().click();
      await expect(page.getByTestId('login-form')).toBeVisible();
      expect(protectedRequests).toEqual([]);
    });
  }

  test('keeps the about page reachable directly and from public pages, including with a session', async ({ page, context }) => {
    await page.route('**/api/auth/me', (route) => route.fulfill(json({ error: 'Authentication required.' }, 401)));
    await page.goto('/app/about/');
    await expect(page.getByTestId('about-features')).toBeVisible();
    await page.getByRole('link', { name: 'Најчести прашања', exact: true }).click();
    await page.getByRole('link', { name: 'За нас и можности', exact: true }).click();
    await expect(page.getByTestId('about-features')).toBeVisible();
    await mockApp(context);
    await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: E2E_USER, csrfToken: 't' })));
    await page.goto('/app/about');
    await expect(page.getByTestId('about-feature-grid').locator('li')).toHaveCount(9);
    await expect(page.getByTestId('login-form')).toHaveCount(0);
  });

  test.describe('МојаОрдинација branding', () => {
    test('keeps the Cyrillic wordmark and shows English product copy in the English interface', async ({ page }) => {
      await page.route('**/api/auth/me', (route) => route.fulfill(json({ error: 'Authentication required.' }, 401)));
      await page.addInitScript(() => localStorage.setItem('medical.locale', 'en'));
      await page.goto('/');
      await expect(page).toHaveTitle('МојаОрдинација');
      for (const width of [375, 1280]) {
        await page.setViewportSize({ width, height: 900 });
        const panel = page.locator(width >= 1024 ? '.login-preview' : '.login-mobile-brand');
        await expect(panel.getByText('МојаОрдинација', { exact: true })).toBeVisible();
        await expect(panel.getByText('Dental Practice Management', { exact: true })).toBeVisible();
        await expect(panel.getByText(brand.productDescription, { exact: true })).toHaveCount(0);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      }
    });

    for (const theme of ['light', 'dark']) {
      test(`shows the approved brand copy in ${theme} mode at mobile, tablet and desktop sizes`, async ({ page }) => {
        await page.route('**/api/auth/me', (route) => route.fulfill(json({ error: 'Authentication required.' }, 401)));
        await page.addInitScript((dark) => document.documentElement.classList.toggle('dark', dark), theme === 'dark');
        await page.goto('/');
        await expect(page).toHaveTitle('МојаОрдинација');
        for (const viewport of [
          { width: 320, height: 740 },
          { width: 375, height: 812 },
          { width: 768, height: 1024 },
          { width: 1280, height: 900 },
          { width: 1366, height: 650 },
        ]) {
          await page.setViewportSize(viewport);
          const desktop = viewport.width >= 1024;
          const brandPanel = page.locator(desktop ? '.login-preview' : '.login-mobile-brand');
          await expect(brandPanel).toBeVisible();
          const visibleBrandCopy = desktop
            ? [
                'МојаОрдинација',
                'Менаџмент на стоматолошки ординации',
                'Помалку администрација. Повеќе насмевки.',
                'Термини, пациенти и организација на ординацијата — на едно место.',
              ]
            : ['МојаОрдинација', 'Менаџмент на стоматолошки ординации'];
          for (const text of visibleBrandCopy) {
            await expect(brandPanel.getByText(text, { exact: true })).toBeVisible();
          }
          await expect(page.getByTestId('login-form')).toBeVisible();
          await expect(page.getByTestId('login-submit')).toBeVisible();
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
          if (desktop) {
            await expect(brandPanel.locator('img')).toHaveAttribute('src', '/app/brand-icon.png?v=calendar-smile-png');
            await expect(brandPanel).toHaveCSS('color', 'rgb(255, 255, 255)');
            expect(await brandPanel.evaluate((element) => getComputedStyle(element).backgroundImage)).toContain('linear-gradient');
            await expect(brandPanel.locator('.login-calendar-pattern')).toHaveCount(2);
          }
        }
        expect(await page.locator('body').innerText()).not.toMatch(/iTermin|ClinicCalendar|Lovable/);
      });
    }

    test('serves consistent browser metadata, manifest, and correctly sized brand icons', async ({ page, request }) => {
      await page.route('**/api/auth/me', (route) => route.fulfill(json({ error: 'Authentication required.' }, 401)));
      await page.goto('/');
      await expect(page).toHaveTitle(brand.name);
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', brand.metaDescription);
      await expect(page.locator('meta[name="application-name"]')).toHaveAttribute('content', brand.name);
      await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', brand.name);
      await expect(page.locator('meta[property="og:description"]')).toHaveAttribute('content', brand.extendedDescription);
      await expect(page.locator('meta[name="twitter:title"]')).toHaveAttribute('content', brand.name);
      await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', brand.themeColor);
      const manifestPath = await page.locator('link[rel="manifest"]').getAttribute('href');
      expect(manifestPath).toBe('/app/manifest.webmanifest');
      const response = await request.get(manifestPath!);
      expect(response.ok()).toBe(true);
      const manifest = await response.json();
      expect(manifest).toMatchObject({
        name: brand.name, short_name: brand.name, description: brand.metaDescription,
        lang: 'mk', start_url: './', scope: './', display: 'standalone', theme_color: brand.themeColor,
      });
      const icoResponse = await request.get('/app/favicon.ico');
      expect(icoResponse.ok()).toBe(true);
      expect(icoResponse.headers()['content-type']).toContain('image/x-icon');
      for (const [asset, width, height] of [
        ['/app/favicon.svg', 64, 64],
        ['/app/apple-touch-icon.png', 180, 180],
        ['/app/icon-192.png', 192, 192],
        ['/app/icon-512.png', 512, 512],
        ['/app/icon-maskable-512.png', 512, 512],
        ['/app/brand-social.png', 1200, 630],
      ] as const) {
        const dimensions = await page.evaluate(async (src) => {
          const image = new Image();
          const loadPromise = new Promise<void>((resolve, reject) => {
            image.onload = () => resolve();
            image.onerror = () => reject(new Error(`Unable to load image: ${src}`));
          });
          image.src = src;
          if ('decode' in image) {
            try {
              await image.decode();
            } catch {
              await loadPromise;
            }
          } else {
            await loadPromise;
          }
          return { width: image.naturalWidth, height: image.naturalHeight };
        }, asset);
        expect(dimensions).toEqual({ width, height });
      }
      await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/app/favicon.svg?v=calendar-smile-png');
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', '/app/brand-social.png?v=calendar-smile-png');
    });

    test('shows the custom practice instead of product branding in the sidebar and resets the title after logout', async ({ page, context }) => {
      await mockApp(context);
      await context.route('**/api/settings', (route) => route.fulfill(json({
        locale: 'en', practiceName: 'Dental Studio',
        logoDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==',
        startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30,
      })));
      await page.route('**/api/auth/me', (route) => route.fulfill(json({ user: E2E_USER, csrfToken: 't' })));
      await page.route('**/api/auth/logout', (route) => route.fulfill({ status: 204, body: '' }));
      await page.goto('/');
      await expect(page).toHaveTitle(`Dental Studio | ${brand.name}`);
      const sidebar = page.getByTestId('desktop-sidebar');
      await expect(sidebar.getByTestId('sidebar-product-brand')).toHaveCount(0);
      await expect(sidebar.getByTestId('sidebar-practice-brand')).toContainText('Dental Studio');
      await expect(sidebar.getByTestId('sidebar-practice-brand').locator('img')).toBeVisible();
      await expect(sidebar.getByTestId('sidebar-practice-brand').locator('span'))
        .toHaveClass(/text-xl.*font-semibold.*tracking-tight/);
      await page.evaluate(() => document.documentElement.classList.add('dark'));
      await expect(sidebar.getByTestId('sidebar-practice-brand')).toBeVisible();
      await page.setViewportSize({ width: 375, height: 812 });
      await expect(page.locator('header').getByText(brand.name, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
      await expect(page.getByTestId('mobile-sidebar').getByTestId('sidebar-product-brand')).toHaveCount(0);
      await expect(page.getByTestId('mobile-sidebar').getByTestId('sidebar-practice-brand')).toContainText('Dental Studio');
      await page.getByTestId('mobile-sidebar').getByTestId('logout-button').click();
      await expect(page.getByTestId('login-form')).toBeVisible();
      await expect(page).toHaveTitle(brand.name);
    });

    test('shows the product brand in the sidebar when no custom practice is configured', async ({ page, context }) => {
      await mockApp(context);
      await context.route('**/api/auth/me', (route) => route.fulfill(json({ user: E2E_USER, csrfToken: 't' })));
      await page.goto('/');

      const sidebar = page.getByTestId('desktop-sidebar');
      await expect(page).toHaveTitle(brand.name);
      await expect(sidebar.getByTestId('sidebar-product-brand')).toContainText(brand.name);
      await expect(sidebar.getByTestId('sidebar-practice-brand')).toHaveCount(0);
    });

    test('uses the dental practice identity throughout public information pages', async ({ page }) => {
      await page.route('**/api/auth/me', (route) => route.fulfill(json({ error: 'Authentication required.' }, 401)));
      await page.setViewportSize({ width: 375, height: 812 });
      for (const path of ['faq', 'privacy', 'terms', 'contact']) {
        await page.goto(`/app/${path}`);
        await expect(page).toHaveTitle(brand.name);
        await expect(page.getByText(brand.name, { exact: true })).toBeVisible();
        await expect(page.getByText(brand.productDescription, { exact: true })).toBeVisible();
        expect(await page.locator('body').innerText()).not.toMatch(/iTermin|ClinicCalendar|Lovable/);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
      }
    });
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
    const email = page.locator('#login-email');
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
    await page.locator('button[aria-controls="login-password"]').click();
    await expect(password).toHaveAttribute('type', 'text');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toHaveText('Погрешна е-пошта или лозинка.');
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

    await expect(page.getByTestId('login-error')).toHaveText('Вашата сесија истече. Најавете се повторно.');
  });
});
