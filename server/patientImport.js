import { normalizePatientName } from './patientMatching.js';

const CYRILLIC = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'gj', е: 'e', ж: 'zh', з: 'z', ѕ: 'dz',
  и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', ќ: 'kj', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', џ: 'dzh', ш: 'sh',
};
const reviewName = (name) => normalizePatientName(name).replace(/[а-яѓѕјљњќџ]/gu, (letter) => CYRILLIC[letter] ?? letter);

const normalizeRegistrationDate = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return '';
  const local = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text);
  const iso = local ? `${local[3]}-${local[2]}-${local[1]}` : text;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === iso ? iso : null;
};

export function dateOfBirthFromEmbg(embg) {
  if (!/^\d{13}$/.test(embg)) return null;
  const suffix = Number(embg.slice(4, 7));
  const year = (suffix >= 800 ? 1000 : 2000) + suffix;
  const iso = `${year}-${embg.slice(2, 4)}-${embg.slice(0, 2)}`;
  const date = normalizeRegistrationDate(iso);
  return date && date <= new Date().toISOString().slice(0, 10) ? date : null;
}

export function validateImportRows(rows) {
  if (!Array.isArray(rows) || !rows.length || rows.length > 10000 ||
      rows.some((row) => !row || typeof row !== 'object' ||
        typeof row.name !== 'string' || row.name.length > 300 ||
        typeof row.embg !== 'string' || row.embg.length > 100 ||
        typeof row.address !== 'string' || row.address.length > 1000 ||
        (row.registrationDate !== undefined &&
          (typeof row.registrationDate !== 'string' || row.registrationDate.length > 30)))) {
    const error = new Error('Import requires 1-10000 patient rows with name, embg and address strings.');
    error.statusCode = 400;
    throw error;
  }
}

export function planPatientImport(patients, rows) {
  validateImportRows(rows);
  const byEmbg = new Map();
  const byName = new Map();
  const byReviewName = new Map();
  const incoming = new Map();
  const incomingNames = new Map();
  const add = (map, key, value) => {
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(value);
  };
  for (const patient of patients) {
    const embg = String(patient.embg ?? '').trim();
    const name = `${patient.firstName ?? ''} ${patient.lastName ?? ''}`;
    if (embg) add(byEmbg, embg, patient);
    if (!embg) {
      add(byName, normalizePatientName(name), patient);
      add(byReviewName, reviewName(name), patient);
    }
  }
  const normalized = rows.map((row) => ({
    name: row.name.normalize('NFKC').trim().replace(/\s+/gu, ' '),
    embg: row.embg.trim(),
    address: row.address.trim(),
    registrationDate: normalizeRegistrationDate(row.registrationDate),
  }));
  normalized.forEach((row, index) => {
    add(incoming, row.embg, index);
    add(incomingNames, normalizePatientName(row.name), row.embg);
  });
  const fileConflicts = new Set([...incoming.entries()].filter(([, indexes]) => {
    const first = normalized[indexes[0]];
    return indexes.some((index) =>
      normalizePatientName(normalized[index].name) !== normalizePatientName(first.name) ||
      normalized[index].address !== first.address ||
      normalized[index].registrationDate !== first.registrationDate);
  }).map(([embg]) => embg));
  return normalized.map((row, index) => {
    const dateOfBirth = dateOfBirthFromEmbg(row.embg);
    const result = { row: index + 1, ...row, dateOfBirth: dateOfBirth ?? '', registrationDate: row.registrationDate ?? '',
      status: 'review', reason: '', patient: null, changes: {} };
    if (!/^\d{13}$/.test(row.embg) || !row.name.includes(' ')) {
      return { ...result, reason: 'invalid' };
    }
    if (row.registrationDate === null) return { ...result, reason: 'invalidDate' };
    if (!dateOfBirth) return { ...result, reason: 'invalidBirthDate' };
    const sameEmbg = incoming.get(row.embg);
    if (fileConflicts.has(row.embg)) {
      return { ...result, reason: 'fileConflict' };
    }
    if (sameEmbg[0] !== index) return { ...result, status: 'duplicate', reason: 'duplicate' };
    const matches = byEmbg.get(row.embg) ?? [];
    if (matches.length > 1) return { ...result, reason: 'ambiguous' };
    let patient = matches[0];
    if (!patient) {
      const names = byName.get(normalizePatientName(row.name)) ?? [];
      if (names.length > 1) return { ...result, reason: 'ambiguous' };
      patient = names[0];
      if (patient && incomingNames.get(normalizePatientName(row.name)).some((embg) => embg !== row.embg)) {
        return { ...result, patient, reason: 'ambiguous' };
      }
      if (!patient) {
        const suggestions = byReviewName.get(reviewName(row.name)) ?? [];
        if (suggestions.length) {
          return { ...result, patient: suggestions.length === 1 ? suggestions[0] : null, reason: 'alphabetMatch' };
        }
      }
    }
    if (!patient) return { ...result, status: 'new' };
    const changes = {
      ...(!String(patient.embg ?? '').trim() ? { embg: row.embg } : {}),
      ...(!String(patient.address ?? '').trim() && row.address ? { address: row.address } : {}),
      ...(!String(patient.dateOfBirth ?? '').trim() ? { dateOfBirth } : {}),
      ...(row.registrationDate && row.registrationDate !== patient.registrationDate
        ? { registrationDate: row.registrationDate } : {}),
    };
    return { ...result, patient, changes, status: Object.keys(changes).length ? 'update' : 'unchanged' };
  });
}
