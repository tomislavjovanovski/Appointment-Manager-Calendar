import { Patient, Appointment, AppointmentSettings } from '@/types/appointment';
import type { AppLocale } from '@/i18n/types';

// API base URL
// Use relative path to work in preview; will fail if backend isn't running
const API_BASE_URL = '/api';

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
    throw new Error(`API call failed: ${response.statusText}`);
  }
  
  return response.json();
};

// Local fallback helpers (used when API is unavailable)
const LS_KEYS = {
  patients: 'ls_patients',
  appointments: 'ls_appointments',
  settings: 'ls_settings',
};

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

const generateId = () => {
  try {
    // @ts-ignore
    const uuid = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : null;
    return uuid ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }
};

const DEFAULT_SETTINGS: AppointmentSettings = {
  locale: 'en',
  workingDays: [1, 2, 3, 4, 5],
  startTime: '09:00',
  endTime: '17:00',
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
      return await apiCall('/patients');
    } catch {
      return readLS<Patient[]>(LS_KEYS.patients, []);
    }
  },
  
  add: async (patient: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient> => {
    try {
      return await apiCall('/patients', {
        method: 'POST',
        body: JSON.stringify({
          ...patient,
          createdAt: new Date().toISOString()
        }),
      });
    } catch {
      const all = readLS<Patient[]>(LS_KEYS.patients, []);
      const newPatient: Patient = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        ...(patient as any),
      } as Patient;
      all.push(newPatient);
      writeLS(LS_KEYS.patients, all);
      return newPatient;
    }
  },
  
  update: async (id: string, updates: Partial<Patient>): Promise<Patient> => {
    try {
      return await apiCall(`/patients/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      const all = readLS<Patient[]>(LS_KEYS.patients, []);
      const idx = all.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Patient not found (offline)');
      all[idx] = { ...all[idx], ...updates } as Patient;
      writeLS(LS_KEYS.patients, all);
      return all[idx];
    }
  },
  
  delete: async (id: string): Promise<void> => {
    try {
      await apiCall(`/patients/${id}`, {
        method: 'DELETE',
      });
    } catch {
      const all = readLS<Patient[]>(LS_KEYS.patients, []);
      const next = all.filter(p => p.id !== id);
      writeLS(LS_KEYS.patients, next);
    }
  }
};

// Appointment storage operations
export const appointmentsStorage = {
  getAll: async (): Promise<Appointment[]> => {
    try {
      return await apiCall('/appointments');
    } catch {
      return readLS<Appointment[]>(LS_KEYS.appointments, []);
    }
  },
  
  add: async (appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
    try {
      return await apiCall('/appointments', {
        method: 'POST',
        body: JSON.stringify({
          ...appointment,
          createdAt: new Date().toISOString()
        }),
      });
    } catch {
      const all = readLS<Appointment[]>(LS_KEYS.appointments, []);
      const newApt: Appointment = {
        id: generateId(),
        createdAt: new Date().toISOString(),
        ...(appointment as any),
      } as Appointment;
      all.push(newApt);
      writeLS(LS_KEYS.appointments, all);
      return newApt;
    }
  },
  
  update: async (id: string, updates: Partial<Appointment>): Promise<Appointment> => {
    try {
      return await apiCall(`/appointments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    } catch {
      const all = readLS<Appointment[]>(LS_KEYS.appointments, []);
      const idx = all.findIndex(a => a.id === id);
      if (idx === -1) throw new Error('Appointment not found (offline)');
      all[idx] = { ...all[idx], ...updates } as Appointment;
      writeLS(LS_KEYS.appointments, all);
      return all[idx];
    }
  },
  
  delete: async (id: string): Promise<void> => {
    try {
      await apiCall(`/appointments/${id}`, {
        method: 'DELETE',
      });
    } catch {
      const all = readLS<Appointment[]>(LS_KEYS.appointments, []);
      const next = all.filter(a => a.id !== id);
      writeLS(LS_KEYS.appointments, next);
    }
  },
  
  getByPatient: async (patientId: string): Promise<Appointment[]> => {
    try {
      const appointments = await apiCall('/appointments');
      return appointments.filter((a: any) => a.patientId === patientId);
    } catch {
      const appointments = readLS<Appointment[]>(LS_KEYS.appointments, []);
      return appointments.filter((a) => a.patientId === patientId);
    }
  },
  
  getByDate: async (date: string): Promise<Appointment[]> => {
    try {
      const appointments = await apiCall('/appointments');
      return appointments.filter((a: any) => a.date === date);
    } catch {
      const appointments = readLS<Appointment[]>(LS_KEYS.appointments, []);
      return appointments.filter((a) => a.date === date);
    }
  }
};

// Settings storage operations
export const settingsStorage = {
  get: async (): Promise<AppointmentSettings> => {
    try {
      const data = await apiCall('/settings');
      return normalizeSettings(data);
    } catch {
      return normalizeSettings(readLS<Partial<AppointmentSettings>>(LS_KEYS.settings, {}));
    }
  },
  
  save: async (settings: AppointmentSettings): Promise<AppointmentSettings> => {
    try {
      const data = await apiCall('/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      });
      return normalizeSettings(data);
    } catch {
      writeLS(LS_KEYS.settings, settings);
      return normalizeSettings(settings);
    }
  },
  
  update: async (updates: Partial<AppointmentSettings>): Promise<AppointmentSettings> => {
    try {
      const data = await apiCall('/settings', {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return normalizeSettings(data);
    } catch {
      const current = normalizeSettings(readLS<Partial<AppointmentSettings>>(LS_KEYS.settings, {}));
      const next = { ...current, ...updates } as AppointmentSettings;
      writeLS(LS_KEYS.settings, next);
      return normalizeSettings(next);
    }
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