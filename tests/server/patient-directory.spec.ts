import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { createDataStore } from '../../server/dataStore.js';

test('patient directory returns activity summaries and deleting a patient removes its JSON records', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'clinic-patient-directory-'));
  const store = createDataStore({
    dataDir: dir,
    patientsFile: path.join(dir, 'patients.json'),
    appointmentsFile: path.join(dir, 'appointments.json'),
    settingsFile: path.join(dir, 'settings.json'),
    googleTokensFile: path.join(dir, 'google-tokens.json'),
  });
  try {
    await store.initialize();
    const first = await store.createPatient({ firstName: 'First', lastName: 'Patient' });
    const second = await store.createPatient({ firstName: 'Second', lastName: 'Patient' });
    const empty = await store.createPatient({ firstName: 'No', lastName: 'Appointments' });
    const addAppointment = (patientId: string, startTime: string) => store.createAppointment({
      patientId,
      startTime,
      endTime: new Date(Date.parse(startTime) + 1_800_000).toISOString(),
      title: 'Private treatment title',
      notes: 'Private clinical note',
      duration: 30,
      type: 'consultation',
      status: 'scheduled',
    });
    const older = await addAppointment(first.id, '2026-09-10T09:00:00Z');
    await addAppointment(second.id, '2026-10-10T09:00:00Z');
    await addAppointment(first.id, '2026-08-10T09:00:00Z');

    let directory = await store.getPatientDirectory();
    expect(directory.map((patient) => patient.id)).toEqual([second.id, first.id, empty.id]);
    expect(directory[1]).toMatchObject({ appointmentCount: 2, lastAppointmentAt: older.startTime });
    expect(directory[2]).toMatchObject({ appointmentCount: 0, lastAppointmentAt: null });
    expect(JSON.stringify(directory)).not.toContain('Private clinical note');
    expect(JSON.stringify(directory)).not.toContain('Private treatment title');

    await store.updateAppointment(older.id, {
      startTime: '2026-11-10T09:00:00Z',
      endTime: '2026-11-10T09:30:00Z',
    });
    directory = await store.getPatientDirectory();
    expect(directory[0].id).toBe(first.id);

    await store.deleteAppointment(older.id);
    directory = await store.getPatientDirectory();
    expect(directory[0].id).toBe(second.id);
    expect(directory.find((patient) => patient.id === first.id)).toMatchObject({
      appointmentCount: 1,
      lastAppointmentAt: '2026-08-10T09:00:00Z',
    });

    await store.deletePatient(first.id);
    const savedPatients = JSON.parse(await fs.readFile(path.join(dir, 'patients.json'), 'utf8'));
    const savedAppointments = JSON.parse(await fs.readFile(path.join(dir, 'appointments.json'), 'utf8'));
    expect(savedPatients.some((patient: { id: string }) => patient.id === first.id)).toBe(false);
    expect(savedAppointments.some((appointment: { patientId: string }) => appointment.patientId === first.id)).toBe(false);
    expect(savedAppointments.some((appointment: { patientId: string }) => appointment.patientId === second.id)).toBe(true);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});