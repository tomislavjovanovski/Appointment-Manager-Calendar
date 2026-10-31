import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import postcss from 'postcss';
import tailwind from 'tailwindcss';
import ts from 'typescript';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const module = { exports: {} };
const configCode = ts.transpileModule(await read('tailwind.config.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
new Function('require', 'module', 'exports', configCode)(
  createRequire(import.meta.url), module, module.exports
);
const config = module.exports.default;
const controls = await Promise.all([
  'button', 'input', 'textarea', 'select', 'card', 'badge', 'dialog', 'alert-dialog', 'tabs', 'table',
].map((name) => read(`src/components/ui/${name}.tsx`)));
const css = await postcss([tailwind({
  ...config,
  content: [{ raw: controls.join('\n'), extension: 'tsx' }],
})]).process('@tailwind utilities;', { from: undefined });

test('shared desktop radii are emitted only at the existing desktop breakpoint', () => {
  for (const token of ['control', 'panel', 'dialog']) {
    const selector = `.md\\:rounded-${token}`;
    const rules = [];
    css.root.walkRules(selector, (rule) => rules.push(rule));
    assert.ok(rules.length > 0, `${token} radius is generated`);
    for (const rule of rules) {
      assert.equal(rule.parent.type, 'atrule');
      assert.equal(rule.parent.name, 'media');
      assert.equal(rule.parent.params, '(min-width: 768px)');
      assert.equal(rule.nodes[0].value, `var(--radius-${token})`);
    }
  }
  assert.equal(config.theme.extend.borderRadius.md, 'calc(var(--radius) - 2px)');
  assert.ok(controls[0].includes('rounded-md text-sm'));
  assert.ok(controls[1].includes('text-base'));
  assert.ok(controls[1].includes('md:text-sm'));
});

test('token-based heading and focus refinements retain keyboard focus and mobile defaults', async () => {
  const input = controls[1];
  assert.ok(input.includes('focus-visible:ring-2'));
  assert.ok(input.includes('md:focus-visible:border-primary'));
  assert.ok(controls[4].includes('text-2xl font-semibold leading-none'));
  assert.ok(controls[4].includes('md:text-lg'));
  const styles = await read('src/index.css');
  for (const [name, value] of [['control', '0.5rem'], ['panel', '0.75rem'], ['dialog', '1rem']]) {
    assert.ok(styles.includes(`--radius-${name}: ${value}`));
  }
  assert.ok(styles.includes('--heading: 210 40% 98%'));
  assert.ok(styles.includes('Arial, "Noto Sans", "DejaVu Sans", sans-serif'));
});

test('destructive actions keep their danger hover treatment and selected slots remain explicit', async () => {
  for (const path of [
    'src/components/patients/PatientDeleteButton.tsx',
    'src/components/appointments/AppointmentDialog.tsx',
  ]) {
    const source = await read(path);
    assert.ok(source.includes('md:hover:bg-destructive/10 md:hover:text-destructive'));
  }
  const appointment = await read('src/components/appointments/AppointmentDialog.tsx');
  assert.ok(appointment.includes('aria-pressed={isSelected}'));
  assert.ok(appointment.includes("isSelected && 'md:ring-2"));
});

test('appointment scroll area clips header and footer to the inherited modal corners', async () => {
  const appointment = await read('src/components/appointments/AppointmentDialog.tsx');
  assert.match(appointment, /className="[^"]*overflow-y-auto rounded-\[inherit\][^"]*" data-testid="booking-dialog"/);
  assert.ok(appointment.includes('popper: { container: () => pickerContainerRef.current'));
  assert.match(appointment, /ref=\{pickerContainerRef\}\s+className="(?![^"]*overflow-hidden)[^"]*"/);
});
