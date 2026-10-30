import { Patient, PatientWithActivity, Appointment, AppointmentSettings } from '@/types/appointment';
import { normalizeLocale, type AppLocale } from '@/i18n/types';
import { normalizePatientForm, normalizePatientUpdates } from '@/lib/patientForm';
import { authFetch } from '@/lib/auth';
import { DEFAULT_APPOINTMENT_TYPE_DURATIONS } from '@/lib/appointmentTypes';
import type { FzoRow, ImportPreview } from '@/lib/fzoImport';

export const patientImportStorage = {
  preview: (rows: FzoRow[]): Promise<ImportPreview> =>
    apiCall('/patients/import/preview', { method: 'POST', body: JSON.stringify({ rows }) }),
  confirm: (rows: FzoRow[], revision: string): Promise<{
    added: number; updated: number; unchanged: number; review: number; duplicate: number;
  }> => apiCall('/patients/import', { method: 'POST', body: JSON.stringify({ rows, revision }) }),
};

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');
const LOCAL_HOST_PATTERN = /^(localhost|127(?:\.\d{1,3}){3}|0\.0\.0\.0|::1|\[::1\])$/i;
const PRIVATE_NETWORK_HOST_PATTERN =
  /^(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})$/;

const isLikelyLocalBackendHost = (hostname: string) =>
  LOCAL_HOST_PATTERN.test(hostname) || PRIVATE_NETWORK_HOST_PATTERN.test(hostname);

const resolveApiBaseUrl = () => {
  const configuredBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL ?? '');
  if (configuredBaseUrl) {
    return configuredBaseUrl.endsWith('/api') ? configuredBaseUrl : `${configuredBaseUrl}/api`;
  }

  if (import.meta.env.DEV) {
    return '/api';
  }

  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    if (port !== '3000' && isLikelyLocalBackendHost(hostname)) {
      return `${protocol}//${hostname}:3000/api`;
    }
  }

  return '/api';
};

export const API_BASE_URL = resolveApiBaseUrl();
export const buildApiUrl = (endpoint: string) => `${API_BASE_URL}${endpoint}`;

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
const pendingReads = new Map<string, Promise<unknown>>();

const apiCall = (endpoint: string, options: RequestInit = {}): Promise<any> => {
  const shareRead = (options.method ?? 'GET').toUpperCase() === 'GET' && !options.signal;
  const pending = shareRead ? pendingReads.get(endpoint) : undefined;
  if (pending !== undefined) return pending;
  const request = performApiCall(endpoint, options);
  if (!shareRead) return request;
  const shared = request.finally(() => { pendingReads.delete(endpoint); });
  pendingReads.set(endpoint, shared);
  return shared;
};

const performApiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await authFetch(buildApiUrl(endpoint), {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
    signal: options.signal ?? ((options.method ?? 'GET').toUpperCase() === 'GET'
      ? AbortSignal.timeout(10_000)
      : undefined),
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

const DEFAULT_SETTINGS: AppointmentSettings = {
  locale: 'mk',
  blockedSlots: [],
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
  appointmentTypeDurations: { ...DEFAULT_APPOINTMENT_TYPE_DURATIONS },
  defaultAppointmentType: 'procedure',
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
  const locale: AppLocale = normalizeLocale(d.locale);
  return {
    ...DEFAULT_SETTINGS,
    ...d,
    locale,
    workingDays: Array.isArray(d.workingDays) ? d.workingDays : DEFAULT_SETTINGS.workingDays,
    blockedSlots: Array.isArray(d.blockedSlots) ? d.blockedSlots : [],
    notifications: { ...DEFAULT_SETTINGS.notifications, ...d.notifications },
    appointmentTypeDurations: { ...DEFAULT_APPOINTMENT_TYPE_DURATIONS, ...d.appointmentTypeDurations },
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
  getAll: async (): Promise<Patient[]> => apiCall('/patients') as Promise<Patient[]>,
  getWithActivity: async (): Promise<PatientWithActivity[]> => apiCall('/patients') as Promise<PatientWithActivity[]>,

  resolve: async (patient: Omit<Patient, 'id' | 'createdAt'>): Promise<{ patient: Patient; reused: boolean }> =>
    apiCall('/patients/resolve', {
      method: 'POST',
      body: JSON.stringify(normalizePatientForm(patient)),
    }),

  merge: async (targetId: string, sourceIds: string[]): Promise<Patient> =>
    apiCall('/patients/merge', {
      method: 'POST',
      body: JSON.stringify({ targetId, sourceIds }),
    }),
  
  add: async (patient: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient> => {
    const payload = {
      ...normalizePatientForm(patient),
      createdAt: new Date().toISOString(),
    };

    return apiCall('/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<Patient>;
  },
  
  update: async (id: string, updates: Partial<Patient>): Promise<Patient> => {
    const normalizedUpdates = normalizePatientUpdates(updates);
    return apiCall(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(normalizedUpdates),
    }) as Promise<Patient>;
  },
  
  delete: async (id: string): Promise<void> => {
    await apiCall(`/patients/${id}`, { method: 'DELETE' });
  }
};

// Appointment storage operations
export const appointmentsStorage = {
  getAll: async (): Promise<Appointment[]> => apiCall('/appointments') as Promise<Appointment[]>,
  
  add: async (appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
    const payload = {
      ...appointment,
      createdAt: new Date().toISOString(),
    };
    return apiCall('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }) as Promise<Appointment>;
  },
  
  update: async (id: string, updates: Partial<Appointment>): Promise<Appointment> => {
    return apiCall(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }) as Promise<Appointment>;
  },
  
  delete: async (id: string): Promise<void> => {
    await apiCall(`/appointments/${id}`, { method: 'DELETE' });
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
let cachedSettings: AppointmentSettings | null = null;
let settingsCachedAt = 0;
let settingsRevision = 0;

/** Drops cached API data, e.g. after logout, so the next user never sees the previous session's data. */
export const resetApiCaches = () => {
  pendingReads.clear();
  cachedSettings = null;
  settingsCachedAt = 0;
  settingsRevision += 1;
};

const cacheSettings = (settings: AppointmentSettings) => {
  cachedSettings = settings;
  settingsCachedAt = Date.now();
  return settings;
};

export const settingsStorage = {
  getCached: (): AppointmentSettings | null => cachedSettings,
  get: async (): Promise<AppointmentSettings> => {
    if (cachedSettings && Date.now() - settingsCachedAt < 5_000) return cachedSettings;
    const revision = settingsRevision;
    const settings = normalizeSettings(await apiCall('/settings'));
    if (revision !== settingsRevision && cachedSettings) return cachedSettings;
    return cacheSettings(settings);
  },
  
  save: async (settings: AppointmentSettings): Promise<AppointmentSettings> => {
    const saved = normalizeSettings(await apiCall('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }));
    settingsRevision += 1;
    return cacheSettings(saved);
  },
  
  update: async (updates: Partial<AppointmentSettings>): Promise<AppointmentSettings> => {
    const saved = normalizeSettings(await apiCall('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }));
    settingsRevision += 1;
    return cacheSettings(saved);
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
