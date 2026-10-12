import type { Patient } from '@/types/appointment';

export type PatientFormValues = Omit<Patient, 'id' | 'createdAt'>;

export const createEmptyPatientForm = (): PatientFormValues => ({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  address: '',
  emergencyContact: '',
  notes: '',
});

export const normalizePatientForm = (values: Partial<PatientFormValues>): PatientFormValues => ({
  firstName: values.firstName?.trim() ?? '',
  lastName: values.lastName?.trim() ?? '',
  email: values.email?.trim() ?? '',
  phone: values.phone?.trim() ?? '',
  dateOfBirth: values.dateOfBirth?.trim() ?? '',
  address: values.address?.trim() ?? '',
  emergencyContact: values.emergencyContact?.trim() ?? '',
  notes: values.notes?.trim() ?? '',
});

export const normalizePatientUpdates = (values: Partial<PatientFormValues>): Partial<PatientFormValues> => {
  const normalized: Partial<PatientFormValues> = {};

  (Object.keys(createEmptyPatientForm()) as Array<keyof PatientFormValues>).forEach((key) => {
    if (values[key] !== undefined) normalized[key] = values[key]?.trim() ?? '';
  });

  return normalized;
};

export const validatePatientForm = (values: PatientFormValues) => {
  const errors: Record<string, boolean> = {};

  if (!values.firstName) errors.firstName = true;
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.emailInvalid = true;
  }

  return errors;
};
