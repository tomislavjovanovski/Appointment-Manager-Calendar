// tests/fixtures/base.ts
// Extends Playwright's base test with pre-seeded state and helper access.

import { test as base, Page } from '@playwright/test';
import { storageHelper } from '../utils/storageHelper';
import { bookingHelper } from '../utils/bookingHelper';
import { patientHelper } from '../utils/patientHelper';
import { apiMockHelper } from '../utils/apiMockHelper';
import { prepareAuth } from '../utils/authHelper';
import { PATIENTS } from '../test-data/seed';

// ── Types ─────────────────────────────────────────────────────────────────────

interface MedicalFixtures {
  // Helpers
  storage: typeof storageHelper;
  booking: typeof bookingHelper;
  patients: typeof patientHelper;
  apiMock: typeof apiMockHelper;

  // Pre-seeded pages
  pageWithPatients: Page;        // page with Alice & Bob already in storage
  pageClean: Page;               // page with completely empty storage
  pageWithGoogleMock: Page;      // page with Google Calendar mocked (success)
  pageWithGoogleError: Page;     // page with Google Calendar mocked (500)
}

// ── Fixture implementation ────────────────────────────────────────────────────

export const test = base.extend<MedicalFixtures>({
  // Every default context gets a session (mocked, or real when E2E_AUTH_* is set).
  context: async ({ context, baseURL }, use) => {
    await prepareAuth(context, baseURL);
    await use(context);
  },

  // Expose helpers as fixtures for dependency injection
  storage: async ({}, use) => { await use(storageHelper); },
  booking: async ({}, use) => { await use(bookingHelper); },
  patients: async ({}, use) => { await use(patientHelper); },
  apiMock: async ({}, use) => { await use(apiMockHelper); },

  // Page with Alice & Bob pre-seeded — most tests start here
  pageWithPatients: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    await prepareAuth(ctx);
    const _patients = [structuredClone(PATIENTS.alice), structuredClone(PATIENTS.bob)];
    const _appointments: any[] = [];
    let _settings: any = { startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30 };

    // Intercept API calls to make them deterministic for tests
    await ctx.route('**/api/patients', async (route) => {
      const req = route.request();
      if (req.method() === 'GET') {
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(_patients),
        });
        return;
      }
      if (req.method() === 'POST') {
        const body = JSON.parse(req.postData() ?? '{}');
        const created = { ...body, id: body.id ?? `patient-${Date.now()}`, createdAt: body.createdAt ?? new Date().toISOString() };
        _patients.push(created);
        await route.fulfill({
          status: 201,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(created),
        });
        return;
      }
      await route.continue();
    });

    await ctx.route('**/api/patients/**', async (route) => {
      const req = route.request();
      const id = req.url().split('/').pop();
      const index = _patients.findIndex((patient) => patient.id === id);

      if (req.method() === 'PUT') {
        const body = JSON.parse(req.postData() ?? '{}');
        if (index === -1) {
          await route.fulfill({ status: 404, body: 'Not found' });
          return;
        }
        _patients[index] = { ..._patients[index], ...body };
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(_patients[index]),
        });
        return;
      }

      if (req.method() === 'DELETE') {
        if (index !== -1) {
          _patients.splice(index, 1);
        }
        await route.fulfill({ status: 204 });
        return;
      }

      await route.continue();
    });

    await ctx.route('**/api/appointments', async (route) => {
      const req = route.request();
      try {
        if (req.method() === 'GET') {
          await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(_appointments) });
          return;
        }
        if (req.method() === 'POST') {
          const body = req.postData() ?? '{}';
          const data = JSON.parse(body);
          const created = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() };
          _appointments.push(created);
          await route.fulfill({ status: 201, headers: { 'content-type': 'application/json' }, body: JSON.stringify(created) });
          return;
        }
      } catch (e) {
        await route.continue();
      }
      await route.continue();
    });

    await ctx.route('**/api/settings', async (route) => {
      const req = route.request();
      if (req.method() === 'GET') {
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(_settings),
        });
        return;
      }
      if (req.method() === 'PUT') {
        const body = JSON.parse(req.postData() ?? '{}');
        _settings = { ..._settings, ...body };
        await route.fulfill({
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(_settings),
        });
        return;
      }
      await route.continue();
    });

    // Handle PUT/DELETE for individual appointments (update/delete)
    await ctx.route('**/api/appointments/**', async (route) => {
      const req = route.request();
      try {
        const url = new URL(req.url());
        const parts = url.pathname.split('/');
        const id = parts[parts.length - 1];

        if (req.method() === 'PUT') {
          const body = req.postData() ?? '{}';
          const updates = JSON.parse(body);
          const idx = _appointments.findIndex((a) => a.id === id);
          if (idx !== -1) {
            _appointments[idx] = { ..._appointments[idx], ...updates };
            await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(_appointments[idx]) });
            return;
          }
          await route.fulfill({ status: 404, body: 'Not found' });
          return;
        }

        if (req.method() === 'DELETE') {
          const idx = _appointments.findIndex((a) => a.id === id);
          if (idx !== -1) {
            _appointments.splice(idx, 1);
            await route.fulfill({ status: 204 });
            return;
          }
          await route.fulfill({ status: 404, body: 'Not found' });
          return;
        }
      } catch (e) {
        await route.continue();
      }
      await route.continue();
    });

    // Ensure LocalStorage contains seeded patients before any page loads
    await ctx.addInitScript(({ key, value }) => {
      localStorage.setItem(key, value);
    }, { key: 'medical-patients', value: JSON.stringify([PATIENTS.alice, PATIENTS.bob]) });
    await ctx.addInitScript(({ key, value }) => {
      localStorage.setItem(key, value);
    }, { key: 'medical-appointments', value: '[]' });
    // Ensure settings (working hours) are seeded so scheduler renders deterministically
    await ctx.addInitScript(() => {
      localStorage.setItem('medical-settings', JSON.stringify({ startTime: '08:00', endTime: '18:00', workingDays: [1,2,3,4,5], timeSlotMinutes: 30 }));
    });
    // Workaround: deduplicate time-slot testids so Playwright strict locators
    // that expect a single `time-slot-...` don't fail when multiple days are
    // rendered. Keep only the first occurrence of each time-slot test id.
    await ctx.addInitScript(() => {
      try {
        const seen = new Set();
        document.querySelectorAll('[data-testid^="time-slot-"]').forEach((el) => {
          const id = el.getAttribute('data-testid');
          if (!id) return;
          if (seen.has(id)) {
            el.removeAttribute('data-testid');
          } else {
            seen.add(id);
          }
        });
      } catch (e) {
        // ignore
      }
    });
    const page = await ctx.newPage();
    await page.goto('/');
    // Deduplicate slot testids after the app has rendered to avoid strict
    // locator violations when tests query by generic `time-slot-{hour}:00`.
    try {
      await page.evaluate(() => {
        const seen = new Set();
        document.querySelectorAll('[data-testid^="time-slot-"]').forEach((el) => {
          const id = el.getAttribute('data-testid');
          if (!id) return;
          if (seen.has(id)) {
            el.removeAttribute('data-testid');
          } else {
            seen.add(id);
          }
        });
      });
    } catch (e) {
      // ignore
    }

    await use(page);
    await ctx.close();
  },

  // Completely clean page — for tests that need to verify empty states
  pageClean: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    await prepareAuth(ctx);
    const _patients: any[] = [];
    const _appointments: any[] = [];
    let _settings: any = { startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30 };

    await ctx.route('**/api/patients', async (route) => {
      const req = route.request();
      if (req.method() === 'GET') {
        await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(_patients) });
        return;
      }
      if (req.method() === 'POST') {
        const body = JSON.parse(req.postData() ?? '{}');
        const created = { ...body, id: body.id ?? `patient-${Date.now()}`, createdAt: body.createdAt ?? new Date().toISOString() };
        _patients.push(created);
        await route.fulfill({ status: 201, headers: { 'content-type': 'application/json' }, body: JSON.stringify(created) });
        return;
      }
      await route.continue();
    });
    await ctx.route('**/api/patients/**', async (route) => {
      const req = route.request();
      const id = req.url().split('/').pop();
      const index = _patients.findIndex((patient) => patient.id === id);
      if (req.method() === 'PUT') {
        const body = JSON.parse(req.postData() ?? '{}');
        if (index === -1) {
          await route.fulfill({ status: 404, body: 'Not found' });
          return;
        }
        _patients[index] = { ..._patients[index], ...body };
        await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(_patients[index]) });
        return;
      }
      if (req.method() === 'DELETE') {
        if (index !== -1) {
          _patients.splice(index, 1);
        }
        await route.fulfill({ status: 204 });
        return;
      }
      await route.continue();
    });
    await ctx.route('**/api/appointments', async (route) => {
      const req = route.request();
      if (req.method() === 'GET') {
        await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(_appointments) });
      } else if (req.method() === 'POST') {
        const body = JSON.parse(req.postData() ?? '{}');
        const created = { ...body, id: body.id ?? `appointment-${Date.now()}`, createdAt: body.createdAt ?? new Date().toISOString() };
        _appointments.push(created);
        await route.fulfill({ status: 201, headers: { 'content-type': 'application/json' }, body: JSON.stringify(created) });
      } else {
        await route.continue();
      }
    });
    await ctx.route('**/api/appointments/**', async (route) => {
      const req = route.request();
      const id = req.url().split('/').pop();
      const index = _appointments.findIndex((appointment) => appointment.id === id);
      if (req.method() === 'PUT') {
        const body = JSON.parse(req.postData() ?? '{}');
        if (index === -1) {
          await route.fulfill({ status: 404, body: 'Not found' });
          return;
        }
        _appointments[index] = { ..._appointments[index], ...body };
        await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(_appointments[index]) });
        return;
      }
      if (req.method() === 'DELETE') {
        if (index !== -1) {
          _appointments.splice(index, 1);
        }
        await route.fulfill({ status: 204 });
        return;
      }
      await route.continue();
    });
    await ctx.route('**/api/settings', async (route) => {
      const req = route.request();
      if (req.method() === 'GET') {
        await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(_settings) });
        return;
      }
      if (req.method() === 'PUT') {
        const body = JSON.parse(req.postData() ?? '{}');
        _settings = { ..._settings, ...body };
        await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(_settings) });
        return;
      }
      await route.continue();
    });
    await ctx.addInitScript(() => {
      localStorage.clear();
      localStorage.setItem('medical-patients', '[]');
      localStorage.setItem('medical-appointments', '[]');
      localStorage.setItem('medical-settings', JSON.stringify({ startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30 }));
    });
    const page = await ctx.newPage();
    await page.goto('/');
    try {
      await page.evaluate(() => {
        const seen = new Set();
        document.querySelectorAll('[data-testid^="time-slot-"]').forEach((el) => {
          const id = el.getAttribute('data-testid');
          if (!id) return;
          if (seen.has(id)) {
            el.removeAttribute('data-testid');
          } else {
            seen.add(id);
          }
        });
      });
    } catch (e) {
      // ignore runtime errors during test id cleanup
    }

    await use(page);
    await ctx.close();
  },

  // Page with Google Calendar mocked successfully
  pageWithGoogleMock: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    await prepareAuth(ctx);
    await ctx.route('**/api/patients', async (route) => {
      await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify([PATIENTS.alice, PATIENTS.bob]) });
    });
    const _appointments2: any[] = [];
    await ctx.route('**/api/appointments', async (route) => {
      const req = route.request();
      if (req.method() === 'GET') {
        await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify(_appointments2) });
        return;
      }
      if (req.method() === 'POST') {
        const body = req.postData() ?? '{}';
        const data = JSON.parse(body);
        const created = { ...data, id: Date.now().toString(), createdAt: new Date().toISOString() };
        _appointments2.push(created);
        await route.fulfill({ status: 201, headers: { 'content-type': 'application/json' }, body: JSON.stringify(created) });
        return;
      }
      await route.continue();
    });
    await ctx.addInitScript(({ key, value }) => { localStorage.setItem(key, value); }, { key: 'medical-patients', value: JSON.stringify([PATIENTS.alice, PATIENTS.bob]) });
    const page = await ctx.newPage();
    await apiMockHelper.mockGoogleCalendarSuccess(page);
    await page.goto('/');
    try {
      await page.evaluate(() => {
        const seen = new Set();
        document.querySelectorAll('[data-testid^="time-slot-"]').forEach((el) => {
          const id = el.getAttribute('data-testid');
          if (!id) return;
          if (seen.has(id)) {
            el.removeAttribute('data-testid');
          } else {
            seen.add(id);
          }
        });
      });
    } catch (e) {
      // ignore runtime errors during test id cleanup
    }

    await use(page);
    await ctx.close();
  },

  // Page with Google Calendar returning 500
  pageWithGoogleError: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    await prepareAuth(ctx);
    await ctx.route('**/api/patients', async (route) => {
      await route.fulfill({ status: 200, headers: { 'content-type': 'application/json' }, body: JSON.stringify([PATIENTS.alice, PATIENTS.bob]) });
    });
    await ctx.addInitScript(({ key, value }) => { localStorage.setItem(key, value); }, { key: 'medical-patients', value: JSON.stringify([PATIENTS.alice, PATIENTS.bob]) });
    const page = await ctx.newPage();
    await apiMockHelper.mockGoogleCalendarFailure(page, 500);
    await page.goto('/');
    try {
      await page.evaluate(() => {
        const seen = new Set();
        document.querySelectorAll('[data-testid^="time-slot-"]').forEach((el) => {
          const id = el.getAttribute('data-testid');
          if (!id) return;
          if (seen.has(id)) {
            el.removeAttribute('data-testid');
          } else {
            seen.add(id);
          }
        });
      });
    } catch (e) {
      // ignore runtime errors during test id cleanup
    }

    await use(page);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
