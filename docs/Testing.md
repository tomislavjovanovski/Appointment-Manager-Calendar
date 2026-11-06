# QA Test Suite — Medical Appointment Management System

## Test Strategy

### Scope & Risk Model

This suite follows **risk-based testing**: effort is proportional to business impact of failure.

| Layer | Tool | What lives here |
|---|---|---|
| E2E (this suite) | Playwright | Full user journeys, data consistency, failure modes |
| API | Playwright `page.route` | Backend contract verification (mocked) |
| Unit | Node `node:test` | Pure functions and component/control regressions |

**Not covered here** (intentional):
- Visual regression (add Percy/Argos if design system matures)
- Performance benchmarks (add k6 when moving off LocalStorage)
- Accessibility (add axe-playwright per component)

---

### Test Layer Decision Matrix

```
Booking form validation  →  Unit (Zod schema) + E2E (invalid submission)
Drag & drop correctness  →  E2E only (requires real DOM)
Google Calendar sync     →  E2E with page.route mock (no real API calls)
Double booking check     →  E2E concurrency project
LocalStorage corruption  →  E2E (simulated via evaluate)
Time/timezone logic      →  Unit (date-fns helpers) + E2E (ISO format assertion)
```

---

### Architecture

```
tests/
├── e2e/
│   ├── smoke.spec.ts              # Chromium sanity checks (< 10s each)
│   ├── statistics.spec.ts         # Monthly statistics page
│   ├── appointment-booking.spec.ts # Critical path + validation + lifecycle
│   ├── patient-management.spec.ts  # Standalone + inline creation, search
│   ├── drag-drop-rescheduling.spec.ts # D&D correctness + conflict + cancel
│   ├── google-calendar.spec.ts    # Happy path + 500 + 401 + network fail
│   ├── data-consistency.spec.ts   # UI↔Storage, reload, corruption, timezone
│   └── concurrency.spec.ts        # Multi-context race conditions ⚡
├── fixtures/
│   └── base.ts                    # Extended test with pre-seeded contexts
├── utils/
│   ├── storageHelper.ts           # All LocalStorage reads/writes/assertions
│   ├── bookingHelper.ts           # Page-Object for booking flow
│   ├── patientHelper.ts           # Page-Object for patient management
│   └── apiMockHelper.ts           # All page.route() mock definitions
└── test-data/
    └── seed.ts                    # Single source of truth for test data
```

---

### Key Design Decisions

**1. No hardcoded waits anywhere.**
Every pause is driven by `expect(...).toBeVisible()`, `waitForLoadState`, or `waitFor`. This eliminates flakiness from arbitrary timeouts.

**2. All selectors use `data-testid`.**
Never `page.locator('button.primary')` — that breaks on any CSS refactor.
Add `data-testid` attributes to your components during development.

**3. Storage manipulation is centralised.**
`storageHelper` is the only place that touches `localStorage`. Tests never call `page.evaluate(localStorage...)` inline.

**4. Test data never conflicts between tests.**
Appointments use `nextWorkingSlot(offsetDays, hour)` — each test picks a unique day/time offset. No test assumes an empty scheduler without explicitly seeding `pageClean`.

**5. Concurrency tests run sequentially.**
The `concurrency` Playwright project sets `fullyParallel: false`. The multi-context race is a controlled experiment, not a parallel test race.

**6. Mocks are removed per-test.**
`apiMockHelper` uses per-page `page.route()`. When the page/context closes, the mock dies with it. No global mock state leaks between tests.

---

### Running the Suite

```bash
# Install the Chromium browser (first time; the suite and CI run Chromium only)
npx playwright install chromium

# All tests
npx playwright test

# Specific file
npx playwright test tests/e2e/appointment-booking.spec.ts

# Concurrency tests only
npx playwright test --project=concurrency

# Smoke tests
npx playwright test tests/e2e/smoke.spec.ts

# Headed (watch the browser)
npx playwright test --headed

# Debug a specific test
npx playwright test --debug tests/e2e/drag-drop-rescheduling.spec.ts

# View HTML report
npx playwright show-report
```

