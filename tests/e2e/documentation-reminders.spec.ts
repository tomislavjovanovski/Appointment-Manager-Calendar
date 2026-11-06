import { test, expect } from '../fixtures/base';
import type { Page } from '@playwright/test';
import type { Appointment } from '../../src/types/appointment';
import { PATIENTS } from '../test-data/seed';

test.use({ timezoneId: 'Europe/Skopje' });

function appointment(id: string, time: string, overrides: Partial<Appointment> = {}, day = '2026-11-06'): Appointment {
  const start = new Date(`${day}T${time}:00+01:00`);
  return {
    id, patientId: PATIENTS.alice.id, patientName: 'Alice Thornton', title: id,
    startTime: start.toISOString(), endTime: new Date(start.getTime() + 1_800_000).toISOString(),
    duration: 30, type: 'procedure', status: 'completed', notes: '', createdAt: start.toISOString(),
    ...overrides,
  };
}

async function mockAppointments(page: Page, records: Appointment[]) {
  const state = { records, updates: [] as { id: string; updates: Partial<Appointment> }[], reads: 0 };
  await page.route('**/api/settings', (route) => route.fulfill({ json: {
    locale: 'en', startTime: '08:00', endTime: '18:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30,
  } }));
  await page.route('**/api/patients', (route) => route.fulfill({ json: [PATIENTS.alice, PATIENTS.bob] }));
  await page.route('**/api/appointments', (route) => {
    state.reads += 1;
    return route.fulfill({ json: state.records });
  });
  await page.route('**/api/appointments/*', (route) => {
    const id = route.request().url().split('/').pop()!;
    const updates = route.request().postDataJSON() as Partial<Appointment>;
    state.updates.push({ id, updates });
    const index = state.records.findIndex((record) => record.id === id);
    if (index === -1) return route.fulfill({ status: 404, json: { error: 'Not found' } });
    state.records[index] = { ...state.records[index], ...updates };
    return route.fulfill({ json: state.records[index] });
  });
  return state;
}

const at = (time: string, day = '2026-11-06') => new Date(`${day}T${time}:00+01:00`);
const cardById = (page: Page, id: string, mobile = false) =>
  page.getByTestId(mobile ? 'mobile-appointment' : 'appointment-block')
    .and(page.locator(`[data-appointment-id="${id}"]`));

