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

test('custom types persist, accept bookings, and keep existing appointment IDs and durations', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'clinic-custom-types-'));
  const options = {
    dataDir: dir,
    patientsFile: path.join(dir, 'patients.json'),
    appointmentsFile: path.join(dir, 'appointments.json'),
    settingsFile: path.join(dir, 'settings.json'),
    googleTokensFile: path.join(dir, 'google-tokens.json'),
  };
  const store = createDataStore(options);
  try {
    await store.initialize();
    const patient = await store.createPatient({ firstName: 'Test', lastName: 'Patient' });
    const input = {
      patientId: patient.id, title: 'Original title', duration: 30, type: 'procedure',
      startTime: '2026-11-09T09:00:00Z', endTime: '2026-11-09T09:30:00Z',
    };
    const existing = await store.createAppointment(input);
    const before = await fs.readFile(options.appointmentsFile, 'utf8');
    await store.updateSettings({
      appointmentTypes: {
        procedure: { name: 'Treatment', color: '#123456' },
        'custom-implant': { name: 'Implant', color: '#abcdef' },
      },
      appointmentTypeDurations: { 'custom-implant': 90 },
      defaultAppointmentType: 'custom-implant',
    });
    expect(await fs.readFile(options.appointmentsFile, 'utf8')).toBe(before);
    const restarted = createDataStore(options);
    const settings = await restarted.getSettings();
    expect(settings.appointmentTypes.procedure).toEqual({ name: 'Treatment', color: '#123456' });
    expect(settings.appointmentTypes['custom-implant']).toEqual({ name: 'Implant', color: '#abcdef' });
    expect(settings.defaultAppointmentType).toBe('custom-implant');
    expect(settings.appointmentTypeDurations['custom-implant']).toBe(90);
    expect((await restarted.getAppointments())[0]).toEqual(existing);

    const added = await restarted.createAppointment({ ...input, type: 'custom-implant', duration: 90, endTime: '2026-11-09T10:30:00Z' });
    expect(added.type).toBe('custom-implant');
    expect((await restarted.updateAppointment(added.id, { notes: 'Updated' })).type).toBe('custom-implant');
    await restarted.updateSettings({ appointmentTypeDurations: { 'custom-implant': 45 } });
    expect((await restarted.getSettings()).appointmentTypeDurations['custom-implant']).toBe(45);
    await restarted.saveSettings({ ...await restarted.getSettings(), appointmentTypes: {} });
    expect((await restarted.getSettings()).appointmentTypes['custom-implant'].name).toBe('Implant');
    await restarted.saveSettings(DEFAULT_SETTINGS);
    expect((await restarted.getSettings()).appointmentTypeDurations['custom-implant']).toBe(45);
    await expect(restarted.createAppointment({ ...input, type: 'unregistered' })).rejects.toMatchObject({ statusCode: 400 });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('malformed custom types and defaults are rejected without writing settings', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'clinic-invalid-types-'));
  const options = {
    dataDir: dir,
    patientsFile: path.join(dir, 'patients.json'),
    appointmentsFile: path.join(dir, 'appointments.json'),
    settingsFile: path.join(dir, 'settings.json'),
    googleTokensFile: path.join(dir, 'google-tokens.json'),
  };
  const store = createDataStore(options);
  try {
    await store.initialize();
    const before = await fs.readFile(options.settingsFile, 'utf8');
    const invalidMaps = [
      null, [], 'types',
      { procedure: { name: '', color: '#123456' } },
      { procedure: { name: '   ', color: '#123456' } },
      { procedure: { name: 'a'.repeat(101), color: '#123456' } },
      { procedure: { name: 42, color: '#123456' } },
      { procedure: { color: 'red' } },
      { procedure: { color: '#123' } },
      { procedure: null },
      { 'custom-new': { color: '#123456' } },
      { 'bad id': { name: 'New', color: '#123456' } },
      { other: { name: 'New', color: '#123456' } },
      { constructor: { name: 'New', color: '#123456' } },
    ];
    for (const appointmentTypes of invalidMaps) {
      await expect(store.saveSettings({ appointmentTypes })).rejects.toMatchObject({ statusCode: 400 });
      await expect(store.updateSettings({ appointmentTypes })).rejects.toMatchObject({ statusCode: 400 });
    }
    const appointmentTypes = { 'custom-new': { name: 'New', color: '#123456' } };
    for (const invalid of [null, [], { 'custom-new': 15 }, { 'custom-new': '60' }]) {
      await expect(store.saveSettings({ appointmentTypes, appointmentTypeDurations: invalid })).rejects.toMatchObject({ statusCode: 400 });
      await expect(store.updateSettings({ appointmentTypes, appointmentTypeDurations: invalid })).rejects.toMatchObject({ statusCode: 400 });
    }
    expect(await fs.readFile(options.settingsFile, 'utf8')).toBe(before);
    const saved = await store.saveSettings({ appointmentTypes, defaultAppointmentType: 'custom-new', appointmentTypeDurations: { 'custom-new': 60 } });
    expect(saved.appointmentTypeDurations['custom-new']).toBe(60);
    expect(saved.defaultAppointmentType).toBe('custom-new');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
