// tests/utils/storageHelper.ts
// All LocalStorage operations go through this helper.
// Tests should NEVER call page.evaluate(localStorage...) inline.

import { Page } from '@playwright/test';

const KEYS = {
  appointments: 'medical-appointments',
  patients: 'medical-patients',
  settings: 'medical-settings',
} as const;

export type StorageKey = keyof typeof KEYS;

export const storageHelper = {
  // ── Read ──────────────────────────────────────────────────────────────────

  async getAll(page: Page, key: StorageKey): Promise<unknown[]> {
    return page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k) ?? '[]'),
      KEYS[key],
    );
  },

  async findById(page: Page, key: StorageKey, id: string): Promise<unknown> {
    const items = await this.getAll(page, key) as { id: string }[];
    return items.find((item) => item.id === id) ?? null;
  },

  async count(page: Page, key: StorageKey): Promise<number> {
    const items = await this.getAll(page, key);
    return items.length;
  },

  // ── Write ─────────────────────────────────────────────────────────────────

  async seed(page: Page, key: StorageKey, data: unknown[]): Promise<void> {
    await page.evaluate(
      ([k, d]) => localStorage.setItem(k, JSON.stringify(d)),
      [KEYS[key], data] as [string, unknown[]],
    );
  },

  async clear(page: Page, key: StorageKey): Promise<void> {
    await page.evaluate((k) => localStorage.removeItem(k), KEYS[key]);
  },

  async clearAll(page: Page): Promise<void> {
    await page.evaluate(() => localStorage.clear());
  },

  // ── Corruption simulation ─────────────────────────────────────────────────

  async corrupt(page: Page, key: StorageKey): Promise<void> {
    await page.evaluate(
      (k) => localStorage.setItem(k, '{ this is: [invalid json'),
      KEYS[key],
    );
  },

  async simulateQuotaExceeded(page: Page): Promise<void> {
    // Override setItem to throw QuotaExceededError
    await page.evaluate(() => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = () => {
        const error = new DOMException('QuotaExceededError');
        throw error;
      };
      // Restore after 5 seconds so page can recover
      setTimeout(() => { Storage.prototype.setItem = original; }, 5_000);
    });
  },

  // ── Assertions ────────────────────────────────────────────────────────────

  async assertAppointmentExistsInStorage(
    page: Page,
    matcher: Partial<{ patientId: string; startTime: string; type: string }>,
  ): Promise<void> {
    const appointments = await this.getAll(page, 'appointments') as Record<string, unknown>[];
    const found = appointments.some((appt) =>
      Object.entries(matcher).every(([k, v]) => appt[k] === v),
    );
    if (!found) {
      throw new Error(
        `No appointment matching ${JSON.stringify(matcher)} found in LocalStorage.\n` +
        `Storage contains: ${JSON.stringify(appointments, null, 2)}`,
      );
    }
  },

  async assertPatientExistsInStorage(
    page: Page,
    email: string,
  ): Promise<void> {
    const patients = await this.getAll(page, 'patients') as { email: string }[];
    const found = patients.some((p) => p.email === email);
    if (!found) {
      throw new Error(
        `Patient with email "${email}" not found in LocalStorage.\n` +
        `Patients: ${JSON.stringify(patients.map((p) => p.email))}`,
      );
    }
  },
};