for (const mobile of [false, true]) {
  test.describe(mobile ? 'Mobile documentation reminders' : 'Desktop documentation reminders', () => {
    test.beforeEach(async ({ page }) => {
      if (mobile) await page.setViewportSize({ width: 375, height: 812 });
      await page.clock.setFixedTime(at('10:05'));
    });

    test('only the previous undocumented appointment gets a pencil; current clock remains unchanged', async ({ page }) => {
      const previous = appointment('previous', '09:00', { status: 'scheduled', notes: ' \n ' });
      const current = appointment('current', '10:00', { status: 'scheduled' });
      const state = await mockAppointments(page, [previous, current]);
      await page.goto('/');
      const previousCard = cardById(page, 'previous', mobile);
      const currentCard = cardById(page, 'current', mobile);
      await expect(previousCard.getByTestId('previous-documentation-reminder')).toBeVisible();
      await expect(currentCard).toHaveAttribute('data-current', 'true');
      await expect(currentCard.getByRole('img', { name: 'Appointment in progress' })).toBeVisible();
      await expect(currentCard.getByTestId('previous-documentation-reminder')).toHaveCount(0);
      await expect(page.getByTestId('documentation-summary')).toHaveCount(0);
      await previousCard.click();
      await page.getByTestId('appointment-notes').fill('Treatment documented');
      await page.getByTestId('booking-submit-btn').click();
      await expect(page.getByTestId('booking-dialog')).toBeHidden();
      await expect(previousCard.getByTestId('previous-documentation-reminder')).toHaveCount(0);
      expect(state.records[0].notes).toBe('Treatment documented');
      expect(state.records[0].status).toBe('scheduled');
      expect(state.records[0].startTime).toBe(previous.startTime);
    });

    test('empty-slot reminder appears at scheduled end without touching appointment data', async ({ page }) => {
      await page.clock.install({ time: at('09:29') });
      const state = await mockAppointments(page, [
        appointment('ended', '09:00', { status: 'scheduled' }),
        appointment('later', '11:00', { status: 'scheduled' }),
      ]);
      const before = structuredClone(state.records);
      await page.goto('/');
      const pencil = cardById(page, 'ended', mobile).getByTestId('previous-documentation-reminder');
      await expect(cardById(page, 'ended', mobile)).toBeVisible();
      await expect(pencil).toHaveCount(0);
      await page.clock.fastForward('01:00');
      await expect(pencil).toBeVisible();
      const banner = page.getByTestId('latest-documentation-banner');
      if (mobile) await expect(banner).toBeHidden();
      else await expect(banner).toBeVisible();
      await expect(page.getByTestId('documentation-summary')).toHaveCount(0);
      await expect(cardById(page, 'later', mobile).getByTestId('previous-documentation-reminder')).toHaveCount(0);
      expect(state.updates).toEqual([]);
      expect(state.records).toEqual(before);
    });

    test('end-of-day modal saves all entered notes without filtering the calendar', async ({ page }) => {
      await page.clock.setFixedTime(at('12:00'));
      const state = await mockAppointments(page, [
        appointment('missing-one', '09:00'), appointment('documented', '10:00', { notes: 'Saved note' }),
        appointment('missing-two', '11:00'), appointment('cancelled', '08:00', { status: 'cancelled', notes: 'Cancelled by patient' }),
        appointment('no-show', '08:30', { status: 'no-show', notes: 'Did not attend' }),
      ]);
      await page.goto('/');
      const summary = page.getByTestId('documentation-summary');
      if (mobile) {
        await expect(summary).toBeHidden();
        await expect(page.getByTestId('latest-documentation-banner')).toBeHidden();
        await expect(page.getByTestId('mobile-appointment')).toHaveCount(5);
        await expect(cardById(page, 'missing-one', true).getByTestId('previous-documentation-reminder')).toBeVisible();
        return;
      }
      await expect(summary).toContainText('2 appointments could use a note');
      await expect(summary).toHaveCSS('background-color', 'rgb(254, 215, 170)');
      await expect(summary.getByTestId('documentation-counts')).toHaveCount(0);
      await summary.getByTestId('review-documentation').click();
      const dialog = page.getByTestId('documentation-dialog');
      await expect(dialog).toBeVisible();
      await expect(page.getByTestId('documentation-counts')).toHaveText('Appointments: 5 · Completed: 3 · With notes: 3 · Without notes: 2');
      await expect(page.getByTestId('pending-documentation-appointment')).toHaveCount(2);
      await expect(page.getByTestId('documentation-filter')).toHaveCount(0);
      const cards = page.getByTestId(mobile ? 'mobile-appointment' : 'appointment-block');
      await expect(cards).toHaveCount(5);
      await page.getByTestId('pending-documentation-appointment').filter({ hasText: 'missing-one' })
        .getByTestId('documentation-note').fill('Now documented');
      await page.getByTestId('pending-documentation-appointment').filter({ hasText: 'missing-two' })
        .getByTestId('documentation-note').fill('Final documentation');
      await page.getByTestId('save-documentation-notes').click();
      await expect(page.getByTestId('documentation-counts')).toHaveText('Appointments: 5 · Completed: 3 · With notes: 5 · Without notes: 0');
      expect(state.records[1].notes).toBe('Saved note');
      expect(state.records[0].notes).toBe('Now documented');
      expect(state.records[2].notes).toBe('Final documentation');
      expect(state.updates.map(({ updates }) => Object.keys(updates))).toEqual([['notes'], ['notes']]);
      await expect(summary).toHaveCount(0);
      await expect(dialog).toContainText('All documentation for this day is resolved.');
      await page.getByTestId('close-documentation').click();
      await expect(dialog).toBeHidden();
      await expect(cards).toHaveCount(5);
    });
  });
}

test('existing notes and overlapping current appointments never get a new reminder', async ({ page }) => {
  await page.clock.install({ time: at('10:05') });
  await mockAppointments(page, [
    appointment('documented', '08:00', { notes: 'Existing documentation' }),
    appointment('overlapping', '09:00', { status: 'scheduled', endTime: at('10:15').toISOString() }),
    appointment('current', '10:00', { status: 'scheduled' }),
  ]);
  await page.goto('/');
  const cards = page.getByTestId('appointment-block');
  await expect(cards).toHaveCount(3);
  await expect(cards.getByTestId('previous-documentation-reminder')).toHaveCount(0);
  await page.clock.fastForward('10:00');
  await expect(cardById(page, 'overlapping').getByTestId('previous-documentation-reminder')).toBeVisible();
});

