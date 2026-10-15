// tests/e2e/smoke.spec.ts
// Fast sanity checks run on Chromium in CI.
// Each test is self-contained and completes in < 10 seconds.

import { test, expect } from '../fixtures/base';
import { bookingHelper } from '../utils/bookingHelper';
import { patientHelper } from '../utils/patientHelper';
import { PATIENTS, nextWorkingSlot } from '../test-data/seed';
import { E2E_USER } from '../utils/authHelper';

test.describe('Smoke — Application Loads', () => {
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
    await page.getByRole('option', { name: '45 minutes', exact: true }).click();
    await expect(page.getByTestId('settings-default-type-procedure')).toBeChecked();
    await page.getByTestId('settings-default-type-prosthetics-orthodontics').click();
    const saved = page.waitForResponse((response) => response.url().endsWith('/api/settings') && response.request().method() === 'PUT');
    await page.getByTestId('save-settings-btn').click();
    expect((await saved).ok()).toBe(true);

    await page.getByTestId('nav-scheduler').click();
    await page.getByTestId('new-appointment-btn').click();
    await expect(page.getByTestId('appointment-type-select')).toContainText('Prosthetics');
    await expect(page.getByTestId('duration-select')).toContainText('60');
    await bookingHelper.selectRadixOption(page, 'duration-select', 'duration-option-90');
    await expect(page.getByTestId('duration-select')).toContainText('90');
    await page.getByTestId('appointment-notes').fill('Manual duration is preserved');
    await expect(page.getByTestId('duration-select')).toContainText('90');
    await bookingHelper.selectRadixOption(page, 'appointment-type-select', 'appointment-type-option-procedure');
    await expect(page.getByTestId('duration-select')).toContainText('45');
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
});
