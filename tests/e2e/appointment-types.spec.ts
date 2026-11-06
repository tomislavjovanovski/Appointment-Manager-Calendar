import { test, expect } from '../fixtures/base';
import { PATIENTS } from '../test-data/seed';
import type { AppointmentSettings } from '../../src/types/appointment';
import { getAppointmentType, getAppointmentTypes, appointmentTypeLabel, getAppointmentTypeDuration } from '../../src/lib/appointmentTypes';

test('type resolution preserves translations and supports custom names, colors and durations', () => {
  const settings = {
    appointmentTypes: { procedure: { color: '#123456' }, 'custom-test': { name: 'Custom', color: '#654321' } },
    appointmentTypeDurations: { 'custom-test': 90 as const },
  };
  const translate = (key: string) => `translated:${key}`;
  expect(Object.keys(getAppointmentTypes(settings))).toHaveLength(7);
  expect(appointmentTypeLabel(getAppointmentType('procedure', settings), translate)).toBe('translated:appointment.types.procedure');
  expect(getAppointmentType('procedure', settings).color).toBe('#123456');
  expect(appointmentTypeLabel(getAppointmentType('custom-test', settings), translate)).toBe('Custom');
  expect(getAppointmentTypeDuration('custom-test', settings)).toBe(90);
  expect(getAppointmentTypeDuration('custom-without-duration', settings)).toBe(30);
  expect(getAppointmentType('unknown', settings)).toEqual({ name: 'unknown', color: '#64748b' });
});

