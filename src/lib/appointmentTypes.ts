export const APPOINTMENT_TYPE_VALUES = [
  'consultation',
  'follow-up',
  'procedure',
  'prevention',
  'prosthetics-orthodontics',
  'urgent',
] as const;

export type AppointmentType = typeof APPOINTMENT_TYPE_VALUES[number];
export const APPOINTMENT_DURATIONS = [30, 45, 60, 90, 120] as const;
export type AppointmentDuration = typeof APPOINTMENT_DURATIONS[number];
export const DEFAULT_APPOINTMENT_TYPE_DURATIONS: Record<AppointmentType, AppointmentDuration> = {
  consultation: 30,
  'follow-up': 30,
  procedure: 30,
  prevention: 30,
  'prosthetics-orthodontics': 60,
  urgent: 30,
};

export const APPOINTMENT_TYPES: Record<AppointmentType, { labelKey: string; descriptionKey: string; color: string }> = {
  consultation: { labelKey: 'appointment.types.consultation', descriptionKey: 'appointment.types.consultationDescription', color: '#2563eb' },
  'follow-up': { labelKey: 'appointment.types.followUp', descriptionKey: 'appointment.types.followUpDescription', color: '#0f766e' },
  procedure: { labelKey: 'appointment.types.procedure', descriptionKey: 'appointment.types.procedureDescription', color: '#c2410c' },
  prevention: { labelKey: 'appointment.types.prevention', descriptionKey: 'appointment.types.preventionDescription', color: '#15803d' },
  'prosthetics-orthodontics': { labelKey: 'appointment.types.prostheticsOrthodontics', descriptionKey: 'appointment.types.prostheticsOrthodonticsDescription', color: '#7e22ce' },
  urgent: { labelKey: 'appointment.types.urgent', descriptionKey: 'appointment.types.urgentDescription', color: '#b91c1c' },
};

export function appointmentBackgroundColor(color: string, isCurrent = false): string {
  return `color-mix(in srgb, ${color} ${isCurrent ? 15 : 10}%, hsl(var(--background)))`;
}

export function darkenHexColor(color: string): string {
  const hex = color.match(/^#([\da-f]{6})$/i)?.[1];
  if (!hex) return color;

  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `#${channels.map((channel) => Math.round(channel * 0.75).toString(16).padStart(2, '0')).join('')}`;
}
