// tests/test-data/seed.ts
// Single source of truth for all test data.
// Import from here — never hardcode values in test files.

export const PATIENTS = {
  alice: {
    id: 'patient-test-001',
    firstName: 'Alice',
    lastName: 'Thornton',
    email: 'alice.thornton@test.medical',
    phone: '555-0101',
    dateOfBirth: '1985-03-15',
    address: '12 Oak Street, Springfield',
    emergencyContact: 'Bob Thornton - 555-0102',
    notes: 'Allergic to penicillin',
  },
  bob: {
    id: 'patient-test-002',
    firstName: 'Bob',
    lastName: 'Nguyen',
    email: 'bob.nguyen@test.medical',
    phone: '555-0103',
    dateOfBirth: '1972-11-22',
    address: '45 Elm Avenue, Shelbyville',
    emergencyContact: 'Carol Nguyen - 555-0104',
    notes: '',
  },
  newPatient: {
    firstName: 'Carol',
    lastName: 'Osei',
    email: 'carol.osei@test.medical',
    phone: '555-0199',
    dateOfBirth: '1990-07-04',
    address: '99 Maple Road, Capital City',
    emergencyContact: '',
    notes: 'First visit',
  },
} as const;

export const APPOINTMENTS = {
  consultation: {
    type: 'consultation',
    duration: 30,
    notes: 'Routine check-up',
    status: 'scheduled',
  },
  followUp: {
    type: 'follow-up',
    duration: 60,
    notes: 'Post-surgery follow up',
    status: 'scheduled',
  },
  procedure: {
    type: 'procedure',
    duration: 120,
    notes: 'Minor procedure',
    status: 'scheduled',
  },
} as const;

export const WORKING_HOURS = {
  start: 8,   // 08:00
  end: 18,    // 18:00
};

// A slot guaranteed to be within working hours for today + 1 day
export function nextWorkingSlot(offsetDays = 1, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  // Skip weekends
  while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
  d.setHours(hour, minute, 0, 0);
  return d;
}

export const GOOGLE_CALENDAR_EVENT = {
  id: 'gcal-event-001',
  summary: 'External Meeting',
  start: { dateTime: new Date().toISOString() },
  end: { dateTime: new Date(Date.now() + 3_600_000).toISOString() },
  colorId: '1',
};

export const MOCK_GOOGLE_CALENDAR_RESPONSE = {
  kind: 'calendar#events',
  summary: 'Test Calendar',
  items: [GOOGLE_CALENDAR_EVENT],
};
