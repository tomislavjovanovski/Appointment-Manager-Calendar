// tests/e2e/patient-management.spec.ts
// Tests patient creation both standalone and inline during booking.
// Also covers: search, profile view, data persistence.

import { test, expect } from '../fixtures/base';
import { PATIENTS } from '../test-data/seed';
import type { Page } from '@playwright/test';
import { translate } from '../../src/i18n/dictionary';

const historyAppointment = (id: string, patientId: string, startTime: string, notes: string) => ({
  id, patientId, startTime, notes,
  endTime: new Date(Date.parse(startTime) + 1_800_000).toISOString(),
  patientName: 'Alice Thornton', title: 'Dental follow-up',
  duration: 30, type: 'follow-up', status: 'completed', createdAt: startTime,
});

async function openHistoryPatient(page: Page, patientId = PATIENTS.alice.id) {
  const patient = Object.values(PATIENTS).find((candidate) => 'id' in candidate && candidate.id === patientId);
  if (!patient || !('id' in patient)) throw new Error('Unknown history patient');
  await page.getByTestId('patient-row').filter({ hasText: patient.email }).click();
  await page.getByTestId('patient-history-tab').click();
  await expect(page.getByTestId('patient-history')).toBeVisible();
}

test.describe('Patient appointment history', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/patients', (route) => route.fulfill({ json: [PATIENTS.alice, PATIENTS.bob] }));
    await page.route('**/api/settings', (route) => route.fulfill({ json: {
      locale: 'en', startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30,
    } }));
  });

  test('shows persisted dates and notes newest first, and isolates patients after reload', async ({ page }) => {
    const records = [
      historyAppointment('older', PATIENTS.alice.id, '2026-09-10T09:00:00Z', 'Initial examination\nTooth 16: sensitivity'),
      historyAppointment('other', PATIENTS.bob.id, '2026-10-12T09:00:00Z', 'Private Bob note'),
      historyAppointment('newer', PATIENTS.alice.id, '2026-10-10T09:00:00Z', 'Pain improved after treatment'),
      historyAppointment('blank', PATIENTS.alice.id, '2026-08-10T09:00:00Z', ''),
    ];
    await page.route('**/api/appointments', (route) => route.fulfill({ json: records }));
    await page.goto('/app/');
    await page.getByTestId('nav-patients').click();
    await openHistoryPatient(page);
    await page.getByTestId('patient-details-tab').click();
    await expect(page.getByTestId('patient-form-submit')).toBeInViewport();
    await expect(page.getByTestId('patient-history-tab')).toBeInViewport();
    await page.getByTestId('patient-history-tab').click();
    const entries = page.getByTestId('patient-history-entry');
    await expect(entries).toHaveCount(3);
    await expect(entries.nth(0)).toContainText('Pain improved after treatment');
    await expect(entries.nth(0).locator('time')).toHaveAttribute('datetime', records[2].startTime);
    await expect(entries.nth(0).locator('time')).not.toBeEmpty();
    await expect(entries.nth(0).getByTestId('patient-history-type')).toHaveText('Follow-up');
    await expect(entries.nth(0)).not.toContainText('Completed');
    await expect(entries.nth(0)).not.toContainText('Dental follow-up');
    await expect(entries.nth(1)).toContainText('Initial examination\nTooth 16: sensitivity');
    await expect(entries.nth(2)).toContainText('No notes recorded.');
    await expect(page.getByTestId('patient-history')).not.toContainText('Private Bob note');
    await page.getByTestId('patient-details-tab').click();
    await expect(page.getByTestId('patient-notes')).toHaveValue(PATIENTS.alice.notes);
    await page.getByRole('button', { name: 'Close', exact: true }).click();
    await openHistoryPatient(page, PATIENTS.bob.id);
    await expect(entries).toHaveCount(1);
    await expect(entries.first()).toContainText('Private Bob note');

    records[2].notes = 'Updated progress note';
    records[2].startTime = '2026-10-11T09:00:00Z';
    await page.reload();
    await page.getByTestId('nav-patients').click();
    await openHistoryPatient(page);
    await expect(entries.first()).toContainText('Updated progress note');
    await expect(entries.first().locator('time')).toHaveAttribute('datetime', records[2].startTime);
  });

  test('shows empty history and retries a failed request without submitting patient details', async ({ page }) => {
    await page.route('**/api/appointments', (route) => route.fulfill({ json: [] }));
    await page.goto('/app/');
    await page.getByTestId('nav-patients').click();
    await expect(page.getByTestId('patient-row')).toHaveCount(2);
    await page.route('**/api/appointments', (route) => route.fulfill({ status: 500, json: { error: 'Unavailable' } }));
    await openHistoryPatient(page);
    await expect(page.getByTestId('patient-history').getByRole('alert')).toContainText('Unable to load');
    await page.route('**/api/appointments', (route) => route.fulfill({ json: [] }));
    await page.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByTestId('patient-history')).toContainText('No appointments for this patient yet.');
    await expect(page.getByTestId('patient-form-submit')).not.toBeVisible();
  });

  test('fits long notes on mobile and translates the history tab', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.route('**/api/settings', (route) => route.fulfill({ json: { locale: 'mk' } }));
    await page.route('**/api/appointments', (route) => route.fulfill({ json: [
      historyAppointment('long', PATIENTS.alice.id, '2026-10-10T09:00:00Z', 'Treatment'.repeat(100)),
    ] }));
    await page.goto('/app/');
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByTestId('mobile-sidebar').getByTestId('nav-patients').click();
    await page.getByTestId('patient-card').filter({ hasText: PATIENTS.alice.firstName }).click();
    await expect(page.getByTestId('patient-form-submit')).toBeInViewport();
    await expect(page.getByTestId('patient-history-tab')).toHaveText(translate('mk', 'patientHistory.title'));
    await page.getByTestId('patient-history-tab').click();
    await expect(page.getByTestId('patient-history-entry')).toContainText('Treatment'.repeat(100));
    const dialog = page.getByTestId('patient-form-dialog');
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.screenshot({ path: '/tmp/patient-history-mobile.png' });
  });
});

