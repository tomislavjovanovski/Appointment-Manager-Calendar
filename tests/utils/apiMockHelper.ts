// tests/utils/apiMockHelper.ts
// Centralises all page.route() calls so network mocking is never duplicated.

import { Page } from '@playwright/test';
import { MOCK_GOOGLE_CALENDAR_RESPONSE } from '../test-data/seed';

const BACKEND = 'http://localhost:3001';

export const apiMockHelper = {
  // ── Google Calendar: happy path ───────────────────────────────────────────

  async mockGoogleCalendarSuccess(page: Page): Promise<void> {
    await page.route(`${BACKEND}/api/calendar/events*`, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_GOOGLE_CALENDAR_RESPONSE),
      }),
    );

    await page.route(`${BACKEND}/api/calendar/events`, (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'gcal-created-001', status: 'confirmed' }),
        });
      }
      return route.continue();
    });
  },

  // ── Google Calendar: server error ─────────────────────────────────────────

  async mockGoogleCalendarFailure(page: Page, status = 500): Promise<void> {
    await page.route(`${BACKEND}/api/calendar/**`, (route) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      }),
    );
  },

  // ── Google Calendar: auth expired ─────────────────────────────────────────

  async mockGoogleCalendarUnauthorized(page: Page): Promise<void> {
    await page.route(`${BACKEND}/api/calendar/**`, (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Token expired' }),
      }),
    );
  },

  // ── Network failure (connection refused) ──────────────────────────────────

  async mockNetworkFailure(page: Page, urlPattern: string): Promise<void> {
    await page.route(urlPattern, (route) => route.abort('failed'));
  },

  // ── Slow network (latency simulation) ─────────────────────────────────────

  async mockSlowNetwork(page: Page, delayMs: number): Promise<void> {
    await page.route(`${BACKEND}/api/**`, async (route) => {
      await new Promise((r) => setTimeout(r, delayMs));
      await route.continue();
    });
  },

  // ── Track outgoing requests (for assertion) ───────────────────────────────

  interceptRequests(page: Page, urlPattern: string) {
    const captured: { method: string; url: string; body: unknown }[] = [];

    page.route(urlPattern, async (route) => {
      const req = route.request();
      let body: unknown = null;
      try { body = JSON.parse(req.postData() ?? 'null'); } catch { /* not JSON */ }

      captured.push({ method: req.method(), url: req.url(), body });
      await route.continue();
    });

    return captured; // tests can assert on this array later
  },

  async removeAllMocks(page: Page): Promise<void> {
    await page.unrouteAll();
  },
};
