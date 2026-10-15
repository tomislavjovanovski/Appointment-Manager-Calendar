import type { AppLocale } from '@/i18n/types';
import type { AppointmentType, AppointmentDuration } from '@/lib/appointmentTypes';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
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
  title: string;
  patientId: string;
  patientName: string;
  /** ISO timestamp */
  startTime: string;
  /** ISO timestamp */
  endTime: string;
  duration: AppointmentDuration; // in minutes
  type: AppointmentType;
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
  practiceName?: string;
  logoDataUrl?: string;
  workingDays: number[]; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  /** Per-weekday overrides of startTime/endTime, keyed by day (0 = Sunday). */
  dailyHours?: Partial<Record<number, { startTime: string; endTime: string }>>;
  appointmentSizes: {
    half: { duration: 30; label: 'Half Hour' };
    full: { duration: 60; label: 'Full Hour' };
    double: { duration: 120; label: 'Double Hour' };
  };
  breakTime: number; // minutes between appointments
  timeSlotMinutes: 15 | 30 | 60; // grid/time step in minutes
  appointmentTypeDurations?: Partial<Record<AppointmentType, AppointmentDuration>>;
  defaultAppointmentType?: AppointmentType;
  notifications: NotificationSettings;
}