test.describe('Patient Management — Standalone Creation', () => {
  test('creates a new patient and verifies in UI and LocalStorage', async ({
    pageClean: page, patients, storage,
  }) => {
    const newP = PATIENTS.newPatient;

    await test.step('Navigate to Patients page', async () => {
      await patients.goToPatients(page);
    });

    await test.step('Open create dialog and fill all fields', async () => {
      await patients.openCreateDialog(page);
      await patients.fillForm(page, {
        firstName: newP.firstName,
        lastName: newP.lastName,
        email: newP.email,
        phone: newP.phone,
        dateOfBirth: newP.dateOfBirth,
        address: newP.address,
        emergencyContact: newP.emergencyContact,
        notes: newP.notes,
      });
    });

    await test.step('Submit and confirm patient appears in list', async () => {
      await patients.submitForm(page);
      await expect(page.getByTestId('toast-success')).toBeVisible();

      const row = page.getByTestId('patient-row').filter({ hasText: newP.email });
      await expect(row).toBeVisible();
    });

    await test.step('Verify patient stored in LocalStorage with all fields', async () => {
      await storage.assertPatientExistsInStorage(page, newP.email);

      const stored = await storage.getAll(page, 'patients') as Record<string, string>[];
      const patient = stored.find((p) => p.email === newP.email);

      expect(patient?.firstName).toBe(newP.firstName);
      expect(patient?.lastName).toBe(newP.lastName);
      expect(patient?.phone).toBe(newP.phone);
      expect(patient?.address).toBe(newP.address);
    });
  });

  test('cannot create patient with duplicate email', async ({
    pageWithPatients: page, patients,
  }) => {
    await patients.goToPatients(page);
    await patients.openCreateDialog(page);

    // Try to register Alice's email again
    await patients.fillForm(page, {
      firstName: 'Duplicate',
      lastName: 'User',
      email: PATIENTS.alice.email, // already exists
      phone: '555-9999',
      dateOfBirth: '2000-01-01',
    });

    await page.getByTestId('patient-form-submit').click();
    await expect(page.getByTestId('error-email-duplicate')).toBeVisible();
    await expect(page.getByTestId('patient-form-dialog')).toBeVisible(); // stays open
  });

  test('only requires first and last name', async ({
    pageClean: page, patients,
  }) => {
    await patients.goToPatients(page);
    await patients.openCreateDialog(page);

    await page.getByTestId('patient-first-name').fill('Name');
    await page.getByTestId('patient-last-name').fill('Only');
    await page.getByTestId('patient-form-submit').click();

    await expect(page.getByTestId('patient-form-dialog')).not.toBeVisible();
    await expect(page.getByTestId('toast-success')).toBeVisible();
  });

  test('patient email format is validated', async ({
    pageClean: page, patients,
  }) => {
    await patients.goToPatients(page);
    await patients.openCreateDialog(page);

    await patients.fillForm(page, {
      firstName: 'Test',
      lastName: 'User',
      email: 'not-an-email', // invalid
      phone: '555-1234',
      dateOfBirth: '1990-01-01',
    });

    await page.getByTestId('patient-form-submit').click();
    await expect(page.getByTestId('error-email-invalid')).toBeVisible();
  });
});

