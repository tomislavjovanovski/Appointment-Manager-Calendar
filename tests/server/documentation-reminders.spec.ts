import { test, expect } from '@playwright/test';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { createDataStore } from '../../server/dataStore.js';

test('review acknowledgement persists independently, preserves clinical data and accepts legacy records', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'clinic-documentation-'));
  const options = {
    dataDir: dir, patientsFile: path.join(dir, 'patients.json'),
    appointmentsFile: path.join(dir, 'appointments.json'), settingsFile: path.join(dir, 'settings.json'),
    googleTokensFile: path.join(dir, 'google-tokens.json'),
  };
  try {
    const store = createDataStore(options);
    await store.initialize();
    const patient = await store.createPatient({ firstName: 'Test', lastName: 'Patient' });
    const input = {
      patientId: patient.id, title: 'Treatment', duration: 30, type: 'procedure',
      startTime: '2026-11-06T09:00:00Z', endTime: '2026-11-06T09:30:00Z',
    };
    const scheduled = await store.createAppointment(input);
    const documented = await store.createAppointment({ ...input, status: 'completed', notes: '  Existing note\n' });
    expect(scheduled.documentationReviewedAt).toBeUndefined();
    expect((await store.getAppointments())[0]).toEqual(scheduled);

    const documentationReviewedAt = '2026-11-06T17:00:00Z';
    for (const appointment of [scheduled, documented]) {
      const reviewed = await store.updateAppointment(appointment.id, { documentationReviewedAt });
      expect(reviewed).toEqual({ ...appointment, documentationReviewedAt });
    }
    const restarted = createDataStore(options);
    expect(await restarted.getAppointments()).toEqual([
      { ...scheduled, documentationReviewedAt }, { ...documented, documentationReviewedAt },
    ]);
    const updated = await restarted.updateAppointment(scheduled.id, { notes: 'Saved documentation' });
    expect(updated.status).toBe('scheduled');
    expect(updated.documentationReviewedAt).toBe(documentationReviewedAt);
    expect((await restarted.updateAppointment(scheduled.id, { status: 'completed' })).notes).toBe('Saved documentation');
    expect((await restarted.getAppointments())[1].notes).toBe(documented.notes);

    const before = await fs.readFile(options.appointmentsFile, 'utf8');
    for (const invalid of [null, '', 'not-a-date', 123, {}]) {
      await expect(restarted.updateAppointment(scheduled.id, { documentationReviewedAt: invalid }))
        .rejects.toMatchObject({ statusCode: 400 });
    }
    expect(await fs.readFile(options.appointmentsFile, 'utf8')).toBe(before);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});
