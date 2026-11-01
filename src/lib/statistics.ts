import { eachDayOfInterval, endOfMonth, format, isValid, startOfMonth } from 'date-fns';
import type { Appointment, AppointmentSettings } from '@/types/appointment';
import { APPOINTMENT_TYPE_VALUES, type AppointmentType } from '@/lib/appointmentTypes';

const EXCLUDED_STATUSES = new Set<Appointment['status']>(['cancelled', 'no-show']);

interface TimeInterval {
  start: number;
  end: number;
}

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
  /** Patients with at least one completed appointment during the month. */
  visitedPatients: number;
  /** Patients whose first completed appointment in retained history falls in this month. */
  newPatients: number;
  returningPatients: number;
  bookedMinutes: number;
  utilizationBookedMinutes: number | null;
  utilizationAvailableMinutes: number | null;
  utilizationPercent: number | null;
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

const parseTime = (value: string) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
};

const mergeIntervals = (intervals: TimeInterval[]) =>
  intervals
    .filter(({ start, end }) => Number.isFinite(start) && Number.isFinite(end) && end > start)
    .sort((left, right) => left.start - right.start)
    .reduce<TimeInterval[]>((merged, interval) => {
      const last = merged[merged.length - 1];
      if (last && interval.start <= last.end) last.end = Math.max(last.end, interval.end);
      else merged.push({ ...interval });
      return merged;
    }, []);

const intervalMinutes = (intervals: TimeInterval[]) =>
  intervals.reduce((total, { start, end }) => total + (end - start) / 60_000, 0);

function subtractBlockedSlots(
  start: number,
  end: number,
  appointments: Appointment[],
  settings: Pick<AppointmentSettings, 'blockedSlots'>,
) {
  const blocked = mergeIntervals((settings.blockedSlots ?? []).map((slot) => ({
    start: Math.max(start, new Date(slot.startTime).getTime()),
    end: Math.min(end, new Date(slot.endTime).getTime()),
  })));
  const available: TimeInterval[] = [];
  let cursor = start;

  for (const interval of blocked) {
    if (interval.start > cursor) available.push({ start: cursor, end: interval.start });
    cursor = Math.max(cursor, interval.end);
  }
  if (cursor < end) available.push({ start: cursor, end });

  const booked = mergeIntervals(appointments.flatMap((appointment) => {
    const appointmentStart = startOf(appointment).getTime();
    const appointmentEnd = new Date(appointment.endTime).getTime();
    if (!Number.isFinite(appointmentEnd) || appointmentEnd <= appointmentStart) return [];
    return available.flatMap((interval) => {
      const clippedStart = Math.max(interval.start, appointmentStart);
      const clippedEnd = Math.min(interval.end, appointmentEnd);
      return clippedEnd > clippedStart ? [{ start: clippedStart, end: clippedEnd }] : [];
    });
  }));

  return { available, booked };
}

export function getMonthStatistics(
  appointments: Appointment[],
  settings: Pick<AppointmentSettings, 'workingDays' | 'startTime' | 'endTime' | 'dailyHours' | 'blockedSlots'>,
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

  const completed = counted.filter((appointment) => appointment.status === 'completed');
  const completedInMonth = completed.filter((appointment) => {
    const start = startOf(appointment);
    return start >= monthStart && start <= monthEnd;
  });
  const firstCompletedVisit = new Map<string, number>();
  for (const appointment of completed) {
    const key = patientKey(appointment);
    if (!key) continue;
    const time = startOf(appointment).getTime();
    if (time < (firstCompletedVisit.get(key) ?? Infinity)) firstCompletedVisit.set(key, time);
  }
  const visited = new Set(completedInMonth.map(patientKey).filter(Boolean));
  const newPatients = [...visited].filter((key) => {
    const firstVisit = firstCompletedVisit.get(key);
    return firstVisit !== undefined && firstVisit >= monthStart.getTime() && firstVisit <= monthEnd.getTime();
  }).length;

  const appointmentsByWorkingDay = new Map<string, { day: Date; appointments: Appointment[] }>();
  for (const appointment of inMonth) {
    const day = startOf(appointment);
    if (!settings.workingDays?.includes(day.getDay())) continue;
    const key = format(day, 'yyyy-MM-dd');
    const entry = appointmentsByWorkingDay.get(key) ?? { day, appointments: [] };
    entry.appointments.push(appointment);
    appointmentsByWorkingDay.set(key, entry);
  }

  let utilizationAvailableMinutes = 0;
  let utilizationBookedMinutes = 0;
  let hasInvalidSchedule = false;
  for (const { day, appointments: dayAppointments } of appointmentsByWorkingDay.values()) {
    const hours = settings.dailyHours?.[day.getDay()] ?? settings;
    const opening = parseTime(hours.startTime);
    const closing = parseTime(hours.endTime);
    if (opening === null || closing === null || closing < opening) {
      hasInvalidSchedule = true;
      break;
    }

    const scheduleStart = new Date(day);
    scheduleStart.setHours(0, opening, 0, 0);
    const scheduleEnd = new Date(day);
    scheduleEnd.setHours(0, closing, 0, 0);
    const { available, booked } = subtractBlockedSlots(
      scheduleStart.getTime(),
      scheduleEnd.getTime(),
      dayAppointments,
      settings,
    );
    utilizationAvailableMinutes += intervalMinutes(available);
    utilizationBookedMinutes += intervalMinutes(booked);
  }

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
    uniquePatients: new Set(inMonth.map(patientKey).filter(Boolean)).size,
    visitedPatients: visited.size,
    newPatients,
    returningPatients: visited.size - newPatients,
    bookedMinutes: inMonth.reduce((sum, appointment) => sum + durationMinutes(appointment), 0),
    utilizationBookedMinutes: hasInvalidSchedule ? null : utilizationBookedMinutes,
    utilizationAvailableMinutes: hasInvalidSchedule ? null : utilizationAvailableMinutes,
    utilizationPercent: hasInvalidSchedule
      ? null
      : utilizationAvailableMinutes === 0
        ? 0
        : (utilizationBookedMinutes / utilizationAvailableMinutes) * 100,
    byType: [...byType.values()],
  };
}
