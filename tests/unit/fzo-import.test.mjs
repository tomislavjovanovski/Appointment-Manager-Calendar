import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import ts from 'typescript';

let browser;
let page;
let code;
before(async () => {
  const source = await readFile(new URL('../../src/lib/fzoImport.ts', import.meta.url), 'utf8');
  code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
});
after(async () => { await browser?.close(); });

const cell = (text, index = '') => `<Cell ${index ? `ss:Index="${index}"` : ''}><Data ss:Type="String">${text}</Data></Cell>`;
const workbook = (name = 'Test Patient', address = 'Test address', embg = '0101990450001') =>
  `\uFEFF<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet><Table>
  <Row><Cell ss:Index="2" ss:MergeAcross="2"><Data>Report title</Data></Cell></Row>
  <Row>${cell('Име и презиме на осигуреникот', '3')}${cell('Ембг на осигуреното лице', '6')}${cell('Адреса')}</Row>
  <Row>${cell(name, '3')}${cell(embg, '6')}${cell(address)}</Row>
  </Table></Worksheet></Workbook>`;

const parse = (xml) => page.evaluate(({ code, xml }) => {
  const exports = {};
  new Function('exports', code)(exports);
  return exports.parseFzoSpreadsheet(xml);
}, { code, xml });

test('reads FZO headers, sparse columns, merged report titles, BOM and leading-zero EMBGs', async () => {
  assert.deepEqual(await parse(workbook()), {
    rows: [{ name: 'Test Patient', embg: '0101990450001', address: 'Test address' }],
    repairedAmpersands: 0,
    ignoredPortalHtml: false,
  });
});

test('reads the FZO registration date column without conflating it with record creation', async () => {
  const xml = workbook()
    .replace(cell('Име и презиме на осигуреникот', '3'), `${cell('Датум на пријава', '2')}${cell('Име и презиме на осигуреникот', '3')}`)
    .replace(cell('Test Patient', '3'), `${cell('03.01.2026', '2')}${cell('Test Patient', '3')}`);
  const result = await parse(xml);
  assert.equal(result.rows[0].registrationDate, '03.01.2026');
  assert.equal(result.rows[0].embg, '0101990450001');
});

test('repairs bare ampersands from FZO without double-encoding entities or changing CDATA/comments', async () => {
  assert.deepEqual(await parse(workbook('Test & Patient', 'A &amp; B & C')), {
    rows: [{ name: 'Test & Patient', embg: '0101990450001', address: 'A & B & C' }],
    repairedAmpersands: 2,
    ignoredPortalHtml: false,
  });
  const result = await parse(workbook('Test Patient', '<![CDATA[A & B]]>').replace('<Table>', '<Table><!-- & -->'));
  assert.equal(result.rows[0].address, 'A & B');
  assert.equal(result.repairedAmpersands, 0);
});

test('reads workbook when FZO appends its HTML response, but rejects arbitrary trailing content', async () => {
  const result = await parse(`${workbook()}\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml"><body><form><input type="hidden" name="__VIEWSTATE" value="test" /></form></body></html>`);
  assert.equal(result.ignoredPortalHtml, true);
  assert.equal(result.rows.length, 1);
  await assert.rejects(parse(`${workbook()}<unrelated/>`), /patientImport.invalidXml/);
  await assert.rejects(parse(`<!DOCTYPE Workbook [<!ENTITY x "test">]>${workbook()}\n<!DOCTYPE html><html></html>`), /patientImport.invalidXml/);
});

test('rejects malformed, unsupported, DTD/entity-bearing and missing-header files', async () => {
  for (const xml of ['<broken>', '<Workbook/>', `<!DOCTYPE Workbook [<!ENTITY x "test">]>${workbook()}`,
    workbook('Test &unknown; Patient')]) {
    await assert.rejects(parse(xml), /patientImport.invalidXml/);
  }
  await assert.rejects(parse(workbook().replace('Ембг на осигуреното лице', 'Wrong column')), /patientImport.headersMissing/);
});

test('empty spreadsheets and files over the row limit are rejected', async () => {
  const empty = workbook().replace(/<Row><Cell ss:Index="3"><Data ss:Type="String">Test Patient[\s\S]*?<\/Row>/, '');
  await assert.rejects(parse(empty), /patientImport.empty/);
  const data = `<Row>${cell('Test Patient', '3')}${cell('0101990450001', '6')}${cell('Address')}</Row>`;
  const large = empty.replace('</Table>', `${data.repeat(10001)}</Table>`);
  await assert.rejects(parse(large), /patientImport.tooLarge/);
});
