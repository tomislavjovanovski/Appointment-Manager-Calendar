import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';
import { createDataStore } from '../../server/dataStore.js';
import { createApp } from '../../server/app.js';
import { dateOfBirthFromEmbg, planPatientImport } from '../../server/patientImport.js';
import { groupDuplicatePatients } from '../../server/patientMatching.js';
import { login, makeAuth, TEST_EMAIL, TEST_PASSWORD } from './authHelpers';
import { normalizePatientForm, normalizePatientUpdates, validatePatientForm } from '../../src/lib/patientForm';

const EMBG = '0101990450001';
const SECOND_EMBG = '0202990450002';
const row = (name = 'Ана Петрова', embg = EMBG, address = 'Test address') => ({ name, embg, address });

test('EMBG birth dates decode day, month and year with calendar and future-date validation', () => {
  expect(dateOfBirthFromEmbg('0106986420013')).toBe('1986-06-01');
  expect(dateOfBirthFromEmbg('0101000420013')).toBe('2000-01-01');
  expect(dateOfBirthFromEmbg('2902000420013')).toBe('2000-02-29');
  expect(dateOfBirthFromEmbg('3112999420013')).toBe('1999-12-31');
  expect(dateOfBirthFromEmbg('0101900420013')).toBe('1900-01-01');
  for (const embg of ['2902900420013', '3104986420013', '0006986420013', '0113986420013', '0101099420013', '123']) {
    expect(dateOfBirthFromEmbg(embg)).toBeNull();
  }
  expect(planPatientImport([], [row('Test Person', '3104986420013')])[0]).toMatchObject({
    status: 'review', reason: 'invalidBirthDate', dateOfBirth: '',
  });
});

