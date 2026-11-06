import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../../src/lib/documentationReminders.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
new Function('exports', code)(exports);
const { deriveDocumentationReminders: derive, hasMeaningfulNote, localDayKey, localDayDate } = exports;
const at = (hour, minute = 0, day = 6) => new Date(2026, 10, day, hour, minute).getTime();
const appointment = (id, start, end, overrides = {}) => ({
  id, title: 'Treatment', patientId: 'patient', patientName: 'Test Patient',
  startTime: new Date(start).toISOString(), endTime: new Date(end).toISOString(),
  duration: 30, type: 'procedure', status: 'scheduled', notes: '', createdAt: new Date(start).toISOString(),
  ...overrides,
});
const previous = appointment('previous', at(9), at(9, 30));
const current = appointment('current', at(10), at(10, 30));

test('missing note appears at scheduled end, including during an empty slot', () => {
  assert.equal(derive([previous, current], at(9, 29)).previousIds.size, 0);
  assert.deepEqual([...derive([previous, current], at(9, 30)).previousIds], ['previous']);
  assert.deepEqual([...derive([previous, current], at(9, 59)).previousIds], ['previous']);
  assert.deepEqual([...derive([current, previous], at(10)).previousIds], ['previous']);
  assert.equal(previous.status, 'scheduled');
});

test('existing meaningful notes suppress the previous reminder; blank/legacy notes do not', () => {
  for (const notes of ['Treatment performed', '  Follow-up\n']) {
    assert.equal(derive([{ ...previous, notes }, current], at(10)).previousIds.size, 0);
  }
  for (const notes of ['', ' \n\t ', undefined, null]) {
    assert.equal(hasMeaningfulNote(notes), false);
    assert.equal(derive([{ ...previous, notes }, current], at(10)).previousIds.has('previous'), true);
  }
});

test('current appointments and overlapping predecessors still in progress get no new indicator', () => {
  const overlapping = { ...previous, endTime: new Date(at(10, 15)).toISOString() };
  assert.equal(derive([overlapping, current], at(10)).previousIds.size, 0);
  assert.deepEqual([...derive([overlapping, current], at(10, 15)).previousIds], ['previous']);
  assert.equal(derive([previous, current], at(10, 20)).previousIds.has('current'), false);
});

test('end-of-day summary waits for the maximum end, including an earlier-starting overlapping appointment', () => {
  const early = appointment('early', at(9), at(12), { status: 'completed' });
  const later = appointment('later', at(10), at(10, 30), { status: 'completed' });
  assert.equal(derive([early, later], at(11)).summaries.length, 0);
  assert.equal(derive([early, later], at(12)).summaries[0].completed, 2);
});

test('multiple missing notes produce exact completed/documented/pending counts and list', () => {
  const records = [
    { ...previous, status: 'completed' }, { ...current, status: 'completed', notes: 'Done' },
    appointment('last', at(11), at(11, 30), { status: 'completed', notes: '  ' }),
    appointment('not-completed', at(8), at(8, 30)),
  ];
  const [summary] = derive(records, at(12)).summaries;
  assert.equal(summary.total, 4);
  assert.equal(summary.completed, 3);
  assert.equal(summary.withNotes, 1);
  assert.equal(summary.withoutNotes, 3);
  assert.deepEqual(summary.pending.map((record) => record.id), ['not-completed', 'previous', 'last']);
});

test('all appointments documented produce no pending appointments', () => {
  const [summary] = derive([{ ...previous, status: 'completed', notes: 'Documented' }], at(12)).summaries;
  assert.equal(summary.completed, 1);
  assert.equal(summary.withNotes, 1);
  assert.equal(summary.withoutNotes, 0);
  assert.deepEqual(summary.pending, []);
});

test('all statuses qualify for reminders only after ending and gate the end-of-day summary', () => {
  const records = [
    { ...previous, status: 'completed' }, current,
    appointment('cancelled', at(9, 45), at(18), { status: 'cancelled' }),
    appointment('no-show', at(19), at(20), { status: 'no-show' }),
  ];
  const result = derive(records, at(11));
  assert.deepEqual([...result.previousIds], ['previous', 'current']);
  assert.equal(result.summaries.length, 0);
  const ended = derive(records, at(20));
  assert.deepEqual([...ended.previousIds], ['previous', 'cancelled', 'current', 'no-show']);
  assert.equal(ended.latestEnded.id, 'no-show');
  assert.equal(ended.summaries[0].completed, 1);
  assert.equal(ended.summaries[0].total, 4);
  assert.equal(ended.summaries[0].withoutNotes, 4);
  assert.deepEqual(ended.summaries[0].pending.map((record) => record.id), ['previous', 'cancelled', 'current', 'no-show']);
});

