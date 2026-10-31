// tests/e2e/smoke.spec.ts
// Fast sanity checks run on Chromium in CI.
// Each test is self-contained and completes in < 10 seconds.

import { test, expect } from '../fixtures/base';
import { bookingHelper } from '../utils/bookingHelper';
import { patientHelper } from '../utils/patientHelper';
import { PATIENTS, nextWorkingSlot } from '../test-data/seed';
import { E2E_USER } from '../utils/authHelper';
import { groupSnapshotItems, type SnapshotItem } from '../../src/lib/scheduleSnapshot';

test.describe('Snapshot grouping', () => {
  test('combines touching and overlapping bookings without changing the source items', () => {
    const items: SnapshotItem[] = [
      { kind: 'appointment', start: '09:00', end: '10:00', count: 1 },
      { kind: 'appointment', start: '08:00', end: '09:00', count: 1 },
      { kind: 'appointment', start: '08:30', end: '08:45', count: 1 },
    ];
    expect(groupSnapshotItems(items)).toEqual([
      { kind: 'appointment', start: '08:00', end: '10:00', count: 3 },
    ]);
    expect(items[0]).toEqual({ kind: 'appointment', start: '09:00', end: '10:00', count: 1 });
    expect(items[1].end).toBe('09:00');
    expect(groupSnapshotItems([])).toEqual([]);
  });

  test('preserves free gaps, unavailable time, and non-touching bookings', () => {
    const items: SnapshotItem[] = [
      { kind: 'appointment', start: '08:00', end: '09:00', count: 1 },
      { kind: 'free', start: '09:00', end: '09:30' },
      { kind: 'appointment', start: '09:30', end: '10:00', count: 1 },
      { kind: 'blocked', start: '10:00', end: '11:00' },
      { kind: 'appointment', start: '11:00', end: '11:30', count: 1 },
      { kind: 'appointment', start: '11:45', end: '12:00', count: 1 },
    ];
    expect(groupSnapshotItems(items)).toEqual(items);
  });
});