test('import fills missing birth dates, preserves populated dates and persists them across repeat imports', async () => {
  const { dir, options, store } = await harness();
  try {
    const missing = await store.createPatient({ firstName: 'Ана', lastName: 'Петрова', embg: EMBG });
    const populated = await store.createPatient({
      firstName: 'Other', lastName: 'Person', embg: SECOND_EMBG, dateOfBirth: '1985-03-04',
    });
    const rows = [row(), row('Other Person', SECOND_EMBG), row('New Patient', '0106986420013')];
    const preview = await store.previewPatientImport(rows);
    expect(preview.entries[0].changes.dateOfBirth).toBe('1990-01-01');
    expect(preview.entries[1].changes).not.toHaveProperty('dateOfBirth');
    expect(preview.entries[2].dateOfBirth).toBe('1986-06-01');
    await store.importPatients(rows, preview.revision);
    const restarted = createDataStore(options);
    await restarted.initialize();
    const patients = await restarted.getPatients();
    expect(patients[0]).toMatchObject({ id: missing.id, dateOfBirth: '1990-01-01' });
    expect(patients[1]).toMatchObject({ id: populated.id, dateOfBirth: '1985-03-04' });
    expect(patients[2].dateOfBirth).toBe('1986-06-01');
    const next = await restarted.previewPatientImport(rows);
    expect(await restarted.importPatients(rows, next.revision)).toMatchObject({ added: 0, updated: 0, unchanged: 3 });
    expect(await restarted.getPatients()).toEqual(patients);
    expect(planPatientImport([{ ...missing, dateOfBirth: '  ' }], [row()])[0].changes.dateOfBirth).toBe('1990-01-01');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('duplicate groups use EMBG, with name fallback only between records without EMBG', () => {
  const patient = { id: 'one', firstName: 'Ана', lastName: 'Петрова', embg: EMBG };
  const sameEmbg = { ...patient, id: 'two', firstName: 'Different' };
  const otherPerson = { ...patient, id: 'three', embg: SECOND_EMBG };
  const missing = { ...patient, id: 'four', embg: '' };
  const missingDuplicate = { ...missing, id: 'five' };
  expect(groupDuplicatePatients([patient, sameEmbg, otherPerson, missing, missingDuplicate]))
    .toEqual([[patient, sameEmbg], [missing, missingDuplicate]]);
  expect(groupDuplicatePatients([patient, otherPerson, missing])).toEqual([]);
});

test('registration dates are normalized, updated on reimport and never replace createdAt', async () => {
  const { dir, options, store } = await harness();
  try {
    const existing = await store.createPatient({ firstName: 'Ана', lastName: 'Петрова', embg: EMBG });
    const rows = [{ ...row(), registrationDate: '03.01.2026' },
      { ...row('Other Person', SECOND_EMBG), registrationDate: '29.02.2024' }];
    const preview = await store.previewPatientImport(rows);
    expect(preview.entries[0].changes.registrationDate).toBe('2026-01-03');
    await store.importPatients(rows, preview.revision);
    let patients = await store.getPatients();
    expect(patients[0]).toMatchObject({ registrationDate: '2026-01-03', createdAt: existing.createdAt });
    expect(patients[1].registrationDate).toBe('2024-02-29');
    const changed = [{ ...row(), registrationDate: '2026-02-04' }];
    const next = await store.previewPatientImport(changed);
    expect(await store.importPatients(changed, next.revision)).toMatchObject({ added: 0, updated: 1 });
    const restarted = createDataStore(options);
    await restarted.initialize();
    patients = await restarted.getPatients();
    expect(patients[0]).toMatchObject({ registrationDate: '2026-02-04', createdAt: existing.createdAt });
    expect((await restarted.previewPatientImport(changed)).entries[0].status).toBe('unchanged');
    for (const registrationDate of ['', undefined]) {
      expect((await restarted.previewPatientImport([{ ...row(), registrationDate }])).entries[0].changes)
        .not.toHaveProperty('registrationDate');
    }
    for (const registrationDate of ['31.02.2026', '29.02.2025', '2026-13-01', 'bad']) {
      expect(planPatientImport([], [{ ...row(), registrationDate }])[0]).toMatchObject({
        status: 'review', reason: 'invalidDate',
      });
    }
    expect(planPatientImport([], [{ ...row(), registrationDate: '01.01.2026' },
      { ...row(), registrationDate: '02.01.2026' }]).map((entry) => entry.reason))
      .toEqual(['fileConflict', 'fileConflict']);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

async function harness() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'clinic-patient-import-'));
  const options = {
    dataDir: dir, patientsFile: path.join(dir, 'patients.json'),
    appointmentsFile: path.join(dir, 'appointments.json'),
    settingsFile: path.join(dir, 'settings.json'),
    googleTokensFile: path.join(dir, 'google-tokens.json'),
  };
  const store = createDataStore(options);
  await store.initialize();
  return { dir, options, store };
}

test('import matches EMBG first, normalizes exact names, and never overwrites existing details', () => {
  const patient = { id: 'existing', firstName: 'Ана', lastName: 'Петрова', embg: EMBG, address: 'Keep address', dateOfBirth: '1990-01-01' };
  expect(planPatientImport([patient], [row('Changed Name')])[0]).toMatchObject({
    status: 'unchanged', patient, changes: {},
  });
  const withoutEmbg = { ...patient, embg: '', address: '' };
  expect(planPatientImport([withoutEmbg], [row('  АНА   ПЕТРОВА  ')])[0]).toMatchObject({
    status: 'update', patient: withoutEmbg, changes: { embg: EMBG, address: 'Test address' },
  });
  expect(planPatientImport([], [row()])[0].status).toBe('new');
});

test('ambiguous missing-EMBG matches, transliteration suggestions and malformed rows require review', () => {
  const patient = { id: 'existing', firstName: 'Ана', lastName: 'Петрова' };
  expect(planPatientImport([patient, { ...patient, id: 'other' }], [row()])[0].reason).toBe('ambiguous');
  expect(planPatientImport([{ ...patient, firstName: 'Ana', lastName: 'Petrova' }], [row()])[0]).toMatchObject({
    status: 'review', reason: 'alphabetMatch', patient: { id: 'existing' },
  });
  expect(planPatientImport([patient], [row(), row('Ана Петрова', SECOND_EMBG)]).map((entry) => entry.reason))
    .toEqual(['ambiguous', 'ambiguous']);
  expect(planPatientImport([], [row('OnlyFirst'), row('Test Patient', '123')]).map((entry) => entry.reason))
    .toEqual(['invalid', 'invalid']);
  expect(() => planPatientImport([], [])).toThrow();
  expect(() => planPatientImport([], [{ ...row(), embg: 123 }])).toThrow();
  expect(() => planPatientImport([], Array.from({ length: 10001 }, () => row()))).toThrow();
});

test('same names with different EMBGs are different people, including alternate alphabets', () => {
  const patient = { id: 'existing', firstName: 'Ана', lastName: 'Петрова', embg: SECOND_EMBG };
  for (const patients of [
    [patient],
    [patient, { ...patient, id: 'another', embg: '0303990450003' }],
    [{ ...patient, firstName: 'Ana', lastName: 'Petrova' }],
  ]) {
    expect(planPatientImport(patients, [row()])[0]).toMatchObject({
      status: 'new', patient: null, reason: '',
    });
  }
  const noEmbg = { id: 'missing', firstName: 'Ана', lastName: 'Петрова' };
  expect(planPatientImport([patient, noEmbg], [row()])[0]).toMatchObject({
    status: 'update', patient: noEmbg, changes: { embg: EMBG },
  });
  expect(planPatientImport([], [row(), row('Ана Петрова', SECOND_EMBG)]).map((entry) => entry.status))
    .toEqual(['new', 'new']);
  expect(planPatientImport([patient], [row(), row('Ана Петрова', SECOND_EMBG)]).map((entry) => entry.status))
    .toEqual(['new', 'update']);
});

test('same-name patients with different EMBGs persist separately and are reused on repeat import', async () => {
  const { dir, store } = await harness();
  try {
    const existing = await store.createPatient({ firstName: 'Ана', lastName: 'Петрова', embg: SECOND_EMBG });
    const rows = [row()];
    const preview = await store.previewPatientImport(rows);
    expect(await store.importPatients(rows, preview.revision)).toMatchObject({ added: 1, review: 0 });
    const patients = await store.getPatients();
    expect(patients).toHaveLength(2);
    expect(patients[0]).toEqual(existing);
    expect(patients[1]).toMatchObject({ firstName: 'Ана', lastName: 'Петрова', embg: EMBG });
    expect(patients[1].id).not.toBe(existing.id);
    const next = await store.previewPatientImport(rows);
    expect(await store.importPatients(rows, next.revision)).toMatchObject({ added: 0, unchanged: 1, review: 0 });
    expect(await store.getPatients()).toEqual(patients);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('identical file rows are deduplicated and all conflicting occurrences are blocked', () => {
  expect(planPatientImport([], [row(), row()]).map((entry) => entry.status)).toEqual(['new', 'duplicate']);
  for (const conflicting of [row('Other Person'), row('Ана Петрова', EMBG, 'Other address')]) {
    expect(planPatientImport([], [row(), conflicting]).map((entry) => entry.reason)).toEqual(['fileConflict', 'fileConflict']);
  }
});

test('import persists updates and new patients, preserves appointments/settings, and is repeat-safe', async () => {
  const { dir, options, store } = await harness();
  try {
    const patient = await store.createPatient({ firstName: 'Ана', lastName: 'Петрова', phone: 'keep', notes: 'Keep notes' });
    const unrelated = await store.createPatient({ firstName: 'Unrelated', lastName: 'Person' });
    await store.createAppointment({
      patientId: patient.id, title: 'Keep visit', startTime: '2026-10-30T09:00:00Z',
      endTime: '2026-10-30T09:30:00Z', duration: 30, type: 'procedure', status: 'scheduled',
    });
    const beforeAppointments = await store.getAppointments();
    const beforeSettings = await store.getSettings();
    const rows = [row(), row('Драгана Величковиќ Илиќ', SECOND_EMBG), row(), row('Invalid', 'x')];
    const preview = await store.previewPatientImport(rows);
    expect(await store.getPatients()).toEqual([patient, unrelated]);
    expect(await store.importPatients(rows, preview.revision)).toEqual({
      added: 1, updated: 1, unchanged: 0, review: 1, duplicate: 1,
    });
    const restarted = createDataStore(options);
    await restarted.initialize();
    const patients = await restarted.getPatients();
    expect(patients).toHaveLength(3);
    expect(patients[0]).toEqual({ ...patient, embg: EMBG, address: 'Test address', dateOfBirth: '1990-01-01' });
    expect(patients[1]).toEqual(unrelated);
    expect(patients[2]).toMatchObject({
      firstName: 'Драгана', lastName: 'Величковиќ Илиќ', embg: SECOND_EMBG, email: '', phone: '',
    });
    const secondPreview = await restarted.previewPatientImport(rows);
    expect(await restarted.importPatients(rows, secondPreview.revision)).toEqual({
      added: 0, updated: 0, unchanged: 2, review: 1, duplicate: 1,
    });
    expect(await restarted.getPatients()).toEqual(patients);
    expect(await restarted.getAppointments()).toEqual(beforeAppointments);
    expect(await restarted.getSettings()).toEqual(beforeSettings);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('stale or modified previews are rejected and simultaneous confirmations cannot duplicate patients', async () => {
  const { dir, store } = await harness();
  try {
    const rows = [row()];
    const preview = await store.previewPatientImport(rows);
    await expect(store.importPatients([row('Other Name')], preview.revision)).rejects.toMatchObject({ statusCode: 409 });
    const results = await Promise.allSettled([
      store.importPatients(rows, preview.revision), store.importPatients(rows, preview.revision),
    ]);
    expect(results.map((result) => result.status)).toEqual(['fulfilled', 'rejected']);
    expect(await store.getPatients()).toHaveLength(1);
    const currentPreview = await store.previewPatientImport(rows);
    const patient = (await store.getPatients())[0];
    await store.updatePatient(patient.id, { notes: 'Changed since preview' });
    await expect(store.importPatients(rows, currentPreview.revision)).rejects.toMatchObject({ statusCode: 409 });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('patient editing preserves EMBG strings and validates identifiers; merge never discards an EMBG', async () => {
  expect(normalizePatientForm({ firstName: 'Ana', embg: ` ${EMBG} ` }).embg).toBe(EMBG);
  expect(normalizePatientUpdates({ embg: ` ${EMBG} ` })).toEqual({ embg: EMBG });
  expect(validatePatientForm(normalizePatientForm({ firstName: 'Ana', embg: '123' }))).toMatchObject({ embg: true });
  const { dir, store } = await harness();
  try {
    const first = await store.createPatient({ firstName: 'Ana', embg: EMBG });
    const second = await store.createPatient({ firstName: 'Ana', embg: SECOND_EMBG });
    await expect(store.createPatient({ firstName: 'Other', embg: EMBG })).rejects.toMatchObject({ statusCode: 409 });
    await expect(store.updatePatient(second.id, { embg: EMBG })).rejects.toMatchObject({ statusCode: 409 });
    await expect(store.updatePatient(first.id, { embg: 'bad' })).rejects.toMatchObject({ statusCode: 400 });
    await expect(store.mergePatients(first.id, [second.id])).rejects.toMatchObject({ statusCode: 409 });
    const target = await store.createPatient({ firstName: 'Ana' });
    expect(await store.mergePatients(target.id, [first.id])).toMatchObject({ id: target.id, embg: EMBG });
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('import endpoints enforce authentication, CSRF, validation, previews and idempotent persistence', async () => {
  const { dir, store } = await harness();
  const authHarness = await makeAuth();
  await authHarness.store.createUser({ email: TEST_EMAIL, password: TEST_PASSWORD });
  const server = createApp({ dataStore: store, dataDir: dir, auth: authHarness.auth }).listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  const post = (endpoint: string, body: unknown, headers: Record<string, string> = {}) => fetch(`${url}/api/patients/${endpoint}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  });
  try {
    for (const endpoint of ['import/preview', 'import']) expect((await post(endpoint, {})).status).toBe(401);
    const session = await login(url);
    for (const endpoint of ['import/preview', 'import']) {
      expect((await post(endpoint, {}, { cookie: session.cookie })).status).toBe(403);
    }
    const headers = { cookie: session.cookie, 'X-CSRF-Token': session.csrfToken! };
    expect((await post('import/preview', { rows: [] }, headers)).status).toBe(400);
    const previewResponse = await post('import/preview', { rows: [row()] }, headers);
    expect(previewResponse.status).toBe(200);
    const preview = await previewResponse.json();
    expect(preview.entries[0].status).toBe('new');
    expect((await post('import', { rows: [row()], revision: 'stale' }, headers)).status).toBe(409);
    const response = await post('import', { rows: [row()], revision: preview.revision }, headers);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ added: 1, updated: 0 });
    expect(await store.getPatients()).toHaveLength(1);
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await fs.rm(dir, { recursive: true, force: true });
    await fs.rm(authHarness.dir, { recursive: true, force: true });
  }
});