test('future appointments are not counted, even if already marked completed', () => {
  const future = appointment('future', at(10, 0, 7), at(10, 30, 7), { status: 'completed' });
  const result = derive([{ ...previous, status: 'completed' }, future], at(12));
  assert.equal(result.summaries.length, 1);
  assert.equal(result.summaries[0].completed, 1);
  assert.deepEqual(result.summaries[0].pending.map((record) => record.id), ['previous']);
});

test('returning after the last appointment derives reminders without witnessing any clock transition', () => {
  const result = derive([{ ...previous, status: 'completed' }, { ...current, status: 'completed' }], at(8, 0, 7));
  assert.equal(result.summaries[0].day, localDayKey(new Date(at(9))));
  assert.equal(result.summaries[0].withoutNotes, 2);
  assert.equal(result.previousIds.has('previous'), true);
});

test('saving a note and changing status immediately recalculate both reminder types', () => {
  const records = [{ ...previous, status: 'completed' }, { ...current, status: 'completed' }];
  assert.equal(derive(records, at(12)).summaries[0].withoutNotes, 2);
  records[0] = { ...records[0], notes: 'Saved treatment' };
  let result = derive(records, at(12));
  assert.deepEqual([...result.previousIds], ['current']);
  assert.equal(result.summaries[0].withoutNotes, 1);
  records[1] = { ...records[1], status: 'no-show' };
  result = derive(records, at(12));
  assert.equal(result.summaries[0].completed, 1);
  assert.equal(result.summaries[0].total, 2);
  assert.equal(result.summaries[0].withoutNotes, 1);
  records[1] = { ...records[1], notes: 'Did not attend' };
  assert.equal(derive(records, at(12)).summaries[0].withoutNotes, 0);
});

test('review acknowledgement silences indicators but never changes documentation counts, notes or status', () => {
  const records = [{ ...previous, status: 'completed' }, current];
  const before = structuredClone(records);
  const reviewed = [{ ...records[0], documentationReviewedAt: new Date(at(11)).toISOString() }, current];
  const result = derive(reviewed, at(12));
  assert.deepEqual([...result.previousIds], ['current']);
  assert.equal(result.summaries[0].withoutNotes, 2);
  assert.equal(reviewed[0].notes, '');
  assert.equal(reviewed[0].status, 'completed');
  assert.deepEqual(records, before);
});

test('simultaneous starts qualify independently at their scheduled ends', () => {
  const simultaneous = appointment('simultaneous', at(9), at(9, 45));
  assert.deepEqual([...derive([previous, simultaneous], at(9, 30)).previousIds], ['previous']);
  assert.deepEqual([...derive([previous, simultaneous], at(10)).previousIds], ['previous', 'simultaneous']);
  assert.deepEqual([...derive([simultaneous, current, previous], at(10)).previousIds], ['previous', 'simultaneous']);
});

