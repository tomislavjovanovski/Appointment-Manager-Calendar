import { Patient, Appointment, AppointmentSettings } from '@/types/appointment';
import type { AppLocale } from '@/i18n/types';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const resolveApiBaseUrl = () => {
  const configuredBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? '');
  if (configuredBaseUrl) {
    return configuredBaseUrl.endsWith('/api') ? configuredBaseUrl : `${configuredBaseUrl}/api`;
  }

  return '/api';
};

const API_BASE_URL = resolveApiBaseUrl();

class ApiResponseError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiResponseError';
    this.status = status;
  }
}

const isJsonResponse = (response: Response) =>
  response.headers.get('content-type')?.includes('application/json');

// API helper functions
const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    let message = `API call failed: ${response.statusText}`;

    try {
      if (isJsonResponse(response)) {
        const data = await response.json();
        message = data?.error || data?.message || message;
      } else {
        const text = await response.text();
        if (text.trim()) {
          message = text.trim();
        }
      }
    } catch {
      // Keep the default message if the error body is unreadable.
    }

    throw new ApiResponseError(response.status, message);
  }
  
  if (response.status === 204) {
    return null;
  }

  if (isJsonResponse(response)) {
    return response.json();
  }

  return response.text();
};

let hasWarnedAboutOfflineFallback = false;

const logOfflineFallback = (entity: string, error: unknown) => {
  if (hasWarnedAboutOfflineFallback) {
    return;
  }

  hasWarnedAboutOfflineFallback = true;
  console.warn(`API unavailable for ${entity}; falling back to browser storage.`, error);
};

const shouldUseOfflineFallback = (error: unknown) => {
  if (error instanceof ApiResponseError) {
    return false;
  }

  if (error instanceof TypeError) {
    return true;
  }

  return error instanceof Error
    ? /Failed to fetch|NetworkError|Load failed/i.test(error.message)
    : false;
};

// Local fallback helpers (used when API is unavailable)
// Keep these keys stable: Playwright E2E tests depend on them.
const LS_KEYS = {
  patients: 'medical-patients',
  appointments: 'medical-appointments',
  settings: 'medical-settings',
} as const;

