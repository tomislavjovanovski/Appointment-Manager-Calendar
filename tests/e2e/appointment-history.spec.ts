import { test, expect } from '../fixtures/base';
import { PATIENTS } from '../test-data/seed';
import type { Appointment } from '../../src/types/appointment';

function historyAppointment(id: string, patientId: string, startTime: string, notes: string): Appointment {
  return {
    id, patientId, notes,
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(Date.parse(startTime) + 1_800_000).toISOString(),
    patientName: patientId === PATIENTS.alice.id ? 'Alice Thornton' : 'Bob Nguyen',
    title: 'Follow-up', duration: 30, type: 'follow-up', status: 'scheduled', createdAt: startTime,
  };
}

test.describe('Appointment edit history', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-10-26T08:00:00'));
    await page.route('**/api/settings', (route) => route.fulfill({ json: {
      locale: 'en', startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30,
    } }));
    await page.route('**/api/patients', (route) => route.fulfill({ json: [PATIENTS.alice, PATIENTS.bob] }));
  });

  test('shows all saved appointments, preserves edits across tabs and saves them', async ({ page }) => {
    const records = [
      historyAppointment('oldest', PATIENTS.alice.id, '2026-08-03T10:00:00', ''),
      historyAppointment('current', PATIENTS.alice.id, '2026-10-26T10:00:00', 'Saved current notes'),
      historyAppointment('other', PATIENTS.bob.id, '2026-10-12T10:00:00', 'Private Bob note'),
      historyAppointment('older', PATIENTS.alice.id, '2026-09-07T10:00:00', 'Earlier visit'),
      historyAppointment('recent', PATIENTS.alice.id, '2026-10-19T10:00:00', 'Recent visit\nProgress notes'),
    ];
    await page.route('**/api/appointments', (route) => route.fulfill({ json: records }));
    await page.route('**/api/appointments/current', async (route) => {
      expect(route.request().method()).toBe('PUT');
      const updates = route.request().postDataJSON();
      expect(updates.notes).toBe('Unsaved progress notes');
      expect(updates.title).toBe('Updated appointment');
      records[1] = { ...records[1], ...updates };
      await route.fulfill({ json: records[1] });
    });
    await page.goto('/app/');
    await page.getByTestId('appointment-block').filter({ hasText: 'Alice Thornton' }).click();
    await expect(page.getByTestId('appointment-details-tab')).toHaveAttribute('data-state', 'active');
    await page.getByTestId('appointment-notes').fill('Unsaved progress notes');
    await page.getByTestId('appointment-title-input').fill('Updated appointment');
    await page.getByTestId('appointment-history-tab').click();
    const history = page.getByTestId('appointment-history');
    const entries = history.getByTestId('patient-history-entry');
    await expect(entries).toHaveCount(4);
    await expect(entries.nth(0)).toContainText('Saved current notes');
    await expect(entries.nth(0).getByTestId('current-appointment-label')).toHaveText('Current appointment');
    await expect(entries.nth(0).getByTestId('patient-history-type')).toHaveText('Follow-up');
    await expect(entries.nth(1)).toContainText('Recent visit\nProgress notes');
    await expect(entries.nth(2)).toContainText('Earlier visit');
    await expect(entries.nth(3)).toContainText('No notes recorded.');
    await expect(history).not.toContainText('Private Bob note');
    await expect(history).not.toContainText('Unsaved progress notes');
    await expect(page.getByTestId('booking-submit-btn')).not.toBeVisible();
    await page.getByTestId('appointment-details-tab').click();
    await expect(page.getByTestId('appointment-notes')).toHaveValue('Unsaved progress notes');
    await expect(page.getByTestId('appointment-title-input')).toHaveValue('Updated appointment');
    await expect(page.getByTestId('booking-submit-btn')).toBeEnabled();
    const saved = page.waitForResponse((response) =>
      response.url().endsWith('/api/appointments/current') && response.request().method() === 'PUT');
    await page.getByTestId('booking-submit-btn').click();
    expect((await saved).ok()).toBe(true);
    await expect(page.getByTestId('booking-dialog')).toBeHidden();
    await page.getByTestId('appointment-block').filter({ hasText: 'Alice Thornton' }).click();
    await expect(page.getByTestId('appointment-details-tab')).toHaveAttribute('data-state', 'active');
    await page.getByTestId('appointment-history-tab').click();
    await expect(entries.first()).toContainText('Unsaved progress notes');
  });

  test('follows the selected patient, handles missing and empty histories, and retries failures', async ({ page }) => {
    const current = historyAppointment('current', PATIENTS.alice.id, '2026-10-26T10:00:00', 'Alice saved note');
    await page.route('**/api/appointments', (route) => route.fulfill({ json: [current] }));
    await page.goto('/app/');
    await page.getByTestId('appointment-block').filter({ hasText: 'Alice Thornton' }).click();
    await page.getByTestId('appointment-history-tab').click();
    await expect(page.getByTestId('patient-history-entry')).toContainText('Alice saved note');
    await page.getByTestId('appointment-details-tab').click();
    await page.getByTestId('change-patient-btn').click();
    await page.getByTestId('appointment-history-tab').click();
    await expect(page.getByTestId('appointment-history')).toContainText('Select a patient');
    await expect(page.getByTestId('patient-history-entry')).toHaveCount(0);
    await page.getByTestId('appointment-details-tab').click();
    await page.getByTestId('patient-first-name').fill('Bob');
    await page.getByTestId(`patient-name-match-${PATIENTS.bob.id}`).click();
    await page.route('**/api/appointments', (route) => route.fulfill({ status: 500, json: { error: 'Unavailable' } }));
    await page.getByTestId('appointment-history-tab').click();
    const history = page.getByTestId('appointment-history');
    await expect(history.getByRole('alert')).toContainText('Unable to load appointment history.');
    await expect(history).not.toContainText('Alice saved note');
    await page.route('**/api/appointments', (route) => route.fulfill({ json: [current] }));
    await history.getByRole('button', { name: 'Try again' }).click();
    await expect(history).toContainText('No appointments for this patient yet.');
    const bob = historyAppointment('bob', PATIENTS.bob.id, '2026-10-12T10:00:00', 'Bob history');
    await page.route('**/api/appointments', (route) => route.fulfill({ json: [current, bob] }));
    await page.getByTestId('appointment-details-tab').click();
    await page.getByTestId('appointment-history-tab').click();
    await expect(page.getByTestId('patient-history-entry')).toHaveCount(1);
    await expect(page.getByTestId('patient-history-entry')).toContainText('Bob history');
    await expect(page.getByTestId('current-appointment-label')).toHaveCount(0);
  });

  test('fits mobile history, translates labels and leaves creation without tabs', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route('**/api/settings', (route) => route.fulfill({ json: {
      locale: 'mk', startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30,
    } }));
    const notes = 'Treatment'.repeat(100);
    await page.route('**/api/appointments', (route) => route.fulfill({ json: [
      historyAppointment('current', PATIENTS.alice.id, '2026-10-26T10:00:00', notes),
    ] }));
    await page.goto('/app/');
    await page.getByTestId('mobile-appointment').filter({ hasText: 'Alice Thornton' }).click();
    await expect(page.getByTestId('appointment-history-tab')).toHaveText('Историја на термини');
    await page.getByTestId('appointment-history-tab').click();
    await expect(page.getByTestId('patient-history-entry')).toContainText(notes);
    await expect(page.getByTestId('current-appointment-label')).toHaveText('Тековен термин');
    const dialog = page.getByTestId('booking-dialog');
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByTestId('mobile-free-slot').first().click();
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('appointment-details-tab')).toHaveCount(0);
    await expect(page.getByTestId('appointment-history-tab')).toHaveCount(0);
    await expect(page.getByTestId('patient-first-name')).toBeVisible();
  });

  test('keeps the shared patient history simple and preserves patient detail edits', async ({ page }) => {
    const records = [
      historyAppointment('older', PATIENTS.alice.id, '2026-09-07T10:00:00', ''),
      historyAppointment('recent', PATIENTS.alice.id, '2026-10-19T10:00:00', 'Recent patient visit'),
      historyAppointment('bob', PATIENTS.bob.id, '2026-10-12T10:00:00', 'Private Bob note'),
    ];
    await page.route('**/api/appointments', (route) => route.fulfill({ json: records }));
    await page.goto('/app/');
    await page.getByTestId('nav-patients').click();
    await page.getByTestId('patient-row').filter({ hasText: PATIENTS.alice.email }).click();
    await page.getByTestId('patient-notes').fill('Unsaved patient notes');
    await page.getByTestId('patient-history-tab').click();
    const history = page.getByTestId('patient-history');
    const entries = history.getByTestId('patient-history-entry');
    await expect(entries).toHaveCount(2);
    await expect(entries.first()).toContainText('Recent patient visit');
    await expect(entries.first().locator('time')).toHaveAttribute('datetime', records[1].startTime);
    await expect(entries.first().getByTestId('patient-history-type')).toHaveText('Follow-up');
    await expect(entries.last()).toContainText('No notes recorded.');
    await expect(history).not.toContainText('Private Bob note');
    await expect(history.getByTestId('current-appointment-label')).toHaveCount(0);
    await expect(page.getByTestId('patient-form-submit')).not.toBeVisible();
    await page.getByTestId('patient-details-tab').click();
    await expect(page.getByTestId('patient-notes')).toHaveValue('Unsaved patient notes');
    await expect(page.getByTestId('patient-form-submit')).toBeInViewport();
  });
});
