# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/google-calendar.spec.ts >> Google Calendar — Failure Scenarios >> backend 500 error shows error toast but still saves appointment locally
- Location: tests/e2e/google-calendar.spec.ts:98:3

# Error details

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for getByTestId('booking-submit-btn')
    - locator resolved to <button disabled type="submit" data-testid="booking-submit-btn" class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 py-2 h-10 px-5 shadow-sm">Креирај</button>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not enabled
    - retrying click action
      - waiting 100ms
    19 × waiting for element to be visible, enabled and stable
       - element is not enabled
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic:
  - generic:
    - list
    - region "Notifications alt+T"
    - generic:
      - generic:
        - generic:
          - generic:
            - generic:
              - img
            - generic:
              - heading [level=1]: MediCal
              - paragraph: Менаџер за термини
        - navigation:
          - paragraph: Мени
          - generic:
            - button:
              - img
              - text: Контролна табла
            - button:
              - img
              - text: Пациенти
            - button:
              - img
              - text: Поставки
          - generic:
            - paragraph: Преглед
            - generic:
              - generic:
                - generic:
                  - generic:
                    - paragraph: Вкупно пациенти
                    - paragraph: "2"
                  - generic:
                    - img
              - generic:
                - generic:
                  - generic:
                    - paragraph: Вкупно посети
                    - paragraph: "14"
                  - generic:
                    - img
              - generic:
                - generic:
                  - generic:
                    - paragraph: Посети овој месец
                    - paragraph: "4"
                  - generic:
                    - img
        - generic:
          - generic:
            - paragraph: Самостоен • Флексибилен
            - paragraph: Податоците се локално зачувани
      - main:
        - generic:
          - generic:
            - generic:
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - img
                    - heading [level=2]: Неделен распоред
                  - paragraph: "Работно време: 07:00 - 16:00"
                - generic:
                  - button:
                    - img
                    - text: Google Календар
                  - button:
                    - img
                    - text: Нов термин
              - generic:
                - generic:
                  - generic:
                    - generic:
                      - generic:
                        - button:
                          - img
                        - generic: 14 септ – 20 септ 2026
                        - button:
                          - img
                    - generic:
                      - button: Оваа недела
                      - button:
                        - img
                        - generic: Оди на датум
                  - generic:
                    - generic:
                      - generic:
                        - generic:
                          - generic:
                            - generic:
                              - paragraph: "14"
                              - paragraph: Mon
                          - generic:
                            - generic:
                              - paragraph: "15"
                              - paragraph: Tue
                          - generic:
                            - generic:
                              - paragraph: "16"
                              - paragraph: Wed
                          - generic:
                            - generic:
                              - paragraph: "17"
                              - paragraph: Thu
                          - generic:
                            - generic:
                              - paragraph: "18"
                              - paragraph: Fri
                          - generic:
                            - generic:
                              - paragraph: "19"
                              - paragraph: Sat
                          - generic:
                            - generic:
                              - paragraph: "20"
                              - paragraph: Sun
                        - generic:
                          - generic:
                            - generic: 07:00
                          - generic:
                            - generic: 07:30
                          - generic:
                            - generic: 08:00
                          - generic:
                            - generic: 08:30
                          - generic:
                            - generic: 09:00
                          - generic:
                            - generic: 09:30
                          - generic:
                            - generic: 10:00
                          - generic:
                            - generic: 10:30
                          - generic:
                            - generic: 11:00
                          - generic:
                            - generic: 11:30
                          - generic:
                            - generic: 12:00
                          - generic:
                            - generic: 12:30
                          - generic:
                            - generic: 13:00
                          - generic:
                            - generic: 13:30
                          - generic:
                            - generic: 14:00
                          - generic:
                            - generic: 14:30
                          - generic:
                            - generic: 15:00
                          - generic:
                            - generic: 15:30
              - generic:
                - generic:
                  - heading [level=3]: Appointment Types
                - generic:
                  - generic:
                    - generic: Консултација
                    - generic: Контрола
                    - generic: Процедура
                    - generic: Google Календар
  - dialog "Нов термин и пациент" [ref=e2]:
    - generic [ref=e3]:
      - generic [ref=e6]:
        - img [ref=e8]
        - generic [ref=e11]:
          - heading "Нов термин и пациент" [level=2] [ref=e12]
          - paragraph [ref=e13]: Закажете термин и управувајте со податоци за пациентот.
      - generic [ref=e14]:
        - generic [ref=e15]:
          - generic [ref=e17]:
            - generic [ref=e18]:
              - generic [ref=e19]:
                - img [ref=e20]
                - text: Наслов
              - textbox "Наслов" [ref=e23]
            - generic [ref=e24]:
              - generic [ref=e25]:
                - img [ref=e26]
                - text: Пациент
              - combobox "Пациент" [ref=e29] [cursor=pointer]:
                - generic [ref=e30]: Alice Thornton
                - img
              - button "Додај нов пациент" [ref=e31] [cursor=pointer]
          - generic [ref=e33]:
            - generic [ref=e34]:
              - text: Тип
              - combobox "Тип" [ref=e35] [cursor=pointer]:
                - generic: Консултација
                - img [ref=e36]
              - combobox [ref=e38]
            - generic [ref=e39]:
              - text: Траење
              - combobox "Траење" [ref=e40] [cursor=pointer]:
                - generic: Половина час (30 мин)
                - img [ref=e41]
              - combobox [ref=e43]
          - generic [ref=e45]:
            - generic [ref=e46]:
              - generic [ref=e47]:
                - generic [ref=e48]:
                  - img [ref=e49]
                  - text: Почеток
                - textbox "Почеток" [ref=e51]: 2026-09-14T09:00
              - generic [ref=e52]:
                - generic [ref=e53]:
                  - img [ref=e54]
                  - text: Крај
                - textbox "Крај" [ref=e57]: 2026-09-14T09:30
            - generic [ref=e58]:
              - generic [ref=e59]:
                - img [ref=e60]
                - text: Белешки
              - textbox "Белешки" [ref=e63]
          - generic [ref=e65]:
            - checkbox "Синхронизирај со Google Календар" [checked] [active] [ref=e66]
            - generic [ref=e67]: Синхронизирај со Google Календар
        - generic [ref=e68]:
          - button "Откажи" [ref=e69] [cursor=pointer]
          - button "Креирај" [disabled]
    - button "Close" [ref=e70] [cursor=pointer]:
      - img [ref=e71]
      - generic [ref=e74]: Close