const readLS = <T,>(key: string, defaultValue: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const writeLS = (key: string, data: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
};

const syncCollectionCache = <T,>(key: string, data: T[]) => {
  writeLS(key, data);
  return data;
};

const syncSettingsCache = (settings: AppointmentSettings) => {
  writeLS(LS_KEYS.settings, settings);
  return settings;
};

const buildPatientName = (patient: Partial<Patient>) =>
  `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim();

const DEFAULT_SETTINGS: AppointmentSettings = {
  locale: 'en',
  workingDays: [1, 2, 3, 4, 5],
  startTime: '08:00',
  endTime: '18:00',
  appointmentSizes: {
    half: { duration: 30, label: 'Half Hour' },
    full: { duration: 60, label: 'Full Hour' },
    double: { duration: 120, label: 'Double Hour' },
  },
  breakTime: 10,
  timeSlotMinutes: 30,
  notifications: {
    emailWebhookUrl: '',
    smsWebhookUrl: '',
    emailNotificationTime: '09:00',
    smsNotificationTime: '09:00',
    enableDayBeforeEmail: false,
    enableSameDayEmail: false,
    enableSameDaySMS: false,
    emailTemplate: '',
    smsTemplate: '',
  },
};

export function normalizeSettings(data: Partial<AppointmentSettings> | null | undefined): AppointmentSettings {
  const d = data ?? {};
  const locale: AppLocale = d.locale === 'mk' ? 'mk' : 'en';
  return {
    ...DEFAULT_SETTINGS,
    ...d,
    locale,
    workingDays: Array.isArray(d.workingDays) ? d.workingDays : DEFAULT_SETTINGS.workingDays,
    notifications: { ...DEFAULT_SETTINGS.notifications, ...d.notifications },
    appointmentSizes: {
      half: { ...DEFAULT_SETTINGS.appointmentSizes.half, ...d.appointmentSizes?.half },
      full: { ...DEFAULT_SETTINGS.appointmentSizes.full, ...d.appointmentSizes?.full },
      double: { ...DEFAULT_SETTINGS.appointmentSizes.double, ...d.appointmentSizes?.double },
    },
  };
}

// Initialize data (now just a placeholder since we use API)
export const initializeData = async () => {
  // No longer needed since we fetch from API
  return Promise.resolve();
};

// Patient storage operations
export const patientsStorage = {
  getAll: async (): Promise<Patient[]> => {
    try {
      const patients = await apiCall('/patients') as Patient[];
      return syncCollectionCache(LS_KEYS.patients, patients);
    } catch (error) {
      if (!shouldUseOfflineFallback(error)) {
        throw error;
      }
      logOfflineFallback('patients', error);
      return readLS<Patient[]>(LS_KEYS.patients, []);
    }
  },
  
  add: async (patient: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient> => {
    const createdPatient = await apiCall('/patients', {
      method: 'POST',
      body: JSON.stringify({
        ...patient,
        createdAt: new Date().toISOString()
      }),
    }) as Patient;

    const all = readLS<Patient[]>(LS_KEYS.patients, []);
    syncCollectionCache(LS_KEYS.patients, [...all, createdPatient]);
    return createdPatient;
  },
  
  update: async (id: string, updates: Partial<Patient>): Promise<Patient> => {
    const updatedPatient = await apiCall(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }) as Patient;

    const all = readLS<Patient[]>(LS_KEYS.patients, []);
    syncCollectionCache(
      LS_KEYS.patients,
      all.map((patient) => patient.id === id ? updatedPatient : patient)
    );

    const appointmentCache = readLS<Appointment[]>(LS_KEYS.appointments, []);
    syncCollectionCache(
      LS_KEYS.appointments,
      appointmentCache.map((appointment) =>
        appointment.patientId === id
          ? { ...appointment, patientName: buildPatientName(updatedPatient) }
          : appointment
      )
    );

    return updatedPatient;
  },
  
  delete: async (id: string): Promise<void> => {
    await apiCall(`/patients/${id}`, {
      method: 'DELETE',
    });

    const all = readLS<Patient[]>(LS_KEYS.patients, []);
    syncCollectionCache(
      LS_KEYS.patients,
      all.filter((patient) => patient.id !== id)
    );

    const appointmentCache = readLS<Appointment[]>(LS_KEYS.appointments, []);
    syncCollectionCache(
      LS_KEYS.appointments,
      appointmentCache.filter((appointment) => appointment.patientId !== id)
    );
  }
};

// Appointment storage operations
export const appointmentsStorage = {
  getAll: async (): Promise<Appointment[]> => {
    try {
      const appointments = await apiCall('/appointments') as Appointment[];
      return syncCollectionCache(LS_KEYS.appointments, appointments);
    } catch (error) {
      if (!shouldUseOfflineFallback(error)) {
        throw error;
      }
      logOfflineFallback('appointments', error);
      return readLS<Appointment[]>(LS_KEYS.appointments, []);
    }
  },
  
  add: async (appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
    const createdAppointment = await apiCall('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        ...appointment,
        createdAt: new Date().toISOString()
      }),
    }) as Appointment;

    const all = readLS<Appointment[]>(LS_KEYS.appointments, []);
    syncCollectionCache(LS_KEYS.appointments, [...all, createdAppointment]);
    return createdAppointment;
  },
  
  update: async (id: string, updates: Partial<Appointment>): Promise<Appointment> => {
    const updatedAppointment = await apiCall(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }) as Appointment;

    const all = readLS<Appointment[]>(LS_KEYS.appointments, []);
    syncCollectionCache(
      LS_KEYS.appointments,
      all.map((appointment) => appointment.id === id ? updatedAppointment : appointment)
    );
    return updatedAppointment;
  },
  
  delete: async (id: string): Promise<void> => {
    await apiCall(`/appointments/${id}`, {
      method: 'DELETE',
    });

    const all = readLS<Appointment[]>(LS_KEYS.appointments, []);
    syncCollectionCache(
      LS_KEYS.appointments,
      all.filter((appointment) => appointment.id !== id)
    );
  },
  
  getByPatient: async (patientId: string): Promise<Appointment[]> => {
    const appointments = await appointmentsStorage.getAll();
    return appointments.filter((appointment) => appointment.patientId === patientId);
  },
  
  getByDate: async (date: string): Promise<Appointment[]> => {
    const appointments = await appointmentsStorage.getAll();
    return appointments.filter((appointment) => {
      const start = appointment.startTime || (appointment as any).start;
      if (!start) {
        return false;
      }
      return new Date(start).toISOString().slice(0, 10) === date;
    });
  }
};

// Settings storage operations
export const settingsStorage = {
  get: async (): Promise<AppointmentSettings> => {
    try {
      const data = normalizeSettings(await apiCall('/settings'));
      return syncSettingsCache(data);
    } catch (error) {
      if (!shouldUseOfflineFallback(error)) {
        throw error;
      }
      logOfflineFallback('settings', error);
      return normalizeSettings(readLS<Partial<AppointmentSettings>>(LS_KEYS.settings, {}));
    }
  },
  
  save: async (settings: AppointmentSettings): Promise<AppointmentSettings> => {
    const data = normalizeSettings(await apiCall('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }));

    return syncSettingsCache(data);
  },
  
  update: async (updates: Partial<AppointmentSettings>): Promise<AppointmentSettings> => {
    const data = normalizeSettings(await apiCall('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }));

    return syncSettingsCache(data);
  }
};

// Data management for export/import
export const dataManagement = {
  exportAll: async () => {
    const patients = await patientsStorage.getAll();
    const appointments = await appointmentsStorage.getAll();
    const settings = await settingsStorage.get();
    
    const allData = {
      patients,
      appointments,
      settings,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medical-data-export.json';
    a.click();
    URL.revokeObjectURL(url);
  },

  importAll: async (data: any) => {
    // Since we now use API, we'll need to recreate all the data
    try {
      if (data.settings) {
        await settingsStorage.save(data.settings);
      }
      if (data.patients) {
        // Note: This is a simplified import - in production you'd want better handling
        for (const patient of data.patients) {
          await patientsStorage.add(patient);
        }
      }
      if (data.appointments) {
        for (const appointment of data.appointments) {
          await appointmentsStorage.add(appointment);
        }
      }
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }
};
