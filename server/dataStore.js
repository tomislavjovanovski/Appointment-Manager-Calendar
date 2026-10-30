import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { findExactPatients } from './patientMatching.js';

export const DEFAULT_SETTINGS = {
  locale: 'mk',
  blockedSlots: [],
  workingDays: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '17:00',
  appointmentSizes: {
    half: { duration: 30, label: 'Half Hour' },
    full: { duration: 60, label: 'Full Hour' },
    double: { duration: 120, label: 'Double Hour' },
  },
  breakTime: 15,
  timeSlotMinutes: 30,
  defaultAppointmentType: 'procedure',
  appointmentTypeDurations: {
    consultation: 30,
    'follow-up': 30,
    procedure: 30,
    prevention: 30,
    'prosthetics-orthodontics': 60,
    urgent: 30,
  },
  notifications: {
    emailWebhookUrl: '',
    smsWebhookUrl: '',
    emailNotificationTime: '09:00',
    smsNotificationTime: '09:00',
    enableDayBeforeEmail: true,
    enableSameDayEmail: true,
    enableSameDaySMS: true,
    emailTemplate: '',
    smsTemplate: '',
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

const validateTypeDurations = (settings) => {
  if (settings.defaultAppointmentType !== undefined &&
      !Object.hasOwn(DEFAULT_SETTINGS.appointmentTypeDurations, settings.defaultAppointmentType)) {
    const error = new Error('Default appointment type must be a known appointment type.');
    error.statusCode = 400;
    throw error;
  }
  const durations = settings.appointmentTypeDurations;
  if (durations === undefined) return;
  if (!durations || typeof durations !== 'object' || Array.isArray(durations) ||
      Object.entries(durations).some(([type, duration]) =>
        !Object.hasOwn(DEFAULT_SETTINGS.appointmentTypeDurations, type) ||
        ![30, 45, 60, 90, 120].includes(duration))) {
    const error = new Error('Appointment type defaults must use a known type and a duration of 30, 45, 60, 90, or 120 minutes.');
    error.statusCode = 400;
    throw error;
  }
};

const validateBrandLogo = (settings) => {
  const logo = settings.logoDataUrl;
  if (logo === undefined || logo === '') return;
  if (typeof logo !== 'string' || logo.length > 180_000 ||
      !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(logo) ||
      Buffer.from(logo.slice(logo.indexOf(',') + 1), 'base64').length > 128 * 1024) {
    const error = new Error('Logo must be a PNG, JPEG, or WebP image up to 128 KB.');
    error.statusCode = 400;
    throw error;
  }
};

const mergeSettings = (partial = {}) => ({
  ...DEFAULT_SETTINGS,
  ...partial,
  locale: partial.locale === 'en' ? 'en' : 'mk',
  blockedSlots: Array.isArray(partial.blockedSlots) ? partial.blockedSlots : [],
  appointmentTypeDurations: {
    ...DEFAULT_SETTINGS.appointmentTypeDurations,
    ...partial.appointmentTypeDurations,
  },
  appointmentSizes: {
    half: {
      ...DEFAULT_SETTINGS.appointmentSizes.half,
      ...partial.appointmentSizes?.half,
    },
    full: {
      ...DEFAULT_SETTINGS.appointmentSizes.full,
      ...partial.appointmentSizes?.full,
    },
    double: {
      ...DEFAULT_SETTINGS.appointmentSizes.double,
      ...partial.appointmentSizes?.double,
    },
  },
  notifications: {
    ...DEFAULT_SETTINGS.notifications,
    ...partial.notifications,
  },
});

export function createDataStore({
  dataDir,
  patientsFile,
  appointmentsFile,
  settingsFile,
  googleTokensFile,
}) {
  const writeLocks = new Map();

  const ensureDataDir = async () => {
    await fs.mkdir(dataDir, { recursive: true });
  };

  const ensureJsonFile = async (filePath, defaultValue) => {
    try {
      await fs.access(filePath);
    } catch (error) {
      // Only create a default file when it is genuinely missing. Any other error (permissions,
      // too many open files, I/O) must surface instead of risking an overwrite of real data.
      if (error?.code !== 'ENOENT') throw error;
      await ensureDataDir();
      try {
        await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), { encoding: 'utf8', flag: 'wx' });
      } catch (writeError) {
        if (writeError?.code !== 'EEXIST') throw writeError;
      }
    }
  };

  const recoverCorruptFile = async (filePath, defaultValue, error) => {
    const backupPath = `${filePath}.corrupt-${Date.now()}`;
    try {
      await fs.rename(filePath, backupPath);
    } catch {
      // Ignore backup failures and still try to restore a valid file.
    }
    await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
    console.error(`Recovered corrupt JSON file at ${filePath}`, error);
    return clone(defaultValue);
  };

  const readJsonFile = async (filePath, defaultValue) => {
    await ensureJsonFile(filePath, defaultValue);

    try {
      const raw = await fs.readFile(filePath, 'utf8');
      if (!raw.trim()) {
        return clone(defaultValue);
      }
      return JSON.parse(raw);
    } catch (error) {
      if (error instanceof SyntaxError) {
        return recoverCorruptFile(filePath, defaultValue, error);
      }
      throw error;
    }
  };

  const queueWrite = async (filePath, writer) => {
    const previous = writeLocks.get(filePath) ?? Promise.resolve();
    const next = previous.then(writer, writer);
    writeLocks.set(filePath, next.catch(() => {}));
    return next;
  };

  const writeJsonFile = async (filePath, value) => {
    await queueWrite(filePath, async () => {
      await ensureDataDir();
      const tempFile = path.join(
        path.dirname(filePath),
        `.${path.basename(filePath)}.${process.pid}.${Date.now()}.tmp`
      );
      await fs.writeFile(tempFile, JSON.stringify(value, null, 2), 'utf8');
      await fs.rename(tempFile, filePath);
    });
  };

  const readPatients = async () => {
    const patients = await readJsonFile(patientsFile, []);
    return Array.isArray(patients) ? patients : [];
  };

  const readAppointments = async () => {
    const appointments = await readJsonFile(appointmentsFile, []);
    return Array.isArray(appointments) ? appointments : [];
  };

  const readSettings = async () => mergeSettings(await readJsonFile(settingsFile, DEFAULT_SETTINGS));

  const mergeJournalFile = path.join(dataDir, 'patient-merge-pending.json');
  const recoverPatientMerge = async () => {
    let raw;
    try {
      raw = await fs.readFile(mergeJournalFile, 'utf8');
    } catch (error) {
      if (error.code === 'ENOENT') return;
      throw error;
    }
    // Keep the journal until both files are persisted, so interrupted merges can be replayed.
    const { patients, appointments } = JSON.parse(raw);
    if (!Array.isArray(patients) || !Array.isArray(appointments)) {
      throw new Error('Invalid patient merge journal.');
    }
    await writeJsonFile(appointmentsFile, appointments);
    await writeJsonFile(patientsFile, patients);
    await fs.unlink(mergeJournalFile);
  };

  const validateAppointment = (input, patients) => {
    const patientId = String(input.patientId ?? '').trim();
    const title = String(input.title ?? '').trim();
    const startTime = String(input.startTime ?? '').trim();
    const endTime = String(input.endTime ?? '').trim();
    const duration = Number(input.duration ?? 30);
    const type = String(input.type ?? 'consultation');
    const status = String(input.status ?? 'scheduled');
    const patient = patients.find((candidate) => candidate.id === patientId);

    if (!title) {
      const error = new Error('Appointment title is required.');
      error.statusCode = 400;
      throw error;
    }
    if (!patient) {
      const error = new Error('A valid patient is required for an appointment.');
      error.statusCode = 400;
      throw error;
    }
    if (!Number.isFinite(new Date(startTime).getTime()) || !Number.isFinite(new Date(endTime).getTime())) {
      const error = new Error('Appointment start and end times must be valid dates.');
      error.statusCode = 400;
      throw error;
    }
    if (new Date(endTime).getTime() <= new Date(startTime).getTime()) {
      const error = new Error('Appointment end time must be after its start time.');
      error.statusCode = 400;
      throw error;
    }
    if (![30, 45, 60, 90, 120].includes(duration)) {
      const error = new Error('Appointment duration must be 30, 45, 60, 90, or 120 minutes.');
      error.statusCode = 400;
      throw error;
    }
    if (!['consultation', 'follow-up', 'procedure', 'prevention', 'prosthetics-orthodontics', 'urgent'].includes(type)) {
      const error = new Error('Appointment type is invalid.');
      error.statusCode = 400;
      throw error;
    }
    if (!['scheduled', 'completed', 'cancelled', 'no-show'].includes(status)) {
      const error = new Error('Appointment status is invalid.');
      error.statusCode = 400;
      throw error;
    }

    return {
      patientId,
      patientName: `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim(),
      title,
      startTime,
      endTime,
      duration,
      type,
      status,
    };
  };

  const store = {
    async initialize() {
      await Promise.all([
        ensureJsonFile(patientsFile, []),
        ensureJsonFile(appointmentsFile, []),
        ensureJsonFile(settingsFile, DEFAULT_SETTINGS),
      ]);
      await recoverPatientMerge();
    },

    async getPatients() {
      return readPatients();
    },

    async getPatientDirectory() {
      const [patients, appointments] = await Promise.all([readPatients(), readAppointments()]);
      const activity = new Map();
      for (const appointment of appointments) {
        const summary = activity.get(appointment.patientId) ?? { appointmentCount: 0, lastAppointmentAt: null };
        summary.appointmentCount += 1;
        const date = appointment.startTime ?? appointment.date;
        const timestamp = Date.parse(date);
        if (Number.isFinite(timestamp) &&
            (summary.lastAppointmentAt === null || timestamp > Date.parse(summary.lastAppointmentAt))) {
          summary.lastAppointmentAt = date;
        }
        activity.set(appointment.patientId, summary);
      }
      return patients.map((patient) => ({
        ...patient,
        ...(activity.get(patient.id) ?? { appointmentCount: 0, lastAppointmentAt: null }),
      })).sort((first, second) => {
        const firstTime = first.lastAppointmentAt === null ? -Infinity : Date.parse(first.lastAppointmentAt);
        const secondTime = second.lastAppointmentAt === null ? -Infinity : Date.parse(second.lastAppointmentAt);
        if (firstTime === secondTime) return 0;
        return secondTime > firstTime ? 1 : -1;
      });
    },

    async createPatient(input) {
      const patients = await readPatients();
      const firstName = String(input.firstName ?? '').trim();
      const lastName = String(input.lastName ?? '').trim();
      if (!firstName) {
        const error = new Error('First name is required.');
        error.statusCode = 400;
        throw error;
      }
      const email = String(input.email ?? '').trim().toLowerCase();
      if (email && patients.some((patient) => String(patient.email ?? '').trim().toLowerCase() === email)) {
        const error = new Error('A patient with this email already exists.');
        error.statusCode = 409;
        throw error;
      }

      const patient = {
        id: randomUUID(),
        createdAt: input.createdAt ?? new Date().toISOString(),
        firstName,
        lastName,
        email: String(input.email ?? '').trim(),
        phone: String(input.phone ?? '').trim(),
        dateOfBirth: String(input.dateOfBirth ?? ''),
        address: String(input.address ?? ''),
        emergencyContact: String(input.emergencyContact ?? ''),
        notes: String(input.notes ?? ''),
      };

      patients.push(patient);
      await writeJsonFile(patientsFile, patients);
      return patient;
    },

    async resolvePatient(input) {
      const patients = await readPatients();
      const matches = findExactPatients(patients, input);
      if (matches.length > 1) {
        const error = new Error('Several patients match this name. Select an existing patient before saving.');
        error.statusCode = 409;
        throw error;
      }
      if (matches.length === 1) return { patient: matches[0], reused: true };
      return { patient: await store.createPatient(input), reused: false };
    },

    async mergePatients(targetId, sourceIds) {
      if (typeof targetId !== 'string' || !Array.isArray(sourceIds) || !sourceIds.length ||
          sourceIds.some((id) => typeof id !== 'string' || !id || id === targetId) ||
          new Set(sourceIds).size !== sourceIds.length) {
        const error = new Error('Choose a patient to keep and distinct patients to merge into it.');
        error.statusCode = 400;
        throw error;
      }
      const patients = await readPatients();
      const appointments = await readAppointments();
      const target = patients.find((patient) => patient.id === targetId);
      const sources = sourceIds.map((id) => patients.find((patient) => patient.id === id));
      if (!target || sources.some((patient) => !patient)) {
        const error = new Error('One or more patients no longer exist. Reload the patient list.');
        error.statusCode = 404;
        throw error;
      }
      const merged = { ...target };
      const notes = [String(target.notes ?? '').trim()].filter(Boolean);
      for (const source of sources) {
        const conflicts = [];
        for (const field of ['firstName', 'lastName', 'email', 'phone', 'dateOfBirth', 'address', 'emergencyContact']) {
          const value = String(source[field] ?? '').trim();
          if (!String(merged[field] ?? '').trim()) merged[field] = value;
          else if (value && value !== String(merged[field]).trim()) conflicts.push(`${field}: ${value}`);
        }
        const sourceNotes = String(source.notes ?? '').trim();
        if (sourceNotes) conflicts.push(`notes: ${sourceNotes}`);
        if (conflicts.length) {
          notes.push(`[Merged patient ${source.id}: ${source.firstName} ${source.lastName}]\n${conflicts.join('\n')}`);
        }
      }
      merged.notes = notes.join('\n\n');
      const patientName = `${merged.firstName} ${merged.lastName}`.trim();
      const affectedIds = new Set([targetId, ...sourceIds]);
      const nextAppointments = appointments.map((appointment) =>
        affectedIds.has(appointment.patientId) ? { ...appointment, patientId: targetId, patientName } : appointment);
      const nextPatients = patients.filter((patient) => !sourceIds.includes(patient.id))
        .map((patient) => patient.id === targetId ? merged : patient);
      await writeJsonFile(mergeJournalFile, { patients: nextPatients, appointments: nextAppointments });
      await recoverPatientMerge();
      return merged;
    },

    async updatePatient(id, updates) {
      const patients = await readPatients();
      const appointments = await readAppointments();
      const index = patients.findIndex((patient) => patient.id === id);
      if (index === -1) {
        const error = new Error('Patient not found.');
        error.statusCode = 404;
        throw error;
      }

      const nextEmail = updates.email == null
        ? String(patients[index].email ?? '').trim().toLowerCase()
        : String(updates.email).trim().toLowerCase();
      if (
        nextEmail &&
        patients.some((patient, patientIndex) => patientIndex !== index && String(patient.email ?? '').trim().toLowerCase() === nextEmail)
      ) {
        const error = new Error('A patient with this email already exists.');
        error.statusCode = 409;
        throw error;
      }

      const nextFirstName = updates.firstName == null ? patients[index].firstName : String(updates.firstName).trim();
      const nextLastName = updates.lastName == null ? patients[index].lastName : String(updates.lastName).trim();
      if (!nextFirstName) {
        const error = new Error('First name is required.');
        error.statusCode = 400;
        throw error;
      }

      patients[index] = {
        ...patients[index],
        ...updates,
        firstName: nextFirstName,
        lastName: nextLastName,
        id: patients[index].id,
        createdAt: patients[index].createdAt,
      };

      const patientName = `${patients[index].firstName ?? ''} ${patients[index].lastName ?? ''}`.trim();
      const nextAppointments = appointments.map((appointment) =>
        appointment.patientId === id
          ? { ...appointment, patientName }
          : appointment
      );

      await writeJsonFile(patientsFile, patients);
      await writeJsonFile(appointmentsFile, nextAppointments);
      return patients[index];
    },

    async deletePatient(id) {
      const patients = await readPatients();
      const appointments = await readAppointments();
      const nextPatients = patients.filter((patient) => patient.id !== id);

      if (nextPatients.length === patients.length) {
        const error = new Error('Patient not found.');
        error.statusCode = 404;
        throw error;
      }

      const nextAppointments = appointments.filter((appointment) => appointment.patientId !== id);

      await writeJsonFile(patientsFile, nextPatients);
      await writeJsonFile(appointmentsFile, nextAppointments);
    },

    async getAppointments() {
      return readAppointments();
    },

    async createAppointment(input) {
      const [appointments, patients] = await Promise.all([readAppointments(), readPatients()]);
      const details = validateAppointment(input, patients);
      const appointment = {
        id: randomUUID(),
        createdAt: input.createdAt ?? new Date().toISOString(),
        ...details,
        notes: String(input.notes ?? ''),
      };

      appointments.push(appointment);
      await writeJsonFile(appointmentsFile, appointments);
      return appointment;
    },

    async updateAppointment(id, updates) {
      const [appointments, patients] = await Promise.all([readAppointments(), readPatients()]);
      const index = appointments.findIndex((appointment) => appointment.id === id);
      if (index === -1) {
        const error = new Error('Appointment not found.');
        error.statusCode = 404;
        throw error;
      }

      const details = validateAppointment({ ...appointments[index], ...updates }, patients);
      appointments[index] = {
        ...appointments[index],
        ...updates,
        ...details,
        id: appointments[index].id,
        createdAt: appointments[index].createdAt,
      };

      await writeJsonFile(appointmentsFile, appointments);
      return appointments[index];
    },

    async deleteAppointment(id) {
      const appointments = await readAppointments();
      const nextAppointments = appointments.filter((appointment) => appointment.id !== id);

      if (nextAppointments.length === appointments.length) {
        const error = new Error('Appointment not found.');
        error.statusCode = 404;
        throw error;
      }

      await writeJsonFile(appointmentsFile, nextAppointments);
    },

    async getSettings() {
      return readSettings();
    },

    async saveSettings(nextSettings) {
      validateBrandLogo(nextSettings);
      validateTypeDurations(nextSettings);
      const settings = mergeSettings(nextSettings);
      await writeJsonFile(settingsFile, settings);
      return settings;
    },

    async updateSettings(partialSettings) {
      validateBrandLogo(partialSettings);
      validateTypeDurations(partialSettings);
      const current = await readSettings();
      const next = mergeSettings({
        ...current,
        ...partialSettings,
        appointmentTypeDurations: {
          ...current.appointmentTypeDurations,
          ...partialSettings.appointmentTypeDurations,
        },
        appointmentSizes: {
          ...current.appointmentSizes,
          ...partialSettings.appointmentSizes,
        },
        notifications: {
          ...current.notifications,
          ...partialSettings.notifications,
        },
      });
      await writeJsonFile(settingsFile, next);
      return next;
    },

    async getGoogleTokens() {
      return readJsonFile(googleTokensFile, null);
    },

    async saveGoogleTokens(tokens) {
      await writeJsonFile(googleTokensFile, tokens);
      return tokens;
    },

    async deleteGoogleTokens() {
      await fs.unlink(googleTokensFile).catch(() => {});
    },
  };

  // Serialize whole read/modify/write operations, including name resolution and cross-file merges.
  let mutation = Promise.resolve();
  const result = { ...store };
  for (const method of ['createPatient', 'resolvePatient', 'mergePatients', 'updatePatient', 'deletePatient',
    'createAppointment', 'updateAppointment', 'deleteAppointment']) {
    result[method] = (...args) => {
      const next = mutation.then(async () => {
        await recoverPatientMerge();
        return store[method](...args);
      });
      mutation = next.catch(() => {});
      return next;
    };
  }
  return result;
}