test('summary is gated until the last appointment ends and appears on a later opening', async ({ page }) => {
  await page.clock.install({ time: at('10:29') });
  await mockAppointments(page, [appointment('previous', '09:00'), appointment('last', '10:00')]);
  await page.goto('/');
  await expect(page.getByTestId('appointment-block')).toHaveCount(2);
  await expect(page.getByTestId('documentation-summary')).toHaveCount(0);
  await page.clock.fastForward('01:00');
  await expect(page.getByTestId('documentation-summary')).toHaveCount(1);
  await expect(page.getByTestId('latest-documentation-banner')).toHaveCount(0);
  await expect(cardById(page, 'last').getByTestId('previous-documentation-reminder')).toBeVisible();
  await page.reload();
  await expect(page.getByTestId('documentation-summary')).toContainText('2 appointments could use a note');
});

test('dismissal is non-blocking, survives refetches within the session, and never changes appointments', async ({ page }) => {
  await page.clock.setFixedTime(at('12:00'));
  const records = [appointment('previous', '09:00'), appointment('last', '10:00')];
  const before = structuredClone(records);
  const state = await mockAppointments(page, records);
  await page.goto('/');
  const summary = page.getByTestId('documentation-summary');
  await summary.getByTestId('dismiss-documentation').click();
  await expect(summary).toHaveAttribute('data-dismissed', 'true');
  await expect(summary).not.toHaveCSS('background-color', 'rgb(254, 215, 170)');
  const reads = state.reads;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect.poll(() => state.reads).toBeGreaterThan(reads);
  await expect(summary).toHaveAttribute('data-dismissed', 'true');
  await expect(summary.getByTestId('review-documentation')).toBeVisible();
  expect(state.updates).toEqual([]);
  expect(state.records).toEqual(before);
  await summary.getByTestId('review-documentation').click();
  await expect(page.getByTestId('pending-documentation-appointment')).toHaveCount(2);
});

test('persistent review acknowledgement keeps missing notes accessible and leaves unsaved notes untouched', async ({ page }) => {
  await page.clock.setFixedTime(at('12:00'));
  const records = [appointment('previous', '09:00'), appointment('last', '10:00')];
  const original = structuredClone(records[0]);
  const state = await mockAppointments(page, records);
  await page.goto('/');
  const previous = cardById(page, 'previous');
  await previous.click();
  await page.getByTestId('appointment-notes').fill('Unsaved draft');
  await page.getByTestId('review-appointment-reminder').click();
  await expect(page.getByTestId('review-appointment-reminder')).toHaveCount(0);
  await expect(page.getByTestId('appointment-notes')).toHaveValue('Unsaved draft');
  expect(state.updates).toHaveLength(1);
  expect(Object.keys(state.updates[0].updates)).toEqual(['documentationReviewedAt']);
  expect(state.records[0]).toEqual({ ...original, documentationReviewedAt: state.updates[0].updates.documentationReviewedAt });
  await page.getByTestId('cancel-booking-btn').click();
  await expect(previous.getByTestId('previous-documentation-reminder')).toHaveCount(0);
  await page.getByTestId('review-documentation').click();
  await page.getByTestId('acknowledge-documentation').click();
  await expect(page.getByTestId('documentation-summary')).toHaveAttribute('data-dismissed', 'true');
  await page.reload();
  await expect(page.getByTestId('documentation-summary')).toHaveAttribute('data-dismissed', 'true');
  await page.getByTestId('review-documentation').click();
  await expect(page.getByTestId('appointment-block')).toHaveCount(2);
  expect(state.records.map((record) => record.notes)).toEqual(['', '']);
  expect(state.records.map((record) => record.status)).toEqual(['completed', 'completed']);
});

