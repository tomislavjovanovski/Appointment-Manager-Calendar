import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { addMinutes, format } from 'date-fns';
import ts from 'typescript';

const source = await readFile(new URL('../../src/components/appointments/AppointmentDialog.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('AppointmentDialog.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const slotFunction = ast.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === 'FreeStartTimes');
assert.ok(slotFunction);
const code = ts.transpileModule(slotFunction.getText(ast), {
  compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
}).outputText;
const Button = ({ variant, size, ...props }) => React.createElement('button', props);
const FreeStartTimes = new Function('React', 'Button', 'useI18n', 'addMinutes', 'format', 'cn', `${code}; return FreeStartTimes;`)(
  React, Button, () => ({ t: (key) => key }), addMinutes, format,
  (...classes) => classes.filter(Boolean).join(' ')
);
const day = new Date(2026, 9, 30, 10);
const slots = [0, 15, 30, 45].map((minutes) => addMinutes(day, minutes));
const props = {
  day, slots, starts: [day], duration: 30,
  availableDurations: new Map([[day.getTime(), 30], [slots[1].getTime(), 30]]),
  loading: false, error: false, onSelect: () => {},
};
const render = (overrides) => renderToStaticMarkup(React.createElement(FreeStartTimes, { ...props, ...overrides }));
const buttons = (html) => [...html.matchAll(/<button\b([^>]*)>/g)].map((match) => match[1]);

test('availability is prepared while closed and opening does not restart its request', () => {
  const effect = source.match(/useEffect\(\(\) => \{\s*let isMounted = true;\s*setAvailabilityLoading\(true\);[\s\S]*?\}, \[refreshTrigger\]\);/);
  assert.ok(effect);
  assert.ok(effect[0].includes('appointmentsStorage.getAll()'));
  assert.ok(!effect[0].includes('if (!open)'));
});

test('loading renders every working slot without advertising stale availability', () => {
  const html = render({ loading: true });
  const elements = buttons(html);
  assert.equal(elements.length, slots.length);
  assert.ok(elements.every((element) => element.includes('disabled=""')));
  assert.ok(elements.every((element) => element.includes('aria-pressed="false"')));
  assert.ok(html.includes('aria-busy="true"'));
  assert.ok(html.includes('role="status"'));
  assert.ok(!html.includes('appointment.noAvailableTimes'));
});

test('loaded grid keeps the same slots and highlights only the selected available range', () => {
  const html = render({});
  const elements = buttons(html);
  assert.equal(elements.length, slots.length);
  assert.equal(elements.filter((element) => element.includes('aria-pressed="true"')).length, 2);
  assert.equal(elements.filter((element) => element.includes('disabled=""')).length, 2);
  assert.ok(elements.every((element) => element.includes('transition-[background-color,box-shadow]')));
  assert.ok(elements.filter((element) => element.includes('aria-pressed="true"')).every((element) => element.includes('text-primary-foreground')));
  assert.ok(elements.filter((element) => element.includes('aria-pressed="false"')).every((element) => element.includes('text-foreground')));
  assert.ok(html.includes('aria-busy="false"'));
  assert.ok(!html.includes('appointment.loadingAvailability'));
});

test('availability errors retain the grid, disable all slots and expose an alert', () => {
  const html = render({ error: true });
  assert.equal(buttons(html).length, slots.length);
  assert.ok(buttons(html).every((element) => element.includes('disabled=""')));
  assert.ok(buttons(html).every((element) => element.includes('aria-pressed="false"')));
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes('appointment.availabilityFailed'));
  assert.ok(!html.includes('appointment.noAvailableTimes'));
});

test('empty loaded availability explains the result instead of showing a selection', () => {
  const html = render({ starts: [], availableDurations: new Map() });
  assert.ok(html.includes('appointment.noAvailableTimes'));
  assert.ok(buttons(html).every((element) => element.includes('disabled=""')));
});

test('duration controls expose all existing choices as non-submit toggle buttons', () => {
  let group;
  const visit = (node) => {
    if (ts.isJsxElement(node) && node.openingElement.attributes.properties.some((attribute) =>
      ts.isJsxAttribute(attribute) && attribute.name.getText(ast) === 'data-testid' &&
      attribute.initializer?.getText(ast) === '"duration-select"'
    )) group = node.getText(ast);
    ts.forEachChild(node, visit);
  };
  visit(ast);
  assert.ok(group);
  const durationCode = ts.transpileModule(`const DurationControls = () => (${group});`, {
    compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const values = [30, 45, 60, 90, 120];
  for (const selected of values) {
    const Component = new Function('React', 'Button', 'APPOINTMENT_DURATIONS', 'durationValue', 't', 'setValue', 'cn',
      `${durationCode}; return DurationControls;`)(
      React, Button, values, String(selected), (key, { n }) => `${n} мин`, () => {}, (...classes) => classes.filter(Boolean).join(' ')
    );
    const html = renderToStaticMarkup(React.createElement(Component));
    assert.equal(buttons(html).length, 5);
    assert.ok(buttons(html).every((element) => element.includes('type="button"')));
    assert.equal(buttons(html).filter((element) => element.includes('aria-pressed="true"')).length, 1);
    assert.ok(buttons(html).every((element) => element.includes('transition-[background-color,box-shadow]')));
    assert.ok(buttons(html).filter((element) => element.includes('aria-pressed="false"')).every((element) => element.includes('text-foreground')));
    for (const minutes of values) assert.ok(html.includes(`>${minutes} мин</button>`));
  }
});

test('reusing the duration map preserves exact-duration availability including blocked slots and edited appointments', async () => {
  const availabilitySource = await readFile(new URL('../../src/lib/appointmentAvailability.ts', import.meta.url), 'utf8');
  const exports = {};
  const availabilityCode = ts.transpileModule(availabilitySource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  new Function('exports', availabilityCode)(exports);
  const settings = {
    workingDays: [5], startTime: '09:00', endTime: '17:00',
    blockedSlots: [{ startTime: new Date(2026, 9, 30, 12).toISOString(), endTime: new Date(2026, 9, 30, 13).toISOString() }],
  };
  const appointments = [{
    id: 'edited', startTime: new Date(2026, 9, 30, 10).toISOString(),
    endTime: new Date(2026, 9, 30, 11).toISOString(),
  }];
  for (const duration of [30, 45, 60, 90, 120]) {
    for (const excludedId of [undefined, 'edited']) {
      const map = exports.getAvailableStartDurations(day, duration, settings, appointments, excludedId);
      const fromMap = exports.getWorkingTimeSlots(day, settings).filter((slot) => map.get(slot.getTime()) === duration);
      assert.deepEqual(fromMap, exports.getAvailableStarts(day, duration, settings, appointments, excludedId));
    }
  }
});
