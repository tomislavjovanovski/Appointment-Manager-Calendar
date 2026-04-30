# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/google-calendar.spec.ts >> Google Calendar — Happy Path >> syncing displays Google Calendar events alongside local appointments
- Location: tests/e2e/google-calendar.spec.ts:16:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByTestId('gcal-event-block').filter({ hasText: 'External Meeting' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByTestId('gcal-event-block').filter({ hasText: 'External Meeting' })

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
          - button "Dashboard" [ref=e18] [cursor=pointer]:
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
            - button "Google Calendar" [active] [ref=e38] [cursor=pointer]:
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
              - button [ref=e101] [cursor=pointer]
              - button [ref=e103] [cursor=pointer]
              - button [ref=e105] [cursor=pointer]
              - button [ref=e107] [cursor=pointer]
              - generic [ref=e109]: 08:30
              - button [ref=e111] [cursor=pointer]
              - button [ref=e113] [cursor=pointer]
              - button [ref=e115] [cursor=pointer]
              - button [ref=e117] [cursor=pointer]
              - button [ref=e119] [cursor=pointer]
              - button [ref=e121] [cursor=pointer]
              - button [ref=e123] [cursor=pointer]
              - generic [ref=e125]: 09:00
              - button [ref=e127] [cursor=pointer]
              - button [ref=e129] [cursor=pointer]
              - button [ref=e131] [cursor=pointer]
              - button [ref=e133] [cursor=pointer]
              - button [ref=e135] [cursor=pointer]
              - button [ref=e137] [cursor=pointer]
              - button [ref=e139] [cursor=pointer]
              - generic [ref=e141]: 09:30
              - button [ref=e143] [cursor=pointer]
              - button [ref=e145] [cursor=pointer]
              - button [ref=e147] [cursor=pointer]
              - button [ref=e149] [cursor=pointer]
              - button [ref=e151] [cursor=pointer]
              - button [ref=e153] [cursor=pointer]
              - button [ref=e155] [cursor=pointer]
              - generic [ref=e157]: 10:00
              - button [ref=e159] [cursor=pointer]
              - button [ref=e161] [cursor=pointer]
              - button [ref=e163] [cursor=pointer]
              - button [ref=e165] [cursor=pointer]
              - button [ref=e167] [cursor=pointer]
              - button [ref=e169] [cursor=pointer]
              - button [ref=e171] [cursor=pointer]
              - generic [ref=e173]: 10:30
              - button [ref=e175] [cursor=pointer]
              - button [ref=e177] [cursor=pointer]
              - button [ref=e179] [cursor=pointer]
              - button [ref=e181] [cursor=pointer]
              - button [ref=e183] [cursor=pointer]
              - button [ref=e185] [cursor=pointer]
              - button [ref=e187] [cursor=pointer]
              - generic [ref=e189]: 11:00
              - button [ref=e191] [cursor=pointer]
              - button [ref=e193] [cursor=pointer]
              - button [ref=e195] [cursor=pointer]
              - button [ref=e197] [cursor=pointer]
              - button [ref=e199] [cursor=pointer]
              - button [ref=e201] [cursor=pointer]
              - button [ref=e203] [cursor=pointer]
              - generic [ref=e205]: 11:30
              - button [ref=e207] [cursor=pointer]
              - button [ref=e209] [cursor=pointer]
              - button [ref=e211] [cursor=pointer]
              - button [ref=e213] [cursor=pointer]
              - button [ref=e215] [cursor=pointer]
              - button [ref=e217] [cursor=pointer]
              - button [ref=e219] [cursor=pointer]
              - generic [ref=e221]: 12:00
              - button [ref=e223] [cursor=pointer]
              - button [ref=e225] [cursor=pointer]
              - button [ref=e227] [cursor=pointer]
              - button [ref=e229] [cursor=pointer]
              - button [ref=e231] [cursor=pointer]
              - button [ref=e233] [cursor=pointer]
              - button [ref=e235] [cursor=pointer]
              - generic [ref=e237]: 12:30
              - button [ref=e239] [cursor=pointer]
              - button [ref=e241] [cursor=pointer]
              - button [ref=e243] [cursor=pointer]
              - button [ref=e245] [cursor=pointer]
              - button [ref=e247] [cursor=pointer]
              - button [ref=e249] [cursor=pointer]
              - button [ref=e251] [cursor=pointer]
              - generic [ref=e253]: 13:00
              - button [ref=e255] [cursor=pointer]
              - button [ref=e257] [cursor=pointer]
              - button [ref=e259] [cursor=pointer]
              - button [ref=e261] [cursor=pointer]
              - button [ref=e263] [cursor=pointer]
              - button [ref=e265] [cursor=pointer]
              - button [ref=e267] [cursor=pointer]
              - generic [ref=e269]: 13:30
              - button [ref=e271] [cursor=pointer]
              - button [ref=e273] [cursor=pointer]
              - button [ref=e275] [cursor=pointer]
              - button [ref=e277] [cursor=pointer]
              - button [ref=e279] [cursor=pointer]
              - button [ref=e281] [cursor=pointer]
              - button [ref=e283] [cursor=pointer]
              - generic [ref=e285]: 14:00
              - button [ref=e287] [cursor=pointer]
              - button [ref=e289] [cursor=pointer]
              - button [ref=e291] [cursor=pointer]
              - button [ref=e293] [cursor=pointer]
              - button [ref=e295] [cursor=pointer]
              - button [ref=e297] [cursor=pointer]
              - button [ref=e299] [cursor=pointer]
              - generic [ref=e301]: 14:30
              - button [ref=e303] [cursor=pointer]
              - button [ref=e305] [cursor=pointer]
              - button [ref=e307] [cursor=pointer]
              - button [ref=e309] [cursor=pointer]
              - button [ref=e311] [cursor=pointer]
              - button [ref=e313] [cursor=pointer]
              - button [ref=e315] [cursor=pointer]
              - generic [ref=e317]: 15:00
              - button [ref=e319] [cursor=pointer]
              - button [ref=e321] [cursor=pointer]
              - button [ref=e323] [cursor=pointer]
              - button [ref=e325] [cursor=pointer]
              - button [ref=e327] [cursor=pointer]
              - button [ref=e329] [cursor=pointer]
              - button [ref=e331] [cursor=pointer]
              - generic [ref=e333]: 15:30
              - button [ref=e335] [cursor=pointer]
              - button [ref=e337] [cursor=pointer]
              - button [ref=e339] [cursor=pointer]
              - button [ref=e341] [cursor=pointer]
              - button [ref=e343] [cursor=pointer]
              - button [ref=e345] [cursor=pointer]
              - button [ref=e347] [cursor=pointer]
              - generic [ref=e349]: 16:00
              - button [ref=e351] [cursor=pointer]
              - button [ref=e353] [cursor=pointer]
              - button [ref=e355] [cursor=pointer]
              - button [ref=e357] [cursor=pointer]
              - button [ref=e359] [cursor=pointer]
              - button [ref=e361] [cursor=pointer]
              - button [ref=e363] [cursor=pointer]
              - generic [ref=e365]: 16:30
              - button [ref=e367] [cursor=pointer]
              - button [ref=e369] [cursor=pointer]
              - button [ref=e371] [cursor=pointer]
              - button [ref=e373] [cursor=pointer]
              - button [ref=e375] [cursor=pointer]
              - button [ref=e377] [cursor=pointer]
              - button [ref=e379] [cursor=pointer]
              - generic [ref=e381]: 17:00
              - button [ref=e383] [cursor=pointer]
              - button [ref=e385] [cursor=pointer]
              - button [ref=e387] [cursor=pointer]
              - button [ref=e389] [cursor=pointer]
              - button [ref=e391] [cursor=pointer]
              - button [ref=e393] [cursor=pointer]
              - button [ref=e395] [cursor=pointer]
              - generic [ref=e397]: 17:30
              - button [ref=e399] [cursor=pointer]
              - button [ref=e401] [cursor=pointer]
              - button [ref=e403] [cursor=pointer]
              - button [ref=e405] [cursor=pointer]
              - button [ref=e407] [cursor=pointer]
              - button [ref=e409] [cursor=pointer]
              - button [ref=e411] [cursor=pointer]
        - generic [ref=e413]:
          - heading "Google Calendar Integration Not Connected" [level=3] [ref=e415]:
            - img [ref=e416]
            - text: Google Calendar Integration
            - generic [ref=e418]:
              - img [ref=e419]
              - text: Not Connected
          - generic [ref=e424]:
            - generic [ref=e425]:
              - heading "Setup Instructions:" [level=4] [ref=e426]
              - list [ref=e427]:
                - listitem [ref=e428]:
                  - text: Go to
                  - link "Google Cloud Console" [ref=e429] [cursor=pointer]:
                    - /url: https://console.cloud.google.com/
                    - text: Google Cloud Console
                    - img [ref=e430]
                - listitem [ref=e434]: Create a new project or select existing one
                - listitem [ref=e435]: Enable the Google Calendar API
                - listitem [ref=e436]: Create OAuth 2.0 credentials
                - listitem [ref=e437]: Add http://localhost:3000/api/google/callback as redirect URI
                - listitem [ref=e438]: Copy Client ID and Client Secret below
            - generic [ref=e439]:
              - generic [ref=e440]:
                - text: Google Client ID
                - textbox "Google Client ID" [ref=e441]:
                  - /placeholder: xxx.apps.googleusercontent.com
              - generic [ref=e442]:
                - text: Google Client Secret
                - textbox "Google Client Secret" [ref=e443]:
                  - /placeholder: GOCSPX-xxx
            - button "Connect to Google Calendar" [ref=e444] [cursor=pointer]
        - generic [ref=e445]:
          - heading "Status Legend" [level=3] [ref=e447]
          - generic [ref=e449]:
            - generic [ref=e450]: Scheduled
            - generic [ref=e452]: Completed
            - generic [ref=e454]: Cancelled
            - generic [ref=e456]: No Show
            - generic [ref=e458]: Google Calendar
```

# Test source

```ts
  1   | // tests/e2e/google-calendar.spec.ts
  2   | // Tests Google Calendar integration with mocked backend responses.
  3   | // All external HTTP is intercepted — no real Google API calls.
  4   | 
  5   | import { test, expect } from '../fixtures/base';
  6   | import { storageHelper } from '../utils/storageHelper';
  7   | import { bookingHelper } from '../utils/bookingHelper';
  8   | import { apiMockHelper } from '../utils/apiMockHelper';
  9   | import {
  10  |   PATIENTS,
  11  |   MOCK_GOOGLE_CALENDAR_RESPONSE,
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
> 33  |       await expect(block).toBeVisible({ timeout: 5_000 });
      |                           ^ Error: expect(locator).toBeVisible() failed
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
```