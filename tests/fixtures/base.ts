// tests/fixtures/base.ts
// Extends Playwright's base test with pre-seeded state and helper access.

import { test as base, Page } from '@playwright/test';
import { storageHelper } from '../utils/storageHelper';
import { bookingHelper } from '../utils/bookingHelper';
import { patientHelper } from '../utils/patientHelper';
import { apiMockHelper } from '../utils/apiMockHelper';
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
  // Expose helpers as fixtures for dependency injection
  storage: async ({}, use) => { await use(storageHelper); },
  booking: async ({}, use) => { await use(bookingHelper); },
  patients: async ({}, use) => { await use(patientHelper); },
  apiMock: async ({}, use) => { await use(apiMockHelper); },

  // Page with Alice & Bob pre-seeded — most tests start here
  pageWithPatients: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto('/');
    await storageHelper.seed(page, 'patients', [PATIENTS.alice, PATIENTS.bob]);
    await page.reload();

    await use(page);
    await ctx.close();
  },

  // Completely clean page — for tests that need to verify empty states
  pageClean: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await page.goto('/');
    await storageHelper.clearAll(page);
    await page.reload();

    await use(page);
    await ctx.close();
  },

  // Page with Google Calendar mocked successfully
  pageWithGoogleMock: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await apiMockHelper.mockGoogleCalendarSuccess(page);
    await page.goto('/');
    await storageHelper.seed(page, 'patients', [PATIENTS.alice, PATIENTS.bob]);
    await page.reload();

    await use(page);
    await ctx.close();
  },

  // Page with Google Calendar returning 500
  pageWithGoogleError: async ({ browser }, use) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    await apiMockHelper.mockGoogleCalendarFailure(page, 500);
    await page.goto('/');
    await storageHelper.seed(page, 'patients', [PATIENTS.alice, PATIENTS.bob]);
    await page.reload();

    await use(page);
    await ctx.close();
  },
});

export { expect } from '@playwright/test';
