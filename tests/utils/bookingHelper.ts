// tests/utils/bookingHelper.ts
// Page-Object style helper for the booking flow.
// Tests use this instead of duplicating selectors.

import { Page, expect } from '@playwright/test';
import { nextWorkingSlot } from '../test-data/seed';

export interface BookingOptions {
  patientId?: string;         // select existing patient
  newPatient?: {              // OR create inline
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
  };
  type: 'consultation' | 'follow-up' | 'procedure';
  duration: 30 | 60 | 120;
  notes?: string;
  syncToGoogle?: boolean;
  slotDate?: Date;            // defaults to nextWorkingSlot()
}

export const bookingHelper = {
  // ── Navigate ──────────────────────────────────────────────────────────────

  async goToScheduler(page: Page): Promise<void> {
    await page.getByTestId('nav-scheduler').click();
    await expect(page.getByTestId('scheduler-grid')).toBeVisible();
  },

  // ── Open booking dialog ────────────────────────────────────────────────────

  async openSlot(page: Page, slot?: Date): Promise<void> {
    const target = slot ?? nextWorkingSlot();
    const hour = target.getHours();

    // Click the correct hour cell in the scheduler grid
    await page
      .getByTestId(`time-slot-${hour}:00`)
      .first()
      .click();

    await expect(page.getByTestId('booking-dialog')).toBeVisible();
  },

  // ── Fill the booking form ─────────────────────────────────────────────────

  async fillBookingForm(page: Page, options: BookingOptions): Promise<void> {
    const dialog = page.getByTestId('booking-dialog');

    // Patient selection
    if (options.patientId) {
      await dialog.getByTestId('patient-select').click();
      await page
        .getByTestId(`patient-option-${options.patientId}`)
        .click();
    } else if (options.newPatient) {
      await dialog.getByTestId('create-new-patient-btn').click();
      await this.fillNewPatientForm(page, options.newPatient);
    }

    // Appointment type
    await dialog.getByTestId('appointment-type-select').selectOption(options.type);

    // Duration
    await dialog.getByTestId('duration-select').selectOption(String(options.duration));

    // Notes
    if (options.notes) {
      await dialog.getByTestId('appointment-notes').fill(options.notes);
    }

    // Google sync toggle
    if (options.syncToGoogle !== undefined) {
      const toggle = dialog.getByTestId('google-sync-toggle');
      const isChecked = await toggle.isChecked();
      if (isChecked !== options.syncToGoogle) await toggle.click();
    }
  },

  async fillNewPatientForm(
    page: Page,
    patient: BookingOptions['newPatient'] & object,
  ): Promise<void> {
    const panel = page.getByTestId('new-patient-panel');
    await expect(panel).toBeVisible();

    await panel.getByTestId('patient-first-name').fill(patient.firstName);
    await panel.getByTestId('patient-last-name').fill(patient.lastName);
    await panel.getByTestId('patient-email').fill(patient.email);
    await panel.getByTestId('patient-phone').fill(patient.phone);
    await panel.getByTestId('patient-dob').fill(patient.dateOfBirth);
  },

  // ── Submit ────────────────────────────────────────────────────────────────

  async submit(page: Page): Promise<void> {
    await page.getByTestId('booking-submit-btn').click();
    // Wait for dialog to close — this confirms success without arbitrary waits
    await expect(page.getByTestId('booking-dialog')).not.toBeVisible({
      timeout: 8_000,
    });
  },

  async submitAndExpectError(page: Page, errorTestId: string): Promise<void> {
    await page.getByTestId('booking-submit-btn').click();
    await expect(page.getByTestId(errorTestId)).toBeVisible();
    // Dialog must remain open on validation failure
    await expect(page.getByTestId('booking-dialog')).toBeVisible();
  },

  // ── Full booking flow (convenience) ──────────────────────────────────────

  async book(page: Page, options: BookingOptions): Promise<void> {
    await this.openSlot(page, options.slotDate);
    await this.fillBookingForm(page, options);
    await this.submit(page);
    // Toast confirmation
    await expect(page.getByTestId('toast-success')).toBeVisible();
  },

  // ── Status change ─────────────────────────────────────────────────────────

  async changeStatus(
    page: Page,
    appointmentTestId: string,
    newStatus: 'scheduled' | 'completed' | 'cancelled' | 'no-show',
  ): Promise<void> {
    await page.getByTestId(appointmentTestId).click();
    await expect(page.getByTestId('appointment-detail-dialog')).toBeVisible();
    await page.getByTestId('status-select').selectOption(newStatus);
    await page.getByTestId('save-status-btn').click();
    await expect(page.getByTestId('appointment-detail-dialog')).not.toBeVisible();
  },
};
