export const normalizePatientName = (value) =>
  String(value ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();

/** @template {{ firstName: string, lastName: string }} T
 * @param {T[]} patients
 * @param {{ firstName: string, lastName?: string }} input
 * @returns {T[]}
 */
export function findExactPatients(patients, input) {
  const firstName = normalizePatientName(input.firstName);
  const lastName = normalizePatientName(input.lastName);
  if (!firstName) return [];
  return patients.filter((patient) =>
    normalizePatientName(patient.firstName) === firstName &&
    (!lastName || normalizePatientName(patient.lastName) === lastName));
}

/** @template {{ firstName: string, lastName: string, embg?: string }} T
 * @param {T[]} patients
 * @returns {T[][]}
 */
export function groupDuplicatePatients(patients) {
  const groups = new Map();
  for (const patient of patients) {
    const first = normalizePatientName(patient.firstName);
    const last = normalizePatientName(patient.lastName);
    const embg = String(patient.embg ?? '').trim();
    if (!embg && !first) continue;
    const key = embg ? JSON.stringify(['embg', embg]) : JSON.stringify(['name', first, last]);
    const group = groups.get(key) ?? [];
    group.push(patient);
    groups.set(key, group);
  }
  return [...groups.values()].filter((group) => group.length > 1);
}