**Login:** the app requires a session. UI tests mock `/api/auth/me` automatically. Tests that call the real backend need a test account: set `E2E_AUTH_EMAIL` and `E2E_AUTH_PASSWORD` (create it with `node server/manage-users.js create`), and the fixtures sign in before each test. `tests/e2e/concurrency.spec.ts` imports `@playwright/test` directly and does not sign in yet. Backend auth and API-protection tests run without a browser: `npm run test:server`.

---

### Documentation reminder coverage

```bash
node --test tests/unit/documentation-reminders.test.mjs tests/unit/booking-controls.test.mjs
npm run test:server -- tests/server/documentation-reminders.spec.ts tests/server/type-durations.spec.ts
npx playwright test tests/e2e/documentation-reminders.spec.ts tests/e2e/appointment-history.spec.ts
```

The browser suite uses mocked persisted appointments and a controlled clock in
`Europe/Skopje`, covering desktop-only gentle banners, mobile pencil indicators
without banners, end-of-day counts behind review, review filters, note saves,
return/refetch, session dismissal, persistent review, failed acknowledgement,
overnight review, scheduled-end reminders during empty slots, and the transition
from an individual banner to one end-of-day summary without polling. Unit tests additionally exercise
simultaneous starts, gaps, overlaps, legacy records, future exclusions, reminders
for all statuses (including cancelled/no-show) without automatic completion,
UTC/local-day differences in positive and negative offsets, and DST boundaries.
Server tests verify acknowledgement persistence, validation, and preservation of
notes/statuses across a datastore restart. None of these tests modify live patient
or appointment data.

Login tests use their own auth routes instead of the authenticated base fixture.
Their app mocks also include patient summary and directory endpoints through
`mockPatientDirectory`, so protected requests do not reach the real backend and
expire a mocked session.

### Required `data-testid` Attributes

Add these to your React components. This list is the contract between QA and Dev:

**Navigation**
- `nav-scheduler`, `nav-patients`, `nav-settings`

**Scheduler**
- `scheduler-grid`, `time-slot-{H:MM}` (e.g. `time-slot-10:00`)
- `appointment-block` (+ `data-status`, `data-source` attributes)
- `sync-google-btn`, `gcal-event-block`, `gcal-detail-panel`

**Booking Dialog**
- `booking-dialog`, `patient-select`, `patient-option-{id}`
- `create-new-patient-btn`, `new-patient-panel`
- `appointment-type-select`, `duration-select`
- `appointment-notes`, `google-sync-toggle`
- `booking-submit-btn`

**Patient Management**
- `patients-page`, `add-patient-btn`, `patient-form-dialog`
- `patient-row`, `patient-search-input`, `patient-profile-panel`
- `patient-first-name`, `patient-last-name`, `patient-email`
- `patient-phone`, `patient-dob`, `patient-address`
- `patient-emergency-contact`, `patient-notes`, `patient-form-submit`
- `patients-empty-state`

**Errors**
- `error-patient-required`, `error-notes-too-long`
- `error-email-duplicate`, `error-email-invalid`
- `error-slot-conflict`, `error-first-name-required`
- `error-last-name-required`, `error-phone-required`
- `storage-error-banner`, `scheduler-empty-state`

**Appointment Detail**
- `appointment-detail-dialog`, `status-select`, `save-status-btn`
- `delete-appointment-btn`, `confirm-delete-btn`
- `detail-type`, `detail-duration`, `detail-notes`, `detail-patient-name`

**Settings**
- `settings-page`, `practice-name-input`, `save-settings-btn`

**Feedback**
- `toast-success`, `toast-error`, `google-reauth-banner`

---

### CI Integration (GitHub Actions example)

```yaml
# .github/workflows/qa.yml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
        env:
          BASE_URL: http://localhost:8081
          CI: true
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```
