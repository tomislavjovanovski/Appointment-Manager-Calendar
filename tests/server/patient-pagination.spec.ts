import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { createDataStore } from '../../server/dataStore.js';
import { createApp } from '../../server/app.js';
import { makeAuth, login, TEST_EMAIL, TEST_PASSWORD } from './authHelpers';
import type { AddressInfo } from 'net';

test('patient pages search all records, sort before slicing, keep global counts and clamp empty pages', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'clinic-patient-pages-'));
  const options = {
    dataDir: dir, patientsFile: path.join(dir, 'patients.json'), appointmentsFile: path.join(dir, 'appointments.json'),
    settingsFile: path.join(dir, 'settings.json'), googleTokensFile: path.join(dir, 'tokens.json'),
  };
  const store = createDataStore(options);
  try {
    await store.initialize();
    const patients = Array.from({ length: 205 }, (_, index) => ({
      id: `patient-${index}`, firstName: index === 204 ? 'Елена' : 'Patient', lastName: String(index),
      email: index === 204 ? 'unique@example.test' : '', phone: index === 204 ? '070123456' : '',
      embg: index === 204 ? '1234567890123' : '', createdAt: new Date().toISOString(),
    }));
    const appointments = Array.from({ length: 150 }, (_, index) => ({
      id: `appointment-${index}`, patientId: `patient-${index}`,
      startTime: new Date(Date.UTC(2026, 0, 1 + index)).toISOString(),
      notes: 'Private appointment notes', title: 'Private treatment',
    }));
    await fs.writeFile(options.patientsFile, JSON.stringify(patients));
    await fs.writeFile(options.appointmentsFile, JSON.stringify(appointments));
    const first = await store.getPatientPage();
    expect(first.patients).toHaveLength(100);
    expect(first).toMatchObject({ page: 1, pageSize: 100, total: 205, totalPages: 3, patientsWithVisits: 150, totalAppointments: 150 });
    expect(first.patients[0].id).toBe('patient-149');
    expect(first.patients[99].id).toBe('patient-50');
    const second = await store.getPatientPage({ page: 2 });
    const third = await store.getPatientPage({ page: 3 });
    expect(second.patients).toHaveLength(100);
    expect(third.patients).toHaveLength(5);
    expect(new Set([...first.patients, ...second.patients, ...third.patients].map((patient) => patient.id)).size).toBe(205);
    expect(second.patients[0].id).toBe('patient-49');
    expect(second.patients[50].lastAppointmentAt).toBeNull();
    expect(JSON.stringify(first)).not.toContain('Private appointment');
    expect(await store.getPatientSummary()).toEqual({ total: 205, newThisMonth: 205 });
    for (const search of [' ЕЛЕНА ', 'unique@EXAMPLE', '070123456', '1234567890123', 'Елена 204']) {
      const result = await store.getPatientPage({ page: 3, search });
      expect(result.patients.map((patient) => patient.id)).toEqual(['patient-204']);
      expect(result).toMatchObject({ page: 1, total: 1, totalPages: 1, patientsWithVisits: 0, totalAppointments: 0 });
    }
    expect(await store.getPatientPage({ search: 'not-found' })).toMatchObject({ patients: [], page: 1, total: 0, totalPages: 1 });
    expect((await store.getPatientPage({ page: 999 })).page).toBe(3);
    const unpaged = await store.getPatientDirectory();
    expect(unpaged).toHaveLength(205);
    await fs.writeFile(options.patientsFile, JSON.stringify(patients.slice(0, 200)));
    expect(await store.getPatientPage({ page: 3 })).toMatchObject({ page: 2, total: 200, totalPages: 2 });
    for (const page of [0, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(store.getPatientPage({ page })).rejects.toMatchObject({ statusCode: 400 });
    }
    await expect(store.getPatientPage({ search: 'x'.repeat(201) })).rejects.toMatchObject({ statusCode: 400 });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('directory and summary API are authenticated, validate queries and retain the legacy endpoint', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'clinic-patient-page-api-'));
  const store = createDataStore({
    dataDir: dir, patientsFile: path.join(dir, 'patients.json'), appointmentsFile: path.join(dir, 'appointments.json'),
    settingsFile: path.join(dir, 'settings.json'), googleTokensFile: path.join(dir, 'tokens.json'),
  });
  const authHarness = await makeAuth();
  await authHarness.store.createUser({ email: TEST_EMAIL, password: TEST_PASSWORD });
  await store.initialize();
  await store.createPatient({ firstName: 'Patient', lastName: 'Test' });
  const app = createApp({ dataStore: store, dataDir: dir, auth: authHarness.auth });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    expect((await fetch(`${url}/api/patients/directory?page=1`)).status).toBe(401);
    expect((await fetch(`${url}/api/patients/summary`)).status).toBe(401);
    const { response, cookie } = await login(url);
    expect(response.ok).toBe(true);
    const headers = { Cookie: cookie };
    const page = await fetch(`${url}/api/patients/directory?page=1&search=Test`, { headers });
    expect(page.ok).toBe(true);
    expect(await page.json()).toMatchObject({ total: 1, pageSize: 100, totalPages: 1 });
    expect(await (await fetch(`${url}/api/patients/summary`, { headers })).json()).toMatchObject({ total: 1 });
    expect(Array.isArray(await (await fetch(`${url}/api/patients`, { headers })).json())).toBe(true);
    for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=1&page=2', 'page=99999999999999999999', 'search=a&search=b', `search=${'x'.repeat(201)}`]) {
      expect((await fetch(`${url}/api/patients/directory?${query}`, { headers })).status).toBe(400);
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await fs.rm(dir, { recursive: true, force: true });
    await fs.rm(authHarness.dir, { recursive: true, force: true });
  }
});
