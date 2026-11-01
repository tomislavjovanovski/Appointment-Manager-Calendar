// tests/e2e/statistics.spec.ts
// Monthly statistics: KPI cards (working days, appointments, patients, hours) with the change vs last month,
// new vs returning patients, the per-activity cards, month navigation and the mobile layout. Data is mocked; the clock is 15 Oct 2026.

import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../fixtures/base';

// Mon–Fri: 22 working days in both September and October 2026.
const SETTINGS = { startTime: '08:00', endTime: '16:00', workingDays: [1, 2, 3, 4, 5], timeSlotMinutes: 30 };

const appointment = (id: string, patientId: string, start: string, end: string, type: string, status = 'scheduled') => ({
  id, patientId, patientName: patientId, title: '', notes: '', type, status, createdAt: start,
  startTime: start, endTime: end,
  duration: (new Date(end).getTime() - new Date(start).getTime()) / 60_000,
});

const APPOINTMENTS = [
  appointment('a1', 'alice', '2026-09-10T09:00:00', '2026-09-10T10:00:00', 'consultation', 'completed'),
  appointment('a2', 'alice', '2026-10-05T09:00:00', '2026-10-05T09:30:00', 'follow-up', 'completed'),
  appointment('a3', 'bob', '2026-10-05T10:00:00', '2026-10-05T11:00:00', 'procedure', 'completed'),
  appointment('a4', 'carol', '2026-10-07T09:00:00', '2026-10-07T10:30:00', 'prosthetics-orthodontics', 'completed'),
  appointment('a5', 'bob', '2026-10-20T09:00:00', '2026-10-20T09:30:00', 'follow-up'),
  appointment('a6', 'dave', '2026-10-21T09:00:00', '2026-10-21T10:00:00', 'consultation', 'cancelled'),
];

