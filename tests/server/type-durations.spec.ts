import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { createDataStore, DEFAULT_SETTINGS } from '../../server/dataStore.js';

test('appointment type defaults merge legacy settings, persist, and preserve other defaults', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'clinic-type-durations-'));
  const settingsFile = path.join(dir, 'settings.json');
  const store = createDataStore({
    dataDir: dir,
    patientsFile: path.join(dir, 'patients.json'),
    appointmentsFile: path.join(dir, 'appointments.json'),
    settingsFile,
    googleTokensFile: path.join(dir, 'google-tokens.json'),
  });
  try {
    await fs.writeFile(settingsFile, JSON.stringify({ locale: 'mk', practiceName: 'Clinic' }));
    const initial = await store.getSettings();
    expect(initial.appointmentTypeDurations).toEqual(DEFAULT_SETTINGS.appointmentTypeDurations);
    expect(initial.appointmentTypeDurations['prosthetics-orthodontics']).toBe(60);
    expect(initial.appointmentTypeDurations.procedure).toBe(30);
    expect(initial.defaultAppointmentType).toBe('procedure');

    await store.updateSettings({ defaultAppointmentType: 'prosthetics-orthodontics', appointmentTypeDurations: { procedure: 45 } });
    await store.updateSettings({ appointmentTypeDurations: { 'prosthetics-orthodontics': 90 } });
    const saved = await store.getSettings();
    expect(saved.appointmentTypeDurations.procedure).toBe(45);
    expect(saved.appointmentTypeDurations['prosthetics-orthodontics']).toBe(90);
    expect(saved.appointmentTypeDurations.consultation).toBe(30);
    expect(saved.practiceName).toBe('Clinic');
    expect(saved.locale).toBe('mk');
    expect(saved.defaultAppointmentType).toBe('prosthetics-orthodontics');
    expect(JSON.parse(await fs.readFile(settingsFile, 'utf8')).defaultAppointmentType).toBe('prosthetics-orthodontics');
    expect(JSON.parse(await fs.readFile(settingsFile, 'utf8')).appointmentTypeDurations)
      .toEqual(saved.appointmentTypeDurations);

    await store.saveSettings({ ...saved, appointmentTypeDurations: { ...saved.appointmentTypeDurations, urgent: 120 } });
    expect((await store.getSettings()).appointmentTypeDurations.urgent).toBe(120);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('invalid type defaults are rejected without changing persisted settings', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'clinic-type-durations-'));
  const settingsFile = path.join(dir, 'settings.json');
  const store = createDataStore({
    dataDir: dir,
    patientsFile: path.join(dir, 'patients.json'),
    appointmentsFile: path.join(dir, 'appointments.json'),
    settingsFile,
    googleTokensFile: path.join(dir, 'google-tokens.json'),
  });
  try {
    await store.saveSettings(DEFAULT_SETTINGS);
    const before = await fs.readFile(settingsFile, 'utf8');
    for (const invalid of [null, '', 'unknown', 30]) {
      await expect(store.saveSettings({ defaultAppointmentType: invalid })).rejects.toMatchObject({ statusCode: 400 });
      await expect(store.updateSettings({ defaultAppointmentType: invalid })).rejects.toMatchObject({ statusCode: 400 });
    }
    for (const invalid of [null, [], { procedure: 15 }, { procedure: '60' }, { unknown: 30 }]) {
      await expect(store.saveSettings({ appointmentTypeDurations: invalid })).rejects.toMatchObject({ statusCode: 400 });
      await expect(store.updateSettings({ appointmentTypeDurations: invalid })).rejects.toMatchObject({ statusCode: 400 });
    }
    expect(await fs.readFile(settingsFile, 'utf8')).toBe(before);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
