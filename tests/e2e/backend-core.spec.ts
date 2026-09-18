import { test, expect } from '../fixtures/base';
import { bookingHelper } from '../utils/bookingHelper';
import { patientHelper } from '../utils/patientHelper';
import { nextWorkingSlot } from '../test-data/seed';

const API_URL = 'http://127.0.0.1:3000/api';

async function backendIsAvailable() {
  try {
    const response = await fetch(`${API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

async function apiJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`, options);
  expect(response.ok).toBe(true);
  return response.json() as Promise<T>;
}

test.describe('Backend Core Persistence', () => {
  test('adding a patient persists it in the backend', async ({ page }) => {
    test.skip(!(await backendIsAvailable()), 'Backend server is not available on port 3000.');

    const email = `backend-patient-${Date.now()}@test.medical`;
    await page.goto('/');

    await patientHelper.goToPatients(page);
    await patientHelper.createPatient(page, {
      firstName: 'Backend',
      lastName: 'Patient',
      email,
      phone: '555-0101',
      dateOfBirth: '1990-01-01',
    });

    const patients = await apiJson<Array<{ id: string; firstName: string; lastName: string; email: string }>>('/patients');
    const created = patients.find((patient) => patient.email === email);

    expect(created).toMatchObject({
      firstName: 'Backend',
      lastName: 'Patient',
      email,
    });

    if (created) {
      await fetch(`${API_URL}/patients/${created.id}`, { method: 'DELETE' });
    }
  });

  test('creating an appointment persists it in the backend', async ({ page }) => {
    test.skip(!(await backendIsAvailable()), 'Backend server is not available on port 3000.');

    const uniqueId = Date.now();
    const patient = await apiJson<{ id: string }>('/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Appointment',
        lastName: `Patient${uniqueId}`,
        email: `backend-appointment-${uniqueId}@test.medical`,
        phone: '555-0102',
        dateOfBirth: '1990-01-01',
        address: '',
        emergencyContact: '',
        notes: '',
      }),
    });

    try {
      await page.goto('/');
      await bookingHelper.goToScheduler(page);
      await bookingHelper.book(page, {
        patientId: patient.id,
        type: 'consultation',
        duration: 30,
        notes: 'Backend persistence check',
        slotDate: nextWorkingSlot(1, 10),
      });

      const appointments = await apiJson<Array<{
        id: string;
        patientId: string;
        type: string;
        duration: number;
        notes: string;
      }>>('/appointments');
      const created = appointments.find((appointment) => appointment.patientId === patient.id);

      expect(created).toMatchObject({
        patientId: patient.id,
        type: 'consultation',
        duration: 30,
        notes: 'Backend persistence check',
      });

      if (created) {
        await fetch(`${API_URL}/appointments/${created.id}`, { method: 'DELETE' });
      }
    } finally {
      await fetch(`${API_URL}/patients/${patient.id}`, { method: 'DELETE' });
    }
  });

  test('saving settings persists them in the backend', async ({ page }) => {
    test.skip(!(await backendIsAvailable()), 'Backend server is not available on port 3000.');

    const original = await apiJson<Record<string, unknown>>('/settings');

    try {
      await page.goto('/');
      await page.getByTestId('nav-settings').click();
      await page.getByTestId('settings-start-time-input').fill('07:30');
      await page.getByTestId('settings-end-time-input').fill('16:30');
      await page.getByTestId('save-settings-btn').click();
      await expect(page.getByTestId('toast-success')).toBeVisible();

      const saved = await apiJson<{ startTime: string; endTime: string }>('/settings');
      expect(saved).toMatchObject({ startTime: '07:30', endTime: '16:30' });
    } finally {
      await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(original),
      });
    }
  });
});
