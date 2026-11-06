import { test, expect } from '../fixtures/base';
import { PATIENTS } from '../test-data/seed';
import { mockPatientDirectory } from '../utils/patientDirectoryMock';
import type { Appointment } from '../../src/types/appointment';

for (const mobile of [false, true]) {
  test(`patient directory pages 100 records and searches the full dataset on ${mobile ? 'mobile' : 'desktop'}`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date('2026-10-26T08:00:00'));
    let patients = Array.from({ length: 205 }, (_, index) => ({
      ...PATIENTS.alice, id: `patient-${index}`, firstName: 'Elena', lastName: `Patient ${index}`,
      email: index === 204 ? 'unique@test.local' : '', embg: index === 204 ? '1234567890123' : '',
    }));
    const appointments: Appointment[] = Array.from({ length: 150 }, (_, index) => ({
      id: `apt-${index}`, patientId: `patient-${index}`, patientName: `Elena Patient ${index}`,
      startTime: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(), endTime: new Date(Date.UTC(2026, 0, 1 + index, 1)).toISOString(),
      duration: 60, title: 'Visit', notes: '', type: 'procedure', status: 'completed', createdAt: '2026-01-01',
    }));
    await page.route('**/api/settings', (route) => route.fulfill({ json: { locale: 'en' } }));
    await page.route('**/api/patients', (route) => route.fulfill({ json: patients }));
    await page.route('**/api/appointments', (route) => route.fulfill({ json: [] }));
    await mockPatientDirectory(page, () => patients, () => appointments);
    await page.route('**/api/patients/patient-*', async (route) => {
      const id = new URL(route.request().url()).pathname.split('/').pop();
      patients = patients.filter((patient) => patient.id !== id);
      await route.fulfill({ status: 204 });
    });
    await page.goto('/');
    if (mobile) await page.getByRole('button', { name: 'Open navigation' }).click();
    await (mobile ? page.getByTestId('mobile-sidebar') : page).getByTestId('nav-patients').click();
    const items = page.getByTestId(mobile ? 'patient-card' : 'patient-row');
    await expect(items).toHaveCount(100);
    await expect(items.first()).toContainText('Patient 149');
    await expect(page.getByTestId('patients-total')).toHaveText('205');
    await expect(page.getByTestId('patients-with-visits')).toHaveText('150');
    await expect(page.getByTestId('patients-total-appointments')).toHaveText('150');
    await expect(page.getByTestId('patients-page-range')).toHaveText('1–100 of 205 patients');
    const fullReads: string[] = [];
    page.on('request', (request) => {
      if (new URL(request.url()).pathname === '/api/patients') fullReads.push(request.url());
    });
    await page.getByTestId('patients-next-page').click();
    await expect(items).toHaveCount(100);
    await expect(items.first()).toContainText('Patient 49');
    await expect(page.getByTestId('patients-page-number')).toHaveText('2 / 3');
    await page.getByTestId('patients-next-page').click();
    await expect(items).toHaveCount(5);
    await expect(page.getByTestId('patients-next-page')).toBeDisabled();
    for (const search of ['Patient 204', 'unique@test.local', '1234567890123']) {
      await page.getByTestId('patient-search-input').fill(search);
      await expect(items).toHaveCount(1);
      await expect(items.first()).toContainText('Patient 204');
      await expect(page.getByTestId('patients-total')).toHaveText('1');
      await expect(page.getByTestId('patients-page-number')).toHaveText('1 / 1');
    }
    await page.getByTestId('patient-search-input').fill('no-match');
    await expect(items).toHaveCount(0);
    await expect(page.getByTestId('patients-empty-state').filter({ visible: true })).toContainText('No patients found');
    await page.getByTestId('patient-search-input').fill('');
    await expect(items).toHaveCount(100);
    expect(fullReads).toEqual([]);
    if (!mobile) {
      await page.getByTestId('patients-next-page').click();
      await expect(page.getByTestId('patients-page-number')).toHaveText('2 / 3');
      await page.getByTestId('patients-next-page').click();
      await expect(items).toHaveCount(5);
      for (let count = 5; count > 0; count--) {
        await items.last().getByTestId('delete-patient-btn').click();
        await page.getByTestId('confirm-delete-patient-btn').click();
        if (count > 1) await expect(items).toHaveCount(count - 1);
      }
      await expect(items).toHaveCount(100);
      await expect(page.getByTestId('patients-page-number')).toHaveText('2 / 2');
    } else {
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test('patient directory exposes load errors and retries without displaying a false empty state', async ({ pageWithPatients: page }) => {
  await page.goto('/');
  await page.route('**/api/patients/directory?*', (route) => route.fulfill({ status: 500, json: { error: 'Unavailable' } }));
  await page.getByTestId('nav-patients').click();
  await expect(page.getByRole('alert')).toContainText('Пациентите не може да се вчитаат');
  await expect(page.getByTestId('patients-empty-state')).toHaveCount(0);
  await mockPatientDirectory(page, () => [PATIENTS.alice]);
  await page.getByRole('button', { name: 'Обидете се повторно', exact: true }).click();
  await expect(page.getByTestId('patient-row')).toHaveCount(1);
});
