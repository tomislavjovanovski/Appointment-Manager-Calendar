import type { Appointment } from '@/types/appointment';

type AppointmentDates = {
  startTime?: string;
  endTime?: string;
  start?: string;
  end?: string;
};

export function appointmentTimes(appointment: AppointmentDates) {
  return {
    start: Date.parse(appointment.startTime || appointment.start || ''),
    end: Date.parse(appointment.endTime || appointment.end || ''),
  };
}

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function localDayDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function hasMeaningfulNote(note: string | null | undefined): boolean {
  return Boolean(note?.trim());
}

export interface DocumentationDay {
  day: string;
  total: number;
  completed: number;
  withNotes: number;
  withoutNotes: number;
  pending: Appointment[];
}

export interface DocumentationReview {
  day: string;
  requestId: number;
}

export function deriveDocumentationReminders(appointments: Appointment[], now: number) {
  const days = new Map<string, { appointment: Appointment; start: number; end: number }[]>();
  const invalidIds: string[] = [];
  for (const appointment of appointments) {
    const { start, end } = appointmentTimes(appointment);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      invalidIds.push(appointment.id);
      continue;
    }
    const day = localDayKey(new Date(start));
    const entries = days.get(day) ?? [];
    entries.push({ appointment, start, end });
    days.set(day, entries);
  }

  const previousIds = new Set<string>();
  const summaries: DocumentationDay[] = [];
  let latestEnded: Appointment | null = null;
  const today = localDayKey(new Date(now));
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  let nextBoundary = midnight.getTime();
  for (const [day, entries] of days) {
    entries.sort((a, b) => a.start - b.start || a.appointment.id.localeCompare(b.appointment.id));
    for (const { appointment, start, end } of entries) {
      if (start > now) nextBoundary = Math.min(nextBoundary, start);
      if (end > now) nextBoundary = Math.min(nextBoundary, end);
      if (end <= now && !hasMeaningfulNote(appointment.notes) && !appointment.documentationReviewedAt) {
        previousIds.add(appointment.id);
      }
    }
    if (day === today) {
      const ended = entries.filter(({ appointment }) => previousIds.has(appointment.id))
        .sort((a, b) => b.end - a.end || b.start - a.start || a.appointment.id.localeCompare(b.appointment.id))[0];
      if (ended) latestEnded = ended.appointment;
    }

    if (entries.some(({ end }) => end > now)) continue;
    const pending = entries.filter(({ appointment }) => !hasMeaningfulNote(appointment.notes))
      .map(({ appointment }) => appointment);
    summaries.push({
      day,
      total: entries.length,
      completed: entries.filter(({ appointment }) => appointment.status === 'completed').length,
      withNotes: entries.length - pending.length,
      withoutNotes: pending.length,
      pending,
    });
  }
  summaries.sort((a, b) => b.day.localeCompare(a.day));
  return { previousIds, summaries, invalidIds, latestEnded, nextBoundary };
}
