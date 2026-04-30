# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/concurrency.spec.ts >> Double Booking — StorageEvent Cross-Tab Sync >> scheduler reflects appointment created in another tab via storage event
- Location: tests/e2e/concurrency.spec.ts:143:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('toast-success')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('toast-success')

```

# Test source

```ts
  33  |     await page.getByTestId('nav-scheduler').click();
  34  |     await expect(page.getByTestId('scheduler-grid')).toBeVisible();
  35  |   },
  36  | 
  37  |   // ── Open booking dialog ────────────────────────────────────────────────────
  38  | 
  39  |   async openSlot(page: Page, slot?: Date): Promise<void> {
  40  |     const target = slot ?? nextWorkingSlot();
  41  |     const hour = target.getHours();
  42  | 
  43  |     // Click the correct hour cell in the scheduler grid
  44  |     await page
  45  |       .getByTestId(`time-slot-${hour}:00`)
  46  |       .first()
  47  |       .click();
  48  | 
  49  |     await expect(page.getByTestId('booking-dialog')).toBeVisible();
  50  |   },
  51  | 
  52  |   // ── Fill the booking form ─────────────────────────────────────────────────
  53  | 
  54  |   async fillBookingForm(page: Page, options: BookingOptions): Promise<void> {
  55  |     const dialog = page.getByTestId('booking-dialog');
  56  | 
  57  |     // Patient selection
  58  |     if (options.patientId) {
  59  |       await dialog.getByTestId('patient-select').click();
  60  |       await page
  61  |         .getByTestId(`patient-option-${options.patientId}`)
  62  |         .click();
  63  |     } else if (options.newPatient) {
  64  |       await dialog.getByTestId('create-new-patient-btn').click();
  65  |       await this.fillNewPatientForm(page, options.newPatient);
  66  |     }
  67  | 
  68  |     // Appointment type
  69  |     await this.selectRadixOption(
  70  |       page,
  71  |       'appointment-type-select',
  72  |       `appointment-type-option-${options.type}`,
  73  |     );
  74  | 
  75  |     // Duration
  76  |     await this.selectRadixOption(
  77  |       page,
  78  |       'duration-select',
  79  |       `duration-option-${options.duration}`,
  80  |     );
  81  | 
  82  |     // Notes
  83  |     if (options.notes) {
  84  |       await dialog.getByTestId('appointment-notes').fill(options.notes);
  85  |     }
  86  | 
  87  |     // Google sync toggle
  88  |     if (options.syncToGoogle !== undefined) {
  89  |       const toggle = dialog.getByTestId('google-sync-toggle');
  90  |       const isChecked = await toggle.isChecked();
  91  |       if (isChecked !== options.syncToGoogle) await toggle.click();
  92  |     }
  93  |   },
  94  | 
  95  |   async fillNewPatientForm(
  96  |     page: Page,
  97  |     patient: BookingOptions['newPatient'] & object,
  98  |   ): Promise<void> {
  99  |     const panel = page.getByTestId('new-patient-panel');
  100 |     await expect(panel).toBeVisible();
  101 | 
  102 |     await panel.getByTestId('patient-first-name').fill(patient.firstName);
  103 |     await panel.getByTestId('patient-last-name').fill(patient.lastName);
  104 |     await panel.getByTestId('patient-email').fill(patient.email);
  105 |     await panel.getByTestId('patient-phone').fill(patient.phone);
  106 |     await panel.getByTestId('patient-dob').fill(patient.dateOfBirth);
  107 |   },
  108 | 
  109 |   // ── Submit ────────────────────────────────────────────────────────────────
  110 | 
  111 |   async submit(page: Page): Promise<void> {
  112 |     await page.getByTestId('booking-submit-btn').click();
  113 |     // Wait for dialog to close — this confirms success without arbitrary waits
  114 |     await expect(page.getByTestId('booking-dialog')).not.toBeVisible({
  115 |       timeout: 8_000,
  116 |     });
  117 |   },
  118 | 
  119 |   async submitAndExpectError(page: Page, errorTestId: string): Promise<void> {
  120 |     await page.getByTestId('booking-submit-btn').click();
  121 |     await expect(page.getByTestId(errorTestId)).toBeVisible();
  122 |     // Dialog must remain open on validation failure
  123 |     await expect(page.getByTestId('booking-dialog')).toBeVisible();
  124 |   },
  125 | 
  126 |   // ── Full booking flow (convenience) ──────────────────────────────────────
  127 | 
  128 |   async book(page: Page, options: BookingOptions): Promise<void> {
  129 |     await this.openSlot(page, options.slotDate);
  130 |     await this.fillBookingForm(page, options);
  131 |     await this.submit(page);
  132 |     // Toast confirmation
> 133 |     await expect(page.getByTestId('toast-success')).toBeVisible();
      |                                                     ^ Error: expect(locator).toBeVisible() failed
  134 |   },
  135 | 
  136 |   // ── Status change ─────────────────────────────────────────────────────────
  137 | 
  138 |   async changeStatus(
  139 |     page: Page,
  140 |     appointmentTestId: string,
  141 |     newStatus: 'scheduled' | 'completed' | 'cancelled' | 'no-show',
  142 |   ): Promise<void> {
  143 |     await page.getByTestId(appointmentTestId).click();
  144 |     await expect(page.getByTestId('appointment-detail-dialog')).toBeVisible();
  145 |     await this.selectRadixOption(page, 'status-select', `status-option-${newStatus}`);
  146 |     await page.getByTestId('save-status-btn').click();
  147 |     await expect(page.getByTestId('appointment-detail-dialog')).not.toBeVisible();
  148 |   },
  149 | };
  150 | 
```