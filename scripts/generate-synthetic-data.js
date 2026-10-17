#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPOSITORY_ROOT = path.resolve(SCRIPT_DIR, '..');
const DEFAULT_TARGET = path.join(REPOSITORY_ROOT, '.local', 'synthetic-data');
const LOCAL_SETTINGS_FILE = path.join(REPOSITORY_ROOT, 'public', 'data', 'settings.json');
const MANIFEST_NAME = 'synthetic-data-manifest.json';
const PATIENT_COUNT = 1_000;
const APPOINTMENT_COUNT = 2_000;
const TYPES = ['consultation', 'follow-up', 'procedure', 'prevention', 'prosthetics-orthodontics', 'urgent'];
const DURATIONS = [30, 45, 60, 90, 120];
const FIRST_NAMES = ['Alex', 'Ana', 'Bojan', 'Elena', 'Filip', 'Ivana', 'Jovan', 'Katerina', 'Marko', 'Mila', 'Nikola', 'Sara', 'Stefan', 'Teodora', 'Viktor'];
const LAST_NAMES = ['Petrov', 'Stojanov', 'Iliev', 'Nikolov', 'Dimitrov', 'Georgiev', 'Kostov', 'Ristov', 'Trajkov', 'Velkov', 'Andonov', 'Janev'];
const DEFAULT_SEED = 'itermin-ui-2026';

const fail = (message) => {
  throw new Error(message);
};

const parseArgs = (args) => {
  const options = { target: DEFAULT_TARGET, seed: DEFAULT_SEED, write: false, confirm: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--write') options.write = true;
    else if (arg === '--confirm-synthetic-data') options.confirm = true;
    else if (arg === '--seed') options.seed = args[++index] || fail('--seed requires a value.');
    else if (arg === '--data-dir') options.target = path.resolve(args[++index] || fail('--data-dir requires a path.'));
    else if (arg === '--help' || arg === '-h') options.help = true;
    else fail(`Unknown argument: ${arg}`);
  }
  return options;
};

const printHelp = () => {
  console.log(`Local-only iTermin synthetic data generator

Default: dry-run preview; no files are written.

Manual workflow:
  ITERMIN_LOCAL_ONLY=1 NODE_ENV=development node ./scripts/generate-synthetic-data.js
  ITERMIN_LOCAL_ONLY=1 NODE_ENV=development node ./scripts/generate-synthetic-data.js \\
    --write --confirm-synthetic-data

Options:
  --data-dir <path>                 Dedicated target under .local/ (default: .local/synthetic-data)
  --seed <value>                    Reproducible scheduling seed
  --write                           Opt in to writing generated records
  --confirm-synthetic-data          Required together with --write
`);
};

const assertSafeTarget = (target, { write }) => {
  const localRoot = path.join(REPOSITORY_ROOT, '.local') + path.sep;
  const resolved = path.resolve(target);
  if (!resolved.startsWith(localRoot) || resolved === path.join(REPOSITORY_ROOT, '.local')) {
    fail(`Unsafe data directory. Use a dedicated directory below ${path.join(REPOSITORY_ROOT, '.local')}.`);
  }
  if (resolved.includes(`${path.sep}public${path.sep}`) || resolved.includes(`${path.sep}server${path.sep}`)) {
    fail('Refusing an application or server data directory.');
  }
  if (write && (process.env.NODE_ENV !== 'development' || process.env.ITERMIN_LOCAL_ONLY !== '1' ||
      typeof globalThis.PhusionPassenger !== 'undefined')) {
    fail('Writes require NODE_ENV=development, ITERMIN_LOCAL_ONLY=1, and no Passenger process.');
  }
  return resolved;
};

const readJson = async (file) => {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') fail(`Missing required local file: ${file}`);
    fail(`Unable to read JSON file ${file}: ${error.message}`);
  }
};

const readArrayOrEmpty = async (file) => {
  try {
    const value = JSON.parse(await fs.readFile(file, 'utf8'));
    if (!Array.isArray(value)) fail(`Expected a JSON array in ${file}.`);
    return value;
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    if (error instanceof SyntaxError) fail(`Unable to parse JSON file ${file}.`);
    throw error;
  }
};