test('local calendar day differs from UTC and overnight appointments are counted once after their actual end', () => {
  const originalTimezone = process.env.TZ;
  try {
    for (const timezone of ['Europe/Skopje', 'America/Los_Angeles']) {
      process.env.TZ = timezone;
      const overnight = appointment('overnight', at(23, 30), at(0, 30, 7), { status: 'completed' });
      assert.equal(derive([overnight], at(0, 0, 7)).summaries.length, 0);
      const result = derive([overnight], at(0, 30, 7));
      assert.equal(result.summaries[0].day, '2026-11-06');
      assert.equal(result.summaries[0].completed, 1);
      assert.equal(localDayKey(localDayDate('2026-11-06')), '2026-11-06');
      const nextDay = appointment('next', at(1, 0, 7), at(1, 30, 7));
      assert.deepEqual([...derive([overnight, nextDay], at(2, 0, 7)).previousIds], ['overnight', 'next']);
    }
    process.env.TZ = 'Europe/Skopje';
    const utcPreviousDay = appointment('utc-previous', Date.parse('2026-11-05T23:15:00Z'), Date.parse('2026-11-05T23:45:00Z'), { status: 'completed' });
    assert.equal(derive([utcPreviousDay], Date.parse('2026-11-06T01:00:00Z')).summaries[0].day, '2026-11-06');
    process.env.TZ = 'America/Los_Angeles';
    const utcNextDay = appointment('utc-next', Date.parse('2026-11-07T06:00:00Z'), Date.parse('2026-11-07T06:30:00Z'), { status: 'completed' });
    assert.equal(derive([utcNextDay], Date.parse('2026-11-07T07:00:00Z')).summaries[0].day, '2026-11-06');
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test('DST day boundaries use local calendar dates, not fixed 24-hour buckets', () => {
  const originalTimezone = process.env.TZ;
  try {
    process.env.TZ = 'Europe/Skopje';
    const record = appointment('dst', Date.parse('2026-10-24T22:30:00Z'), Date.parse('2026-10-25T02:30:00Z'), { status: 'completed' });
    const result = derive([record], Date.parse('2026-10-25T03:00:00Z'));
    assert.equal(result.summaries[0].day, '2026-10-25');
    assert.equal(result.summaries[0].completed, 1);
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

test('legacy timestamps/notes are backward compatible and invalid dates are reported', () => {
  const legacy = { ...previous, start: previous.startTime, end: previous.endTime };
  delete legacy.startTime;
  delete legacy.endTime;
  delete legacy.notes;
  const result = derive([legacy, current, { ...previous, id: 'invalid', startTime: 'invalid' }], at(11));
  assert.equal(result.previousIds.has('previous'), true);
  assert.deepEqual(result.invalidIds, ['invalid']);
});

test('desktop banner selects the most recent ended missing note of any status and falls back to earlier pending notes', () => {
  const completedPrevious = { ...previous, status: 'completed' };
  const completedCurrent = { ...current, status: 'completed' };
  const records = [completedPrevious, completedCurrent];
  assert.equal(derive(records, at(9, 15)).latestEnded, null);
  assert.equal(derive(records, at(9, 45)).latestEnded.id, 'previous');
  assert.equal(derive(records, at(10, 15)).latestEnded.id, 'previous');
  assert.equal(derive(records, at(11)).latestEnded.id, 'current');
  assert.equal(derive(records, at(9, 45, 7)).latestEnded, null);
  for (const overrides of [{ notes: 'Documented' }, { documentationReviewedAt: new Date(at(11)).toISOString() }]) {
    assert.equal(derive([completedPrevious, { ...completedCurrent, ...overrides }], at(11)).latestEnded.id, 'previous');
  }
  for (const status of ['scheduled', 'cancelled', 'no-show']) {
    assert.equal(derive([completedPrevious, { ...completedCurrent, status }], at(11)).latestEnded.id, 'current');
    assert.equal(derive([{ ...completedPrevious, status }], at(11)).latestEnded.id, 'previous');
  }
  assert.equal(derive(records.map((record) => ({ ...record, notes: 'Saved' })), at(11)).latestEnded, null);
});

test('documentation and acknowledgement never mutate status for any appointment category or status', () => {
  for (const status of ['scheduled', 'completed', 'cancelled', 'no-show']) {
    const record = { ...previous, status, type: 'prosthetics-orthodontics' };
    const before = structuredClone(record);
    assert.equal(derive([record, current], at(10, 15)).previousIds.has(record.id), true);
    assert.equal(derive([record], at(11)).summaries[0].withoutNotes, 1);
    assert.equal(derive([{ ...record, documentationReviewedAt: new Date(at(11)).toISOString() }], at(11)).summaries[0].withoutNotes, 1);
    assert.equal(derive([{ ...record, notes: 'Recorded outcome' }], at(11)).summaries[0].withoutNotes, 0);
    assert.deepEqual(record, before);
  }
});

test('next reminder wake-up is a start/end boundary or local midnight, not a polling interval', () => {
  assert.equal(derive([previous, current], at(9, 15)).nextBoundary, at(9, 30));
  assert.equal(derive([previous, current], at(9, 45)).nextBoundary, at(10));
  assert.equal(derive([previous, current], at(10, 15)).nextBoundary, at(10, 30));
  assert.equal(derive([previous, current], at(12)).nextBoundary, at(0, 0, 7));
  assert.equal(derive([], at(12)).nextBoundary, at(0, 0, 7));
});

test('banner and pencil share the scheduled-end trigger; the last appointment also remains in end-of-day review', () => {
  const beforeNext = derive([previous, current], at(9, 45));
  assert.equal(beforeNext.previousIds.has('previous'), true);
  assert.equal(beforeNext.latestEnded.id, 'previous');
  const afterLast = derive([previous, current], at(11));
  assert.equal(afterLast.latestEnded.id, 'current');
  assert.equal(afterLast.previousIds.has('current'), true);
  assert.equal(afterLast.summaries[0].pending.some((appointment) => appointment.id === 'current'), true);
  const duringNext = derive([previous, current], at(10, 15));
  assert.equal(duringNext.latestEnded.id, 'previous');
  assert.equal(duringNext.previousIds.has('previous'), true);
});
