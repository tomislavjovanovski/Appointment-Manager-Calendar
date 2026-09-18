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

Locator: getByTestId('patient-option-patient-test-001')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('patient-option-patient-test-001')

```

# Test source

```ts
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
  25  |   async selectRadixOption(
  26  |     page: Page,
  27  |     triggerTestId: string,
  28  |     optionTestId: string,
  29  |   ): Promise<void> {
  30  |     const trigger = page.getByTestId(triggerTestId);
  31  | 
  32  |     await expect(trigger).toBeVisible();
  33  | 
  34  |     await trigger.click();
  35  | 
  36  |     await expect(trigger).toHaveAttribute("aria-expanded", "true");
  37  | 
  38  |     const option = page.getByTestId(optionTestId);
  39  | 
  40  |     await expect(option).toBeVisible({
  41  |       timeout: 5000,
  42  |     });
  43  | 
  44  |     await option.click();
  45  | 
  46  |     await expect(trigger).toHaveAttribute("aria-expanded", "false");
  47  |   },
  48  | 
  49  | 
  50  | 
  51  | 
  52  | 
  53  | 
  54  |   
  55  |   // ── Navigate ──────────────────────────────────────────────────────────────
  56  | 
  57  |   async goToScheduler(page: Page): Promise<void> {
  58  |     const nav = page.getByTestId('nav-scheduler');
  59  |     await nav.waitFor({ state: 'visible', timeout: 8_000 });
  60  |     try {
  61  |       await nav.click();
  62  |     } catch {
  63  |       await nav.click({ force: true });
  64  |     }
  65  |     await expect(page.getByTestId('scheduler-grid')).toBeVisible();
  66  |   },
  67  | 
  68  |   // ── Open booking dialog ────────────────────────────────────────────────────
  69  | 
  70  |   async openSlot(page: Page, slot?: Date): Promise<void> {
  71  |     const target = slot ?? nextWorkingSlot();
  72  |     const hour = target.getHours();
  73  | 
  74  |     // Click the correct hour cell in the scheduler grid
  75  |     const slotLocator = page
  76  |       .getByTestId(`time-slot-${hour}:00`)
  77  |       .filter({ hasNot: page.locator('[aria-disabled="true"]') })
  78  |       .first();
  79  | 
  80  |     await expect(slotLocator).toBeVisible();
  81  | 
  82  |     try {
  83  |       await slotLocator.click();
  84  |     } catch (err) {
  85  |       // Fallback: try scrolling into view then force-click to avoid intermittent pointer interception
  86  |       await slotLocator.scrollIntoViewIfNeeded();
  87  |       await slotLocator.click({ force: true });
  88  |     }
  89  | 
  90  |     await expect(page.getByTestId('booking-dialog')).toBeVisible();
  91  |   },
  92  | 
  93  |   // ── Fill the booking form ─────────────────────────────────────────────────
  94  | 
  95  |   async fillBookingForm(page: Page, options: BookingOptions): Promise<void> {
  96  |     const dialog = page.getByTestId('booking-dialog');
  97  | 
  98  |     // Patient selection
  99  |     if (options.patientId) {
  100 |         await dialog.getByTestId('patient-select').click();
  101 | 
  102 |         // Wait until the dropdown is actually open
  103 |         await expect(dialog.getByTestId('patient-select')).toHaveAttribute(
  104 |           'aria-expanded',
  105 |           'true'
  106 |         );
  107 | 
  108 |         const optionLocator = page.getByTestId(
  109 |           `patient-option-${options.patientId}`
  110 |         );
  111 | 
> 112 |         await expect(optionLocator).toBeVisible({
      |                                     ^ Error: expect(locator).toBeVisible() failed
  113 |           timeout: 5000,
  114 |         });
  115 | 
  116 |         await optionLocator.click();
  117 | 
  118 |         await expect(dialog.getByTestId('patient-select')).toHaveAttribute(
  119 |           'aria-expanded',
  120 |           'false'
  121 |         );
  122 |     } else if (options.newPatient) {
  123 |       await dialog.getByTestId('create-new-patient-btn').click();
  124 |       await this.fillNewPatientForm(page, options.newPatient);
  125 |         const titleInput = dialog.getByLabel('Title');
  126 |         try {
  127 |           const current = await titleInput.inputValue();
  128 |           if (!current) await titleInput.fill(`${options.type ?? 'Visit'} ${Date.now()}`);
  129 |         } catch {
  130 |           // ignore missing or timing-sensitive title label in the dialog
  131 |         }
  132 |     }
  133 | 
  134 |     // Appointment type
  135 |     await this.selectRadixOption(
  136 |       page,
  137 |       'appointment-type-select',
  138 |       `appointment-type-option-${options.type}`,
  139 |     );
  140 | 
  141 |   // Duration
  142 |   const durationTrigger = dialog.getByTestId("duration-select");
  143 | 
  144 |   const currentDuration =
  145 |     (await durationTrigger.textContent())?.trim() ?? "";
  146 | 
  147 |   const expected =
  148 |     options.duration === 30
  149 |       ? "Half Hour"
  150 |       : options.duration === 60
  151 |         ? "Full Hour"
  152 |         : "Double Hour";
  153 | 
  154 |   if (!currentDuration.includes(expected)) {
  155 |     await this.selectRadixOption(
  156 |       page,
  157 |       "duration-select",
  158 |       `duration-option-${options.duration}`,
  159 |     );
  160 |   }
  161 | 
  162 |     // Notes
  163 |     if (options.notes) {
  164 |       await dialog.getByTestId('appointment-notes').fill(options.notes);
  165 |     }
  166 | 
  167 |     // Google sync toggle
  168 |     if (options.syncToGoogle !== undefined) {
  169 |       const toggleCount = await dialog.locator('[data-testid="google-sync-toggle"]').count();
  170 |       if (toggleCount > 0) {
  171 |         const toggle = dialog.getByTestId('google-sync-toggle');
  172 |         let isChecked = false;
  173 |         try {
  174 |           isChecked = await toggle.isChecked();
  175 |         } catch {
  176 |           // Not an <input> — try common attributes used by toggle implementations
  177 |           const state = (await toggle.getAttribute('data-state')) ??
  178 |             (await toggle.getAttribute('aria-pressed')) ??
  179 |             (await toggle.getAttribute('aria-checked')) ?? 'false';
  180 |           isChecked = state === 'true' || state === 'checked' || state === 'on' || state === 'active';
  181 |         }
  182 |         if (isChecked !== options.syncToGoogle) await toggle.click();
  183 |       }
  184 |     }
  185 |   },
  186 | 
  187 |   async fillNewPatientForm(
  188 |     page: Page,
  189 |     patient: BookingOptions['newPatient'] & object,
  190 |   ): Promise<void> {
  191 |     const panel = page.getByTestId('new-patient-panel');
  192 |     await expect(panel).toBeVisible();
  193 | 
  194 |     await panel.getByTestId('patient-first-name').fill(patient.firstName);
  195 |     await panel.getByTestId('patient-last-name').fill(patient.lastName);
  196 |     await panel.getByTestId('patient-email').fill(patient.email);
  197 |     await panel.getByTestId('patient-phone').fill(patient.phone);
  198 |     await panel.getByTestId('patient-dob').fill(patient.dateOfBirth);
  199 |   },
  200 | 
  201 |   // ── Submit ────────────────────────────────────────────────────────────────
  202 | 
  203 |   async submit(page: Page): Promise<void> {
  204 |     const submitBtn = page.getByTestId('booking-submit-btn');
  205 |     // Wait for the button to become enabled (if form still validating)
  206 |     await submitBtn.waitFor({ state: 'attached', timeout: 5_000 });
  207 |     if (await submitBtn.isEnabled()) {
  208 |       await submitBtn.click();
  209 |     } else {
  210 |       // If still disabled, dispatch submit on the form so tests can continue
  211 |       const form = page.locator('form').first();
  212 |       await form.evaluate((f: HTMLFormElement) => f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
```