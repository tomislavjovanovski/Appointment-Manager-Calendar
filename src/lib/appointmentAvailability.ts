import type { Appointment, AppointmentSettings } from '@/types/appointment';

export function getWorkingTimeSlots(
  day: Date,
  settings: AppointmentSettings,
  duration = 15,
): Date[] {
  if (!Number.isFinite(day.getTime()) || !settings.workingDays.includes(day.getDay())) return [];

  const parseTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  const opening = parseTime(settings.startTime);
  const closing = parseTime(settings.endTime);
  if (!Number.isFinite(opening) || !Number.isFinite(closing) || closing <= opening) return [];

  const slots: Date[] = [];
  for (let minute = Math.ceil(opening / 15) * 15; minute + duration <= closing; minute += 15) {
    const start = new Date(day);
    start.setHours(0, minute, 0, 0);
    slots.push(start);
  }
  return slots;
}

export function getAvailableStarts(
  day: Date,
  duration: number,
  settings: AppointmentSettings,
  appointments: Appointment[],
  excludedId?: string,
): Date[] {
  if (![30, 45, 60, 90, 120].includes(duration)) return [];
  const occupied = appointments.filter((appointment) => appointment.id !== excludedId).map((appointment) => ({
    start: new Date(appointment.startTime).getTime(),
    end: new Date(appointment.endTime).getTime(),
  }));
  return getWorkingTimeSlots(day, settings, duration).filter((start) => {
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + duration);
    return !occupied.some((appointment) => start.getTime() < appointment.end && end.getTime() > appointment.start);
  });
}

export function getAvailableStartDurations(
  day: Date,
  requestedDuration: number,
  settings: AppointmentSettings,
  appointments: Appointment[],
  excludedId?: string,
): Map<number, number> {
  const durations = new Map<number, number>();
  for (const duration of [120, 90, 60, 45, 30]) {
    if (duration > requestedDuration) continue;
    for (const start of getAvailableStarts(day, duration, settings, appointments, excludedId)) {
      if (!durations.has(start.getTime())) durations.set(start.getTime(), duration);
    }
  }
  return durations;
}