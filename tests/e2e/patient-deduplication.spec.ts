import { test, expect } from '../fixtures/base';
import { PATIENTS } from '../test-data/seed';
import type { Patient } from '../../src/types/appointment';
import { findExactPatients } from '../../server/patientMatching.js';

test('closing clears patient names and suggestions before reopening, including pending searches', async ({ pageWithPatients: page }) => {
  await page.clock.setFixedTime(new Date('2026-10-26T08:00:00'));
  await page.goto('/app/');
  await page.getByTestId('new-appointment-btn').click();
  await page.getByTestId('patient-first-name').fill('Alice');
  await expect(page.getByTestId(`patient-name-match-${PATIENTS.alice.id}`)).toBeVisible();
  await page.getByTestId('cancel-booking-btn').click();
  await page.getByTestId('new-appointment-btn').click();
  await expect(page.getByTestId('patient-first-name')).toHaveValue('');
  await expect(page.getByTestId('patient-last-name')).toHaveValue('');
  await expect(page.getByTestId('patient-name-matches')).toHaveCount(0);

  await page.getByTestId('patient-last-name').fill('Thornton');
  await page.getByTestId('cancel-booking-btn').click();
  await page.getByTestId('new-appointment-btn').click();
  await expect(page.getByTestId('patient-last-name')).toHaveValue('');
  await expect(page.getByTestId('patient-name-matches')).toHaveCount(0);
  await page.getByTestId('patient-first-name').fill('Bob');
  await expect(page.getByTestId(`patient-name-match-${PATIENTS.bob.id}`)).toBeVisible();
  await expect(page.getByTestId(`patient-name-match-${PATIENTS.alice.id}`)).toHaveCount(0);
});

for (const mobile of [false, true]) {
  test(`1500 patients keep search bounded and all matches accessible on ${mobile ? 'mobile' : 'desktop'}`, async ({ pageWithPatients: page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date('2026-10-26T08:00:00'));
    const patients = Array.from({ length: 1500 }, (_, index) => ({
      ...PATIENTS.alice, id: `scale-${index}`, firstName: 'Elena', lastName: `Velkov ${index}`,
    }));
    let patientReads = 0;
    await page.route('**/api/patients', (route) => {
      patientReads += 1;
      return route.fulfill({ json: patients });
    });
    await page.goto('/app/');
    if (mobile) await page.getByTestId('mobile-free-slot').first().click();
    else await page.getByTestId('new-appointment-btn').click();
    const firstName = page.getByTestId('patient-first-name');
    let start = Date.now();
    await firstName.fill('Elena');
    const suggestions = page.getByTestId('patient-name-matches');
    const matches = suggestions.locator('[data-testid^="patient-name-match-"]');
    await expect(matches).toHaveCount(10);
    const broadSearchMs = Date.now() - start;
    expect(broadSearchMs).toBeLessThan(3000);
    await expect(suggestions.getByRole('button', { name: /10.*1500/ })).toBeVisible();
    const readsBeforeTyping = patientReads;
    await suggestions.getByRole('button', { name: /10.*1500/ }).click();
    await expect(matches).toHaveCount(20);
    start = Date.now();
    await page.getByTestId('patient-last-name').fill('Velkov 1499');
    await expect(matches).toHaveCount(1);
    await expect(page.getByTestId('patient-name-match-scale-1499')).toBeVisible();
    const exactSearchMs = Date.now() - start;
    expect(exactSearchMs).toBeLessThan(3000);
    expect(patientReads).toBe(readsBeforeTyping);
    await page.getByTestId('patient-last-name').fill('');
    await page.getByTestId('booking-submit-btn').click();
    await expect(page.getByTestId('new-patient-inline-error')).toBeVisible();
    await expect(page.getByTestId('patient-select')).toHaveCount(0);
    await page.getByTestId('patient-last-name').fill('Velkov 1499');
    await page.getByTestId('patient-name-match-scale-1499').click();
    await expect(page.getByTestId('selected-patient')).toContainText('Velkov 1499');
    await page.getByTestId('change-patient-btn').click();
    await expect(firstName).toHaveValue('');
    await expect(page.getByTestId('patient-name-matches')).toHaveCount(0);
    console.log(`1500 patients (${mobile ? 'mobile' : 'desktop'}): broad search ${broadSearchMs}ms; exact search ${exactSearchMs}ms`);
  });
}