```

# Test source

```ts
  12  |   nextWorkingSlot,
  13  | } from '../test-data/seed';
  14  | 
  15  | test.describe('Google Calendar — Happy Path', () => {
  16  |   test('syncing displays Google Calendar events alongside local appointments', async ({
  17  |     pageWithGoogleMock: page,
  18  |   }) => {
  19  |     await test.step('Navigate to scheduler', async () => {
  20  |       await page.getByTestId('nav-scheduler').click();
  21  |       await expect(page.getByTestId('scheduler-grid')).toBeVisible();
  22  |     });
  23  | 
  24  |     await test.step('Trigger Google Calendar sync', async () => {
  25  |       await page.getByTestId('sync-google-btn').click();
  26  |     });
  27  | 
  28  |     await test.step('Google Calendar event block appears in scheduler', async () => {
  29  |       const gcalEvent = MOCK_GOOGLE_CALENDAR_RESPONSE.items[0];
  30  |       const block = page
  31  |         .getByTestId('gcal-event-block')
  32  |         .filter({ hasText: gcalEvent.summary });
  33  |       await expect(block).toBeVisible({ timeout: 5_000 });
  34  |     });
  35  | 
  36  |     await test.step('Google event block has correct visual differentiation', async () => {
  37  |       // Google events must be visually distinct (data-source="google" attribute)
  38  |       await expect(
  39  |         page.getByTestId('gcal-event-block').first(),
  40  |       ).toHaveAttribute('data-source', 'google');
  41  |     });
  42  |   });
  43  | 
  44  |   test('booking with "Sync to Google Calendar" sends POST to backend', async ({
  45  |     pageWithGoogleMock: page,
  46  |   }) => {
  47  |     const captured = apiMockHelper.interceptRequests(
  48  |       page,
  49  |       'http://localhost:3001/api/calendar/events',
  50  |     );
  51  | 
  52  |     await bookingHelper.goToScheduler(page);
  53  |     await bookingHelper.book(page, {
  54  |       patientId: PATIENTS.alice.id,
  55  |       type: 'consultation',
  56  |       duration: 30,
  57  |       syncToGoogle: true,
  58  |       slotDate: nextWorkingSlot(1, 11),
  59  |     });
  60  | 
  61  |     await test.step('Exactly one POST was made to the calendar API', async () => {
  62  |       const posts = captured.filter((r) => r.method === 'POST');
  63  |       expect(posts).toHaveLength(1);
  64  |     });
  65  | 
  66  |     await test.step('POST body contains expected appointment fields', async () => {
  67  |       const post = captured.find((r) => r.method === 'POST')!;
  68  |       const body = post.body as Record<string, unknown>;
  69  |       expect(body).toHaveProperty('summary');
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
> 112 |       await page.getByTestId('booking-submit-btn').click();
      |                                                    ^ TimeoutError: locator.click: Timeout 10000ms exceeded.
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
  170 |       await expect(page.getByTestId('toast-error')).toBeVisible({ timeout: 8_000 });
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