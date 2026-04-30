# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/data-consistency.spec.ts >> Timezone & Date Edge Cases >> appointment created near midnight displays on the correct calendar day
- Location: tests/e2e/data-consistency.spec.ts:225:3

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for getByTestId('time-slot-23:00').first()

```

# Page snapshot

```yaml
- generic [ref=e2]:
  - region "Notifications (F8)":
    - list
  - region "Notifications alt+T"
  - generic [ref=e3]:
    - generic [ref=e4]:
      - generic [ref=e6]:
        - img [ref=e8]
        - generic [ref=e12]:
          - heading "MediCal" [level=1] [ref=e13]
          - paragraph [ref=e14]: Appointment Manager
      - navigation [ref=e15]:
        - paragraph [ref=e16]: Menu
        - generic [ref=e17]:
          - button "Dashboard" [active] [ref=e18] [cursor=pointer]:
            - img
            - text: Dashboard
          - button "Patients" [ref=e19] [cursor=pointer]:
            - img
            - text: Patients
          - button "Settings" [ref=e20] [cursor=pointer]:
            - img
            - text: Settings
      - generic [ref=e22]:
        - paragraph [ref=e23]: Standalone • Flexible
        - paragraph [ref=e24]: Data stored locally
    - main [ref=e25]:
      - generic [ref=e27]:
        - generic [ref=e28]: No appointments scheduled
        - generic [ref=e29]:
          - generic [ref=e30]:
            - generic [ref=e31]:
              - img [ref=e33]
              - heading "Weekly Schedule" [level=2] [ref=e35]
            - paragraph [ref=e36]: "Working hours: 08:00 - 18:00"
          - generic [ref=e37]:
            - button "Google Calendar" [ref=e38] [cursor=pointer]:
              - img
              - text: Google Calendar
            - button "New Appointment" [ref=e39] [cursor=pointer]:
              - img
              - text: New Appointment
        - generic [ref=e41]:
          - generic [ref=e42]:
            - generic [ref=e44]:
              - button "Previous week" [ref=e45] [cursor=pointer]:
                - img
              - generic [ref=e46]: 27 Apr – 3 May 2026
              - button "Next week" [ref=e47] [cursor=pointer]:
                - img
            - generic [ref=e48]:
              - button "This week" [ref=e49] [cursor=pointer]
              - button "Jump to date" [ref=e50] [cursor=pointer]:
                - img
                - generic [ref=e51]: Jump to date
          - generic [ref=e54]:
            - generic [ref=e55]:
              - generic [ref=e58]:
                - paragraph [ref=e59]: "27"
                - paragraph [ref=e60]: Mon
              - generic [ref=e62]:
                - paragraph [ref=e63]: "28"
                - paragraph [ref=e64]: Tue
              - generic [ref=e66]:
                - paragraph [ref=e67]: "29"
                - paragraph [ref=e68]: Wed
              - generic [ref=e70]:
                - paragraph [ref=e71]: "30"
                - paragraph [ref=e72]: Thu
              - generic [ref=e74]:
                - paragraph [ref=e75]: "01"
                - paragraph [ref=e76]: Fri
              - generic [ref=e78]:
                - paragraph [ref=e79]: "02"
                - paragraph [ref=e80]: Sat
              - generic [ref=e82]:
                - paragraph [ref=e83]: "03"
                - paragraph [ref=e84]: Sun
            - generic [ref=e85]:
              - generic [ref=e87]: 08:00
              - button [ref=e89] [cursor=pointer]
              - button [ref=e91] [cursor=pointer]
              - button [ref=e93] [cursor=pointer]
              - button [ref=e98] [cursor=pointer]
              - button [ref=e100] [cursor=pointer]
              - button [ref=e102] [cursor=pointer]
              - button [ref=e104] [cursor=pointer]
              - generic [ref=e106]: 08:30
              - button [ref=e108] [cursor=pointer]
              - button [ref=e110] [cursor=pointer]
              - button [ref=e112] [cursor=pointer]
              - button [ref=e114] [cursor=pointer]
              - button [ref=e116] [cursor=pointer]
              - button [ref=e118] [cursor=pointer]
              - button [ref=e120] [cursor=pointer]
              - generic [ref=e122]: 09:00
              - button [ref=e124] [cursor=pointer]
              - button [ref=e126] [cursor=pointer]
              - button [ref=e128] [cursor=pointer]
              - button [ref=e130] [cursor=pointer]
              - button [ref=e132] [cursor=pointer]
              - button [ref=e134] [cursor=pointer]
              - button [ref=e136] [cursor=pointer]
              - generic [ref=e138]: 09:30
              - button [ref=e140] [cursor=pointer]
              - button [ref=e142] [cursor=pointer]
              - button [ref=e144] [cursor=pointer]
              - button [ref=e146] [cursor=pointer]
              - button [ref=e148] [cursor=pointer]
              - button [ref=e150] [cursor=pointer]
              - button [ref=e152] [cursor=pointer]
              - generic [ref=e154]: 10:00
              - button [ref=e156] [cursor=pointer]
              - button [ref=e158] [cursor=pointer]
              - button [ref=e160] [cursor=pointer]
              - button [ref=e162] [cursor=pointer]
              - button [ref=e164] [cursor=pointer]
              - button [ref=e166] [cursor=pointer]
              - button [ref=e168] [cursor=pointer]
              - generic [ref=e170]: 10:30
              - button [ref=e172] [cursor=pointer]
              - button [ref=e174] [cursor=pointer]
              - button [ref=e176] [cursor=pointer]
              - button [ref=e178] [cursor=pointer]
              - button [ref=e180] [cursor=pointer]
              - button [ref=e182] [cursor=pointer]
              - button [ref=e184] [cursor=pointer]
              - generic [ref=e186]: 11:00
              - button [ref=e188] [cursor=pointer]
              - button [ref=e190] [cursor=pointer]
              - button [ref=e192] [cursor=pointer]
              - button [ref=e194] [cursor=pointer]
              - button [ref=e196] [cursor=pointer]
              - button [ref=e198] [cursor=pointer]
              - button [ref=e200] [cursor=pointer]
              - generic [ref=e202]: 11:30
              - button [ref=e204] [cursor=pointer]
              - button [ref=e206] [cursor=pointer]
              - button [ref=e208] [cursor=pointer]
              - button [ref=e210] [cursor=pointer]
              - button [ref=e212] [cursor=pointer]
              - button [ref=e214] [cursor=pointer]
              - button [ref=e216] [cursor=pointer]
              - generic [ref=e218]: 12:00
              - button [ref=e220] [cursor=pointer]
              - button [ref=e222] [cursor=pointer]
              - button [ref=e224] [cursor=pointer]
              - button [ref=e226] [cursor=pointer]
              - button [ref=e228] [cursor=pointer]
              - button [ref=e230] [cursor=pointer]
              - button [ref=e232] [cursor=pointer]
              - generic [ref=e234]: 12:30
              - button [ref=e236] [cursor=pointer]
              - button [ref=e238] [cursor=pointer]
              - button [ref=e240] [cursor=pointer]
              - button [ref=e242] [cursor=pointer]
              - button [ref=e244] [cursor=pointer]
              - button [ref=e246] [cursor=pointer]
              - button [ref=e248] [cursor=pointer]
              - generic [ref=e250]: 13:00
              - button [ref=e252] [cursor=pointer]
              - button [ref=e254] [cursor=pointer]
              - button [ref=e256] [cursor=pointer]
              - button [ref=e258] [cursor=pointer]
              - button [ref=e260] [cursor=pointer]
              - button [ref=e262] [cursor=pointer]
              - button [ref=e264] [cursor=pointer]
              - generic [ref=e266]: 13:30
              - button [ref=e268] [cursor=pointer]
              - button [ref=e270] [cursor=pointer]
              - button [ref=e272] [cursor=pointer]
              - button [ref=e274] [cursor=pointer]
              - button [ref=e276] [cursor=pointer]
              - button [ref=e278] [cursor=pointer]
              - button [ref=e280] [cursor=pointer]
              - generic [ref=e282]: 14:00
              - button [ref=e284] [cursor=pointer]
              - button [ref=e286] [cursor=pointer]
              - button [ref=e288] [cursor=pointer]
              - button [ref=e290] [cursor=pointer]
              - button [ref=e292] [cursor=pointer]
              - button [ref=e294] [cursor=pointer]
              - button [ref=e296] [cursor=pointer]
              - generic [ref=e298]: 14:30
              - button [ref=e300] [cursor=pointer]
              - button [ref=e302] [cursor=pointer]
              - button [ref=e304] [cursor=pointer]
              - button [ref=e306] [cursor=pointer]
              - button [ref=e308] [cursor=pointer]
              - button [ref=e310] [cursor=pointer]
              - button [ref=e312] [cursor=pointer]
              - generic [ref=e314]: 15:00
              - button [ref=e316] [cursor=pointer]
              - button [ref=e318] [cursor=pointer]
              - button [ref=e320] [cursor=pointer]
              - button [ref=e322] [cursor=pointer]
              - button [ref=e324] [cursor=pointer]
              - button [ref=e326] [cursor=pointer]
              - button [ref=e328] [cursor=pointer]
              - generic [ref=e330]: 15:30
              - button [ref=e332] [cursor=pointer]
              - button [ref=e334] [cursor=pointer]
              - button [ref=e336] [cursor=pointer]
              - button [ref=e338] [cursor=pointer]
              - button [ref=e340] [cursor=pointer]
              - button [ref=e342] [cursor=pointer]
              - button [ref=e344] [cursor=pointer]
              - generic [ref=e346]: 16:00
              - button [ref=e348] [cursor=pointer]
              - button [ref=e350] [cursor=pointer]
              - button [ref=e352] [cursor=pointer]
              - button [ref=e354] [cursor=pointer]
              - button [ref=e356] [cursor=pointer]
              - button [ref=e358] [cursor=pointer]
              - button [ref=e360] [cursor=pointer]
              - generic [ref=e362]: 16:30
              - button [ref=e364] [cursor=pointer]
              - button [ref=e366] [cursor=pointer]
              - button [ref=e368] [cursor=pointer]
              - button [ref=e370] [cursor=pointer]
              - button [ref=e372] [cursor=pointer]
              - button [ref=e374] [cursor=pointer]
              - button [ref=e376] [cursor=pointer]
              - generic [ref=e378]: 17:00
              - button [ref=e380] [cursor=pointer]
              - button [ref=e382] [cursor=pointer]
              - button [ref=e384] [cursor=pointer]
              - button [ref=e386] [cursor=pointer]
              - button [ref=e388] [cursor=pointer]
              - button [ref=e390] [cursor=pointer]
              - button [ref=e392] [cursor=pointer]
              - generic [ref=e394]: 17:30
              - button [ref=e396] [cursor=pointer]
              - button [ref=e398] [cursor=pointer]
              - button [ref=e400] [cursor=pointer]
              - button [ref=e402] [cursor=pointer]
              - button [ref=e404] [cursor=pointer]
              - button [ref=e406] [cursor=pointer]
              - button [ref=e408] [cursor=pointer]
        - generic [ref=e409]:
          - heading "Status Legend" [level=3] [ref=e411]
          - generic [ref=e413]:
            - generic [ref=e414]: Scheduled
            - generic [ref=e416]: Completed
            - generic [ref=e418]: Cancelled
            - generic [ref=e420]: No Show
            - generic [ref=e422]: Google Calendar
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
  25  |   async selectRadixOption(page: Page, triggerTestId: string, optionTestId: string): Promise<void> {
  26  |     await page.getByTestId(triggerTestId).click();
  27  |     await page.getByTestId(optionTestId).click();
  28  |   },
  29  | 
  30  |   // ── Navigate ──────────────────────────────────────────────────────────────
  31  | 
  32  |   async goToScheduler(page: Page): Promise<void> {
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
> 47  |       .click();
      |        ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
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
  133 |     await expect(page.getByTestId('toast-success')).toBeVisible();
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
```