test('returning refetches persisted notes and statuses and recalculates documentation', async ({ page }) => {
  await page.clock.setFixedTime(at('10:05'));
  const state = await mockAppointments(page, [
    appointment('previous', '09:00'), appointment('last', '10:00', { status: 'scheduled' }),
  ]);
  await page.goto('/');
  await expect(page.getByTestId('appointment-block')).toHaveCount(2);
  state.records[1] = { ...state.records[1], status: 'completed' };
  await page.clock.setFixedTime(at('12:00'));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await page.getByTestId('review-documentation').click();
  await expect(page.getByTestId('documentation-counts')).toContainText('Completed: 2');
  state.records[0] = { ...state.records[0], notes: 'Saved elsewhere' };
  state.records[1] = { ...state.records[1], status: 'no-show' };
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByTestId('documentation-counts')).toHaveText('Appointments: 2 · Completed: 1 · With notes: 1 · Without notes: 1');
  await expect(page.getByTestId('pending-documentation-appointment')).toHaveCount(1);
  state.records[1] = { ...state.records[1], notes: 'Did not attend' };
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByTestId('documentation-summary')).toHaveCount(0);
  await expect(page.getByTestId('previous-documentation-reminder')).toHaveCount(0);
  expect(state.updates).toEqual([]);
});

test('overnight summary belongs to the local start day, waits until its end and can review a past day', async ({ page }) => {
  await page.clock.install({ time: at('00:15', '2026-11-07') });
  const overnight = appointment('overnight', '23:30', { duration: 60, endTime: at('00:30', '2026-11-07').toISOString() });
  await mockAppointments(page, [overnight, appointment('future', '09:00', {}, '2026-11-09')]);
  await page.goto('/');
  await expect(page.getByTestId('scheduler-grid')).toBeVisible();
  await expect(page.getByTestId('documentation-summary')).toHaveCount(0);
  await page.clock.fastForward('15:00');
  const summary = page.getByTestId('documentation-summary');
  await expect(summary).toHaveAttribute('data-day', '2026-11-06');
  await summary.getByTestId('review-documentation').click();
  await expect(page.getByTestId('documentation-counts')).toContainText('Completed: 1');
  const row = page.getByTestId('pending-documentation-appointment');
  await expect(row).toContainText('23:30 – 00:30');
  await row.getByTestId('documentation-note').fill('Overnight treatment documented');
  await page.getByTestId('save-documentation-notes').click();
  await expect(summary).toHaveCount(0);
});

test('documentation-only edits preserve an unchanged overlapping schedule and saved timestamps', async ({ page }) => {
  await page.clock.setFixedTime(at('12:00'));
  const overlapping = appointment('overlapping', '09:00', {
    startTime: '2026-11-06T08:00:15Z', endTime: '2026-11-06T08:30:15Z',
  });
  const state = await mockAppointments(page, [overlapping, appointment('other', '09:15')]);
  await page.goto('/');
  await page.getByTestId('review-documentation').click();
  await page.getByTestId('pending-documentation-appointment').filter({ hasText: 'overlapping' })
    .getByTestId('documentation-note').fill('Overlap documented');
  await page.getByTestId('save-documentation-notes').click();
  await expect(page.getByTestId('pending-documentation-appointment')).toHaveCount(1);
  expect(state.records[0].notes).toBe('Overlap documented');
  expect(state.records[0].startTime).toBe(overlapping.startTime);
  expect(state.records[0].endTime).toBe(overlapping.endTime);
  expect(state.records[0].status).toBe('completed');
});

test('review persistence failures are visible and do not dismiss pending documentation', async ({ page }) => {
  await page.clock.setFixedTime(at('12:00'));
  const state = await mockAppointments(page, [appointment('previous', '09:00')]);
  await page.route('**/api/appointments/previous', (route) =>
    route.fulfill({ status: 500, json: { error: 'Review could not be saved' } }));
  await page.goto('/');
  await page.getByTestId('review-documentation').click();
  await page.getByTestId('acknowledge-documentation').click();
  await expect(page.getByRole('alert').filter({ hasText: 'Review could not be saved' })).toBeVisible();
  await expect(page.getByTestId('documentation-summary')).toHaveAttribute('data-dismissed', 'false');
  expect(state.records[0].documentationReviewedAt).toBeUndefined();
  expect(state.records[0].notes).toBe('');
});

