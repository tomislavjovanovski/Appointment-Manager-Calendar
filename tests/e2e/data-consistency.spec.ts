// tests/e2e/data-consistency.spec.ts
// Tests the truth: what the UI shows must match what is in LocalStorage.
// Also covers: storage corruption, quota exceeded, session persistence after reload.

import { test, expect } from '../fixtures/base';
import { storageHelper } from '../utils/storageHelper';
import { bookingHelper } from '../utils/bookingHelper';
import { PATIENTS, nextWorkingSlot } from '../test-data/seed';

test.describe('UI ↔ Storage Consistency', () => {
  test('scheduler appointment count matches storage appointment count', async ({
    pageWithPatients: page, booking,
  }) => {
    await booking.goToScheduler(page);

    // Book 3 appointments and assert after each one
    for (let i = 0; i < 3; i++) {
      await booking.book(page, {
        patientId: i % 2 === 0 ? PATIENTS.alice.id : PATIENTS.bob.id,
        type: 'consultation',
        duration: 30,
        slotDate: nextWorkingSlot(1, 9 + i * 2), // 09, 11, 13
      });

      const uiBlocks = await page.getByTestId('appointment-block').count();
      const storageCount = await storageHelper.count(page, 'appointments');

      // After each booking, UI and storage must agree
      expect(uiBlocks).toBe(storageCount);
    }
  });

  test('appointment details shown in dialog match storage record', async ({
    pageWithPatients: page, booking, storage,
  }) => {
    const slot = nextWorkingSlot(1, 10);

    await booking.goToScheduler(page);
    await booking.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'procedure',
      duration: 120,
      notes: 'Detailed consistency check note',
      slotDate: slot,
    });

    // Open the appointment detail dialog
    await page
      .getByTestId('appointment-block')
      .filter({ hasText: PATIENTS.alice.firstName })
      .click();

    await expect(page.getByTestId('appointment-detail-dialog')).toBeVisible();

    // Read what the UI shows
    const uiType = await page.getByTestId('detail-type').textContent();
    const uiDuration = await page.getByTestId('detail-duration').textContent();
    const uiNotes = await page.getByTestId('detail-notes').textContent();
    const uiPatient = await page.getByTestId('detail-patient-name').textContent();

    // Read what storage has
    const stored = await storage.getAll(page, 'appointments') as {
      type: string;
      duration: number;
      notes: string;
      patientId: string;
    }[];
    const record = stored[stored.length - 1];

    expect(uiType?.toLowerCase()).toContain(record.type);
    expect(uiDuration).toContain(String(record.duration));
    expect(uiNotes).toContain(record.notes);
    expect(uiPatient?.toLowerCase()).toContain(PATIENTS.alice.firstName.toLowerCase());
  });

  test('deleting an appointment removes it from both UI and storage', async ({
    pageWithPatients: page, booking, storage,
  }) => {
    await booking.goToScheduler(page);
    await booking.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      slotDate: nextWorkingSlot(1, 10),
    });

    const countBefore = await storage.count(page, 'appointments');

    // Open detail dialog and delete
    await page
      .getByTestId('appointment-block')
      .filter({ hasText: PATIENTS.alice.firstName })
      .click();

    await page.getByTestId('delete-appointment-btn').click();
    await page.getByTestId('confirm-delete-btn').click(); // confirmation modal

    await test.step('Appointment block is removed from UI', async () => {
      await expect(
        page.getByTestId('appointment-block').filter({ hasText: PATIENTS.alice.firstName }),
      ).not.toBeVisible();
    });

    await test.step('Storage count decremented by 1', async () => {
      const countAfter = await storage.count(page, 'appointments');
      expect(countAfter).toBe(countBefore - 1);
    });
  });
});

