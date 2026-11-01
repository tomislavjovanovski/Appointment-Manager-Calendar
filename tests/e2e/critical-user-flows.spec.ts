import { test, expect } from '../fixtures/base';
import { storageHelper } from '../utils/storageHelper';
import { bookingHelper } from '../utils/bookingHelper';
import { patientHelper } from '../utils/patientHelper';
import { PATIENTS, nextWorkingSlot } from '../test-data/seed';

function toDateTimeLocal(date: Date) {
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

async function backendIsAvailable() {
  try {
    const response = await fetch('http://127.0.0.1:3000/api/health');
    return response.ok;
  } catch {
    return false;
  }
}

test.describe('Critical User Flows', () => {
  test('edit appointment updates title, type, duration, notes, and time', async ({
    pageWithPatients: page,
  }) => {
    const originalSlot = nextWorkingSlot(2, 10);
    const editedStart = nextWorkingSlot(2, 12);

    await bookingHelper.goToScheduler(page);
    await bookingHelper.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      notes: 'Original booking note',
      slotDate: originalSlot,
    });

    await page.getByTestId('appointment-block').filter({ hasText: PATIENTS.alice.firstName }).first().click();
    await expect(page.getByTestId('booking-dialog')).toBeVisible();

    await page.getByTestId('appointment-title-input').fill('Edited follow-up visit');
    await bookingHelper.selectRadixOption(
      page,
      'appointment-type-select',
      'appointment-type-option-follow-up',
    );
    await bookingHelper.selectRadixOption(
      page,
      'duration-select',
      'duration-option-60',
    );
    await page.getByTestId('appointment-start-input').fill(toDateTimeLocal(editedStart));
    await page.getByTestId('appointment-notes').fill('Updated note after edit');
    await page.getByTestId('booking-submit-btn').click();
    await expect(page.getByTestId('booking-dialog')).not.toBeVisible();

    const appointments = await storageHelper.getAll(page, 'appointments') as Array<{
      title: string;
      type: string;
      duration: number;
      notes: string;
      startTime: string;
      patientId: string;
    }>;
    const edited = appointments.find((appointment) => appointment.patientId === PATIENTS.alice.id);

    expect(edited).toBeDefined();
    expect(edited?.title).toBe('Edited follow-up visit');
    expect(edited?.type).toBe('follow-up');
    expect(edited?.duration).toBe(60);
    expect(edited?.notes).toBe('Updated note after edit');
    expect(new Date(edited!.startTime).getHours()).toBe(12);
  });

  test('delete appointment supports cancel and confirm flows', async ({
    pageWithPatients: page,
  }) => {
    await bookingHelper.goToScheduler(page);
    await bookingHelper.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      slotDate: nextWorkingSlot(2, 9),
    });

    const countBeforeDelete = await storageHelper.count(page, 'appointments');
    const appointmentBlock = page.getByTestId('appointment-block').filter({ hasText: PATIENTS.alice.firstName }).first();

    await appointmentBlock.click();
    await page.getByTestId('delete-appointment-btn').click();
    await expect(page.getByTestId('delete-appointment-confirm-dialog')).toBeVisible();
    await page.getByTestId('cancel-delete-btn').click();
    await expect(page.getByTestId('delete-appointment-confirm-dialog')).not.toBeVisible();
    await expect(page.getByTestId('booking-dialog')).toBeVisible();
    expect(await storageHelper.count(page, 'appointments')).toBe(countBeforeDelete);

    await page.getByTestId('delete-appointment-btn').click();
    await page.getByTestId('confirm-delete-btn').click();
    await expect(page.getByTestId('booking-dialog')).not.toBeVisible();
    await expect(appointmentBlock).not.toBeVisible();
    expect(await storageHelper.count(page, 'appointments')).toBe(countBeforeDelete - 1);
  });

  test('working day settings disable and re-enable weekend booking cells', async ({
    pageClean: page,
  }) => {
    await page.getByTestId('nav-settings').click();
    await page.getByTestId('settings-tab-working-hours').click();

    const saturdayToggle = page.getByTestId('working-day-toggle-sat');
    const sundayToggle = page.getByTestId('working-day-toggle-sun');

    if ((await saturdayToggle.getAttribute('data-selected')) === 'true') {
      await saturdayToggle.click();
    }
    if ((await sundayToggle.getAttribute('data-selected')) === 'true') {
      await sundayToggle.click();
    }

    await page.getByTestId('save-settings-btn').click();
    await expect(page.getByTestId('toast-success')).toBeVisible();

    await page.getByTestId('nav-scheduler').click();

    const saturdaySlot = page.locator('[data-slot-day="6"][data-slot-time="10:00"]').first();
    const sundaySlot = page.locator('[data-slot-day="0"][data-slot-time="10:00"]').first();

    await expect(saturdaySlot).toHaveAttribute('data-working-day', 'false');
    await expect(sundaySlot).toHaveAttribute('data-working-day', 'false');

    await saturdaySlot.click();
    await expect(page.getByTestId('booking-dialog')).not.toBeVisible();

    await page.getByTestId('nav-settings').click();
    await page.getByTestId('settings-tab-working-hours').click();
    await saturdayToggle.click();
    await page.getByTestId('save-settings-btn').click();
    await expect(page.getByTestId('toast-success')).toBeVisible();
    await page.getByTestId('nav-scheduler').click();

    await expect(saturdaySlot).toHaveAttribute('data-working-day', 'true');
  });

  test('backend API reflects create, edit, and delete when backend is available', async ({
    page,
  }) => {
    test.skip(!(await backendIsAvailable()), 'Backend server is not available on port 3000.');

    const uniqueId = Date.now().toString();
    const createPatientResponse = await fetch('http://127.0.0.1:3000/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Backend',
        lastName: `Patient${uniqueId}`,
        email: `backend.${uniqueId}@test.medical`,
        phone: `555-${uniqueId.slice(-4)}`,
        dateOfBirth: '1991-01-01',
        address: '',
        emergencyContact: '',
        notes: '',
      }),
    });
    expect(createPatientResponse.ok).toBe(true);
    const patient = await createPatientResponse.json() as { id: string };

    await page.goto('/');
    await bookingHelper.goToScheduler(page);
    await bookingHelper.openSlot(page, nextWorkingSlot(3, 10));
    await bookingHelper.fillBookingForm(page, {
      patientId: patient.id,
      type: 'consultation',
      duration: 30,
      notes: 'Persisted through backend',
    });
    await page.getByTestId('appointment-title-input').fill(`Backend appointment ${uniqueId}`);
    await bookingHelper.submit(page);

    const createdAppointmentsResponse = await fetch('http://127.0.0.1:3000/api/appointments');
    const createdAppointments = await createdAppointmentsResponse.json() as Array<{
      id: string;
      patientId: string;
      title: string;
      notes: string;
    }>;
    const created = createdAppointments.find((appointment) => appointment.patientId === patient.id);
    expect(created).toBeDefined();

    await page.getByTestId('appointment-block').filter({ hasText: 'Backend Patient' }).first().click();
    await page.getByTestId('appointment-notes').fill('Edited through backend path');
    await page.getByTestId('booking-submit-btn').click();

    const editedAppointmentsResponse = await fetch('http://127.0.0.1:3000/api/appointments');
    const editedAppointments = await editedAppointmentsResponse.json() as Array<{
      id: string;
      notes: string;
    }>;
    const edited = editedAppointments.find((appointment) => appointment.id === created?.id);
    expect(edited?.notes).toBe('Edited through backend path');

    await page.getByTestId('appointment-block').filter({ hasText: 'Backend Patient' }).first().click();
    await page.getByTestId('delete-appointment-btn').click();
    await page.getByTestId('confirm-delete-btn').click();

    const afterDeleteResponse = await fetch('http://127.0.0.1:3000/api/appointments');
    const afterDelete = await afterDeleteResponse.json() as Array<{ id: string }>;
    expect(afterDelete.some((appointment) => appointment.id === created?.id)).toBe(false);
  });

  test('editing an appointment into an overlapping time range is rejected', async ({
    pageWithPatients: page,
  }) => {
    await bookingHelper.goToScheduler(page);
    await bookingHelper.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      slotDate: nextWorkingSlot(2, 10),
    });
    await bookingHelper.book(page, {
      patientId: PATIENTS.bob.id,
      type: 'procedure',
      duration: 60,
      slotDate: nextWorkingSlot(2, 11),
    });

    const before = await storageHelper.getAll(page, 'appointments') as Array<{
      id: string;
      patientId: string;
      startTime: string;
    }>;
    const aliceBefore = before.find((appointment) => appointment.patientId === PATIENTS.alice.id);

    await page.getByTestId('appointment-block').filter({ hasText: PATIENTS.alice.firstName }).first().click();
    await bookingHelper.selectRadixOption(
      page,
      'duration-select',
      'duration-option-60',
    );
    await page.getByTestId('appointment-start-input').fill(toDateTimeLocal(nextWorkingSlot(2, 10, 30)));
    await page.getByTestId('booking-submit-btn').click();

    await expect(page.getByTestId('toast-error')).toBeVisible();
    await expect(page.getByText(/overlaps an existing appointment/i)).toBeVisible();
    await expect(page.getByTestId('booking-dialog')).toBeVisible();

    const after = await storageHelper.getAll(page, 'appointments') as Array<{
      id: string;
      startTime: string;
    }>;
    const aliceAfter = after.find((appointment) => appointment.id === aliceBefore?.id);
    expect(aliceAfter?.startTime).toBe(aliceBefore?.startTime);
  });

  test('settings persistence keeps locale, hours, slot interval, and working days after reload', async ({
    pageClean: page,
  }) => {
    await page.getByTestId('nav-settings').click();

    await page.getByTestId('settings-tab-practice').click();
    await bookingHelper.selectRadixOption(page, 'settings-locale-select', 'settings-locale-option-mk');
    await page.getByTestId('settings-tab-working-hours').click();
    await page.getByTestId('settings-start-time-input').fill('07:00');
    await page.getByTestId('settings-end-time-input').fill('16:00');
    await bookingHelper.selectRadixOption(
      page,
      'settings-slot-interval-select',
      'settings-slot-interval-option-60',
    );

    const saturdayToggle = page.getByTestId('working-day-toggle-sat');
    if ((await saturdayToggle.getAttribute('data-selected')) !== 'true') {
      await saturdayToggle.click();
    }

    await page.getByTestId('save-settings-btn').click();
    await expect(page.getByTestId('toast-success')).toBeVisible();

    await page.reload();
    await page.getByTestId('nav-settings').click();
    await page.getByTestId('settings-tab-working-hours').click();

    await expect(page.getByTestId('settings-start-time-input')).toHaveValue('07:00');
    await expect(page.getByTestId('settings-end-time-input')).toHaveValue('16:00');
    await expect(saturdayToggle).toHaveAttribute('data-selected', 'true');
    await expect(page.getByText('Поставки')).toBeVisible();

    await page.getByTestId('nav-scheduler').click();
    await expect(page.getByText('Неделен распоред')).toBeVisible();
    await expect(page.getByTestId('time-slot-7:00').first()).toBeVisible();
  });

  test('editing a patient updates linked appointment display name', async ({
    pageWithPatients: page,
  }) => {
    await bookingHelper.goToScheduler(page);
    await bookingHelper.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      slotDate: nextWorkingSlot(2, 13),
    });

    await patientHelper.goToPatients(page);
    await page.getByTestId('patient-row').filter({ hasText: PATIENTS.alice.email }).click();
    await expect(page.getByTestId('patient-form-dialog')).toBeVisible();
    await page.getByTestId('patient-first-name').fill('Alicia');
    await page.getByTestId('patient-form-submit').click();
    await expect(page.getByTestId('patient-form-dialog')).not.toBeVisible();

    await bookingHelper.goToScheduler(page);
    await expect(
      page.getByTestId('appointment-block').filter({ hasText: 'Alicia Thornton' }).first(),
    ).toBeVisible();
  });

  test('closing an unsaved edit dialog discards changes and keeps stored data unchanged', async ({
    pageWithPatients: page,
  }) => {
    await bookingHelper.goToScheduler(page);
    await bookingHelper.book(page, {
      patientId: PATIENTS.alice.id,
      type: 'consultation',
      duration: 30,
      notes: 'Stable persisted note',
      slotDate: nextWorkingSlot(2, 15),
    });

    const before = await storageHelper.getAll(page, 'appointments') as Array<{
      id: string;
      patientId: string;
      title: string;
      notes: string;
    }>;
    const appointment = before.find((item) => item.patientId === PATIENTS.alice.id);

    await page.getByTestId('appointment-block').filter({ hasText: PATIENTS.alice.firstName }).first().click();
    await page.getByTestId('appointment-title-input').fill('Unsaved edit title');
    await page.getByTestId('appointment-notes').fill('Unsaved edit note');
    await page.getByTestId('cancel-booking-btn').click();
    await expect(page.getByTestId('booking-dialog')).not.toBeVisible();

    await page.getByTestId('appointment-block').filter({ hasText: PATIENTS.alice.firstName }).first().click();
    await expect(page.getByTestId('appointment-title-input')).not.toHaveValue('Unsaved edit title');
    await expect(page.getByTestId('appointment-notes')).not.toHaveValue('Unsaved edit note');

    const after = await storageHelper.getAll(page, 'appointments') as Array<{
      id: string;
      title: string;
      notes: string;
    }>;
    const afterRecord = after.find((item) => item.id === appointment?.id);
    expect(afterRecord?.title).toBe(appointment?.title);
    expect(afterRecord?.notes).toBe(appointment?.notes);
  });
});
