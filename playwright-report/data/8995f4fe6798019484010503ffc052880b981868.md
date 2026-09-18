# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/data-consistency.spec.ts >> LocalStorage Failure Scenarios >> corrupted appointments storage shows error state instead of crashing
- Location: tests/e2e/data-consistency.spec.ts:157:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: true
Received: false
```

# Test source

```ts
  91  |       .getByTestId('appointment-block')
  92  |       .filter({ hasText: PATIENTS.alice.firstName })
  93  |       .click();
  94  | 
  95  |     await page.getByTestId('delete-appointment-btn').click();
  96  |     await page.getByTestId('confirm-delete-btn').click(); // confirmation modal
  97  | 
  98  |     await test.step('Appointment block is removed from UI', async () => {
  99  |       await expect(
  100 |         page.getByTestId('appointment-block').filter({ hasText: PATIENTS.alice.firstName }),
  101 |       ).not.toBeVisible();
  102 |     });
  103 | 
  104 |     await test.step('Storage count decremented by 1', async () => {
  105 |       const countAfter = await storage.count(page, 'appointments');
  106 |       expect(countAfter).toBe(countBefore - 1);
  107 |     });
  108 |   });
  109 | });
  110 | 
  111 | test.describe('Session Persistence After Reload', () => {
  112 |   test('appointments survive a full page reload', async ({
  113 |     pageWithPatients: page, booking, storage,
  114 |   }) => {
  115 |     await booking.goToScheduler(page);
  116 |     await booking.book(page, {
  117 |       patientId: PATIENTS.alice.id,
  118 |       type: 'consultation',
  119 |       duration: 30,
  120 |       slotDate: nextWorkingSlot(1, 10),
  121 |     });
  122 | 
  123 |     const countBeforeReload = await storage.count(page, 'appointments');
  124 | 
  125 |     await test.step('Reload the page', async () => {
  126 |       await page.reload();
  127 |       await page.waitForLoadState('networkidle');
  128 |     });
  129 | 
  130 |     await test.step('Storage count unchanged after reload', async () => {
  131 |       const countAfterReload = await storage.count(page, 'appointments');
  132 |       expect(countAfterReload).toBe(countBeforeReload);
  133 |     });
  134 | 
  135 |     await test.step('Appointment block visible in scheduler after reload', async () => {
  136 |       await page.getByTestId('nav-scheduler').click();
  137 |       await expect(
  138 |         page.getByTestId('appointment-block').filter({ hasText: PATIENTS.alice.firstName }),
  139 |       ).toBeVisible();
  140 |     });
  141 |   });
  142 | 
  143 |   test('patients survive a full page reload', async ({
  144 |     pageWithPatients: page,
  145 |   }) => {
  146 |     await page.reload();
  147 |     await page.waitForLoadState('networkidle');
  148 | 
  149 |     await page.getByTestId('nav-patients').click();
  150 | 
  151 |     const rows = page.getByTestId('patient-row');
  152 |     await expect(rows).toHaveCount(2); // Alice + Bob still present
  153 |   });
  154 | });
  155 | 
  156 | test.describe('LocalStorage Failure Scenarios', () => {
  157 |   test('corrupted appointments storage shows error state instead of crashing', async ({
  158 |     browser,
  159 |   }) => {
  160 |     const ctx = await browser.newContext();
  161 |     const page = await ctx.newPage();
  162 | 
  163 |     try {
  164 |       await page.goto('/');
  165 | 
  166 |       await test.step('Corrupt the appointments key', async () => {
  167 |         await storageHelper.corrupt(page, 'appointments');
  168 |       });
  169 | 
  170 |       await test.step('Reload — app should handle corruption gracefully', async () => {
  171 |         await page.reload();
  172 |         await page.waitForLoadState('networkidle');
  173 |       });
  174 | 
  175 |       await test.step('App renders without white-screening or JS exception', async () => {
  176 |         // No uncaught errors in the page
  177 |         const errors: string[] = [];
  178 |         page.on('pageerror', (err) => errors.push(err.message));
  179 | 
  180 |         await page.getByTestId('nav-scheduler').click();
  181 |         // If the scheduler loads (even empty), the app handled corruption gracefully
  182 |         await expect(page.getByTestId('scheduler-grid')).toBeVisible({ timeout: 5_000 });
  183 | 
  184 |         // Acceptable: error banner. Unacceptable: crash or blank page.
  185 |         expect(errors.filter((e) => e.includes('Cannot read'))).toHaveLength(0);
  186 |       });
  187 | 
  188 |       await test.step('Error banner or empty state shown (not silent)', async () => {
  189 |         const hasBanner = await page.getByTestId('storage-error-banner').isVisible();
  190 |         const hasEmptyState = await page.getByTestId('scheduler-empty-state').isVisible();
> 191 |         expect(hasBanner || hasEmptyState).toBe(true);
      |                                            ^ Error: expect(received).toBe(expected) // Object.is equality
  192 |       });
  193 |     } finally {
  194 |       await ctx.close();
  195 |     }
  196 |   });
  197 | 
  198 |   test('QuotaExceededError during booking shows user-friendly error', async ({
  199 |     pageWithPatients: page, booking,
  200 |   }) => {
  201 |     await booking.goToScheduler(page);
  202 |     await booking.openSlot(page, nextWorkingSlot(1, 10));
  203 |     await booking.fillBookingForm(page, {
  204 |       patientId: PATIENTS.alice.id,
  205 |       type: 'consultation',
  206 |       duration: 30,
  207 |     });
  208 | 
  209 |     await test.step('Simulate storage quota exceeded', async () => {
  210 |       await storageHelper.simulateQuotaExceeded(page);
  211 |     });
  212 | 
  213 |     await test.step('Submit fails with a storage error message (not a generic crash)', async () => {
  214 |       await page.getByTestId('booking-submit-btn').click();
  215 |       await expect(
  216 |         page.getByTestId('toast-error').or(page.getByText(/storage.*full|unable.*save/i)),
  217 |       ).toBeVisible({ timeout: 5_000 });
  218 |       // Dialog remains open — user can copy their data
  219 |       await expect(page.getByTestId('booking-dialog')).toBeVisible();
  220 |     });
  221 |   });
  222 | });
  223 | 
  224 | test.describe('Timezone & Date Edge Cases', () => {
  225 |   test('appointment created near midnight displays on the correct calendar day', async ({
  226 |     pageWithPatients: page, booking, storage,
  227 |   }) => {
  228 |     // Use 23:30 slot on a working day
  229 |     const lateSlot = nextWorkingSlot(1, 23, 30);
  230 | 
  231 |     await booking.goToScheduler(page);
  232 |     await booking.book(page, {
  233 |       patientId: PATIENTS.alice.id,
  234 |       type: 'consultation',
  235 |       duration: 30,
  236 |       slotDate: lateSlot,
  237 |     });
  238 | 
  239 |     const appointments = await storage.getAll(page, 'appointments') as {
  240 |       startTime: string;
  241 |       endTime: string;
  242 |     }[];
  243 | 
  244 |     const appt = appointments[appointments.length - 1];
  245 |     const startDate = new Date(appt.startTime);
  246 |     const endDate = new Date(appt.endTime);
  247 | 
  248 |     // Duration of 30 min starting at 23:30 ends at 00:00 next day — handle correctly
  249 |     expect(startDate.getHours()).toBe(23);
  250 |     expect(startDate.getMinutes()).toBe(30);
  251 |     // End time must be correctly calculated (not negative duration)
  252 |     expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
  253 |   });
  254 | 
  255 |   test('appointment time stored in ISO 8601 format', async ({
  256 |     pageWithPatients: page, booking, storage,
  257 |   }) => {
  258 |     await booking.goToScheduler(page);
  259 |     await booking.book(page, {
  260 |       patientId: PATIENTS.alice.id,
  261 |       type: 'consultation',
  262 |       duration: 30,
  263 |       slotDate: nextWorkingSlot(1, 10),
  264 |     });
  265 | 
  266 |     const appointments = await storage.getAll(page, 'appointments') as { startTime: string }[];
  267 |     const { startTime } = appointments[appointments.length - 1];
  268 | 
  269 |     // ISO 8601: "2025-03-10T10:00:00.000Z" or with offset
  270 |     expect(startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  271 |   });
  272 | });
  273 | 
```