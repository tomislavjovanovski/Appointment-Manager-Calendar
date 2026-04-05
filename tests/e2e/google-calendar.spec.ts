// tests/e2e/google-calendar.spec.ts
// Tests Google Calendar integration with mocked backend responses.
// All external HTTP is intercepted — no real Google API calls.

import { test, expect } from '../fixtures/base';
import { storageHelper } from '../utils/storageHelper';
import { bookingHelper } from '../utils/bookingHelper';
import { apiMockHelper } from '../utils/apiMockHelper';
import {
  PATIENTS,
  MOCK_GOOGLE_CALENDAR_RESPONSE,
  nextWorkingSlot,
} from '../test-data/seed';

test.describe('Google Calendar — Happy Path', () => {
  test('syncing displays Google Calendar events alongside local appointments', async ({
    pageWithGoogleMock: page,
  }) => {
    await test.step('Navigate to scheduler', async () => {
      await page.getByTestId('nav-scheduler').click();
      await expect(page.getByTestId('scheduler-grid')).toBeVisible();
    });

    await test.step('Trigger Google Calendar sync', async () => {
      await page.getByTestId('sync-google-btn').click();
    });

    await test.step('Google Calendar event block appears in scheduler', async () => {
      const gcalEvent = MOCK_GOOGLE_CALENDAR_RESPONSE.items[0];
      const block = page
        .getByTestId('gcal-event-block')
        .filter({ hasText: gcalEvent.summary });
      await expect(block).toBeVisible({ timeout: 5_000 });
    });

    await test.step('Google event block has correct visual differentiation', async () => {
      // Google events must be visually distinct (data-source="google" attribute)
      await expect(
        page.getByTestId('gcal-event-block').first(),
      ).toHaveAttribute('data-source', 'google');
    });
  });

  test('booking with "Sync to Google Calendar" sends POST to backend', async ({
    pageWithGoogleMock: page,
  }) => {
    const captured = apiMockHelper.interceptRequests(
      page,
      'http://localhost:3001/api/calendar/events',
    );

    await bookingHelper.goToScheduler(page);
    await bookingHelper.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      syncToGoogle: true,
      slotDate: nextWorkingSlot(1, 11),
    });

    await test.step('Exactly one POST was made to the calendar API', async () => {
      const posts = captured.filter((r) => r.method === 'POST');
      expect(posts).toHaveLength(1);
    });

    await test.step('POST body contains expected appointment fields', async () => {
      const post = captured.find((r) => r.method === 'POST')!;
      const body = post.body as Record<string, unknown>;
      expect(body).toHaveProperty('summary');
      expect(body).toHaveProperty('start');
      expect(body).toHaveProperty('end');
    });
  });

  test('booking WITHOUT sync toggle does NOT call backend', async ({
    pageWithGoogleMock: page,
  }) => {
    const captured = apiMockHelper.interceptRequests(
      page,
      'http://localhost:3001/api/calendar/events',
    );

    await bookingHelper.goToScheduler(page);
    await bookingHelper.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      syncToGoogle: false,
      slotDate: nextWorkingSlot(1, 15),
    });

    const posts = captured.filter((r) => r.method === 'POST');
    expect(posts).toHaveLength(0);
  });
});

test.describe('Google Calendar — Failure Scenarios', () => {
  test('backend 500 error shows error toast but still saves appointment locally', async ({
    pageWithGoogleError: page, storage,
  }) => {
    const countBefore = await storage.count(page, 'appointments');

    await test.step('Book with Google sync enabled (backend will fail)', async () => {
      await bookingHelper.goToScheduler(page);
      await bookingHelper.openSlot(page, nextWorkingSlot(1, 9));
      await bookingHelper.fillBookingForm(page, {
        patientId: PATIENTS.alice.id,
        type: 'consultation',
        duration: 30,
        syncToGoogle: true,
      });
      await page.getByTestId('booking-submit-btn').click();
    });

    await test.step('Error toast explains Google sync failure', async () => {
      // Must tell the user that *sync* failed — not that the booking failed
      await expect(page.getByTestId('toast-error')).toBeVisible();
      await expect(
        page.getByText(/google.*sync.*failed|calendar.*error/i),
      ).toBeVisible();
    });

    await test.step('Appointment is still saved locally despite sync failure', async () => {
      const countAfter = await storage.count(page, 'appointments');
      expect(countAfter).toBe(countBefore + 1); // local save succeeded
    });
  });

  test('401 Unauthorized triggers re-authentication prompt', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    try {
      await apiMockHelper.mockGoogleCalendarUnauthorized(page);
      await page.goto('/');
      await storageHelper.seed(page, 'patients', [PATIENTS.alice]);
      await page.reload();

      await page.getByTestId('nav-scheduler').click();
      await page.getByTestId('sync-google-btn').click();

      // App should prompt re-auth, not just silently fail
      await expect(
        page.getByTestId('google-reauth-banner').or(page.getByText(/reconnect.*google|sign.*in.*google/i)),
      ).toBeVisible({ timeout: 5_000 });
    } finally {
      await ctx.close();
    }
  });

  test('network failure during sync shows offline error and does not crash', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    try {
      await page.goto('/');
      await storageHelper.seed(page, 'patients', [PATIENTS.alice]);
      // Set up Google mock first, then override with network failure
      await apiMockHelper.mockNetworkFailure(page, 'http://localhost:3001/api/**');
      await page.reload();

      await page.getByTestId('nav-scheduler').click();
      await page.getByTestId('sync-google-btn').click();

      // Must show an error — must not leave the user with a frozen spinner
      await expect(page.getByTestId('toast-error')).toBeVisible({ timeout: 8_000 });
      // Scheduler grid must still be functional
      await expect(page.getByTestId('scheduler-grid')).toBeVisible();
    } finally {
      await ctx.close();
    }
  });
});

test.describe('Google Calendar — Read-Only Enforcement', () => {
  test('clicking a Google Calendar event block does NOT open the booking edit dialog', async ({
    pageWithGoogleMock: page,
  }) => {
    await page.getByTestId('nav-scheduler').click();
    await page.getByTestId('sync-google-btn').click();

    const gcalBlock = page.getByTestId('gcal-event-block').first();
    await expect(gcalBlock).toBeVisible({ timeout: 5_000 });
    await gcalBlock.click();

    // Should open a read-only detail view, NOT the editable booking dialog
    await expect(page.getByTestId('booking-dialog')).not.toBeVisible();
    await expect(page.getByTestId('gcal-detail-panel')).toBeVisible();

    // The read-only panel must NOT have an edit or save button
    await expect(page.getByTestId('booking-submit-btn')).not.toBeVisible();
  });
});
