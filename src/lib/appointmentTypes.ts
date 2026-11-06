export const APPOINTMENT_TYPE_VALUES = [
  'consultation',
  'follow-up',
  'procedure',
  'prevention',
  'prosthetics-orthodontics',
  'urgent',
] as const;

export type BuiltInAppointmentType = typeof APPOINTMENT_TYPE_VALUES[number];
export type AppointmentType = string;
export interface AppointmentTypeCustomization {
  name?: string;
  color: string;
}
interface AppointmentTypeDefinition extends AppointmentTypeCustomization {
  labelKey?: string;
  descriptionKey?: string;
}
type TypeSettings = {
  appointmentTypes?: Record<string, AppointmentTypeCustomization>;
  appointmentTypeDurations?: Partial<Record<string, AppointmentDuration>>;
};
export const APPOINTMENT_DURATIONS = [30, 45, 60, 90, 120] as const;
export type AppointmentDuration = typeof APPOINTMENT_DURATIONS[number];
export const DEFAULT_APPOINTMENT_TYPE_DURATIONS: Partial<Record<AppointmentType, AppointmentDuration>> = {
  consultation: 30,
  'follow-up': 30,
  procedure: 30,
  prevention: 30,
  'prosthetics-orthodontics': 60,
  urgent: 30,
};

export const APPOINTMENT_TYPES: Record<BuiltInAppointmentType, { labelKey: string; descriptionKey: string; color: string }> = {
  consultation: { labelKey: 'appointment.types.consultation', descriptionKey: 'appointment.types.consultationDescription', color: '#2563eb' },
  'follow-up': { labelKey: 'appointment.types.followUp', descriptionKey: 'appointment.types.followUpDescription', color: '#0f766e' },
  procedure: { labelKey: 'appointment.types.procedure', descriptionKey: 'appointment.types.procedureDescription', color: '#c2410c' },
  prevention: { labelKey: 'appointment.types.prevention', descriptionKey: 'appointment.types.preventionDescription', color: '#15803d' },
  'prosthetics-orthodontics': { labelKey: 'appointment.types.prostheticsOrthodontics', descriptionKey: 'appointment.types.prostheticsOrthodonticsDescription', color: '#7e22ce' },
  urgent: { labelKey: 'appointment.types.urgent', descriptionKey: 'appointment.types.urgentDescription', color: '#b91c1c' },
};

export function getAppointmentTypes(settings?: TypeSettings | null): Record<string, AppointmentTypeDefinition> {
  const types: Record<string, AppointmentTypeDefinition> = { ...APPOINTMENT_TYPES };
  for (const [id, customization] of Object.entries(settings?.appointmentTypes ?? {})) {
    types[id] = { ...(Object.prototype.hasOwnProperty.call(types, id) ? types[id] : {}), ...customization };
  }
  return types;
}

export function getAppointmentType(type: string, settings?: TypeSettings | null): AppointmentTypeDefinition {
  const builtIn = Object.prototype.hasOwnProperty.call(APPOINTMENT_TYPES, type)
    ? APPOINTMENT_TYPES[type as BuiltInAppointmentType]
    : undefined;
  const customization = Object.prototype.hasOwnProperty.call(settings?.appointmentTypes ?? {}, type)
    ? settings?.appointmentTypes?.[type]
    : undefined;
  return builtIn || customization
    ? { ...builtIn, ...customization }
    : { name: type, color: '#64748b' };
}

export function appointmentTypeLabel(definition: AppointmentTypeDefinition, t: (key: string) => string): string {
  return definition.name ?? (definition.labelKey ? t(definition.labelKey) : '');
}

export function getAppointmentTypeDuration(type: string, settings?: TypeSettings | null): AppointmentDuration {
  return settings?.appointmentTypeDurations?.[type] ?? DEFAULT_APPOINTMENT_TYPE_DURATIONS[type] ?? 30;
}

export function appointmentBackgroundColor(color: string, isCurrent = false): string {
  return `color-mix(in srgb, ${color} ${isCurrent ? 15 : 10}%, hsl(var(--background)))`;
}

export function darkenHexColor(color: string): string {
  const hex = color.match(/^#([\da-f]{6})$/i)?.[1];
  if (!hex) return color;

  const channels = [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  return `#${channels.map((channel) => Math.round(channel * 0.75).toString(16).padStart(2, '0')).join('')}`;
}
