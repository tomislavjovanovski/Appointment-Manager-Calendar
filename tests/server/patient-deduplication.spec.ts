import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import { createDataStore } from '../../server/dataStore.js';
import { createApp } from '../../server/app.js';
import { findExactPatients, groupDuplicatePatients } from '../../server/patientMatching.js';
import { login, makeAuth, TEST_EMAIL, TEST_PASSWORD } from './authHelpers';

async function harness() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'clinic-patient-dedup-'));
  const options = {
    dataDir: dir,
    patientsFile: path.join(dir, 'patients.json'),
    appointmentsFile: path.join(dir, 'appointments.json'),
    settingsFile: path.join(dir, 'settings.json'),
    googleTokensFile: path.join(dir, 'google-tokens.json'),
  };
  const store = createDataStore(options);
  await store.initialize();
  return { dir, options, store };
}

test('name matching normalizes Unicode, case and whitespace without conflating different surnames', () => {
  const patients = [
    { firstName: '  Ана  Марија ', lastName: 'Петрова' },
    { firstName: 'Ана Марија', lastName: 'Димова' },
    { firstName: 'ана марија', lastName: 'петрова' },
    { firstName: 'Jose\u0301', lastName: '' },
  ];
  expect(findExactPatients(patients, { firstName: 'АНА   МАРИЈА', lastName: ' ПЕТРОВА ' })).toHaveLength(2);
  expect(findExactPatients(patients, { firstName: 'Ана Марија' })).toHaveLength(3);
  expect(findExactPatients(patients, { firstName: 'Ана' })).toHaveLength(0);
  expect(findExactPatients(patients, { firstName: 'José' })).toHaveLength(1);
  expect(findExactPatients(patients, { firstName: '' })).toHaveLength(0);
  expect(groupDuplicatePatients(patients)).toEqual([[patients[0], patients[2]]]);
});

