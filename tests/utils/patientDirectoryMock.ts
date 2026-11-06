import type { BrowserContext, Page } from '@playwright/test';
import type { Patient, PatientWithActivity, Appointment } from '../../src/types/appointment';

export async function mockPatientDirectory(
  target: BrowserContext | Page,
  getPatients: () => Patient[],
  getAppointments: () => Appointment[] = () => [],
) {
  await target.route('**/api/patients/summary', (route) => {
    const patients = getPatients();
    const now = new Date();
    return route.fulfill({ json: {
      total: patients.length,
      newThisMonth: patients.filter((patient) => {
        const date = new Date(patient.createdAt);
        return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
      }).length,
    } });
  });
  await target.route('**/api/patients/directory?*', (route) => {
    const params = new URL(route.request().url()).searchParams;
    const search = (params.get('search') ?? '').trim().toLowerCase();
    const appointments = getAppointments();
    const matches: PatientWithActivity[] = getPatients().filter((patient) =>
      [`${patient.firstName} ${patient.lastName}`, patient.phone, patient.email, patient.embg]
        .some((value) => (value ?? '').toLowerCase().includes(search)),
    ).map((patient) => {
      const visits = appointments.filter((appointment) => appointment.patientId === patient.id);
      const times = visits.map((appointment) => appointment.startTime).sort().reverse();
      return { ...patient, appointmentCount: visits.length, lastAppointmentAt: times[0] ?? null };
    }).sort((a, b) => (b.lastAppointmentAt ?? '').localeCompare(a.lastAppointmentAt ?? ''));
    const totalPages = Math.max(1, Math.ceil(matches.length / 100));
    const page = Math.min(Number(params.get('page') ?? 1), totalPages);
    return route.fulfill({ json: {
      patients: matches.slice((page - 1) * 100, page * 100), page, pageSize: 100, total: matches.length, totalPages,
      patientsWithVisits: matches.filter((patient) => patient.appointmentCount > 0).length,
      totalAppointments: matches.reduce((sum, patient) => sum + patient.appointmentCount, 0),
    } });
  });
}