const writeJsonAtomic = async (file, value) => {
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temporary, file);
};

const hashSeed = (value) => {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const random = (seed) => {
  let state = hashSeed(seed) || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
};

const shuffle = (items, next) => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(next() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
};

const dateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const localDate = (year, month, day, hours = 0, minutes = 0) =>
  new Date(year, month, day, hours, minutes, 0, 0);

const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

const parseTime = (value) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value));
  if (!match) fail(`Invalid working-hours time: ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
};

const getDateRange = (settings, today = new Date()) => {
  const first = localDate(today.getFullYear(), today.getMonth() - 2, 1);
  let last = localDate(today.getFullYear(), today.getMonth() + 1, 0);
  while (minimumSlotCapacity(settings, { first, last }) < APPOINTMENT_COUNT * 2) {
    last = localDate(last.getFullYear(), last.getMonth() + 2, 0);
  }
  return { first, last };
};

const validateSettings = (settings) => {
  if (!settings || !Array.isArray(settings.workingDays) || settings.workingDays.length === 0) {
    fail('Local settings.json must define at least one working day.');
  }
  if (settings.workingDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) {
    fail('Local settings.json has invalid workingDays; use JavaScript day numbers 0-6.');
  }
  parseTime(settings.startTime);
  parseTime(settings.endTime);
  if (parseTime(settings.startTime) >= parseTime(settings.endTime)) fail('Local working hours are invalid.');
  if (settings.dailyHours !== undefined && (typeof settings.dailyHours !== 'object' || Array.isArray(settings.dailyHours))) {
    fail('Local settings.json has invalid dailyHours.');
  }
  const durations = settings.appointmentTypeDurations;
  if (!durations || typeof durations !== 'object' || TYPES.some((type) => !DURATIONS.includes(durations[type]))) {
    fail('Local settings.json must define valid appointmentTypeDurations for every supported appointment type.');
  }
};

const hoursForDay = (settings, day) => {
  const override = settings.dailyHours?.[String(day)];
  const start = parseTime(override?.startTime ?? settings.startTime);
  const end = parseTime(override?.endTime ?? settings.endTime);
  if (start >= end) fail(`Invalid hours for working day ${day}.`);
  return { start, end };
};

const minimumSlotCapacity = (settings, range) => {
  const step = Number(settings.timeSlotMinutes) || 30;
  let capacity = 0;
  for (let date = new Date(range.first); date <= range.last; date = addDays(date, 1)) {
    if (!settings.workingDays.includes(date.getDay())) continue;
    const { start, end } = hoursForDay(settings, date.getDay());
    for (let minute = start; minute + 30 <= end; minute += step) capacity += 1;
  }
  return capacity;
};

const makePatient = (index, range, next) => {
  const createdAt = new Date(range.first.getTime() + next() * (range.last.getTime() - range.first.getTime()));
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  return {
    id: `syn-patient-${String(index + 1).padStart(4, '0')}`,
    createdAt: createdAt.toISOString(),
    firstName: `${firstName}${index >= FIRST_NAMES.length ? ` ${Math.floor(index / FIRST_NAMES.length)}` : ''}`,
    lastName,
    email: `itermin.synthetic.patient${String(index + 1).padStart(4, '0')}@example.com`,
    phone: `000-SYN-${String(index + 1).padStart(4, '0')}`,
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    notes: 'Synthetic test record.',
  };
};

const makeSlots = (settings, range) => {
  const slots = [];
  const step = Number(settings.timeSlotMinutes) || 30;
  for (let date = new Date(range.first); date <= range.last; date = addDays(date, 1)) {
    if (!settings.workingDays.includes(date.getDay())) continue;
    const { start, end } = hoursForDay(settings, date.getDay());
    for (let minute = start; minute + 30 <= end; minute += step) {
      for (const duration of DURATIONS) {
        if (minute + duration <= end) slots.push({ date: dateKey(date), minute, duration });
      }
    }
  }
  return slots;
};

const overlaps = (left, right) =>
  left.date === right.date && left.minute < right.minute + right.duration && right.minute < left.minute + left.duration;

const makeAppointments = (patients, settings, range, seed) => {
  const next = random(`${seed}:appointments`);
  const candidates = shuffle(makeSlots(settings, range), next);
  const selected = [];
  const usedByDay = new Map();
  for (const candidate of candidates) {
    const day = usedByDay.get(candidate.date) ?? [];
    if (day.some((existing) => overlaps(existing, candidate))) continue;
    day.push(candidate);
    usedByDay.set(candidate.date, day);
    selected.push(candidate);
    if (selected.length === APPOINTMENT_COUNT) break;
  }
  if (selected.length !== APPOINTMENT_COUNT) {
    fail(`Only ${selected.length} valid appointments could be scheduled; refusing to generate fewer than ${APPOINTMENT_COUNT}.`);
  }
  return selected.map((slot, index) => {
    const start = new Date(`${slot.date}T00:00:00`);
    start.setMinutes(slot.minute);
    const end = new Date(start.getTime() + slot.duration * 60_000);
    const eligible = patients.filter((patient) => new Date(patient.createdAt) <= start);
    const patient = eligible[Math.floor(next() * eligible.length)] ?? patients[0];
    const type = TYPES[index % TYPES.length];
    const statuses = ['scheduled', 'scheduled', 'scheduled', 'completed', 'completed', 'cancelled', 'no-show'];
    return {
      id: `syn-appointment-${String(index + 1).padStart(4, '0')}`,
      createdAt: new Date(Math.min(Date.now(), start.getTime())).toISOString(),
      title: `Synthetic ${type} appointment`,
      patientId: patient.id,
      patientName: `${patient.firstName} ${patient.lastName}`,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      duration: slot.duration,
      type,
      status: statuses[index % statuses.length],
      notes: 'Synthetic test record.',
    };
  });
};

const validateRecords = (patients, appointments, settings) => {
  const patientIds = new Set(patients.map((patient) => patient.id));
  if (patientIds.size !== patients.length) fail('Generated patient IDs are not unique.');
  if (new Set(appointments.map((appointment) => appointment.id)).size !== appointments.length) fail('Generated appointment IDs are not unique.');
  const seen = new Map();
  for (const appointment of appointments) {
    if (!patientIds.has(appointment.patientId)) fail(`Appointment ${appointment.id} references an unknown patient.`);
    if (!TYPES.includes(appointment.type) || !DURATIONS.includes(appointment.duration)) fail(`Appointment ${appointment.id} has an unsupported type or duration.`);
    const start = new Date(appointment.startTime);
    const end = new Date(appointment.endTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) fail(`Appointment ${appointment.id} has invalid dates.`);
    const local = new Date(start);
    if (!settings.workingDays.includes(local.getDay())) fail(`Appointment ${appointment.id} is outside a working day.`);
    const { start: opening, end: closing } = hoursForDay(settings, local.getDay());
    const minute = local.getHours() * 60 + local.getMinutes();
    if (minute < opening || minute + appointment.duration > closing) fail(`Appointment ${appointment.id} is outside working hours.`);
    const key = dateKey(local);
    const day = seen.get(key) ?? [];
    if (day.some((other) => start < other.end && other.start < end)) fail(`Appointment ${appointment.id} overlaps another appointment.`);
    day.push({ start, end });
    seen.set(key, day);
  }
};

const summarize = (appointments) => {
  const types = Object.fromEntries(TYPES.map((type) => [type, appointments.filter((item) => item.type === type).length]));
  const days = Object.entries(appointments.reduce((counts, item) => {
    const day = new Date(item.startTime).toLocaleDateString('en-US', { weekday: 'long' });
    counts[day] = (counts[day] ?? 0) + 1;
    return counts;
  }, {}));
  return { types, days };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }
  if (options.write !== options.confirm) fail('Use neither flag for preview, or use both --write and --confirm-synthetic-data to write.');
  const target = assertSafeTarget(options.target, options);
  const patientsFile = path.join(target, 'patients.json');
  const appointmentsFile = path.join(target, 'appointments.json');
  const manifestFile = path.join(target, MANIFEST_NAME);
  const settings = await readJson(LOCAL_SETTINGS_FILE);
  validateSettings(settings);
  const existingPatients = await readArrayOrEmpty(patientsFile);
  const existingAppointments = await readArrayOrEmpty(appointmentsFile);
  const manifest = await fs.readFile(manifestFile, 'utf8').then(JSON.parse).catch((error) => {
    if (error?.code === 'ENOENT') return null;
    fail(`Unable to read manifest: ${error.message}`);
  });
  if (manifest && (manifest.seed !== options.seed || manifest.target !== target)) fail('Existing synthetic manifest does not match this seed or target.');
  const generatedPatientIds = new Set(manifest?.patientIds ?? []);
  const generatedAppointmentIds = new Set(manifest?.appointmentIds ?? []);
  const generatedPatients = existingPatients.filter((patient) => generatedPatientIds.has(patient.id));
  const generatedAppointments = existingAppointments.filter((appointment) => generatedAppointmentIds.has(appointment.id));
  if (manifest && (generatedPatients.length !== generatedPatientIds.size || generatedAppointments.length !== generatedAppointmentIds.size)) {
    fail('Previously generated records are missing or changed; refusing to repair them silently.');
  }
  const range = getDateRange(settings);
  const generated = manifest
    ? { patients: generatedPatients, appointments: generatedAppointments }
    : { patients: [], appointments: [] };
  if (!manifest) {
    const patientRandom = random(`${options.seed}:patients`);
    generated.patients = Array.from({ length: PATIENT_COUNT }, (_, index) => makePatient(index, range, patientRandom));
  }
  if (!manifest) generated.appointments = makeAppointments(generated.patients, settings, range, options.seed);
  validateRecords(generated.patients, generated.appointments, settings);
  const existingIds = new Set([...existingPatients, ...existingAppointments].map((record) => record.id));
  if (!manifest && (generated.patients.some((patient) => existingIds.has(patient.id)) ||
      generated.appointments.some((appointment) => existingIds.has(appointment.id))) {
    fail('A generated ID collides with an existing record; choose a new target or seed.');
  }
  const additions = manifest ? { patients: [], appointments: [] } : generated;
  const summary = summarize(generated.appointments);
  console.log(JSON.stringify({
    mode: options.write ? 'write' : 'dry-run',
    target,
    seed: options.seed,
    dateRange: { first: dateKey(range.first), last: dateKey(range.last) },
    generated: { patients: generated.patients.length, appointments: generated.appointments.length },
    existing: { patients: existingPatients.length, appointments: existingAppointments.length },
    afterGeneration: { patients: existingPatients.length + additions.patients.length, appointments: existingAppointments.length + additions.appointments.length },
    appointmentTypes: summary.types,
    appointmentDays: summary.days,
    preservesExistingRecords: true,
    writesFiles: options.write,
  }, null, 2));
  if (!options.write) return;
  if (assertSafeTarget(options.target, options) !== target) fail('The target directory changed before writing.');
  await fs.mkdir(target, { recursive: true });
  await writeJsonAtomic(patientsFile, [...existingPatients, ...additions.patients]);
  await writeJsonAtomic(appointmentsFile, [...existingAppointments, ...additions.appointments]);
  await writeJsonAtomic(manifestFile, {
    version: 1,
    seed: options.seed,
    target,
    generatedAt: new Date().toISOString(),
    dateRange: { first: dateKey(range.first), last: dateKey(range.last) },
    patientIds: generated.patients.map((patient) => patient.id),
    appointmentIds: generated.appointments.map((appointment) => appointment.id),
  });
  console.log(`Wrote ${additions.patients.length} patients and ${additions.appointments.length} appointments.`);
};

main().catch((error) => {
  console.error(`Synthetic data generation failed: ${error.message}`);
  process.exitCode = 1;
});
