import { Patient, Appointment, AppointmentSettings } from '@/types/appointment';

// API base URL
const API_BASE_URL = 'http://localhost:3000/api';

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

// Initialize data (now just a placeholder since we use API)
export const initializeData = async () => {
  // No longer needed since we fetch from API
  return Promise.resolve();
};

// Patient storage operations
export const patientsStorage = {
  getAll: async (): Promise<Patient[]> => {
    return await apiCall('/patients');
  },
  
  add: async (patient: Omit<Patient, 'id' | 'createdAt'>): Promise<Patient> => {
    return await apiCall('/patients', {
      method: 'POST',
      body: JSON.stringify({
        ...patient,
        createdAt: new Date().toISOString()
      }),
    });
  },
  
  update: async (id: string, updates: Partial<Patient>): Promise<Patient> => {
    return await apiCall(`/patients/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  
  delete: async (id: string): Promise<void> => {
    await apiCall(`/patients/${id}`, {
      method: 'DELETE',
    });
  }
};

// Appointment storage operations
export const appointmentsStorage = {
  getAll: async (): Promise<Appointment[]> => {
    return await apiCall('/appointments');
  },
  
  add: async (appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
    return await apiCall('/appointments', {
      method: 'POST',
      body: JSON.stringify({
        ...appointment,
        createdAt: new Date().toISOString()
      }),
    });
  },
  
  update: async (id: string, updates: Partial<Appointment>): Promise<Appointment> => {
    return await apiCall(`/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },
  
  delete: async (id: string): Promise<void> => {
    await apiCall(`/appointments/${id}`, {
      method: 'DELETE',
    });
  },
  
  getByPatient: async (patientId: string): Promise<Appointment[]> => {
    const appointments = await apiCall('/appointments');
    return appointments.filter((a: any) => a.patientId === patientId);
  },
  
  getByDate: async (date: string): Promise<Appointment[]> => {
    const appointments = await apiCall('/appointments');
    return appointments.filter((a: any) => a.date === date);
  }
};

// Settings storage operations
export const settingsStorage = {
  get: async (): Promise<AppointmentSettings> => {
    return await apiCall('/settings');
  },
  
  save: async (settings: AppointmentSettings): Promise<AppointmentSettings> => {
    return await apiCall('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },
  
  update: async (updates: Partial<AppointmentSettings>): Promise<AppointmentSettings> => {
    return await apiCall('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
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