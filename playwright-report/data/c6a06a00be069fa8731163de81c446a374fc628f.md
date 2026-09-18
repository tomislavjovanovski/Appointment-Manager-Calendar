# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/google-calendar.spec.ts >> Google Calendar — Failure Scenarios >> network failure during sync shows offline error and does not crash
- Location: tests/e2e/google-calendar.spec.ts:153:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('toast-error')
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByTestId('toast-error')

```

# Test source

```ts
  70  |       expect(body).toHaveProperty('start');
  71  |       expect(body).toHaveProperty('end');
  72  |     });
  73  |   });
  74  | 
  75  |   test('booking WITHOUT sync toggle does NOT call backend', async ({
  76  |     pageWithGoogleMock: page,
  77  |   }) => {
  78  |     const captured = apiMockHelper.interceptRequests(
  79  |       page,
  80  |       'http://localhost:3001/api/calendar/events',
  81  |     );
  82  | 
  83  |     await bookingHelper.goToScheduler(page);
  84  |     await bookingHelper.book(page, {
  85  |       patientId: PATIENTS.alice.id,
  86  |       type: 'consultation',
  87  |       duration: 30,
  88  |       syncToGoogle: false,
  89  |       slotDate: nextWorkingSlot(1, 15),
  90  |     });
  91  | 
  92  |     const posts = captured.filter((r) => r.method === 'POST');
  93  |     expect(posts).toHaveLength(0);
  94  |   });
  95  | });
  96  | 
  97  | test.describe('Google Calendar — Failure Scenarios', () => {
  98  |   test('backend 500 error shows error toast but still saves appointment locally', async ({
  99  |     pageWithGoogleError: page, storage,
  100 |   }) => {
  101 |     const countBefore = await storage.count(page, 'appointments');
  102 | 
  103 |     await test.step('Book with Google sync enabled (backend will fail)', async () => {
  104 |       await bookingHelper.goToScheduler(page);
  105 |       await bookingHelper.openSlot(page, nextWorkingSlot(1, 9));
  106 |       await bookingHelper.fillBookingForm(page, {
  107 |         patientId: PATIENTS.alice.id,
  108 |         type: 'consultation',
  109 |         duration: 30,
  110 |         syncToGoogle: true,
  111 |       });
  112 |       await page.getByTestId('booking-submit-btn').click();
  113 |     });
  114 | 
  115 |     await test.step('Error toast explains Google sync failure', async () => {
  116 |       // Must tell the user that *sync* failed — not that the booking failed
  117 |       await expect(page.getByTestId('toast-error')).toBeVisible();
  118 |       await expect(
  119 |         page.getByText(/google.*sync.*failed|calendar.*error/i),
  120 |       ).toBeVisible();
  121 |     });
  122 | 
  123 |     await test.step('Appointment is still saved locally despite sync failure', async () => {
  124 |       const countAfter = await storage.count(page, 'appointments');
  125 |       expect(countAfter).toBe(countBefore + 1); // local save succeeded
  126 |     });
  127 |   });
  128 | 
  129 |   test('401 Unauthorized triggers re-authentication prompt', async ({
  130 |     browser,
  131 |   }) => {
  132 |     const ctx = await browser.newContext();
  133 |     const page = await ctx.newPage();
  134 | 
  135 |     try {
  136 |       await apiMockHelper.mockGoogleCalendarUnauthorized(page);
  137 |       await page.goto('/');
  138 |       await storageHelper.seed(page, 'patients', [PATIENTS.alice]);
  139 |       await page.reload();
  140 | 
  141 |       await page.getByTestId('nav-scheduler').click();
  142 |       await page.getByTestId('sync-google-btn').click();
  143 | 
  144 |       // App should prompt re-auth, not just silently fail
  145 |       await expect(
  146 |         page.getByTestId('google-reauth-banner').or(page.getByText(/reconnect.*google|sign.*in.*google/i)),
  147 |       ).toBeVisible({ timeout: 5_000 });
  148 |     } finally {
  149 |       await ctx.close();
  150 |     }
  151 |   });
  152 | 
  153 |   test('network failure during sync shows offline error and does not crash', async ({
  154 |     browser,
  155 |   }) => {
  156 |     const ctx = await browser.newContext();
  157 |     const page = await ctx.newPage();
  158 | 
  159 |     try {
  160 |       await page.goto('/');
  161 |       await storageHelper.seed(page, 'patients', [PATIENTS.alice]);
  162 |       // Set up Google mock first, then override with network failure
  163 |       await apiMockHelper.mockNetworkFailure(page, 'http://localhost:3001/api/**');
  164 |       await page.reload();
  165 | 
  166 |       await page.getByTestId('nav-scheduler').click();
  167 |       await page.getByTestId('sync-google-btn').click();
  168 | 
  169 |       // Must show an error — must not leave the user with a frozen spinner
> 170 |       await expect(page.getByTestId('toast-error')).toBeVisible({ timeout: 8_000 });
      |                                                     ^ Error: expect(locator).toBeVisible() failed
  171 |       // Scheduler grid must still be functional
  172 |       await expect(page.getByTestId('scheduler-grid')).toBeVisible();
  173 |     } finally {
  174 |       await ctx.close();
  175 |     }
  176 |   });
  177 | });
  178 | 
  179 | test.describe('Google Calendar — Read-Only Enforcement', () => {
  180 |   test('clicking a Google Calendar event block does NOT open the booking edit dialog', async ({
  181 |     pageWithGoogleMock: page,
  182 |   }) => {
  183 |     await page.getByTestId('nav-scheduler').click();
  184 |     await page.getByTestId('sync-google-btn').click();
  185 | 
  186 |     const gcalBlock = page.getByTestId('gcal-event-block').first();
  187 |     await expect(gcalBlock).toBeVisible({ timeout: 5_000 });
  188 |     await gcalBlock.click();
  189 | 
  190 |     // Should open a read-only detail view, NOT the editable booking dialog
  191 |     await expect(page.getByTestId('booking-dialog')).not.toBeVisible();
  192 |     await expect(page.getByTestId('gcal-detail-panel')).toBeVisible();
  193 | 
  194 |     // The read-only panel must NOT have an edit or save button
  195 |     await expect(page.getByTestId('booking-submit-btn')).not.toBeVisible();
  196 |   });
  197 | });
  198 | 
```