for (const mobile of [false, true]) {
  for (const firstNameOnly of [false, true]) {
    test(`typed ${firstNameOnly ? 'first name' : 'full name'} reuses an existing patient on ${mobile ? 'mobile' : 'desktop'}`, async ({ pageWithPatients: page }) => {
      if (mobile) await page.setViewportSize({ width: 390, height: 844 });
      await page.clock.setFixedTime(new Date('2026-10-26T08:00:00'));
      await page.route('**/api/settings', (route) => route.fulfill({ json: {
        locale: 'en', startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30,
      } }));
      let resolutions = 0;
      let creations = 0;
      await page.route('**/api/patients', (route) => {
        if (route.request().method() === 'POST') creations += 1;
        return route.fulfill({ json: [PATIENTS.alice, PATIENTS.bob] });
      });
      await page.route('**/api/patients/resolve', async (route) => {
        resolutions += 1;
        const matches = findExactPatients([PATIENTS.alice, PATIENTS.bob], route.request().postDataJSON());
        expect(matches).toHaveLength(1);
        await route.fulfill({ json: { patient: matches[0], reused: true } });
      });
      await page.goto('/app/');
      if (mobile) await page.getByTestId('mobile-free-slot').first().click();
      else await page.getByTestId('new-appointment-btn').click();
      await expect(page.getByTestId('patient-search-hint')).toContainText('Type a first or last name');
      await expect(page.getByTestId('patient-first-name')).toHaveAttribute('aria-describedby', 'patient-search-hint');
      await expect(page.getByTestId('patient-last-name')).toHaveAttribute('aria-describedby', 'patient-search-hint');
      await page.getByTestId('patient-first-name').fill(' alice ');
      if (!firstNameOnly) await page.getByTestId('patient-last-name').fill(' THORNTON ');
      await expect(page.getByTestId(`patient-name-match-${PATIENTS.alice.id}`)).toBeVisible();
      await expect(page.getByTestId(`patient-name-match-${PATIENTS.alice.id}`)).toHaveText('Alice Thornton');
      await expect(page.getByTestId('patient-search-hint')).toContainText('Select the patient you want');
      const saved = page.waitForRequest((request) => request.url().endsWith('/api/appointments') && request.method() === 'POST');
      await page.getByTestId('booking-submit-btn').click();
      expect((await saved).postDataJSON().patientId).toBe(PATIENTS.alice.id);
      await expect(page.getByTestId('booking-dialog')).toBeHidden();
      expect(resolutions).toBe(1);
      expect(creations).toBe(0);
    });
  }
}

test('ambiguous names require selecting a suggestion and a new name is resolved before creation', async ({ pageWithPatients: page }) => {
  await page.clock.setFixedTime(new Date('2026-10-26T08:00:00'));
  await page.route('**/api/settings', (route) => route.fulfill({ json: {
    locale: 'en', startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30,
  } }));
  const duplicate = { ...PATIENTS.alice, id: 'alice-second', phone: '222', email: 'second@test.local' };
  await page.route('**/api/patients', (route) => route.fulfill({ json: [PATIENTS.alice, duplicate] }));
  let resolutionCalls = 0;
  await page.route('**/api/patients/resolve', (route) => {
    resolutionCalls += 1;
    return route.fulfill({ json: {
      patient: { ...PATIENTS.alice, ...route.request().postDataJSON(), id: 'new-person' }, reused: false,
    } });
  });
  await page.goto('/app/');
  await page.getByTestId('new-appointment-btn').click();
  await page.getByTestId('patient-first-name').fill('Ali');
  await expect(page.getByTestId('patient-name-matches').getByRole('button')).toHaveCount(2);
  await expect(page.getByTestId('patient-name-match-alice-second')).toContainText('222');
  await expect(page.getByTestId('patient-name-match-alice-second')).not.toContainText('second@test.local');
  await page.getByTestId('patient-first-name').fill('Alice');
  await page.getByTestId('patient-last-name').fill('Thornton');
  await page.getByTestId('booking-submit-btn').click();
  await expect(page.getByTestId('new-patient-inline-error')).toContainText('Several patients');
  expect(resolutionCalls).toBe(0);
  await page.getByTestId('patient-name-match-alice-second').click();
  await expect(page.getByTestId('selected-patient')).toContainText('Alice Thornton');
  const saved = page.waitForRequest((request) => request.url().endsWith('/api/appointments') && request.method() === 'POST');
  await page.getByTestId('booking-submit-btn').click();
  expect((await saved).postDataJSON().patientId).toBe(duplicate.id);
  await expect(page.getByTestId('booking-dialog')).toBeHidden();
  expect(resolutionCalls).toBe(0);

  await page.getByTestId('new-appointment-btn').click();
  await page.getByTestId('available-starts').getByRole('button', { name: /08:30/ }).click();
  await page.getByTestId('patient-first-name').fill('Brandnew');
  await page.getByTestId('patient-last-name').fill('Person');
  await expect(page.getByTestId('patient-name-matches')).toHaveCount(0);
  await expect(page.getByTestId('patient-search-hint')).toContainText('A new patient will be created');
  const created = page.waitForRequest((request) => request.url().endsWith('/api/appointments') && request.method() === 'POST');
  await page.getByTestId('booking-submit-btn').click();
  expect((await created).postDataJSON().patientId).toBe('new-person');
  expect(resolutionCalls).toBe(1);
});

