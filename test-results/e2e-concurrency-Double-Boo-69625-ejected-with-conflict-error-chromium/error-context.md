# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/concurrency.spec.ts >> Double Booking — Same Browser Context (Tab) >> second booking into an occupied slot is rejected with conflict error
- Location: tests/e2e/concurrency.spec.ts:25:3

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for getByTestId('nav-scheduler')

```

# Test source

```ts
  1   | // tests/utils/bookingHelper.ts
  2   | // Page-Object style helper for the booking flow.
  3   | // Tests use this instead of duplicating selectors.
  4   | 
  5   | import { Page, expect } from '@playwright/test';
  6   | import { nextWorkingSlot } from '../test-data/seed';
  7   | 
  8   | export interface BookingOptions {
  9   |   patientId?: string;         // select existing patient
  10  |   newPatient?: {              // OR create inline
  11  |     firstName: string;
  12  |     lastName: string;
  13  |     email: string;
  14  |     phone: string;
  15  |     dateOfBirth: string;
  16  |   };
  17  |   type: 'consultation' | 'follow-up' | 'procedure';
  18  |   duration: 30 | 60 | 120;
  19  |   notes?: string;
  20  |   syncToGoogle?: boolean;
  21  |   slotDate?: Date;            // defaults to nextWorkingSlot()
  22  | }
  23  | 
  24  | export const bookingHelper = {
  25  |   // ── Navigate ──────────────────────────────────────────────────────────────
  26  | 
  27  |   async goToScheduler(page: Page): Promise<void> {
> 28  |     await page.getByTestId('nav-scheduler').click();
      |                                             ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
  29  |     await expect(page.getByTestId('scheduler-grid')).toBeVisible();
  30  |   },
  31  | 
  32  |   // ── Open booking dialog ────────────────────────────────────────────────────
  33  | 
  34  |   async openSlot(page: Page, slot?: Date): Promise<void> {
  35  |     const target = slot ?? nextWorkingSlot();
  36  |     const hour = target.getHours();
  37  | 
  38  |     // Click the correct hour cell in the scheduler grid
  39  |     await page
  40  |       .getByTestId(`time-slot-${hour}:00`)
  41  |       .first()
  42  |       .click();
  43  | 
  44  |     await expect(page.getByTestId('booking-dialog')).toBeVisible();
  45  |   },
  46  | 
  47  |   // ── Fill the booking form ─────────────────────────────────────────────────
  48  | 
  49  |   async fillBookingForm(page: Page, options: BookingOptions): Promise<void> {
  50  |     const dialog = page.getByTestId('booking-dialog');
  51  | 
  52  |     // Patient selection
  53  |     if (options.patientId) {
  54  |       await dialog.getByTestId('patient-select').click();
  55  |       await page
  56  |         .getByTestId(`patient-option-${options.patientId}`)
  57  |         .click();
  58  |     } else if (options.newPatient) {
  59  |       await dialog.getByTestId('create-new-patient-btn').click();
  60  |       await this.fillNewPatientForm(page, options.newPatient);
  61  |     }
  62  | 
  63  |     // Appointment type
  64  |     await dialog.getByTestId('appointment-type-select').selectOption(options.type);
  65  | 
  66  |     // Duration
  67  |     await dialog.getByTestId('duration-select').selectOption(String(options.duration));
  68  | 
  69  |     // Notes
  70  |     if (options.notes) {
  71  |       await dialog.getByTestId('appointment-notes').fill(options.notes);
  72  |     }
  73  | 
  74  |     // Google sync toggle
  75  |     if (options.syncToGoogle !== undefined) {
  76  |       const toggle = dialog.getByTestId('google-sync-toggle');
  77  |       const isChecked = await toggle.isChecked();
  78  |       if (isChecked !== options.syncToGoogle) await toggle.click();
  79  |     }
  80  |   },
  81  | 
  82  |   async fillNewPatientForm(
  83  |     page: Page,
  84  |     patient: BookingOptions['newPatient'] & object,
  85  |   ): Promise<void> {
  86  |     const panel = page.getByTestId('new-patient-panel');
  87  |     await expect(panel).toBeVisible();
  88  | 
  89  |     await panel.getByTestId('patient-first-name').fill(patient.firstName);
  90  |     await panel.getByTestId('patient-last-name').fill(patient.lastName);
  91  |     await panel.getByTestId('patient-email').fill(patient.email);
  92  |     await panel.getByTestId('patient-phone').fill(patient.phone);
  93  |     await panel.getByTestId('patient-dob').fill(patient.dateOfBirth);
  94  |   },
  95  | 
  96  |   // ── Submit ────────────────────────────────────────────────────────────────
  97  | 
  98  |   async submit(page: Page): Promise<void> {
  99  |     await page.getByTestId('booking-submit-btn').click();
  100 |     // Wait for dialog to close — this confirms success without arbitrary waits
  101 |     await expect(page.getByTestId('booking-dialog')).not.toBeVisible({
  102 |       timeout: 8_000,
  103 |     });
  104 |   },
  105 | 
  106 |   async submitAndExpectError(page: Page, errorTestId: string): Promise<void> {
  107 |     await page.getByTestId('booking-submit-btn').click();
  108 |     await expect(page.getByTestId(errorTestId)).toBeVisible();
  109 |     // Dialog must remain open on validation failure
  110 |     await expect(page.getByTestId('booking-dialog')).toBeVisible();
  111 |   },
  112 | 
  113 |   // ── Full booking flow (convenience) ──────────────────────────────────────
  114 | 
  115 |   async book(page: Page, options: BookingOptions): Promise<void> {
  116 |     await this.openSlot(page, options.slotDate);
  117 |     await this.fillBookingForm(page, options);
  118 |     await this.submit(page);
  119 |     // Toast confirmation
  120 |     await expect(page.getByTestId('toast-success')).toBeVisible();
  121 |   },
  122 | 
  123 |   // ── Status change ─────────────────────────────────────────────────────────
  124 | 
  125 |   async changeStatus(
  126 |     page: Page,
  127 |     appointmentTestId: string,
  128 |     newStatus: 'scheduled' | 'completed' | 'cancelled' | 'no-show',
```