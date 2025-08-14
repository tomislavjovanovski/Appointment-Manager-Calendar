import { Patient, Appointment, AppointmentSettings } from '@/types/appointment';

// Default settings
const defaultSettings: AppointmentSettings = {
  workingDays: [1, 2, 3, 4, 5], // Monday to Friday
  startTime: '09:00',
  endTime: '17:00',
  appointmentSizes: {
    half: { duration: 30, label: 'Half Hour' },
    full: { duration: 60, label: 'Full Hour' },
    double: { duration: 120, label: 'Double Hour' }
  },
  breakTime: 15
};

// Storage keys
const STORAGE_KEYS = {
  PATIENTS: 'appointment_patients',
  APPOINTMENTS: 'appointment_appointments',
  SETTINGS: 'appointment_settings'
};

// Patient storage
export const patientsStorage = {
  getAll: (): Patient[] => {
    const data = localStorage.getItem(STORAGE_KEYS.PATIENTS);
    return data ? JSON.parse(data) : [];
  },
  
  save: (patients: Patient[]): void => {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
  },
  
  add: (patient: Omit<Patient, 'id' | 'createdAt'>): Patient => {
    const patients = patientsStorage.getAll();
    const newPatient: Patient = {
      ...patient,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    patients.push(newPatient);
    patientsStorage.save(patients);
    return newPatient;
  },
  
  update: (id: string, updates: Partial<Patient>): void => {
    const patients = patientsStorage.getAll();
    const index = patients.findIndex(p => p.id === id);
    if (index !== -1) {
      patients[index] = { ...patients[index], ...updates };
      patientsStorage.save(patients);
    }
  },
  
  delete: (id: string): void => {
    const patients = patientsStorage.getAll().filter(p => p.id !== id);
    patientsStorage.save(patients);
  }
};

// Appointment storage
export const appointmentsStorage = {
  getAll: (): Appointment[] => {
    const data = localStorage.getItem(STORAGE_KEYS.APPOINTMENTS);
    return data ? JSON.parse(data) : [];
  },
  
  save: (appointments: Appointment[]): void => {
    localStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(appointments));
  },
  
  add: (appointment: Omit<Appointment, 'id' | 'createdAt'>): Appointment => {
    const appointments = appointmentsStorage.getAll();
    const newAppointment: Appointment = {
      ...appointment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    appointments.push(newAppointment);
    appointmentsStorage.save(appointments);
    return newAppointment;
  },
  
  update: (id: string, updates: Partial<Appointment>): void => {
    const appointments = appointmentsStorage.getAll();
    const index = appointments.findIndex(a => a.id === id);
    if (index !== -1) {
      appointments[index] = { ...appointments[index], ...updates };
      appointmentsStorage.save(appointments);
    }
  },
  
  delete: (id: string): void => {
    const appointments = appointmentsStorage.getAll().filter(a => a.id !== id);
    appointmentsStorage.save(appointments);
  },
  
  getByPatient: (patientId: string): Appointment[] => {
    return appointmentsStorage.getAll().filter(a => a.patientId === patientId);
  },
  
  getByDate: (date: string): Appointment[] => {
    return appointmentsStorage.getAll().filter(a => a.date === date);
  }
};

// Settings storage
export const settingsStorage = {
  get: (): AppointmentSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data ? { ...defaultSettings, ...JSON.parse(data) } : defaultSettings;
  },
  
  save: (settings: AppointmentSettings): void => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },
  
  update: (updates: Partial<AppointmentSettings>): void => {
    const current = settingsStorage.get();
    const updated = { ...current, ...updates };
    settingsStorage.save(updated);
  }
};

// Export/Import functionality
export const dataManagement = {
  exportAll: () => {
    return {
      patients: patientsStorage.getAll(),
      appointments: appointmentsStorage.getAll(),
      settings: settingsStorage.get(),
      exportedAt: new Date().toISOString()
    };
  },
  
  importAll: (data: any) => {
    if (data.patients) patientsStorage.save(data.patients);
    if (data.appointments) appointmentsStorage.save(data.appointments);
    if (data.settings) settingsStorage.save(data.settings);
  }
};