test('desktop gently guides users through previous missing notes, even when newer notes exist', async ({ page }) => {
  await page.clock.setFixedTime(at('11:05'));
  const state = await mockAppointments(page, [
    appointment('older', '08:00'),
    appointment('latest', '09:00'),
    appointment('next', '11:00', { status: 'scheduled' }),
  ]);
  await page.goto('/');
  const banner = page.getByTestId('calendar-date-controls').getByTestId('latest-documentation-banner');
  await expect(banner).toHaveCount(1);
  await expect(banner).toHaveCSS('background-color', 'rgb(255, 237, 213)');
  await expect(banner).toContainText('The scheduled time with Alice Thornton has ended. You can add a note.');
  await expect(cardById(page, 'latest').getByTestId('previous-documentation-reminder')).toBeVisible();
  await expect(page.getByTestId('documentation-summary')).toHaveCount(0);
  await banner.getByTestId('edit-latest-documentation').click();
  await expect(page.getByTestId('appointment-title-input')).toHaveValue('latest');
  await page.getByTestId('appointment-notes').fill('Documented');
  await page.getByTestId('booking-submit-btn').click();
  await expect(page.getByTestId('booking-dialog')).toBeHidden();
  await expect(cardById(page, 'latest').getByTestId('previous-documentation-reminder')).toHaveCount(0);
  await expect(banner).toHaveCount(1);
  await banner.getByTestId('edit-latest-documentation').click();
  await expect(page.getByTestId('appointment-title-input')).toHaveValue('older');
  await page.getByTestId('cancel-booking-btn').click();
  expect(state.records[0].notes).toBe('');
  expect(state.records[1].status).toBe('completed');
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByTestId('latest-documentation-banner')).toBeHidden();
  await expect(page.getByTestId('documentation-summary')).toBeHidden();
});

test('latest-ended dismissal survives navigation without changing clinical data or showing a mobile banner', async ({ page }) => {
  await page.clock.setFixedTime(at('11:05'));
  const records = [appointment('latest', '09:00'), appointment('next', '11:00')];
  const state = await mockAppointments(page, records);
  await page.goto('/');
  await page.getByTestId('latest-documentation-banner').getByTestId('dismiss-documentation').click();
  await expect(page.getByTestId('latest-documentation-banner')).toHaveCount(0);
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByTestId('latest-documentation-banner')).toHaveCount(0);
  expect(state.updates).toEqual([]);
  expect(state.records[0].notes).toBe('');
  expect(state.records[0].status).toBe('completed');
  await page.reload();
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByTestId('latest-documentation-banner')).toBeHidden();
});

test('one compact end-of-day banner offers older pending days without stacking notifications', async ({ page }) => {
  await page.clock.setFixedTime(at('12:00'));
  await mockAppointments(page, [
    appointment('today', '09:00'), appointment('yesterday', '09:00', {}, '2026-11-05'),
  ]);
  await page.goto('/');
  const banner = page.getByTestId('documentation-summary');
  await expect(banner).toHaveCount(1);
  await expect(banner).toHaveAttribute('data-day', '2026-11-06');
  await page.getByRole('combobox', { name: 'Choose a documentation day' }).selectOption('2026-11-05');
  await banner.getByTestId('review-documentation').click();
  await expect(page.getByRole('dialog')).toContainText('5 Nov 2026');
  await expect(page.getByTestId('pending-documentation-appointment')).toContainText('yesterday');
});

test('scheduled-end reminders appear during empty slots without periodic appointment requests', async ({ page }) => {
  await page.clock.install({ time: at('09:15') });
  const state = await mockAppointments(page, [
    appointment('latest', '09:00'), appointment('next', '11:00', { status: 'scheduled' }),
  ]);
  await page.goto('/');
  await expect(page.getByTestId('appointment-block')).toHaveCount(2);
  await expect(page.getByTestId('latest-documentation-banner')).toHaveCount(0);
  const reads = state.reads;
  await page.clock.fastForward('15:00');
  await expect(page.getByTestId('latest-documentation-banner')).toBeVisible();
  await expect(cardById(page, 'latest').getByTestId('previous-documentation-reminder')).toBeVisible();
  expect(state.reads).toBe(reads);
  await page.clock.fastForward('01:30:00');
  await expect(page.getByTestId('latest-documentation-banner')).toBeVisible();
  await expect(cardById(page, 'latest').getByTestId('previous-documentation-reminder')).toBeVisible();
  expect(state.reads).toBe(reads);
});

