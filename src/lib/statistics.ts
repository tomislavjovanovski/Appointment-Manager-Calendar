import { eachDayOfInterval, endOfMonth, format, isValid, startOfMonth } from 'date-fns';
import type { Appointment, AppointmentSettings } from '@/types/appointment';
import { APPOINTMENT_TYPE_VALUES, type AppointmentType } from '@/lib/appointmentTypes';

const EXCLUDED_STATUSES = new Set<Appointment['status']>(['cancelled', 'no-show']);

export type TypeKey = AppointmentType | 'other';

export interface TypeStatistics {
  type: TypeKey;
  count: number;
  minutes: number;
}

export interface MonthStatistics {
  scheduledWorkingDays: number;
  daysWithAppointments: number;
  totalAppointments: number;
  uniquePatients: number;
  /** Patients whose first appointment ever falls in this month. */
  newPatients: number;
  returningPatients: number;
  bookedMinutes: number;
  byType: TypeStatistics[];
}

const startOf = (appointment: Appointment) => new Date(appointment.startTime);

const patientKey = (appointment: Appointment) =>
  appointment.patientId || appointment.patientName?.trim().toLowerCase() || '';

const durationMinutes = (appointment: Appointment) => {
  const minutes = Math.round((new Date(appointment.endTime).getTime() - startOf(appointment).getTime()) / 60_000);
  if (Number.isFinite(minutes) && minutes > 0) return minutes;
  return Number(appointment.duration) || 0;
};

const typeOf = (appointment: Appointment): TypeKey =>
  (APPOINTMENT_TYPE_VALUES as readonly string[]).includes(appointment.type) ? appointment.type : 'other';

/** Appointments that count towards statistics: valid start time and not cancelled or no-show. */
export const countedAppointments = (appointments: Appointment[]) =>
  appointments.filter((appointment) => isValid(startOf(appointment)) && !EXCLUDED_STATUSES.has(appointment.status));

export function getMonthStatistics(
  appointments: Appointment[],
  settings: Pick<AppointmentSettings, 'workingDays'>,
  month: Date,
): MonthStatistics {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const counted = countedAppointments(appointments);
  const inMonth = counted.filter((appointment) => {
    const start = startOf(appointment);
    return start >= monthStart && start <= monthEnd;
  });

  const scheduledWorkingDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
    .filter((day) => settings.workingDays?.includes(day.getDay())).length;
  const daysWithAppointments = new Set(inMonth.map((appointment) => format(startOf(appointment), 'yyyy-MM-dd'))).size;

  const firstVisit = new Map<string, number>();
  for (const appointment of counted) {
    const key = patientKey(appointment);
    if (!key) continue;
    const time = startOf(appointment).getTime();
    if (time < (firstVisit.get(key) ?? Infinity)) firstVisit.set(key, time);
  }
  const patients = new Set(inMonth.map(patientKey).filter(Boolean));
  const newPatients = [...patients].filter((key) => (firstVisit.get(key) ?? 0) >= monthStart.getTime()).length;

  const byType = new Map<TypeKey, TypeStatistics>(
    [...APPOINTMENT_TYPE_VALUES, 'other' as const].map((type) => [type, { type, count: 0, minutes: 0 }]),
  );
  for (const appointment of inMonth) {
    const entry = byType.get(typeOf(appointment))!;
    entry.count += 1;
    entry.minutes += durationMinutes(appointment);
  }

  return {
    scheduledWorkingDays,
    daysWithAppointments,
    totalAppointments: inMonth.length,
    uniquePatients: patients.size,
    newPatients,
    returningPatients: patients.size - newPatients,
    bookedMinutes: inMonth.reduce((sum, appointment) => sum + durationMinutes(appointment), 0),
    byType: [...byType.values()],
  };
}