for (const mobile of [false, true]) {
  test(`editable appointment types persist and appear throughout ${mobile ? 'mobile' : 'desktop'} UI`, async ({ page }) => {
    if (mobile) await page.setViewportSize({ width: 390, height: 844 });
    await page.clock.setFixedTime(new Date('2026-10-26T07:00:00'));
    let settings: Partial<AppointmentSettings> = {
      locale: 'en', startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30,
    };
    const records = [{
      id: 'existing', patientId: PATIENTS.alice.id, patientName: 'Alice Thornton', title: 'Original title', notes: '',
      startTime: new Date('2026-10-26T10:00:00').toISOString(), endTime: new Date('2026-10-26T10:30:00').toISOString(),
      type: 'procedure', duration: 30, status: 'scheduled', createdAt: '2026-10-01',
    }];
    await page.route('**/api/settings', async (route) => {
      if (route.request().method() === 'PUT') settings = route.request().postDataJSON();
      await route.fulfill({ json: settings });
    });
    await page.route('**/api/patients', (route) => route.fulfill({ json: [PATIENTS.alice] }));
    await page.route('**/api/appointments', async (route) => {
      if (route.request().method() === 'POST') {
        const created = { ...route.request().postDataJSON(), id: 'custom-booking', createdAt: '2026-10-26' };
        records.push(created);
        await route.fulfill({ status: 201, json: created });
      } else {
        await route.fulfill({ json: records });
      }
    });
    await page.goto('/');
    const navigate = async (tab: string) => {
      if (mobile) await page.getByRole('button', { name: 'Open navigation' }).click();
      await (mobile ? page.getByTestId('mobile-sidebar') : page).getByTestId(`nav-${tab}`).click();
    };
    await navigate('settings');
    await page.getByRole('tab', { name: 'Appointments & activities' }).click();
    await page.getByTestId('settings-type-name-procedure').fill('Treatment');
    await page.getByTestId('settings-type-color-procedure').fill('#123456');
    await page.getByTestId('settings-add-type').click();
    const customName = page.locator('[data-testid^="settings-type-name-custom-"]');
    await customName.fill('Implants');
    const customId = (await customName.getAttribute('data-testid'))!.replace('settings-type-name-', '');
    expect(customId).toMatch(/^custom-[0-9a-f]{32}$/);
    await page.getByTestId(`settings-type-color-${customId}`).fill('#abcdef');
    await page.getByTestId(`settings-type-duration-${customId}`).click();
    await page.getByTestId('settings-duration-option-90').click();
    await page.getByTestId(`settings-default-type-${customId}`).click();
    await page.getByTestId('save-settings-btn').click();
    await expect(page.getByText('Settings saved', { exact: true })).toBeVisible();
    expect(settings.appointmentTypes?.[customId]).toEqual({ name: 'Implants', color: '#abcdef' });
    expect(settings.appointmentTypeDurations?.[customId]).toBe(90);
    expect(settings.defaultAppointmentType).toBe(customId);
    expect(records[0].type).toBe('procedure');
    expect(records[0].duration).toBe(30);

    await page.reload();
    const existing = page.getByTestId(mobile ? 'mobile-appointment' : 'appointment-block').filter({ hasText: 'Alice' });
    await expect(existing).toContainText('Treatment');
    if (mobile) await expect(existing.locator(':scope > div').first()).toHaveCSS('background-color', 'rgb(18, 52, 86)');
    if (!mobile) {
      await expect(page.getByTestId('calendar-appointment-type-legend')).toContainText('Implants');
    }

    await existing.click();
    await expect(page.getByTestId('appointment-type-select')).toContainText('Treatment');
    await expect(page.getByTestId('appointment-title-input')).toHaveValue('Original title');
    await page.getByTestId('appointment-history-tab').click();
    await expect(page.getByTestId('patient-history-type')).toHaveText('Treatment');
    await page.getByRole('button', { name: 'Close', exact: true }).click();

    await (mobile ? page.getByRole('button', { name: 'New Appointment', exact: true }) : page.getByTestId('new-appointment-btn')).click();
    await expect(page.getByTestId('appointment-type-select')).toContainText('Implants');
    await expect(page.getByTestId('duration-option-90')).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('available-starts').getByRole('button', { name: '08:00, 90 minutes', exact: true }).click();
    await page.getByTestId('patient-first-name').fill('Alice');
    await page.getByTestId(`patient-name-match-${PATIENTS.alice.id}`).click();
    await page.getByTestId('booking-submit-btn').click();
    await expect(page.getByTestId('booking-dialog')).toBeHidden();
    expect(records[1].type).toBe(customId);
    expect(records[1].duration).toBe(90);
    expect(records[1].title).toBe('Implants');

    await navigate('statistics');
    const customRow = page.getByTestId(`type-row-${customId}`);
    await expect(customRow).toContainText('Implants');
    await expect(customRow.getByTestId('type-count')).toHaveText('1');
    await expect(customRow.getByTestId('type-hours')).toHaveText('1 h 30 min');
    await expect(page.getByTestId('type-row-other')).toHaveCount(0);
    await navigate('settings');
    await page.getByRole('tab', { name: 'Appointments & activities' }).click();
    await expect(page.getByTestId(`settings-type-name-${customId}`)).toHaveValue('Implants');
    await expect(page.getByTestId(`settings-type-color-${customId}`)).toHaveValue('#abcdef');
    await expect(page.getByTestId(`settings-default-type-${customId}`)).toBeChecked();
    if (mobile) expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}

test('empty names block saving and failed saves retain the editable draft', async ({ page }) => {
  let saves = 0;
  let failSave = true;
  await page.route('**/api/settings', async (route) => {
    if (route.request().method() === 'PUT') {
      saves += 1;
      await route.fulfill(failSave
        ? { status: 500, json: { error: 'Unable to save settings.' } }
        : { json: route.request().postDataJSON() });
    } else {
      await route.fulfill({ json: { locale: 'en', workingDays: [1, 2, 3, 4, 5], startTime: '08:00', endTime: '18:00' } });
    }
  });
  await page.route('**/api/patients', (route) => route.fulfill({ json: [] }));
  await page.route('**/api/appointments', (route) => route.fulfill({ json: [] }));
  await page.goto('/');
  await page.getByTestId('nav-settings').click();
  await page.getByTestId('settings-tab-appointments').click();
  const name = page.getByTestId('settings-type-name-procedure');
  await name.fill('   ');
  await page.getByTestId('save-settings-btn').click();
  await expect(page.getByText('Enter a name for every appointment type.', { exact: true })).toBeVisible();
  expect(saves).toBe(0);
  await name.fill('Treatment');
  await page.getByTestId('save-settings-btn').click();
  await expect(page.getByTestId('toast-error').last()).toContainText('Failed to save settings. Please try again.');
  await expect(name).toHaveValue('Treatment');
  expect(saves).toBe(1);
  failSave = false;
  await page.getByTestId('save-settings-btn').click();
  await expect(page.getByText('Settings saved', { exact: true })).toBeVisible();
  expect(saves).toBe(2);
});