const json = (body: unknown) => ({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

async function openStatistics(page: Page, appointments = APPOINTMENTS, settings: Record<string, unknown> = SETTINGS) {
  await page.clock.setFixedTime(new Date('2026-10-15T10:00:00'));
  await page.route('**/api/appointments', (route) => route.fulfill(json(appointments)));
  await page.route('**/api/patients', (route) => route.fulfill(json([])));
  await page.route('**/api/settings', (route) => route.fulfill(json(settings)));
  await page.goto('/app/');
}

const card = (page: Page, id: string) => page.getByTestId(`stat-${id}`);
const typeRow = (page: Page, type: string) => page.getByTestId(`type-row-${type}`);

// Changes are written as "+2" / "−1" / "0"; the card shows the absolute value with an up/down/same arrow.
async function expectChange(locator: Locator, change: string) {
  const trend = change.startsWith('+') ? 'up' : change.startsWith('−') ? 'down' : 'same';
  await expect(locator).toHaveText(change.replace(/^[+−]/, ''));
  await expect(locator).toHaveAttribute('data-trend', trend);
}

async function expectTypeRow(page: Page, type: string, [count, countChange, hours, hoursChange]: string[]) {
  const row = typeRow(page, type);
  await expect(row.getByTestId('type-count'), type).toHaveText(count);
  await expectChange(row.getByTestId('type-count-change'), countChange);
  await expect(row.getByTestId('type-hours'), type).toHaveText(hours);
  await expectChange(row.getByTestId('type-hours-change'), hoursChange);
}

async function expectPatients(page: Page, [newPatients, newPercent]: string[], [returning, returningPercent]: string[]) {
  await expect(page.getByTestId('patients-new').getByTestId('patients-value')).toHaveText(newPatients);
  await expect(page.getByTestId('patients-new').getByTestId('patients-percent')).toHaveText(newPercent);
  await expect(page.getByTestId('patients-returning').getByTestId('patients-value')).toHaveText(returning);
  await expect(page.getByTestId('patients-returning').getByTestId('patients-percent')).toHaveText(returningPercent);
  await expect(page.getByTestId('patients-returning-rate')).toHaveText(returningPercent);
}

test.describe('Monthly statistics', () => {
  test('shows the work done this month by type, compared with last month', async ({ page }) => {
    await openStatistics(page);
    await page.getByTestId('nav-statistics').click();
    await expect(page.getByTestId('statistics-month-label')).toHaveText('октомври 2026');

    await expect(card(page, 'days-worked').getByTestId('stat-value')).toHaveText('3 од 22');
    await expect(card(page, 'appointments').getByTestId('stat-value')).toHaveText('4');
    await expect(card(page, 'patients').getByTestId('stat-value')).toHaveText('3');
    await expectPatients(page, ['2', '66.7%'], ['1', '33.3%']);
    await expect(card(page, 'hours-worked').getByTestId('stat-value')).toHaveText('3 ч 30 мин');
    await expect(page.getByTestId('utilization-percent')).toHaveText('14.6%');
    await expect(page.getByTestId('utilization-hours')).toHaveText('3 ч 30 мин од 24 ч');
    await expectChange(card(page, 'days-worked').getByTestId('stat-change'), '+2');
    await expectChange(card(page, 'appointments').getByTestId('stat-change'), '+3');
    await expectChange(card(page, 'patients').getByTestId('stat-change'), '+2');
    await expectChange(card(page, 'hours-worked').getByTestId('stat-change'), '+2 ч 30 мин');
    await expect(card(page, 'hours-worked').getByTitle('септември: 1 ч')).toBeVisible();
    await expect(page.getByTestId('statistics-compared-with')).toContainText('септември');

    await expectTypeRow(page, 'consultation', ['0', '−1', '0 ч', '−1 ч']);
    await expectTypeRow(page, 'follow-up', ['2', '+2', '1 ч', '+1 ч']);
    await expectTypeRow(page, 'procedure', ['1', '+1', '1 ч', '+1 ч']);
    await expectTypeRow(page, 'prosthetics-orthodontics', ['1', '+1', '1 ч 30 мин', '+1 ч 30 мин']);
    await expectTypeRow(page, 'prevention', ['0', '0', '0 ч', '0 ч']);
    await expect(typeRow(page, 'other')).toHaveCount(0);
  });

  test('navigates between months', async ({ page }) => {
    await openStatistics(page);
    await page.getByTestId('nav-statistics').click();

    await page.getByTestId('statistics-prev-month').click();
    await expect(page.getByTestId('statistics-month-label')).toHaveText('септември 2026');
    await expect(card(page, 'days-worked').getByTestId('stat-value')).toHaveText('1 од 22');
    await expectPatients(page, ['1', '100.0%'], ['0', '0.0%']);
    await expect(page.getByTestId('utilization-percent')).toHaveText('12.5%');
    await expectChange(card(page, 'appointments').getByTestId('stat-change'), '+1');
    await expectTypeRow(page, 'consultation', ['1', '+1', '1 ч', '+1 ч']);

    await page.getByTestId('statistics-prev-month').click();
    await expect(page.getByTestId('statistics-empty')).toBeVisible();
    await expectPatients(page, ['0', '0.0%'], ['0', '0.0%']);
    await expect(page.getByTestId('utilization-percent')).toHaveText('0.0%');

    await page.getByTestId('statistics-this-month').click();
    await expect(page.getByTestId('statistics-month-label')).toHaveText('октомври 2026');
    await expect(page.getByTestId('statistics-this-month')).toHaveCount(0);
  });

  test('uses completed visits for patient categories and avoids double-counting utilization', async ({ page }) => {
    const appointments = [
      appointment('prior-completed', 'returning', '2026-09-10T09:00:00', '2026-09-10T10:00:00', 'consultation', 'completed'),
      appointment('returning-visit', 'returning', '2026-10-05T09:00:00', '2026-10-05T10:00:00', 'consultation', 'completed'),
      appointment('overlap', 'returning', '2026-10-05T09:30:00', '2026-10-05T10:30:00', 'procedure'),
      appointment('new-prior-scheduled', 'new', '2026-09-10T10:00:00', '2026-09-10T11:00:00', 'consultation'),
      appointment('new-visit', 'new', '2026-10-05T10:30:00', '2026-10-05T11:30:00', 'consultation', 'completed'),
      appointment('scheduled-only', 'scheduled-only', '2026-10-05T12:00:00', '2026-10-05T13:00:00', 'consultation'),
      appointment('cancelled-only', 'cancelled-only', '2026-10-06T09:00:00', '2026-10-06T10:00:00', 'consultation', 'cancelled'),
      appointment('no-show-only', 'no-show-only', '2026-10-07T09:00:00', '2026-10-07T10:00:00', 'consultation', 'no-show'),
      appointment('non-working-day', 'weekend-visit', '2026-10-10T09:00:00', '2026-10-10T10:00:00', 'consultation', 'completed'),
    ];
    const settings = {
      ...SETTINGS,
      blockedSlots: [{ id: 'break', startTime: '2026-10-05T09:30:00', endTime: '2026-10-05T10:00:00' }],
    };
    await openStatistics(page, appointments, settings);
    await page.getByTestId('nav-statistics').click();

    await expectPatients(page, ['2', '66.7%'], ['1', '33.3%']);
    await expect(page.getByTestId('utilization-hours')).toHaveText('3 ч од 7 ч 30 мин');
    await expect(page.getByTestId('utilization-percent')).toHaveText('40.0%');
  });

  test('fits the mobile screen and is reachable from the mobile menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await openStatistics(page);
    await page.getByRole('button', { name: 'Open navigation' }).click();
    await page.getByTestId('mobile-sidebar').getByTestId('nav-statistics').click();

    await expect(page.getByTestId('statistics-by-type')).toBeVisible();
    await expect(page.locator('header h1')).toHaveText('Статистика');
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(width).toBeLessThanOrEqual(375);
  });
});
