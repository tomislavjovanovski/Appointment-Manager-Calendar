import { useMemo, useState } from 'react';
import { Upload, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { patientImportStorage } from '@/lib/storage';
import { parseFzoSpreadsheet, type FzoRow, type ImportPreview, type ImportStatus } from '@/lib/fzoImport';
import { useI18n } from '@/i18n';

const STATUSES: ImportStatus[] = ['new', 'update', 'unchanged', 'review', 'duplicate'];
const PAGE_SIZE = 25;

export function PatientImportPanel({ onImported }: Readonly<{ onImported?: () => void }>) {
  const { t } = useI18n();
  const [rows, setRows] = useState<FzoRow[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [repairedAmpersands, setRepairedAmpersands] = useState(0);
  const [ignoredPortalHtml, setIgnoredPortalHtml] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const showError = (error: unknown) => setError(error instanceof Error
    ? error.message.startsWith('patientImport.') ? t(error.message) : error.message
    : t('patientImport.failed'));

  const selectFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setPreview(null);
    setRows([]);
    setError('');
    setResult('');
    setRepairedAmpersands(0);
    setIgnoredPortalHtml(false);
    setFileName(file.name);
    setSearch('');
    setFilter('all');
    setLimit(PAGE_SIZE);
    setBusy(true);
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('patientImport.tooLarge');
      const parsed = parseFzoSpreadsheet(await file.text());
      setRepairedAmpersands(parsed.repairedAmpersands);
      setIgnoredPortalHtml(parsed.ignoredPortalHtml);
      setRows(parsed.rows);
      setPreview(await patientImportStorage.preview(parsed.rows));
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  const refreshPreview = async () => {
    setBusy(true);
    setError('');
    setPreview(null);
    try {
      setPreview(await patientImportStorage.preview(rows));
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      const counts = await patientImportStorage.confirm(rows, preview.revision);
      setResult(t('patientImport.result', counts));
      setPreview(null);
      setRows([]);
      setSearch('');
      setFilter('all');
      setLimit(PAGE_SIZE);
      onImported?.();
    } catch (error) {
      showError(error);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const query = search.normalize('NFKC').trim().toLowerCase();
  const entries = useMemo(() => preview?.entries.filter((entry) =>
    (filter === 'all' || entry.status === filter) &&
    `${entry.name} ${entry.embg} ${entry.patient?.firstName ?? ''} ${entry.patient?.lastName ?? ''}`.toLowerCase().includes(query)
  ) ?? [], [preview, filter, query]);
  const actionable = preview?.entries.filter((entry) => entry.status === 'new' || entry.status === 'update').length ?? 0;

  return (
    <Card data-testid="patient-import-panel">
      <CardHeader>
        <CardTitle>{t('patientImport.title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
          <li><a href="https://portal.fzo.org.mk/SitePages/FzomPages/Pacienti.aspx" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary underline">
            {t('patientImport.login')}<ExternalLink className="h-3 w-3" />
          </a></li>
          <li>{t('patientImport.download')}</li>
          <li>{t('patientImport.reviewStep')}</li>
        </ol>
        <div className="space-y-2">
          <Label htmlFor="fzo-import-file" className="flex items-center gap-2"><Upload className="h-4 w-4" />{t('patientImport.choose')}</Label>
          <Input id="fzo-import-file" type="file" accept=".xls,.xml" onChange={(event) => void selectFile(event)} disabled={busy} />
          {fileName && <p className="break-all text-sm text-muted-foreground">{fileName}</p>}
        </div>
        {busy && <p role="status">{t('patientImport.processing')}</p>}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {(repairedAmpersands > 0 || ignoredPortalHtml) && <details className="rounded-md bg-muted p-3 text-sm">
          <summary className="cursor-pointer">{t('patientImport.fileNotes')}</summary>
          {repairedAmpersands > 0 && <p className="mt-2">{t('patientImport.repairedXml', { n: repairedAmpersands })}</p>}
          {ignoredPortalHtml && <p className="mt-2">{t('patientImport.ignoredHtml')}</p>}
        </details>}
        {result && <p role="status" className="rounded-md bg-muted p-3 text-sm">{result}</p>}
        {rows.length > 0 && <Button variant="outline" onClick={() => void refreshPreview()}
          disabled={busy}>{t('patientImport.refresh')}</Button>}
        {preview && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fzo-patient-search">{t('patientImport.search')}</Label>
              <Input id="fzo-patient-search" value={search} onChange={(event) => { setSearch(event.target.value); setLimit(PAGE_SIZE); }} />
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={t('patientImport.filter')}>
              {['all', ...STATUSES].map((status) => (
                <Button key={status} variant={filter === status ? 'default' : 'outline'} size="sm" aria-pressed={filter === status}
                  onClick={() => { setFilter(status); setLimit(PAGE_SIZE); }}>
                  {t(`patientImport.${status}`)} ({status === 'all' ? preview.entries.length : preview.entries.filter((entry) => entry.status === status).length})
                </Button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b">
                  {['source', 'existing', 'action'].map((key) => <th key={key} scope="col" className="p-2">{t(`patientImport.${key}`)}</th>)}
                </tr></thead>
                <tbody>{entries.slice(0, limit).map((entry) => (
                  <tr key={entry.row} className="border-b align-top">
                    <td className="p-2"><p>{entry.name}</p><p className="font-mono">{entry.embg || '-'}</p><p className="text-muted-foreground">{entry.address}</p>
                      {entry.registrationDate && <p>{t('patientImport.registrationDate')}: {entry.registrationDate}</p>}
                      {entry.dateOfBirth && <p>{t('createPatient.dob')}: {entry.dateOfBirth}</p>}
                    </td>
                    <td className="p-2">{entry.patient ? <><p>{entry.patient.firstName} {entry.patient.lastName}</p><p className="font-mono">{entry.patient.embg || t('patientImport.noEmbg')}</p><p className="text-muted-foreground">{entry.patient.address}</p>
                      {entry.patient.registrationDate && <p>{t('patientImport.registrationDate')}: {entry.patient.registrationDate}</p>}
                    </> : '-'}</td>
                    <td className="p-2"><p className="font-medium">{t(`patientImport.${entry.status}`)}</p>
                      {entry.reason && <p className="text-muted-foreground">{t(`patientImport.reason.${entry.reason}`)}</p>}
                      {entry.changes.embg && <p>{t('patientImport.fillEmbg')}</p>}
                      {entry.changes.address && <p>{t('patientImport.fillAddress')}</p>}
                      {entry.changes.dateOfBirth && <p>{t('patientImport.fillDateOfBirth')}</p>}
                      {entry.changes.registrationDate && <p>{t('patientImport.updateRegistrationDate')}</p>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {!entries.length && <p className="text-sm">{t('patientImport.noResults')}</p>}
            {entries.length > limit && <Button variant="outline" onClick={() => setLimit((value) => value + PAGE_SIZE)}>{t('appointment.morePatients', { shown: limit, total: entries.length })}</Button>}
            {preview.entries.some((entry) => entry.status === 'review' || entry.status === 'duplicate') &&
              <p className="text-sm text-muted-foreground">{t('patientImport.skipped')}</p>}
            <Button onClick={() => void confirm()} disabled={busy || actionable === 0}>{t('patientImport.confirm', { n: actionable })}</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