test('booking resolution reuses exact names and unique first names, rejects ambiguity, and handles concurrent saves', async () => {
  const { dir, store } = await harness();
  try {
    const first = await store.createPatient({ firstName: 'Ana', lastName: 'Petrova', phone: '111' });
    expect(await store.resolvePatient({ firstName: ' ANA ', lastName: 'petrova', phone: '222' }))
      .toEqual({ patient: first, reused: true });
    expect((await store.resolvePatient({ firstName: 'ana' })).patient.id).toBe(first.id);
    await store.createPatient({ firstName: 'Ana', lastName: 'Dimova' });
    await expect(store.resolvePatient({ firstName: 'Ana' })).rejects.toMatchObject({ statusCode: 409 });
    expect((await store.resolvePatient({ firstName: 'Ana', lastName: 'Petrova' })).patient.id).toBe(first.id);
    await store.createPatient({ firstName: 'Ana', lastName: 'Petrova' });
    await expect(store.resolvePatient({ firstName: 'Ana', lastName: 'Petrova' })).rejects.toMatchObject({ statusCode: 409 });
    const results = await Promise.all(Array.from({ length: 5 }, () =>
      store.resolvePatient({ firstName: 'New', lastName: 'Person' })));
    expect(new Set(results.map((result) => result.patient.id)).size).toBe(1);
    expect(results.filter((result) => !result.reused)).toHaveLength(1);
    expect(await store.getPatients()).toHaveLength(4);
    expect((await store.getPatients()).find((patient) => patient.id === first.id).phone).toBe('111');
    await expect(store.resolvePatient({ firstName: '' })).rejects.toMatchObject({ statusCode: 400 });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('merge preserves every appointment and conflicting detail, removes sources, and persists after restart', async () => {
  const { dir, options, store } = await harness();
  try {
    const target = await store.createPatient({ firstName: 'Ana', lastName: 'Petrova', phone: '111', notes: 'Kept note' });
    const source = await store.createPatient({
      firstName: 'ANA', lastName: 'PETROVA', phone: '222', email: 'ana@test.local',
      dateOfBirth: '1990-01-01', address: 'Source address', emergencyContact: 'Source contact', notes: 'Source note',
    });
    const secondSource = await store.createPatient({ firstName: 'Ana', lastName: 'Petrova', dateOfBirth: '1991-02-02' });
    const unrelated = await store.createPatient({ firstName: 'Other', lastName: 'Person' });
    for (const [index, patient] of [target, source, secondSource, unrelated].entries()) {
      await store.createAppointment({
        patientId: patient.id, title: `Visit ${index}`, notes: `Clinical note ${index}`,
        startTime: '2026-10-30T09:00:00Z', endTime: '2026-10-30T09:30:00Z',
        type: 'procedure', duration: 30, status: ['scheduled', 'completed', 'cancelled', 'no-show'][index],
      });
    }
    const before = await store.getAppointments();
    const merged = await store.mergePatients(target.id, [source.id, secondSource.id]);
    expect(merged).toMatchObject({
      id: target.id, createdAt: target.createdAt, firstName: 'Ana', phone: '111',
      email: source.email, dateOfBirth: source.dateOfBirth, address: source.address, emergencyContact: source.emergencyContact,
    });
    for (const value of ['Kept note', 'Source note', 'phone: 222', 'dateOfBirth: 1991-02-02', source.id, secondSource.id]) {
      expect(merged.notes).toContain(value);
    }
    const restarted = createDataStore(options);
    await restarted.initialize();
    expect(await restarted.getPatients()).toEqual([merged, unrelated]);
    expect(await restarted.getAppointments()).toEqual(before.map((appointment) =>
      appointment.patientId === unrelated.id ? appointment : { ...appointment, patientId: target.id, patientName: 'Ana Petrova' }));
    expect((await restarted.getPatientDirectory()).find((patient) => patient.id === target.id).appointmentCount).toBe(3);
    expect(await fs.readdir(dir)).not.toContain('patient-merge-pending.json');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('invalid merges leave stored records unchanged', async () => {
  const { dir, store } = await harness();
  try {
    const target = await store.createPatient({ firstName: 'Ana' });
    const source = await store.createPatient({ firstName: 'Ana' });
    for (const sources of [[], [target.id], [source.id, source.id], [123], null]) {
      await expect(store.mergePatients(target.id, sources)).rejects.toMatchObject({ statusCode: 400 });
    }
    await expect(store.mergePatients('missing', [source.id])).rejects.toMatchObject({ statusCode: 404 });
    await expect(store.mergePatients(target.id, ['missing'])).rejects.toMatchObject({ statusCode: 404 });
    expect(await store.getPatients()).toEqual([target, source]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('an interrupted merge journal is replayed before subsequent writes', async () => {
  const { dir, options, store } = await harness();
  try {
    const target = await store.createPatient({ firstName: 'Ana', lastName: 'Petrova' });
    await store.createPatient({ firstName: 'Ana', lastName: 'Petrova' });
    const journal = path.join(dir, 'patient-merge-pending.json');
    await fs.writeFile(journal, JSON.stringify({ patients: [target], appointments: [] }));
    const restarted = createDataStore(options);
    await restarted.initialize();
    expect(await restarted.getPatients()).toEqual([target]);
    await expect(fs.access(journal)).rejects.toMatchObject({ code: 'ENOENT' });
    await fs.writeFile(journal, JSON.stringify({ patients: [target], appointments: [] }));
    const next = await restarted.resolvePatient({ firstName: 'Ana' });
    expect(next).toEqual({ patient: target, reused: true });
    expect(await restarted.getPatients()).toHaveLength(1);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('merge and simultaneous appointment writes do not lose updates', async () => {
  const { dir, store } = await harness();
  try {
    const target = await store.createPatient({ firstName: 'Ana' });
    const source = await store.createPatient({ firstName: 'Ana' });
    const appointment = {
      patientId: target.id, title: 'Concurrent visit',
      startTime: '2026-10-30T09:00:00Z', endTime: '2026-10-30T09:30:00Z',
      type: 'procedure', duration: 30, status: 'scheduled',
    };
    await Promise.all([
      store.createAppointment({ ...appointment, patientId: source.id }),
      store.mergePatients(target.id, [source.id]),
      store.createAppointment(appointment),
      store.updatePatient(target.id, { phone: '333' }),
    ]);
    expect(await store.getAppointments()).toHaveLength(2);
    expect((await store.getAppointments()).every((item) => item.patientId === target.id)).toBe(true);
    expect(await store.getPatients()).toEqual([expect.objectContaining({ id: target.id, phone: '333' })]);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('resolve and merge APIs enforce sessions, CSRF, validation and persistent patient IDs', async () => {
  const { dir, store } = await harness();
  const authHarness = await makeAuth();
  await authHarness.store.createUser({ email: TEST_EMAIL, password: TEST_PASSWORD });
  const app = createApp({ dataStore: store, dataDir: dir, auth: authHarness.auth });
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (endpoint: string, body: unknown, headers: Record<string, string> = {}) => fetch(`${url}/api/patients/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  try {
    for (const endpoint of ['resolve', 'merge']) expect((await post(endpoint, {})).status).toBe(401);
    const session = await login(url);
    for (const endpoint of ['resolve', 'merge']) {
      expect((await post(endpoint, {}, { cookie: session.cookie })).status).toBe(403);
    }
    const headers = { cookie: session.cookie, 'X-CSRF-Token': session.csrfToken! };
    expect((await post('resolve', [], headers)).status).toBe(400);
    expect((await post('merge', {}, headers)).status).toBe(400);
    const createdResponse = await post('resolve', { firstName: 'Ana', lastName: 'Petrova' }, headers);
    expect(createdResponse.status).toBe(200);
    const created = await createdResponse.json();
    expect(created.reused).toBe(false);
    const reused = await post('resolve', { firstName: 'ANA' }, headers);
    expect(await reused.json()).toMatchObject({ patient: { id: created.patient.id }, reused: true });
    const source = await store.createPatient({ firstName: 'Ana', lastName: 'Petrova', phone: '222' });
    expect((await post('resolve', { firstName: 'Ana', lastName: 'Petrova' }, headers)).status).toBe(409);
    const merged = await post('merge', { targetId: created.patient.id, sourceIds: [source.id] }, headers);
    expect(merged.status).toBe(200);
    expect(await merged.json()).toMatchObject({ id: created.patient.id, phone: '222' });
    expect(await store.getPatients()).toHaveLength(1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(dir, { recursive: true, force: true });
    await fs.rm(authHarness.dir, { recursive: true, force: true });
  }
});