for (const status of ['scheduled', 'completed', 'cancelled', 'no-show'] as const) {
  test(`ended ${status} appointment receives a banner and pencil and note saving preserves status`, async ({ page }) => {
    await page.clock.setFixedTime(at('10:05'));
    const target = appointment('target', '09:00', { status, type: 'prosthetics-orthodontics' });
    const state = await mockAppointments(page, [
      target, appointment('current', '10:00', { status: 'scheduled' }),
    ]);
    await page.goto('/');
    const card = cardById(page, 'target');
    await expect(card.getByTestId('previous-documentation-reminder')).toBeVisible();
    const banner = page.getByTestId('latest-documentation-banner');
    await expect(banner).toBeVisible();
    await banner.getByTestId('edit-latest-documentation').click();
    await expect(page.getByTestId('appointment-title-input')).toHaveValue('target');
    await page.getByTestId('appointment-notes').fill('Recorded appointment outcome');
    await page.getByTestId('booking-submit-btn').click();
    await expect(page.getByTestId('booking-dialog')).toBeHidden();
    await expect(card.getByTestId('previous-documentation-reminder')).toHaveCount(0);
    await expect(banner).toHaveCount(0);
    expect(state.records[0].status).toBe(status);
    expect(state.records[0].type).toBe(target.type);
    expect(state.records[0].notes).toBe('Recorded appointment outcome');
    await page.clock.setFixedTime(at('12:00'));
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByTestId('review-documentation').click();
    await expect(page.getByTestId('documentation-counts')).toHaveText(
      `Appointments: 2 · Completed: ${status === 'completed' ? 1 : 0} · With notes: 1 · Without notes: 1`);
  });
}

test('all ended statuses without notes are listed together in end-of-day review on desktop', async ({ page }) => {
  await page.clock.setFixedTime(at('12:00'));
  const state = await mockAppointments(page, [
    appointment('scheduled', '08:00', { status: 'scheduled' }),
    appointment('completed', '09:00'),
    appointment('cancelled', '10:00', { status: 'cancelled' }),
    appointment('no-show', '11:00', { status: 'no-show', type: 'prosthetics-orthodontics' }),
  ]);
  const before = structuredClone(state.records);
  await page.goto('/');
  await expect(page.getByTestId('documentation-summary')).toContainText('4 appointments could use a note');
  await expect(cardById(page, 'cancelled').getByTestId('previous-documentation-reminder')).toBeVisible();
  await page.getByTestId('review-documentation').click();
  await expect(page.getByTestId('documentation-counts')).toHaveText('Appointments: 4 · Completed: 1 · With notes: 0 · Without notes: 4');
  await expect(page.getByTestId('pending-documentation-appointment')).toHaveCount(4);
  await expect(page.getByTestId('appointment-block')).toHaveCount(4);
  await page.getByTestId('acknowledge-documentation').click();
  expect(state.records.map((record) => ({ ...record, documentationReviewedAt: undefined })))
    .toEqual(before.map((record) => ({ ...record, documentationReviewedAt: undefined })));
  await expect(page.getByTestId('documentation-counts')).toContainText('Without notes: 4');
  const rows = page.getByTestId('pending-documentation-appointment');
  for (let index = 0; index < 4; index++) {
    await rows.nth(index).getByTestId('documentation-note').fill(`Outcome ${index}`);
  }
  await page.getByTestId('save-documentation-notes').click();
  await expect(rows).toHaveCount(0);
  expect(state.records.map((record) => record.status)).toEqual(before.map((record) => record.status));
  expect(state.records.map((record) => record.notes)).toEqual(['Outcome 0', 'Outcome 1', 'Outcome 2', 'Outcome 3']);
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByTestId('documentation-summary')).toBeHidden();
});

test('bulk notes leave blank fields untouched and cancel never writes drafts', async ({ page }) => {
  await page.clock.setFixedTime(at('12:00'));
  const state = await mockAppointments(page, [
    appointment('first', '09:00'), appointment('blank', '10:00', { notes: ' \n ' }),
  ]);
  await page.goto('/');
  await page.getByTestId('review-documentation').click();
  const rows = page.getByTestId('pending-documentation-appointment');
  await expect(page.getByTestId('save-documentation-notes')).toBeDisabled();
  await rows.nth(0).getByTestId('documentation-note').fill('Discarded draft');
  await page.getByTestId('close-documentation').click();
  expect(state.updates).toEqual([]);
  await page.getByTestId('review-documentation').click();
  await expect(rows.nth(0).getByTestId('documentation-note')).toHaveValue('');
  await rows.nth(0).getByTestId('documentation-note').fill('Saved outcome');
  await rows.nth(1).getByTestId('documentation-note').fill(' \n\t ');
  await page.getByTestId('save-documentation-notes').click();
  await expect(rows).toHaveCount(1);
  await expect(page.getByTestId('save-documentation-notes')).toBeDisabled();
  expect(state.updates).toEqual([{ id: 'first', updates: { notes: 'Saved outcome' } }]);
  expect(state.records[1].notes).toBe(' \n ');
});

