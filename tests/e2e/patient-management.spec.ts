// tests/e2e/patient-management.spec.ts
// Tests patient creation both standalone and inline during booking.
// Also covers: search, profile view, data persistence.

import { test, expect } from '../fixtures/base';
import { PATIENTS } from '../test-data/seed';

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
