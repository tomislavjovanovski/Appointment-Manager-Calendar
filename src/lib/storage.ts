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

// In-memory storage
let patientsData: Patient[] = [];
let appointmentsData: Appointment[] = [];
let settingsData: AppointmentSettings = defaultSettings;
let isInitialized = false;

// Initialize data from JSON files
const initializeData = async (): Promise<void> => {
  if (isInitialized) return;
  
  try {
    // Load patients
    const patientsResponse = await fetch('/data/patients.json');
    if (patientsResponse.ok) {
      patientsData = await patientsResponse.json();
    }
    
    // Load appointments
    const appointmentsResponse = await fetch('/data/appointments.json');
    if (appointmentsResponse.ok) {
      appointmentsData = await appointmentsResponse.json();
    }
    
    // Load settings
    const settingsResponse = await fetch('/data/settings.json');
    if (settingsResponse.ok) {
      settingsData = { ...defaultSettings, ...(await settingsResponse.json()) };
    }
    
    isInitialized = true;
  } catch (error) {
    console.warn('Could not load initial data from JSON files:', error);
    isInitialized = true;
  }
};

// Auto-save to downloadable JSON files
const saveToFile = (data: any, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

// Patient storage
export const patientsStorage = {
  getAll: async (): Promise<Patient[]> => {
    await initializeData();
    return [...patientsData];
  },
  
  save: (patients: Patient[]): void => {
    patientsData = [...patients];
    saveToFile(patientsData, 'patients.json');
  },
  
  add: async (patient: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient> => {
    await initializeData();
    const newPatient: Patient = {
      ...patient,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    patientsData.push(newPatient);
    saveToFile(patientsData, 'patients.json');
    return newPatient;
  },
  
  update: async (id: string, updates: Partial<Patient>): Promise<void> => {
    await initializeData();
    const index = patientsData.findIndex(p => p.id === id);
    if (index !== -1) {
      patientsData[index] = { ...patientsData[index], ...updates };
      saveToFile(patientsData, 'patients.json');
    }
  },
  
  delete: async (id: string): Promise<void> => {
    await initializeData();
    patientsData = patientsData.filter(p => p.id !== id);
    saveToFile(patientsData, 'patients.json');
  }
};

// Appointment storage
export const appointmentsStorage = {
  getAll: async (): Promise<Appointment[]> => {
    await initializeData();
    return [...appointmentsData];
  },
  
  save: (appointments: Appointment[]): void => {
    appointmentsData = [...appointments];
    saveToFile(appointmentsData, 'appointments.json');
  },
  
  add: async (appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
    await initializeData();
    const newAppointment: Appointment = {
      ...appointment,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    appointmentsData.push(newAppointment);
    saveToFile(appointmentsData, 'appointments.json');
    return newAppointment;
  },
  
  update: async (id: string, updates: Partial<Appointment>): Promise<void> => {
    await initializeData();
    const index = appointmentsData.findIndex(a => a.id === id);
    if (index !== -1) {
      appointmentsData[index] = { ...appointmentsData[index], ...updates };
      saveToFile(appointmentsData, 'appointments.json');
    }
  },
  
  delete: async (id: string): Promise<void> => {
    await initializeData();
    appointmentsData = appointmentsData.filter(a => a.id !== id);
    saveToFile(appointmentsData, 'appointments.json');
  },
  
  getByPatient: async (patientId: string): Promise<Appointment[]> => {
    await initializeData();
    return appointmentsData.filter(a => a.patientId === patientId);
  },
  
  getByDate: async (date: string): Promise<Appointment[]> => {
    await initializeData();
    return appointmentsData.filter(a => a.date === date);
  }
};

// Settings storage
export const settingsStorage = {
  get: async (): Promise<AppointmentSettings> => {
    await initializeData();
    return { ...settingsData };
  },
  
  save: (settings: AppointmentSettings): void => {
    settingsData = { ...settings };
    saveToFile(settingsData, 'settings.json');
  },
  
  update: async (updates: Partial<AppointmentSettings>): Promise<void> => {
    await initializeData();
    settingsData = { ...settingsData, ...updates };
    saveToFile(settingsData, 'settings.json');
  }
};

// Export/Import functionality
export const dataManagement = {
  exportAll: async () => {
    await initializeData();
    return {
      patients: [...patientsData],
      appointments: [...appointmentsData],
      settings: { ...settingsData },
      exportedAt: new Date().toISOString()
    };
  },
  
  importAll: (data: any) => {
    if (data.patients) {
      patientsData = data.patients;
      saveToFile(patientsData, 'patients.json');
    }
    if (data.appointments) {
      appointmentsData = data.appointments;
      saveToFile(appointmentsData, 'appointments.json');
    }
    if (data.settings) {
      settingsData = data.settings;
      saveToFile(settingsData, 'settings.json');
    }
  },
  
  // Load data from uploaded JSON files
  loadFromFiles: (files: { patients?: File; appointments?: File; settings?: File }) => {
    Object.entries(files).forEach(([type, file]) => {
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            if (type === 'patients') {
              patientsData = data;
            } else if (type === 'appointments') {
              appointmentsData = data;
            } else if (type === 'settings') {
              settingsData = { ...defaultSettings, ...data };
            }
          } catch (error) {
            console.error(`Error loading ${type} data:`, error);
          }
        };
        reader.readAsText(file);
      }
    });
  }
};