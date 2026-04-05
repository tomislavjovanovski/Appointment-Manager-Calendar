// tests/e2e/concurrency.spec.ts
// ⚡ CONCURRENCY & RACE CONDITIONS
// Run under the "concurrency" Playwright project (fullyParallel: false)
// so the multi-context race test is deterministic.
//
// Business risk: Two staff members booking the same slot simultaneously.
// LocalStorage is per-browser-tab, so the real race is at the UI merge layer
// or if a shared backend ever gets added. We test the current behaviour AND
// document the expected behaviour when a backend constraint is added.

import { test, expect, browser } from '@playwright/test';
import { storageHelper } from '../utils/storageHelper';
import { bookingHelper } from '../utils/bookingHelper';
import { PATIENTS, nextWorkingSlot } from '../test-data/seed';

// ── Shared slot for all double-booking tests ─────────────────────────────────

const CONFLICT_SLOT = nextWorkingSlot(2, 14, 0); // 14:00 two days from now

test.describe('Double Booking — Same Browser Context (Tab)', () => {
  // This is the realistic scenario: a user opens the booking dialog, another
  // booking completes in a different tab sharing the same LocalStorage,
  // and the first user then tries to submit into the now-occupied slot.

  test('second booking into an occupied slot is rejected with conflict error', async ({
    browser,
  }) => {
    // ── Context A: first booking (completes successfully) ────────────────────
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();
    await pageA.goto('/');
    await storageHelper.seed(pageA, 'patients', [PATIENTS.alice, PATIENTS.bob]);
    await pageA.reload();

    // ── Context B: second booking (will conflict) ────────────────────────────
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await pageB.goto('/');
    await storageHelper.seed(pageB, 'patients', [PATIENTS.alice, PATIENTS.bob]);
    await pageB.reload();

    try {
      await test.step('Context A opens the booking dialog for 14:00', async () => {
        await bookingHelper.goToScheduler(pageA);
        await bookingHelper.openSlot(pageA, CONFLICT_SLOT);
        await bookingHelper.fillBookingForm(pageA, {
          patientId: PATIENTS.alice.id,
          type: 'consultation',
          duration: 30,
        });
      });

      await test.step('Context A submits successfully', async () => {
        await bookingHelper.submit(pageA);
        await expect(pageA.getByTestId('toast-success')).toBeVisible();
      });

      await test.step('Context B tries to book the same slot', async () => {
        // Copy Context A storage into Context B to simulate the storage sync
        // (e.g. after a background refresh or storage event)
        const aAppointments = await storageHelper.getAll(pageA, 'appointments');
        await storageHelper.seed(pageB, 'appointments', aAppointments);

        await bookingHelper.goToScheduler(pageB);
        await bookingHelper.openSlot(pageB, CONFLICT_SLOT);
        await bookingHelper.fillBookingForm(pageB, {
          patientId: PATIENTS.bob.id,
          type: 'consultation',
          duration: 30,
        });
      });

      await test.step('Context B receives a conflict error — slot already taken', async () => {
        await pageB.getByTestId('booking-submit-btn').click();
        await expect(pageB.getByTestId('error-slot-conflict')).toBeVisible();
        // Dialog remains open (no partial booking saved)
        await expect(pageB.getByTestId('booking-dialog')).toBeVisible();
      });

      await test.step('Only ONE appointment exists in storage for that slot', async () => {
        const appointments = await storageHelper.getAll(pageB, 'appointments') as {
          startTime: string;
        }[];

        const slotAppointments = appointments.filter(
          (a) => new Date(a.startTime).getTime() === CONFLICT_SLOT.getTime(),
        );
        // !! This assertion documents expected behaviour.
        // If it fails, the app is allowing double-booking — a P0 bug.
        expect(slotAppointments).toHaveLength(1);
      });
    } finally {
      await ctxA.close();
      await ctxB.close();
    }
  });
});

test.describe('Double Booking — Same Context, Rapid Clicks', () => {
  // A single user double-clicking the submit button should not create duplicates.

  test('rapid double-click on submit creates exactly one appointment', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    try {
      await page.goto('/');
      await storageHelper.seed(page, 'patients', [PATIENTS.alice]);
      await page.reload();

      const countBefore = await storageHelper.count(page, 'appointments');

      await bookingHelper.goToScheduler(page);
      await bookingHelper.openSlot(page, nextWorkingSlot(3, 11));
      await bookingHelper.fillBookingForm(page, {
        patientId: PATIENTS.alice.id,
        type: 'consultation',
        duration: 30,
      });

      // Double-click the submit button as fast as possible
      const submitBtn = page.getByTestId('booking-submit-btn');
      await submitBtn.dblclick();

      // Wait for dialog to settle
      await page.waitForTimeout(500);

      const countAfter = await storageHelper.count(page, 'appointments');
      expect(countAfter).toBe(countBefore + 1); // exactly +1, not +2
    } finally {
      await ctx.close();
    }
  });
});

test.describe('Double Booking — StorageEvent Cross-Tab Sync', () => {
  // Modern browsers fire a "storage" event when LocalStorage changes in another tab.
  // The app should listen for this and update the scheduler UI accordingly,
  // preventing a user from visually seeing a free slot that was just taken.

  test('scheduler reflects appointment created in another tab via storage event', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page1 = await ctx.newPage();
    const page2 = await ctx.newPage(); // same context = same LocalStorage

    try {
      await page1.goto('/');
      await storageHelper.seed(page1, 'patients', [PATIENTS.alice, PATIENTS.bob]);
      await page2.goto('/');

      await test.step('page1 books an appointment', async () => {
        await bookingHelper.goToScheduler(page1);
        await bookingHelper.book(page1, {
          patientId: PATIENTS.alice.id,
          type: 'consultation',
          duration: 30,
          slotDate: nextWorkingSlot(4, 9),
        });
      });

      await test.step('page2 scheduler shows the new appointment (via storage event)', async () => {
        await bookingHelper.goToScheduler(page2);
        // The scheduler should react to the StorageEvent without a full reload
        const block = page2
          .getByTestId('appointment-block')
          .filter({ hasText: PATIENTS.alice.firstName });

        // Allow up to 3s for the reactive update
        await expect(block).toBeVisible({ timeout: 3_000 });
      });
    } finally {
      await ctx.close();
    }
  });
});
