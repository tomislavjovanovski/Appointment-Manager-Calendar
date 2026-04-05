// tests/e2e/appointment-booking.spec.ts
// Critical path: booking an appointment end-to-end.
// Also covers: validation, out-of-hours, storage consistency.

import { test, expect } from '../fixtures/base';
import { PATIENTS, APPOINTMENTS, nextWorkingSlot, WORKING_HOURS } from '../test-data/seed';

test.describe('Appointment Booking — Core Flow', () => {
  test('books a consultation with an existing patient and persists to storage', async ({
    pageWithPatients: page, booking, storage,
  }) => {
    await test.step('Navigate to scheduler', async () => {
      await booking.goToScheduler(page);
    });

    await test.step('Open a time slot and fill form', async () => {
      await booking.openSlot(page, nextWorkingSlot(1, 10));
      await booking.fillBookingForm(page, {
        patientId: PATIENTS.alice.id,
        type: APPOINTMENTS.consultation.type,
        duration: APPOINTMENTS.consultation.duration,
        notes: APPOINTMENTS.consultation.notes,
        syncToGoogle: false,
      });
    });

    await test.step('Submit and confirm toast', async () => {
      await booking.submit(page);
      await expect(page.getByTestId('toast-success')).toBeVisible();
    });

    await test.step('Verify appointment appears in scheduler UI', async () => {
      const slot = page.getByTestId('appointment-block').filter({
        hasText: `${PATIENTS.alice.firstName} ${PATIENTS.alice.lastName}`,
      });
      await expect(slot).toBeVisible();
    });

    await test.step('Verify appointment persisted to LocalStorage', async () => {
      await storage.assertAppointmentExistsInStorage(page, {
        patientId: PATIENTS.alice.id,
        type: APPOINTMENTS.consultation.type,
      });
    });
  });

  test('appointment count in LocalStorage increments by exactly 1 after booking', async ({
    pageWithPatients: page, booking, storage,
  }) => {
    const countBefore = await storage.count(page, 'appointments');

    await booking.goToScheduler(page);
    await booking.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
    });

    const countAfter = await storage.count(page, 'appointments');
    expect(countAfter).toBe(countBefore + 1);
  });
});

test.describe('Appointment Booking — Validation', () => {
  test('submit with no patient selected shows validation error', async ({
    pageWithPatients: page, booking,
  }) => {
    await booking.goToScheduler(page);
    await booking.openSlot(page);

    await test.step('Submit empty form', async () => {
      await booking.submitAndExpectError(page, 'error-patient-required');
    });

    await test.step('Dialog stays open — no partial save', async () => {
      await expect(page.getByTestId('booking-dialog')).toBeVisible();
    });
  });

  test('submit with invalid notes length shows character-limit error', async ({
    pageWithPatients: page, booking,
  }) => {
    await booking.goToScheduler(page);
    await booking.openSlot(page);

    await booking.fillBookingForm(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      notes: 'x'.repeat(1001), // exceeds reasonable 1000-char limit
    });

    await booking.submitAndExpectError(page, 'error-notes-too-long');
  });

  test('cannot book outside working hours', async ({
    pageWithPatients: page,
  }) => {
    await test.step('Navigate to scheduler', async () => {
      await page.getByTestId('nav-scheduler').click();
    });

    await test.step('Attempt to click a slot before working hours start', async () => {
      const earlySlot = page.getByTestId(`time-slot-${WORKING_HOURS.start - 1}:00`);

      // If rendered, it should be disabled; if not rendered, it shouldn't be clickable
      const isVisible = await earlySlot.isVisible();
      if (isVisible) {
        await expect(earlySlot).toHaveAttribute('aria-disabled', 'true');
      } else {
        // Slot not rendered at all = correct behaviour
        expect(isVisible).toBe(false);
      }
    });
  });
});

test.describe('Appointment Booking — Status Lifecycle', () => {
  // Seed one appointment, then cycle through all statuses
  test('appointment transitions: scheduled → completed → cancelled → no-show', async ({
    pageWithPatients: page, booking, storage,
  }) => {
    // Arrange: book appointment first
    await booking.goToScheduler(page);
    await booking.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
    });

    const statuses = ['completed', 'cancelled', 'no-show', 'scheduled'] as const;

    for (const status of statuses) {
      await test.step(`Set status to "${status}"`, async () => {
        const appointmentBlock = page
          .getByTestId('appointment-block')
          .filter({ hasText: PATIENTS.alice.firstName })
          .first();

        await booking.changeStatus(page, appointmentBlock.toString(), status);

        // Verify CSS class reflects the new status (colour coding)
        await expect(appointmentBlock).toHaveAttribute('data-status', status);

        // Cross-check with storage
        const appointments = await storage.getAll(page, 'appointments') as { status: string }[];
        const latest = appointments[appointments.length - 1];
        expect(latest.status).toBe(status);
      });
    }
  });
});

test.describe('Appointment Booking — Refresh Resilience', () => {
  test('booking dialog dismissed on page refresh — no orphaned appointment', async ({
    pageWithPatients: page, booking, storage,
  }) => {
    const countBefore = await storage.count(page, 'appointments');

    await booking.goToScheduler(page);
    await booking.openSlot(page);

    await test.step('Partially fill form (do NOT submit)', async () => {
      await booking.fillBookingForm(page, {
        patientId: PATIENTS.alice.id,
        type: 'consultation',
        duration: 30,
      });
    });

    await test.step('Refresh before submitting', async () => {
      await page.reload();
      await page.waitForLoadState('networkidle');
    });

    await test.step('Dialog is gone, storage count unchanged', async () => {
      await expect(page.getByTestId('booking-dialog')).not.toBeVisible();
      const countAfter = await storage.count(page, 'appointments');
      expect(countAfter).toBe(countBefore);
    });
  });
});