test.describe('Patient Management — Inline Creation During Booking', () => {
  test('creates a new patient inline during booking and appointment is linked correctly', async ({
    pageClean: page, booking, storage,
  }) => {
    const newP = PATIENTS.newPatient;

    await booking.goToScheduler(page);
    await booking.openSlot(page);

    await test.step('Switch to new-patient form inside booking dialog', async () => {
      await page.getByTestId('create-new-patient-btn').click();
      await expect(page.getByTestId('new-patient-panel')).toBeVisible();
    });

    await test.step('Fill new patient details', async () => {
      await booking.fillNewPatientForm(page, {
        firstName: newP.firstName,
        lastName: newP.lastName,
        email: newP.email,
        phone: newP.phone,
        dateOfBirth: newP.dateOfBirth,
      });

      await page.getByTestId('new-patient-save').click();
      await expect(page.getByTestId('new-patient-panel')).not.toBeVisible();
      await expect(page.getByTestId('patient-select')).toContainText(`${newP.firstName} ${newP.lastName}`);
      await page.getByTestId('patient-select').click();
      await page.getByTestId('patient-search-input').fill(newP.lastName);
      await expect(page.getByRole('option', { name: `${newP.firstName} ${newP.lastName}` })).toBeVisible();
      await page.getByTestId('patient-select').click();
    });

    await test.step('Complete rest of booking form', async () => {
      await booking.selectRadixOption(
        page,
        'appointment-type-select',
        'appointment-type-option-consultation',
      );
      await booking.selectRadixOption(page, 'duration-select', 'duration-option-30');
    });

    await test.step('Submit booking', async () => {
      await booking.submit(page);
      await expect(page.getByTestId('toast-success')).toBeVisible();
    });

    await test.step('Both patient AND appointment exist in storage, correctly linked', async () => {
      await storage.assertPatientExistsInStorage(page, newP.email);

      const patients = await storage.getAll(page, 'patients') as { id: string; email: string }[];
      const patient = patients.find((p) => p.email === newP.email)!;
      expect(patient).toBeDefined();

      // Appointment must reference the newly created patient's ID
      await storage.assertAppointmentExistsInStorage(page, {
        patientId: patient.id,
        type: 'consultation',
      });
    });
  });
});

test.describe('Patient Management — Search', () => {
  test('search filters patient list by name', async ({
    pageWithPatients: page, patients,
  }) => {
    await patients.goToPatients(page);

    await test.step('Search for "Alice"', async () => {
      await patients.searchPatient(page, 'Alice');
      // Only Alice should be visible
      const count = await patients.getVisiblePatientCount(page);
      expect(count).toBe(1);
      await expect(
        page.getByTestId('patient-row').filter({ hasText: PATIENTS.alice.email }),
      ).toBeVisible();
    });

    await test.step('Clear search restores full list', async () => {
      await patients.searchPatient(page, '');
      const count = await patients.getVisiblePatientCount(page);
      expect(count).toBe(2); // Alice + Bob
    });
  });

  test('search with no results shows empty state', async ({
    pageWithPatients: page, patients,
  }) => {
    await patients.goToPatients(page);
    await patients.searchPatient(page, 'nonexistent-patient-xyz');

    await expect(page.getByTestId('patients-empty-state').first()).toBeVisible();
    expect(await patients.getVisiblePatientCount(page)).toBe(0);
  });
});
