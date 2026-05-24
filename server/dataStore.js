import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

export const DEFAULT_SETTINGS = {
  locale: 'en',
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

const mergeSettings = (partial = {}) => ({
  ...DEFAULT_SETTINGS,
  ...partial,
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
    } catch {
      await ensureDataDir();
      await fs.writeFile(filePath, JSON.stringify(defaultValue, null, 2), 'utf8');
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

  return {
    async initialize() {
      await Promise.all([
        ensureJsonFile(patientsFile, []),
        ensureJsonFile(appointmentsFile, []),
        ensureJsonFile(settingsFile, DEFAULT_SETTINGS),
      ]);
    },

    async getPatients() {
      return readPatients();
    },

    async createPatient(input) {
      const patients = await readPatients();
      const email = String(input.email ?? '').trim().toLowerCase();
      if (email && patients.some((patient) => String(patient.email ?? '').trim().toLowerCase() === email)) {
        const error = new Error('A patient with this email already exists.');
        error.statusCode = 409;
        throw error;
      }

      const patient = {
        id: randomUUID(),
        createdAt: input.createdAt ?? new Date().toISOString(),
        firstName: String(input.firstName ?? '').trim(),
        lastName: String(input.lastName ?? '').trim(),
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

      patients[index] = {
        ...patients[index],
        ...updates,
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
      const appointments = await readAppointments();
      const appointment = {
        id: randomUUID(),
        createdAt: input.createdAt ?? new Date().toISOString(),
        title: String(input.title ?? ''),
        patientId: String(input.patientId ?? ''),
        patientName: String(input.patientName ?? ''),
        startTime: String(input.startTime ?? ''),
        endTime: String(input.endTime ?? ''),
        duration: Number(input.duration ?? 30),
        type: String(input.type ?? 'consultation'),
        status: String(input.status ?? 'scheduled'),
        notes: String(input.notes ?? ''),
      };

      appointments.push(appointment);
      await writeJsonFile(appointmentsFile, appointments);
      return appointment;
    },

    async updateAppointment(id, updates) {
      const appointments = await readAppointments();
      const index = appointments.findIndex((appointment) => appointment.id === id);
      if (index === -1) {
        const error = new Error('Appointment not found.');
        error.statusCode = 404;
        throw error;
      }

      appointments[index] = {
        ...appointments[index],
        ...updates,
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
      const settings = mergeSettings(nextSettings);
      await writeJsonFile(settingsFile, settings);
      return settings;
    },

    async updateSettings(partialSettings) {
      const current = await readSettings();
      const next = mergeSettings({
        ...current,
        ...partialSettings,
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
}
