# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/concurrency.spec.ts >> Double Booking — Same Browser Context (Tab) >> second booking into an occupied slot is rejected with conflict error
- Location: tests/e2e/concurrency.spec.ts:25:3

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
  1   | // tests/e2e/concurrency.spec.ts
  2   | // ⚡ CONCURRENCY & RACE CONDITIONS
  3   | // Run under the "concurrency" Playwright project (fullyParallel: false)
  4   | // so the multi-context race test is deterministic.
  5   | //
  6   | // Business risk: Two staff members booking the same slot simultaneously.
  7   | // LocalStorage is per-browser-tab, so the real race is at the UI merge layer
  8   | // or if a shared backend ever gets added. We test the current behaviour AND
  9   | // document the expected behaviour when a backend constraint is added.
  10  | 
  11  | import { test, expect, browser } from '@playwright/test';
  12  | import { storageHelper } from '../utils/storageHelper';
  13  | import { bookingHelper } from '../utils/bookingHelper';
  14  | import { PATIENTS, nextWorkingSlot } from '../test-data/seed';
  15  | 
  16  | // ── Shared slot for all double-booking tests ─────────────────────────────────
  17  | 
  18  | const CONFLICT_SLOT = nextWorkingSlot(2, 14, 0); // 14:00 two days from now
  19  | 
  20  | test.describe('Double Booking — Same Browser Context (Tab)', () => {
  21  |   // This is the realistic scenario: a user opens the booking dialog, another
  22  |   // booking completes in a different tab sharing the same LocalStorage,
  23  |   // and the first user then tries to submit into the now-occupied slot.
  24  | 
  25  |   test('second booking into an occupied slot is rejected with conflict error', async ({
  26  |     browser,
  27  |   }) => {
  28  |     // ── Context A: first booking (completes successfully) ────────────────────
  29  |     const ctxA = await browser.newContext();
  30  |     const pageA = await ctxA.newPage();
  31  |     await pageA.goto('/');
  32  |     await storageHelper.seed(pageA, 'patients', [PATIENTS.alice, PATIENTS.bob]);
  33  |     await pageA.reload();
  34  | 
  35  |     // ── Context B: second booking (will conflict) ────────────────────────────
  36  |     const ctxB = await browser.newContext();
  37  |     const pageB = await ctxB.newPage();
  38  |     await pageB.goto('/');
  39  |     await storageHelper.seed(pageB, 'patients', [PATIENTS.alice, PATIENTS.bob]);
  40  |     await pageB.reload();
  41  | 
  42  |     try {
  43  |       await test.step('Context A opens the booking dialog for 14:00', async () => {
  44  |         await bookingHelper.goToScheduler(pageA);
  45  |         await bookingHelper.openSlot(pageA, CONFLICT_SLOT);
  46  |         await bookingHelper.fillBookingForm(pageA, {
  47  |           patientId: PATIENTS.alice.id,
  48  |           type: 'consultation',
  49  |           duration: 30,
  50  |         });
  51  |       });
  52  | 
  53  |       await test.step('Context A submits successfully', async () => {
  54  |         await bookingHelper.submit(pageA);
> 55  |         await expect(pageA.getByTestId('toast-success')).toBeVisible();
      |                                                          ^ Error: expect(locator).toBeVisible() failed
  56  |       });
  57  | 
  58  |       await test.step('Context B tries to book the same slot', async () => {
  59  |         // Copy Context A storage into Context B to simulate the storage sync
  60  |         // (e.g. after a background refresh or storage event)
  61  |         const aAppointments = await storageHelper.getAll(pageA, 'appointments');
  62  |         await storageHelper.seed(pageB, 'appointments', aAppointments);
  63  | 
  64  |         await bookingHelper.goToScheduler(pageB);
  65  |         await bookingHelper.openSlot(pageB, CONFLICT_SLOT);
  66  |         await bookingHelper.fillBookingForm(pageB, {
  67  |           patientId: PATIENTS.bob.id,
  68  |           type: 'consultation',
  69  |           duration: 30,
  70  |         });
  71  |       });
  72  | 
  73  |       await test.step('Context B receives a conflict error — slot already taken', async () => {
  74  |         await pageB.getByTestId('booking-submit-btn').click();
  75  |         await expect(pageB.getByTestId('error-slot-conflict')).toBeVisible();
  76  |         // Dialog remains open (no partial booking saved)
  77  |         await expect(pageB.getByTestId('booking-dialog')).toBeVisible();
  78  |       });
  79  | 
  80  |       await test.step('Only ONE appointment exists in storage for that slot', async () => {
  81  |         const appointments = await storageHelper.getAll(pageB, 'appointments') as {
  82  |           startTime: string;
  83  |         }[];
  84  | 
  85  |         const slotAppointments = appointments.filter(
  86  |           (a) => new Date(a.startTime).getTime() === CONFLICT_SLOT.getTime(),
  87  |         );
  88  |         // !! This assertion documents expected behaviour.
  89  |         // If it fails, the app is allowing double-booking — a P0 bug.
  90  |         expect(slotAppointments).toHaveLength(1);
  91  |       });
  92  |     } finally {
  93  |       await ctxA.close();
  94  |       await ctxB.close();
  95  |     }
  96  |   });
  97  | });
  98  | 
  99  | test.describe('Double Booking — Same Context, Rapid Clicks', () => {
  100 |   // A single user double-clicking the submit button should not create duplicates.
  101 | 
  102 |   test('rapid double-click on submit creates exactly one appointment', async ({
  103 |     browser,
  104 |   }) => {
  105 |     const ctx = await browser.newContext();
  106 |     const page = await ctx.newPage();
  107 | 
  108 |     try {
  109 |       await page.goto('/');
  110 |       await storageHelper.seed(page, 'patients', [PATIENTS.alice]);
  111 |       await page.reload();
  112 | 
  113 |       const countBefore = await storageHelper.count(page, 'appointments');
  114 | 
  115 |       await bookingHelper.goToScheduler(page);
  116 |       await bookingHelper.openSlot(page, nextWorkingSlot(3, 11));
  117 |       await bookingHelper.fillBookingForm(page, {
  118 |         patientId: PATIENTS.alice.id,
  119 |         type: 'consultation',
  120 |         duration: 30,
  121 |       });
  122 | 
  123 |       // Double-click the submit button as fast as possible
  124 |       const submitBtn = page.getByTestId('booking-submit-btn');
  125 |       await submitBtn.dblclick();
  126 | 
  127 |       // Wait for dialog to settle
  128 |       await page.waitForTimeout(500);
  129 | 
  130 |       const countAfter = await storageHelper.count(page, 'appointments');
  131 |       expect(countAfter).toBe(countBefore + 1); // exactly +1, not +2
  132 |     } finally {
  133 |       await ctx.close();
  134 |     }
  135 |   });
  136 | });
  137 | 
  138 | test.describe('Double Booking — StorageEvent Cross-Tab Sync', () => {
  139 |   // Modern browsers fire a "storage" event when LocalStorage changes in another tab.
  140 |   // The app should listen for this and update the scheduler UI accordingly,
  141 |   // preventing a user from visually seeing a free slot that was just taken.
  142 | 
  143 |   test('scheduler reflects appointment created in another tab via storage event', async ({
  144 |     browser,
  145 |   }) => {
  146 |     const ctx = await browser.newContext();
  147 |     const page1 = await ctx.newPage();
  148 |     const page2 = await ctx.newPage(); // same context = same LocalStorage
  149 | 
  150 |     try {
  151 |       await page1.goto('/');
  152 |       await storageHelper.seed(page1, 'patients', [PATIENTS.alice, PATIENTS.bob]);
  153 |       await page2.goto('/');
  154 | 
  155 |       await test.step('page1 books an appointment', async () => {
```