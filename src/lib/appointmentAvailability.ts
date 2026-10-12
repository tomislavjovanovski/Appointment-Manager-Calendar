import type { Appointment, AppointmentSettings } from '@/types/appointment';

export const parseTimeMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

export function getDayHours(settings: AppointmentSettings, weekday: number) {
  return settings.dailyHours?.[weekday] ?? { startTime: settings.startTime, endTime: settings.endTime };
}

export function getWorkingTimeSlots(
  day: Date,
  settings: AppointmentSettings,
  duration = 15,
): Date[] {
  if (!Number.isFinite(day.getTime()) || !settings.workingDays.includes(day.getDay())) return [];

  const hours = getDayHours(settings, day.getDay());
  const opening = parseTimeMinutes(hours.startTime);
  const closing = parseTimeMinutes(hours.endTime);
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

export function getFreeGaps(
  day: Date,
  settings: AppointmentSettings,
  appointments: Appointment[],
  notBefore?: Date,
  minMinutes = 30,
): { start: Date; end: Date }[] {
  const occupied = appointments.map((appointment) => ({
    start: new Date(appointment.startTime).getTime(),
    end: new Date(appointment.endTime).getTime(),
  }));
  const gaps: { start: Date; end: Date }[] = [];
  for (const slot of getWorkingTimeSlots(day, settings)) {
    const slotEnd = slot.getTime() + 15 * 60_000;
    const isFree = (!notBefore || slot >= notBefore) &&
      !occupied.some((appointment) => slot.getTime() < appointment.end && slotEnd > appointment.start);
    const last = gaps[gaps.length - 1];
    if (isFree && last?.end.getTime() === slot.getTime()) last.end = new Date(slotEnd);
    else if (isFree) gaps.push({ start: slot, end: new Date(slotEnd) });
  }
  return gaps.filter((gap) => gap.end.getTime() - gap.start.getTime() >= minMinutes * 60_000);
}

export function splitIntoSlots(
  gaps: { start: Date; end: Date }[],
  slotMinutes = 30,
  minMinutes = 30,
): { start: Date; end: Date }[] {
  const nextBoundary = (date: Date) => {
    const boundary = new Date(date);
    const minutes = date.getHours() * 60 + date.getMinutes();
    boundary.setHours(0, (Math.floor(minutes / slotMinutes) + 1) * slotMinutes, 0, 0);
    return boundary;
  };
  const slots: { start: Date; end: Date }[] = [];
  for (const gap of gaps) {
    const firstIndex = slots.length;
    let start = gap.start;
    while (start < gap.end) {
      const boundary = nextBoundary(start);
      let end = boundary < gap.end ? boundary : gap.end;
      // A leading chunk too short to book is merged into the following slot.
      if (end.getTime() - start.getTime() < minMinutes * 60_000 && end < gap.end) {
        const following = nextBoundary(end);
        end = following < gap.end ? following : gap.end;
      }
      slots.push({ start, end });
      start = end;
    }
    const last = slots[slots.length - 1];
    if (slots.length - firstIndex > 1 && last.end.getTime() - last.start.getTime() < minMinutes * 60_000) {
      slots.pop();
      slots[slots.length - 1].end = last.end;
    }
  }
  return slots;
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