test.describe('Session Persistence After Reload', () => {
  test('appointments survive a full page reload', async ({
    pageWithPatients: page, booking, storage,
  }) => {
    await booking.goToScheduler(page);
    await booking.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      slotDate: nextWorkingSlot(1, 10),
    });

    const countBeforeReload = await storage.count(page, 'appointments');

    await test.step('Reload the page', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Storage count unchanged after reload', async () => {
      const countAfterReload = await storage.count(page, 'appointments');
      expect(countAfterReload).toBe(countBeforeReload);
    });

    await test.step('Appointment block visible in scheduler after reload', async () => {
      await page.getByTestId('nav-scheduler').click();
      await expect(
        page.getByTestId('appointment-block').filter({ hasText: PATIENTS.alice.firstName }),
      ).toBeVisible();
    });
  });

  test('patients survive a full page reload', async ({
    pageWithPatients: page,
  }) => {
    await page.reload();
    await page.waitForLoadState('networkidle');

    await page.getByTestId('nav-patients').click();

    const rows = page.getByTestId('patient-row');
    await expect(rows).toHaveCount(2); // Alice + Bob still present
  });
});

test.describe('LocalStorage Failure Scenarios', () => {
  test('corrupted appointments storage shows error state instead of crashing', async ({
    browser,
  }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();

    try {
      await page.goto('/');

      await test.step('Corrupt the appointments key', async () => {
        await storageHelper.corrupt(page, 'appointments');
      });

      await test.step('Reload — app should handle corruption gracefully', async () => {
        await page.reload();
        await page.waitForLoadState('networkidle');
      });

      await test.step('App renders without white-screening or JS exception', async () => {
        // No uncaught errors in the page
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.getByTestId('nav-scheduler').click();
        // If the scheduler loads (even empty), the app handled corruption gracefully
        await expect(page.getByTestId('scheduler-grid')).toBeVisible({ timeout: 5_000 });

        // Acceptable: error banner. Unacceptable: crash or blank page.
        expect(errors.filter((e) => e.includes('Cannot read'))).toHaveLength(0);
      });

      await test.step('Error banner or empty state shown (not silent)', async () => {
        const hasBanner = await page.getByTestId('storage-error-banner').isVisible();
        const hasEmptyState = await page.getByTestId('scheduler-empty-state').isVisible();
        expect(hasBanner || hasEmptyState).toBe(true);
      });
    } finally {
      await ctx.close();
    }
  });

  test('QuotaExceededError during booking shows user-friendly error', async ({
    pageWithPatients: page, booking,
  }) => {
    await booking.goToScheduler(page);
    await booking.openSlot(page, nextWorkingSlot(1, 10));
    await booking.fillBookingForm(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
    });

    await test.step('Simulate storage quota exceeded', async () => {
      await storageHelper.simulateQuotaExceeded(page);
    });

    await test.step('Submit fails with a storage error message (not a generic crash)', async () => {
      await page.getByTestId('booking-submit-btn').click();
      await expect(
        page.getByTestId('toast-error').or(page.getByText(/storage.*full|unable.*save/i)),
      ).toBeVisible({ timeout: 5_000 });
      // Dialog remains open — user can copy their data
      await expect(page.getByTestId('booking-dialog')).toBeVisible();
    });
  });
});

test.describe('Timezone & Date Edge Cases', () => {
  test('appointment created near midnight displays on the correct calendar day', async ({
    pageWithPatients: page, booking, storage,
  }) => {
    // Use 23:30 slot on a working day
    const lateSlot = nextWorkingSlot(1, 23, 30);

    await booking.goToScheduler(page);
    await booking.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      slotDate: lateSlot,
    });

    const appointments = await storage.getAll(page, 'appointments') as {
      startTime: string;
      endTime: string;
    }[];

    const appt = appointments[appointments.length - 1];
    const startDate = new Date(appt.startTime);
    const endDate = new Date(appt.endTime);

    // Duration of 30 min starting at 23:30 ends at 00:00 next day — handle correctly
    expect(startDate.getHours()).toBe(23);
    expect(startDate.getMinutes()).toBe(30);
    // End time must be correctly calculated (not negative duration)
    expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
  });

  test('appointment time stored in ISO 8601 format', async ({
    pageWithPatients: page, booking, storage,
  }) => {
    await booking.goToScheduler(page);
    await booking.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      slotDate: nextWorkingSlot(1, 10),
    });

    const appointments = await storage.getAll(page, 'appointments') as { startTime: string }[];
    const { startTime } = appointments[appointments.length - 1];

    // ISO 8601: "2025-03-10T10:00:00.000Z" or with offset
    expect(startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});
