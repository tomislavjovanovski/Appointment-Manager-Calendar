export interface FzoRow {
  name: string;
  embg: string;
  address: string;
  registrationDate?: string;
}

export type ImportStatus = 'new' | 'update' | 'unchanged' | 'review' | 'duplicate';

export interface ImportEntry extends FzoRow {
  dateOfBirth: string;
  row: number;
  status: ImportStatus;
  reason: string;
  patient: { id: string; firstName: string; lastName: string; embg?: string; address?: string; registrationDate?: string; dateOfBirth?: string } | null;
  changes: { embg?: string; address?: string; registrationDate?: string; dateOfBirth?: string };
}

export interface ImportPreview {
  revision: string;
  entries: ImportEntry[];
  currentCount: number;
}

const SS = 'urn:schemas-microsoft-com:office:spreadsheet';
const normalizeHeader = (text: string) => text.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLowerCase();

export function parseFzoSpreadsheet(text: string): { rows: FzoRow[]; repairedAmpersands: number; ignoredPortalHtml: boolean } {
  let ignoredPortalHtml = false;
  // The portal sometimes appends its ASP.NET HTML page after the complete workbook.
  const workbook = text.replace(/^\uFEFF/, '').replace(
    /(<\/(?:[A-Za-z_][\w.-]*:)?Workbook\s*>)\s*<!DOCTYPE\s+html\s*>\s*<html\b[\s\S]*<\/html\s*>\s*$/i,
    (_suffix, closingTag: string) => {
      ignoredPortalHtml = true;
      return closingTag;
    },
  );
  if (/<!DOCTYPE|<!ENTITY/i.test(workbook)) throw new Error('patientImport.invalidXml');
  let repairedAmpersands = 0;
  // FZO exports can contain bare ampersands in cell text. Preserve entities, comments and CDATA.
  const xml = workbook.replace(
    /<!\[CDATA\[[\s\S]*?\]\]>|<!--[\s\S]*?-->|&(?![A-Za-z_:][A-Za-z0-9_.:-]*;|#\d+;|#x[0-9A-Fa-f]+;)/g,
    (token) => {
      if (token !== '&') return token;
      repairedAmpersands++;
      return '&amp;';
    },
  );
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.getElementsByTagName('parsererror').length ||
      document.documentElement.localName !== 'Workbook' || document.documentElement.namespaceURI !== SS) {
    throw new Error('patientImport.invalidXml');
  }
  const tables = Array.from(document.getElementsByTagNameNS(SS, 'Table'));
  for (const table of tables) {
    let columns: { name: number; embg: number; address: number; registrationDate: number } | null = null;
    const patients: FzoRow[] = [];
    for (const row of Array.from(table.children).filter((element) => element.namespaceURI === SS && element.localName === 'Row')) {
      const values = new Map<number, string>();
      let column = 0;
      for (const cell of Array.from(row.children).filter((element) => element.namespaceURI === SS && element.localName === 'Cell')) {
        const index = cell.getAttributeNS(SS, 'Index');
        if (index) column = Number(index) - 1;
        if (!Number.isInteger(column) || column < 0 || column > 1000) throw new Error('patientImport.invalidXml');
        values.set(column, cell.getElementsByTagNameNS(SS, 'Data')[0]?.textContent?.trim() ?? '');
        const merge = Number(cell.getAttributeNS(SS, 'MergeAcross') ?? 0);
        if (!Number.isInteger(merge) || merge < 0 || merge > 1000) throw new Error('patientImport.invalidXml');
        column += merge + 1;
      }
      if (!columns) {
        const headers = [...values.entries()];
        const name = headers.find(([, value]) => normalizeHeader(value) === 'име и презиме на осигуреникот')?.[0];
        const embg = headers.find(([, value]) => normalizeHeader(value) === 'ембг на осигуреното лице')?.[0];
        if (name !== undefined && embg !== undefined) {
          columns = {
            name, embg,
            address: headers.find(([, value]) => normalizeHeader(value) === 'адреса')?.[0] ?? -1,
            registrationDate: headers.find(([, value]) => normalizeHeader(value) === 'датум на пријава')?.[0] ?? -1,
          };
        }
        continue;
      }
      if (![...values.values()].some(Boolean)) continue;
      patients.push({
        name: values.get(columns.name) ?? '',
        embg: values.get(columns.embg) ?? '',
        address: values.get(columns.address) ?? '',
        ...(columns.registrationDate >= 0 ? { registrationDate: values.get(columns.registrationDate) ?? '' } : {}),
      });
      if (patients.length > 10000) throw new Error('patientImport.tooLarge');
    }
    if (columns) {
      if (!patients.length) throw new Error('patientImport.empty');
      return { rows: patients, repairedAmpersands, ignoredPortalHtml };
    }
  }
  throw new Error('patientImport.headersMissing');
}
