export interface Patient {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  emergencyContact: string;
  notes: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: 30 | 60 | 120; // in minutes
  type: 'consultation' | 'follow-up' | 'procedure';
  status: 'scheduled' | 'completed' | 'cancelled' | 'no-show';
  notes: string;
  createdAt: string;
}

export interface AppointmentSettings {
  workingDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  appointmentSizes: {
    half: { duration: 30; label: 'Half Hour' };
    full: { duration: 60; label: 'Full Hour' };
    double: { duration: 120; label: 'Double Hour' };
  };
  breakTime: number; // minutes between appointments
}