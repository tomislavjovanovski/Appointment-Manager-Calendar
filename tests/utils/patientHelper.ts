// tests/utils/patientHelper.ts

import { Page, expect } from '@playwright/test';

export interface PatientFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address?: string;
  emergencyContact?: string;
  notes?: string;
}

export const patientHelper = {
  async goToPatients(page: Page): Promise<void> {
    await page.getByTestId('nav-patients').click();
    await expect(page.getByTestId('patients-page')).toBeVisible();
  },

  async openCreateDialog(page: Page): Promise<void> {
    await page.getByTestId('add-patient-btn').click();
    await expect(page.getByTestId('patient-form-dialog')).toBeVisible();
  },

  async fillForm(page: Page, data: PatientFormData): Promise<void> {
    const dialog = page.getByTestId('patient-form-dialog');

    await dialog.getByTestId('patient-first-name').fill(data.firstName);
    await dialog.getByTestId('patient-last-name').fill(data.lastName);
    await dialog.getByTestId('patient-email').fill(data.email);
    await dialog.getByTestId('patient-phone').fill(data.phone);
    await dialog.getByTestId('patient-dob').fill(data.dateOfBirth);

    if (data.address) {
      await dialog.getByTestId('patient-address').fill(data.address);
    }
    if (data.emergencyContact) {
      await dialog.getByTestId('patient-emergency-contact').fill(data.emergencyContact);
    }
    if (data.notes) {
      await dialog.getByTestId('patient-notes').fill(data.notes);
    }
  },

  async submitForm(page: Page): Promise<void> {
    await page.getByTestId('patient-form-submit').click();
    await expect(page.getByTestId('patient-form-dialog')).not.toBeVisible({
      timeout: 8_000,
    });
  },

  async createPatient(page: Page, data: PatientFormData): Promise<void> {
    await this.openCreateDialog(page);
    await this.fillForm(page, data);
    await this.submitForm(page);
    await expect(page.getByTestId('toast-success')).toBeVisible();
  },

  async searchPatient(page: Page, query: string): Promise<void> {
    await page.getByTestId('patient-search-input').fill(query);
    // Debounce — wait for results to update
    await page.getByTestId('patient-search-input').dispatchEvent('input');
  },

  async getVisiblePatientCount(page: Page): Promise<number> {
    return page.getByTestId('patient-row').count();
  },

  async openPatientProfile(page: Page, email: string): Promise<void> {
    await page
      .getByTestId('patient-row')
      .filter({ hasText: email })
      .click();
    await expect(page.getByTestId('patient-profile-panel')).toBeVisible();
  },
};
