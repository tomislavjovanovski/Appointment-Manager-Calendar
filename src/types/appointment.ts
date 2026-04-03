import type { AppLocale } from '@/i18n/types';

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

export interface NotificationSettings {
  emailWebhookUrl: string;
  smsWebhookUrl: string;
  emailNotificationTime: string; // time to send notifications (e.g., "09:00")
  smsNotificationTime: string;
  enableDayBeforeEmail: boolean;
  enableSameDayEmail: boolean;
  enableSameDaySMS: boolean;
  emailTemplate: string; // HTML template for emails
  smsTemplate: string; // SMS message template
}

export interface AppointmentSettings {
  /** UI language; persisted with other settings */
  locale?: AppLocale;
  workingDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  appointmentSizes: {
    half: { duration: 30; label: 'Half Hour' };
    full: { duration: 60; label: 'Full Hour' };
    double: { duration: 120; label: 'Double Hour' };
  };
  breakTime: number; // minutes between appointments
  timeSlotMinutes: 15 | 30 | 60; // grid/time step in minutes
  notifications: NotificationSettings;
}