test('partial bulk save failure retains remaining drafts and retry does not resave successful notes', async ({ page }) => {
  await page.clock.setFixedTime(at('12:00'));
  const state = await mockAppointments(page, [
    appointment('first', '09:00'), appointment('second', '10:00'), appointment('third', '11:00'),
  ]);
  let attempts = 0;
  await page.route('**/api/appointments/second', (route) => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 500, json: { error: 'Note write failed' } })
      : route.fallback();
  });
  await page.goto('/');
  await page.getByTestId('review-documentation').click();
  const rows = page.getByTestId('pending-documentation-appointment');
  for (let index = 0; index < 3; index++) {
    await rows.nth(index).getByTestId('documentation-note').fill(`Saved note ${index}`);
  }
  await page.getByTestId('save-documentation-notes').click();
  await expect(page.getByRole('alert').filter({ hasText: 'Note write failed' })).toBeVisible();
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0).getByTestId('documentation-note')).toHaveValue('Saved note 1');
  await expect(rows.nth(1).getByTestId('documentation-note')).toHaveValue('Saved note 2');
  await page.getByTestId('save-documentation-notes').click();
  await expect(rows).toHaveCount(0);
  await expect(page.getByTestId('documentation-dialog').getByRole('alert')).toHaveCount(0);
  expect(state.updates.map(({ id }) => id)).toEqual(['first', 'second', 'third']);
  expect(state.records.map(({ notes }) => notes)).toEqual(['Saved note 0', 'Saved note 1', 'Saved note 2']);
});

test('notes modal remains usable at mobile size with a long list and acknowledgement keeps drafts', async ({ page }) => {
  await page.clock.setFixedTime(at('19:00'));
  const state = await mockAppointments(page, Array.from({ length: 15 }, (_, index) =>
    appointment(`record-${index}`, `${String(8 + Math.floor(index / 2)).padStart(2, '0')}:${index % 2 ? '30' : '00'}`)));
  await page.goto('/');
  await page.getByTestId('review-documentation').click();
  await page.setViewportSize({ width: 375, height: 667 });
  const dialog = page.getByTestId('documentation-dialog');
  const fields = dialog.getByTestId('documentation-note');
  await fields.first().fill('Keep this draft');
  await dialog.getByTestId('acknowledge-documentation').click();
  await expect(dialog.getByTestId('acknowledge-documentation')).toHaveCount(0, { timeout: 15_000 });
  await expect(fields.first()).toHaveValue('Keep this draft');
  expect(state.records.every(({ notes }) => notes === '')).toBe(true);
  await fields.last().fill('Final row note');
  const bounds = await dialog.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(375);
  expect(bounds!.height).toBeLessThanOrEqual(667);
  await expect(dialog.getByTestId('save-documentation-notes')).toBeInViewport();
  await dialog.getByTestId('save-documentation-notes').click();
  await expect(fields).toHaveCount(13);
  expect(state.records[0].notes).toBe('Keep this draft');
  expect(state.records[14].notes).toBe('Final row note');
});

test('documentation rows use a 40:60 side-by-side split with two-line notes fields', async ({ page }) => {
  await page.clock.setFixedTime(at('12:00'));
  await mockAppointments(page, [appointment('target', '09:00', { type: 'prosthetics-orthodontics' })]);
  await page.goto('/');
  await page.getByTestId('review-documentation').click();
  const row = page.getByTestId('pending-documentation-appointment');
  await expect(row).toContainText('Prosthetics & orthodontics');
  await expect(row.getByTestId('documentation-note')).toHaveAttribute('rows', '2');
  for (const viewport of [{ width: 1280, height: 800 }, { width: 375, height: 667 }]) {
    await page.setViewportSize(viewport);
    const details = await row.getByTestId('documentation-appointment-details').boundingBox();
    const notes = await row.getByTestId('documentation-note-column').boundingBox();
    expect(details!.x + details!.width).toBeLessThan(notes!.x);
    expect(details!.width / (details!.width + notes!.width)).toBeCloseTo(0.4, 2);
    expect(notes!.y).toBeLessThan(details!.y + details!.height);
    expect(details!.y).toBeLessThan(notes!.y + notes!.height);
    const field = row.getByTestId('documentation-note');
    expect(await field.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
});