test('editing preserves the selected patient and allows switching through name suggestions', async ({ pageWithPatients: page }) => {
  await page.clock.setFixedTime(new Date('2026-10-26T08:00:00'));
  await page.route('**/api/settings', (route) => route.fulfill({ json: {
    locale: 'en', startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30,
  } }));
  const appointment = {
    id: 'existing-visit', title: 'Existing treatment', patientId: PATIENTS.alice.id, patientName: 'Alice Thornton',
    startTime: new Date('2026-10-26T09:00:00').toISOString(),
    endTime: new Date('2026-10-26T09:30:00').toISOString(),
    duration: 30, type: 'procedure', status: 'scheduled', notes: 'Keep clinical notes',
  };
  await page.route('**/api/appointments', (route) => route.fulfill({ json: [appointment] }));
  await page.route('**/api/appointments/existing-visit', (route) => route.fulfill({
    json: { ...appointment, ...route.request().postDataJSON() },
  }));
  await page.goto('/app/');
  await page.getByTestId('appointment-block').filter({ hasText: 'Alice' }).first().click();
  await expect(page.getByTestId('selected-patient')).toContainText('Alice Thornton');
  await expect(page.getByTestId('patient-select')).toHaveCount(0);
  await page.getByTestId('change-patient-btn').click();
  await page.getByTestId('patient-first-name').fill(PATIENTS.bob.firstName);
  await page.getByTestId('patient-last-name').fill(PATIENTS.bob.lastName);
  await page.getByTestId(`patient-name-match-${PATIENTS.bob.id}`).click();
  await expect(page.getByTestId('selected-patient')).toContainText(`${PATIENTS.bob.firstName} ${PATIENTS.bob.lastName}`);
  const saved = page.waitForRequest((request) => request.url().endsWith('/api/appointments/existing-visit') && request.method() === 'PUT');
  await page.getByTestId('booking-submit-btn').click();
  expect((await saved).postDataJSON()).toMatchObject({ patientId: PATIENTS.bob.id, notes: 'Keep clinical notes' });
  await expect(page.getByTestId('booking-dialog')).toBeHidden();
});

for (const mobile of [false, true]) {
  test(`settings merge reviews selected sources and handles errors on ${mobile ? 'mobile' : 'desktop'}`, async ({ pageWithPatients: page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    let patients: Patient[] = [
      { ...PATIENTS.alice, phone: '111' },
      { ...PATIENTS.alice, id: 'alice-duplicate', phone: '222', email: '', notes: 'Source care note' },
      { ...PATIENTS.alice, id: 'alice-different-person', phone: '333', email: '' },
      PATIENTS.bob,
    ];
    await page.route('**/api/settings', (route) => route.fulfill({ json: { locale: 'en' } }));
    await page.route('**/api/patients', (route) => route.fulfill({ json: patients.map((patient) => ({
      ...patient, appointmentCount: 2, lastAppointmentAt: null,
    })) }));
    let mergeCalls = 0;
    let fail = true;
    await page.route('**/api/patients/merge', async (route) => {
      mergeCalls += 1;
      expect(route.request().postDataJSON()).toEqual({ targetId: PATIENTS.alice.id, sourceIds: ['alice-duplicate'] });
      if (fail) return route.fulfill({ status: 409, json: { error: 'Records changed. Refresh and retry.' } });
      patients = patients.filter((patient) => patient.id !== 'alice-duplicate');
      await route.fulfill({ json: patients[0] });
    });
    await page.goto('/app/');
    if (mobile) {
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await page.getByTestId('mobile-sidebar').getByTestId('nav-settings').click();
    } else {
      await page.getByTestId('nav-settings').click();
    }
    await page.getByTestId('settings-tab-system-data').click();
    await expect(page.getByTestId('patient-duplicate-group')).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByTestId('patient-merge-panel')).toContainText('Source care note');
    await page.getByTestId(`merge-keep-${PATIENTS.alice.id}`).click();
    await expect(page.getByTestId('confirm-patient-merge')).toBeDisabled();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(mergeCalls).toBe(0);
    await page.getByTestId(`merge-keep-${PATIENTS.alice.id}`).click();
    await page.getByTestId('merge-source-alice-duplicate').check();
    await page.getByTestId('confirm-patient-merge').click();
    await expect(page.getByRole('alertdialog').getByRole('alert')).toContainText('Records changed');
    expect(patients).toHaveLength(4);
    fail = false;
    await page.getByTestId('confirm-patient-merge').click();
    await expect(page.getByRole('alertdialog')).toBeHidden();
    await expect(page.getByTestId('merge-keep-alice-duplicate')).toHaveCount(0);
    await expect(page.getByTestId('merge-keep-alice-different-person')).toBeVisible();
    expect(patients).toHaveLength(3);
    expect(mergeCalls).toBe(2);
  });
}