test.describe('Smoke — Application Loads', () => {
  test('mobile snapshot highlights availability with compact private busy separators', async ({ pageWithPatients: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date('2026-10-26T07:00:00'));
    await page.addInitScript(() => {
      const original = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (...args: Parameters<typeof original>) {
        const root = document.documentElement;
        const texts: string[] = JSON.parse(root.dataset.snapshotText ?? '[]');
        texts.push(args[0]);
        root.dataset.snapshotText = JSON.stringify(texts);
        return original.apply(this, args);
      };
    });
    const appointment = (id: string, start: string, end: string) => ({
      id, patientId: PATIENTS.alice.id, patientName: 'Alice Thornton',
      startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(),
      duration: (new Date(end).getTime() - new Date(start).getTime()) / 60_000,
      type: 'follow-up', status: 'scheduled', title: 'Private follow-up', notes: 'Private notes',
    });
    await page.route('**/api/settings', (route) => route.fulfill({ json: {
      locale: 'en', startTime: '08:00', endTime: '12:00',
      workingDays: [1, 2], timeSlotMinutes: 30,
      blockedSlots: [{
        id: 'snapshot-blocked',
        startTime: new Date('2026-10-26T11:00:00').toISOString(),
        endTime: new Date('2026-10-26T12:00:00').toISOString(),
      }],
    } }));
    await page.route('**/api/appointments', (route) => route.fulfill({ json: [
      appointment('first', '2026-10-26T08:00:00', '2026-10-26T08:30:00'),
      appointment('second', '2026-10-26T08:30:00', '2026-10-26T09:00:00'),
      appointment('third', '2026-10-26T10:00:00', '2026-10-26T10:30:00'),
      appointment('full-day', '2026-10-27T08:00:00', '2026-10-27T12:00:00'),
    ] }));
    await page.goto('/app/');
    const button = page.getByTestId('mobile-snapshot-btn');
    await expect(button).toBeEnabled();
    await button.click();
    const preview = page.getByTestId('mobile-snapshot-preview');
    await expect(preview).toBeVisible();
    await expect.poll(() => preview.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1080);
    const texts: string[] = await page.evaluate(() => JSON.parse(document.documentElement.dataset.snapshotText ?? '[]'));
    expect(texts).toEqual(expect.arrayContaining([
      '08:00 - 09:00 · 2 booked', '10:00 - 10:30 · 1 booked',
      '11:00 - 12:00 · Unavailable', '08:00 - 12:00 · 1 booked',
      '09:00 - 09:30', '09:30 - 10:00', '10:30 - 11:00', '3 free slots', 'No free slots',
    ]));
    expect(texts.filter((text) => text === 'Free slot')).toHaveLength(3);
    expect(texts.join(' ')).not.toMatch(/Alice|Thornton|Private|follow-up|Xxxxx/);
    expect(await preview.evaluate((image: HTMLImageElement) => image.naturalHeight)).toBe(964);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(page.getByTestId('mobile-appointment').filter({ hasText: 'Alice' })).toHaveCount(4);
  });

  test('mobile agenda scrolls across days and weeks with pinned date controls', async ({ pageWithPatients: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date('2026-10-26T07:00:00'));
    await page.route('**/api/settings', (route) => route.fulfill({ json: {
      locale: 'en', startTime: '08:00', endTime: '10:00',
      workingDays: [0, 1, 2, 3, 4, 5, 6], timeSlotMinutes: 30,
    } }));
    await page.goto('/app/');
    const days = page.getByTestId('mobile-agenda-day');
    const controls = page.getByTestId('mobile-agenda-controls');
    await expect(days.first()).toBeVisible();
    await expect(days).toHaveCount(7);
    const initialCount = await days.count();

    const scrollToDay = async (index: number) => {
      const day = days.nth(index);
      const date = await day.getAttribute('data-date');
      const controlsHeight = (await controls.boundingBox())!.height;
      await day.evaluate((element, height) => {
        window.scrollBy(0, element.getBoundingClientRect().top - height - 12);
      }, controlsHeight);
      await expect(controls.locator(`[data-date="${date}"]`)).toHaveAttribute('aria-pressed', 'true');
      expect((await controls.boundingBox())!.y).toBeCloseTo(0, 0);
    };

    await scrollToDay(1);
    await expect(days).toHaveCount(initialCount);
    await days.nth(6).scrollIntoViewIfNeeded();
    await expect(days).toHaveCount(initialCount + 7);
    await scrollToDay(6);
    await scrollToDay(8);
    await scrollToDay(1);
    await page.getByRole('button', { name: 'Next week', exact: true }).click();
    await expect(controls.locator('[aria-pressed="true"]')).toHaveAttribute('data-date', (await days.nth(7).getAttribute('data-date'))!);
    await days.nth(13).scrollIntoViewIfNeeded();
    await expect(days).toHaveCount(initialCount + 14);
    await scrollToDay(13);
    await page.getByRole('button', { name: 'Today', exact: true }).click();
    await expect(controls.locator('[aria-pressed="true"]')).toHaveAttribute('data-date', (await days.first().getAttribute('data-date'))!);
    await expect(days.first()).toBeInViewport();
    await days.nth(1).getByTestId('mobile-free-slot').first().click();
    await expect(page.getByTestId('booking-dialog')).toBeVisible();
  });

  test('continuous mobile agenda respects working days and opens appointments', async ({ pageWithPatients: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date('2026-10-26T07:00:00'));
    const appointmentDate = new Date('2026-10-26T07:00:00');
    appointmentDate.setDate(appointmentDate.getDate() + 1);
    while ([0, 6].includes(appointmentDate.getDay())) appointmentDate.setDate(appointmentDate.getDate() + 1);
    appointmentDate.setHours(9, 0, 0, 0);
    const end = new Date(appointmentDate.getTime() + 30 * 60_000);
    await page.route('**/api/settings', (route) => route.fulfill({ json: {
      locale: 'en', startTime: '08:00', endTime: '10:00',
      workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30,
    } }));
    await page.route('**/api/appointments', (route) => route.fulfill({ json: [{
      id: 'mobile-scroll-appointment', patientId: PATIENTS.alice.id, patientName: 'Alice Thornton',
      startTime: appointmentDate.toISOString(), endTime: end.toISOString(),
      duration: 30, type: 'follow-up', status: 'scheduled', title: 'Follow-up', notes: '',
    }] }));
    await page.goto('/app/');
    const days = page.getByTestId('mobile-agenda-day');
    await expect(days.first()).toBeVisible();
    for (const date of await days.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-date')!))) {
      expect([0, 6]).not.toContain(new Date(`${date}T12:00:00`).getDay());
    }
    const appointment = page.getByTestId('mobile-appointment').filter({ hasText: 'Alice' });
    await appointment.scrollIntoViewIfNeeded();
    await appointment.click();
    await expect(page.getByTestId('booking-dialog')).toBeVisible();
    await expect(page.getByTestId('appointment-notes')).toHaveValue('');
  });

  test('mobile day highlight follows a heading entering the bottom of the screen', async ({ pageWithPatients: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date('2026-10-26T07:00:00'));
    await page.route('**/api/settings', (route) => route.fulfill({ json: {
      locale: 'en', startTime: '08:00', endTime: '18:00',
      workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30,
    } }));
    await page.goto('/app/');
    const days = page.getByTestId('mobile-agenda-day');
    const controls = page.getByTestId('mobile-agenda-controls');
    await expect(days).toHaveCount(5);
    await days.nth(1).evaluate((element) => {
      window.scrollBy(0, element.getBoundingClientRect().top - window.innerHeight + 70);
    });
    const secondDate = (await days.nth(1).getAttribute('data-date'))!;
    await expect(controls.locator(`[data-date="${secondDate}"]`)).toHaveAttribute('aria-pressed', 'true');
    expect((await days.nth(1).boundingBox())!.y).toBeGreaterThan(700);
    await page.mouse.wheel(0, -150);
    const firstDate = (await days.first().getAttribute('data-date'))!;
    await expect(controls.locator(`[data-date="${firstDate}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(days).toHaveCount(5);
  });

  test('mobile agenda starts with the remaining week and prepares the next week on its last working day', async ({ pageWithPatients: page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date('2026-10-29T07:00:00'));
    await page.route('**/api/settings', (route) => route.fulfill({ json: {
      locale: 'en', startTime: '08:00', endTime: '18:00',
      workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30,
    } }));
    await page.goto('/app/');
    const days = page.getByTestId('mobile-agenda-day');
    const controls = page.getByTestId('mobile-agenda-controls');
    await expect(days).toHaveCount(2);
    await expect(days.first()).toHaveAttribute('data-date', '2026-10-29');
    await expect(days.last()).toHaveAttribute('data-date', '2026-10-30');
    const height = (await controls.boundingBox())!.height;
    await days.nth(1).evaluate((element, controlsHeight) => {
      window.scrollBy(0, element.getBoundingClientRect().top - controlsHeight - 90);
    }, height);
    await expect(days).toHaveCount(7);
    await expect(controls.locator('[aria-pressed="true"]')).toHaveAttribute('data-date', '2026-10-30');
    await expect(days.nth(2)).toHaveAttribute('data-date', '2026-11-02');
    await expect(days.last()).toHaveAttribute('data-date', '2026-11-06');
  });

  test('desktop sidebar preference persists and never collapses the mobile menu', async ({ pageWithPatients: page }) => {
    let collapsed = false;
    await page.route('**/api/auth/me', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ user: { ...E2E_USER, preferences: { desktopSidebarCollapsed: collapsed } }, csrfToken: 'e2e-csrf-token' }),
    }));
    await page.route('**/api/auth/preferences', async (route) => {
      collapsed = route.request().postDataJSON().desktopSidebarCollapsed;
      await route.fulfill({
        status: 200, contentType: 'application/json',
        body: JSON.stringify({ user: { ...E2E_USER, preferences: { desktopSidebarCollapsed: collapsed } } }),
      });
    });
    await page.route('**/api/health/details', (route) => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, dataDir: 'test', patientsCount: 2, appointmentsCount: 0 }),
    }));
    await page.goto('/app/');
    await page.getByTestId('sidebar-toggle').click();
    await expect(page.getByTestId('desktop-sidebar')).toHaveAttribute('data-collapsed', 'true');
    await expect(page.getByTestId('desktop-sidebar').getByTestId('appointment-stats')).toBeHidden();
    await page.reload();
    await expect(page.getByTestId('desktop-sidebar')).toHaveAttribute('data-collapsed', 'true');
    await page.getByTestId('nav-settings').click();
    await expect(page.getByTestId('settings-sidebar-collapsed')).toBeChecked();
    await page.getByTestId('settings-sidebar-collapsed').click();
    await expect(page.getByTestId('desktop-sidebar')).toHaveAttribute('data-collapsed', 'false');
    await page.getByTestId('sidebar-toggle').click();
    await expect(page.getByTestId('desktop-sidebar')).toHaveAttribute('data-collapsed', 'true');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await expect(page.getByTestId('mobile-sidebar')).toHaveAttribute('data-collapsed', 'false');
    await expect(page.getByTestId('mobile-sidebar').getByTestId('appointment-stats')).toBeVisible();
    await expect(page.getByTestId('mobile-sidebar').getByTestId('sidebar-toggle')).toHaveCount(0);
  });

  test('type duration defaults are configurable and booking durations stay editable', async ({ pageWithPatients: page }) => {
    await page.route('**/api/health/details', (route) => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, dataDir: 'test', patientsCount: 2, appointmentsCount: 0 }),
    }));
    await page.goto('/app/');
    await page.getByTestId('nav-settings').click();
    await expect(page.getByTestId('settings-type-duration-procedure')).toContainText('30');
    await expect(page.getByTestId('settings-type-duration-prosthetics-orthodontics')).toContainText('60');
    await page.getByTestId('settings-type-duration-procedure').click();
    await page.getByTestId('settings-duration-option-45').click();
    await expect(page.getByTestId('settings-default-type-procedure')).toBeChecked();
    await page.getByTestId('settings-default-type-prosthetics-orthodontics').click();
    const saved = page.waitForResponse((response) => response.url().endsWith('/api/settings') && response.request().method() === 'PUT');
    await page.getByTestId('save-settings-btn').click();
    expect((await saved).ok()).toBe(true);

    await page.getByTestId('nav-scheduler').click();
    await page.getByTestId('new-appointment-btn').click();
    await expect(page.getByTestId('appointment-type-select')).toContainText('Протетика и ортодонција');
    await expect(page.getByTestId('duration-option-60')).toHaveAttribute('aria-pressed', 'true');
    await bookingHelper.selectRadixOption(page, 'duration-select', 'duration-option-90');
    await expect(page.getByTestId('duration-option-90')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('appointment-notes').fill('Manual duration is preserved');
    await expect(page.getByTestId('duration-option-90')).toHaveAttribute('aria-pressed', 'true');
    await bookingHelper.selectRadixOption(page, 'appointment-type-select', 'appointment-type-option-procedure');
    await expect(page.getByTestId('duration-option-45')).toHaveAttribute('aria-pressed', 'true');
  });

  // pageClean mocks the data endpoints; without them the real backend answers 401 and the browser logs it.
  test('app renders without console errors', async ({ pageClean: page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Allow expected "no data yet" console warnings, not JS errors
    const jsErrors = errors.filter(
      (e) => !e.includes('Warning:') && !e.includes('localStorage'),
    );
    expect(jsErrors).toHaveLength(0);
  });

  test('all main navigation items are reachable', async ({ pageWithPatients: page }) => {
    const navItems = [
      { testId: 'nav-scheduler', pageTestId: 'scheduler-grid' },
      { testId: 'nav-patients', pageTestId: 'patients-page' },
      { testId: 'nav-statistics', pageTestId: 'statistics-page' },
      { testId: 'nav-settings', pageTestId: 'settings-page' },
    ];

    for (const { testId, pageTestId } of navItems) {
      await page.getByTestId(testId).click();
      await expect(page.getByTestId(pageTestId)).toBeVisible();
    }
  });

  test('patients page displays seeded patients', async ({
    pageWithPatients: page,
  }) => {
    await page.getByTestId('nav-patients').click();
    await expect(
      page.getByTestId('patient-row').filter({ hasText: PATIENTS.alice.email }),
    ).toBeVisible();
    await expect(
      page.getByTestId('patient-row').filter({ hasText: PATIENTS.bob.email }),
    ).toBeVisible();
  });

  test('scheduler grid renders working-hours time slots', async ({
    pageWithPatients: page,
  }) => {
    await page.getByTestId('nav-scheduler').click();
    await expect(page.getByTestId('scheduler-grid')).toBeVisible();
    // At least the start-of-day slot should exist
    await expect(page.getByTestId('time-slot-8:00').first()).toBeVisible();
  });

  test('settings page allows saving practice name', async ({
    pageClean: page,
  }) => {
    await page.getByTestId('nav-settings').click();

    const nameInput = page.getByTestId('practice-name-input');
    await nameInput.fill('Test Clinic QA');
    await page.getByTestId('save-settings-btn').click();

    await expect(page.getByTestId('toast-success')).toBeVisible();

    // Reload and verify persistence
    await page.reload();
    await page.getByTestId('nav-settings').click();
    await expect(nameInput).toHaveValue('Test Clinic QA');
  });

  test('patients page allows adding a patient', async ({
    pageClean: page,
  }) => {
    await patientHelper.goToPatients(page);
    await patientHelper.createPatient(page, {
      firstName: 'Smoke',
      lastName: 'Patient',
      email: `smoke-${Date.now()}@test.medical`,
      phone: '555-0100',
      dateOfBirth: '1990-01-01',
    });

    await expect(page.getByTestId('patient-row').filter({ hasText: 'Smoke Patient' })).toBeVisible();
  });

  test('scheduler allows creating an appointment for an existing patient', async ({
    pageWithPatients: page,
  }) => {
    await bookingHelper.goToScheduler(page);
    await bookingHelper.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      slotDate: nextWorkingSlot(1, 10),
    });

    await expect(page.getByTestId('appointment-block').filter({ hasText: PATIENTS.alice.firstName })).toBeVisible();
  });

  test('scheduler can mark a free slot as unavailable without creating an appointment', async ({
    pageWithPatients: page,
  }) => {
    await bookingHelper.goToScheduler(page);
    await bookingHelper.openSlot(page, nextWorkingSlot(1, 14));

    await page.getByTestId('block-slot-btn').click();
    await expect(page.getByTestId('booking-dialog')).not.toBeVisible();
    await expect(page.getByTestId('toast-success')).toBeVisible();

    await page.reload();
    await bookingHelper.goToScheduler(page);
    await expect(page.locator('[data-slot-time="14:00"][data-blocked="true"]')).toBeVisible();
  });
});
