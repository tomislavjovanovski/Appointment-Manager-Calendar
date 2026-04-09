# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/data-consistency.spec.ts >> Session Persistence After Reload >> patients survive a full page reload
- Location: tests/e2e/data-consistency.spec.ts:143:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: write EPIPE
```

```
TimeoutError: locator.click: Timeout 10000ms exceeded.
Call log:
  - waiting for getByTestId('nav-patients')

```

```
Error: browserContext.close: Target page, context or browser has been closed
```

# Test source

```ts
  1  | // tests/fixtures/base.ts
  2  | // Extends Playwright's base test with pre-seeded state and helper access.
  3  | 
  4  | import { test as base, Page } from '@playwright/test';
  5  | import { storageHelper } from '../utils/storageHelper';
  6  | import { bookingHelper } from '../utils/bookingHelper';
  7  | import { patientHelper } from '../utils/patientHelper';
  8  | import { apiMockHelper } from '../utils/apiMockHelper';
  9  | import { PATIENTS } from '../test-data/seed';
  10 | 
  11 | // ── Types ─────────────────────────────────────────────────────────────────────
  12 | 
  13 | interface MedicalFixtures {
  14 |   // Helpers
  15 |   storage: typeof storageHelper;
  16 |   booking: typeof bookingHelper;
  17 |   patients: typeof patientHelper;
  18 |   apiMock: typeof apiMockHelper;
  19 | 
  20 |   // Pre-seeded pages
  21 |   pageWithPatients: Page;        // page with Alice & Bob already in storage
  22 |   pageClean: Page;               // page with completely empty storage
  23 |   pageWithGoogleMock: Page;      // page with Google Calendar mocked (success)
  24 |   pageWithGoogleError: Page;     // page with Google Calendar mocked (500)
  25 | }
  26 | 
  27 | // ── Fixture implementation ────────────────────────────────────────────────────
  28 | 
  29 | export const test = base.extend<MedicalFixtures>({
  30 |   // Expose helpers as fixtures for dependency injection
  31 |   storage: async ({}, use) => { await use(storageHelper); },
  32 |   booking: async ({}, use) => { await use(bookingHelper); },
  33 |   patients: async ({}, use) => { await use(patientHelper); },
  34 |   apiMock: async ({}, use) => { await use(apiMockHelper); },
  35 | 
  36 |   // Page with Alice & Bob pre-seeded — most tests start here
  37 |   pageWithPatients: async ({ browser }, use) => {
  38 |     const ctx = await browser.newContext();
  39 |     const page = await ctx.newPage();
  40 | 
  41 |     await page.goto('/');
  42 |     await storageHelper.seed(page, 'patients', [PATIENTS.alice, PATIENTS.bob]);
  43 |     await page.reload();
  44 | 
  45 |     await use(page);
> 46 |     await ctx.close();
     |     ^ Error: browserContext.close: Target page, context or browser has been closed
  47 |   },
  48 | 
  49 |   // Completely clean page — for tests that need to verify empty states
  50 |   pageClean: async ({ browser }, use) => {
  51 |     const ctx = await browser.newContext();
  52 |     const page = await ctx.newPage();
  53 | 
  54 |     await page.goto('/');
  55 |     await storageHelper.clearAll(page);
  56 |     await page.reload();
  57 | 
  58 |     await use(page);
  59 |     await ctx.close();
  60 |   },
  61 | 
  62 |   // Page with Google Calendar mocked successfully
  63 |   pageWithGoogleMock: async ({ browser }, use) => {
  64 |     const ctx = await browser.newContext();
  65 |     const page = await ctx.newPage();
  66 | 
  67 |     await apiMockHelper.mockGoogleCalendarSuccess(page);
  68 |     await page.goto('/');
  69 |     await storageHelper.seed(page, 'patients', [PATIENTS.alice, PATIENTS.bob]);
  70 |     await page.reload();
  71 | 
  72 |     await use(page);
  73 |     await ctx.close();
  74 |   },
  75 | 
  76 |   // Page with Google Calendar returning 500
  77 |   pageWithGoogleError: async ({ browser }, use) => {
  78 |     const ctx = await browser.newContext();
  79 |     const page = await ctx.newPage();
  80 | 
  81 |     await apiMockHelper.mockGoogleCalendarFailure(page, 500);
  82 |     await page.goto('/');
  83 |     await storageHelper.seed(page, 'patients', [PATIENTS.alice, PATIENTS.bob]);
  84 |     await page.reload();
  85 | 
  86 |     await use(page);
  87 |     await ctx.close();
  88 |   },
  89 | });
  90 | 
  91 | export { expect } from '@playwright/test';
  92 | 
```