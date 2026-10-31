import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const read = (path) => readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const brand = JSON.parse(await read('src/config/brand.json'));
const dictionary = {};
const code = ts.transpileModule(await read('src/i18n/dictionary.ts'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
new Function('require', 'exports', code)((module) => {
  if (module === '@/config/brand.json') return brand;
  if (module === './types') return { DEFAULT_LOCALE: 'mk' };
  throw new Error(`Unexpected dictionary dependency: ${module}`);
}, dictionary);

test('uses the official wordmark and localized product copy', () => {
  assert.equal(brand.name, 'МојаОрдинација');
  assert.equal(brand.productDescription, 'Менаџмент на стоматолошки ординации');
  assert.equal(brand.slogan, 'Помалку администрација. Повеќе насмевки.');
  for (const locale of ['mk', 'en']) {
    assert.equal(dictionary.translate(locale, 'sidebar.appName'), brand.name);
    const description = locale === 'mk' ? brand.productDescription : 'Dental Practice Management';
    assert.equal(dictionary.translate(locale, 'sidebar.appSubtitle'), description);
    assert.equal(dictionary.translate(locale, 'auth.workspace'), description);
    for (const key of ['auth.secureAccess', 'settings.practiceBrandHint', 'public.faq.intro']) {
      assert.ok(dictionary.translate(locale, key).includes(brand.name));
    }
  }
  assert.equal(dictionary.translate('mk', 'auth.workspaceHeadline'), brand.slogan);
});

test('keeps installation identity and paths stable while updating the displayed brand', async () => {
  const manifest = JSON.parse(await read('public/manifest.webmanifest'));
  assert.equal(manifest.name, brand.name);
  assert.equal(manifest.short_name, brand.name);
  assert.equal(manifest.description, brand.metaDescription);
  for (const key of ['id', 'start_url', 'scope']) assert.equal(manifest[key], './');
  assert.equal(manifest.theme_color, brand.themeColor);
  assert.equal(manifest.display, 'standalone');
  assert.deepEqual(manifest.icons.map((icon) => icon.src), [
    'icon-192.png?v=calendar-smile-png', 'icon-512.png?v=calendar-smile-png', 'icon-maskable-512.png?v=calendar-smile-png',
  ]);
  const png = await readFile(new URL('../../public/brand-social.png', import.meta.url));
  assert.equal(png.readUInt32BE(16), 1200);
  assert.equal(png.readUInt32BE(20), 630);
  const html = await read('index.html');
  for (const token of [
    '<title>%BRAND_NAME%</title>',
    'name="application-name" content="%BRAND_NAME%"',
    'property="og:title" content="%BRAND_NAME%"',
    'name="apple-mobile-web-app-title" content="%BRAND_NAME%"',
  ]) assert.ok(html.includes(token));
  assert.ok(html.includes('brand-social.png?v=calendar-smile-png'));
});

test('login and public pages use localized descriptions rather than hardcoded Macedonian copy', async () => {
  for (const path of ['src/pages/Login.tsx', 'src/pages/PublicInfoPage.tsx']) {
    const source = await read(path);
    assert.ok(source.includes("t('auth.workspace')"));
    assert.ok(!source.includes('{brand.productDescription}'));
  }
});
