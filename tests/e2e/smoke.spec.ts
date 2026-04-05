// tests/e2e/smoke.spec.ts
// Fast sanity checks run across all browsers in CI.
// Each test is self-contained and completes in < 10 seconds.

import { test, expect } from '../fixtures/base';
import { PATIENTS } from '../test-data/seed';

test.describe('Smoke — Application Loads', () => {
  test('app renders without console errors', async ({ page }) => {
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
});
