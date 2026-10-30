import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { patientsStorage } from '@/lib/storage';
import { groupDuplicatePatients } from '../../../server/patientMatching.js';
import type { PatientWithActivity } from '@/types/appointment';
import { useI18n } from '@/i18n';
import { useToast } from '@/hooks/use-toast';

export function PatientMergePanel({ onMerged }: Readonly<{ onMerged?: () => void }>) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [patients, setPatients] = useState<PatientWithActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [review, setReview] = useState<{ target: PatientWithActivity; sources: PatientWithActivity[] } | null>(null);
  const [selectedSourceIds, setSelectedSourceIds] = useState<string[]>([]);
  const [groupLimit, setGroupLimit] = useState(10);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPatients(await patientsStorage.getWithActivity());
    } catch (error) {
      setError(error instanceof Error ? error.message : t('patientMerge.failed'));
    } finally {
      setLoading(false);
    }
  }, [t]);
  useEffect(() => { void load(); }, [load]);

  const merge = async () => {
    if (!review || !selectedSourceIds.length) return;
    setSaving(true);
    setError(null);
    try {
      await patientsStorage.merge(review.target.id, selectedSourceIds);
      setReview(null);
      onMerged?.();
      toast({ title: t('patientMerge.success') });
      await load();
    } catch (error) {
      setError(error instanceof Error ? error.message : t('patientMerge.failed'));
    } finally {
      setSaving(false);
    }
  };

  const groups = useMemo(() => groupDuplicatePatients(patients), [patients]);
  return (
    <Card data-testid="patient-merge-panel">
      <CardHeader>
        <CardTitle>{t('patientMerge.title')}</CardTitle>
        <CardDescription>{t('patientMerge.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button type="button" variant="outline" onClick={() => void load()} disabled={loading || saving}>
          {t('patientMerge.refresh')}
        </Button>
        {error && !review && <p role="alert" className="text-sm text-destructive">{error}</p>}
        {loading ? <p role="status">{t('patientMerge.loading')}</p> : !error && groups.length === 0 ? (
          <p>{t('patientMerge.empty')}</p>
        ) : !error && groups.slice(0, groupLimit).map((group) => (
          <fieldset key={group[0].id} className="space-y-3 rounded-lg border p-3" data-testid="patient-duplicate-group">
            <legend className="px-1 font-medium">{group[0].firstName} {group[0].lastName}</legend>
            <p className="text-sm text-muted-foreground">{t('patientMerge.choose')}</p>
            {group.map((patient) => (
              <div key={patient.id} className="space-y-2 rounded-md bg-muted/40 p-3">
                <p className="break-words font-medium">{patient.firstName} {patient.lastName}</p>
                <p className="break-all text-xs text-muted-foreground">#{patient.id}</p>
                <dl className="grid gap-1 text-sm">
                  {([
                    ['createPatient.email', patient.email],
                    ['createPatient.phone', patient.phone],
                    ['createPatient.dob', patient.dateOfBirth],
                    ['createPatient.address', patient.address],
                    ['createPatient.emergencyContact', patient.emergencyContact],
                    ['appointment.notes', patient.notes],
                    ['patientMerge.created', patient.createdAt],
                    ['patientMerge.appointments', String(patient.appointmentCount)],
                  ]).map(([label, value]) => value && (
                    <div key={label} className="whitespace-pre-wrap break-words"><dt className="inline font-medium">{t(label)}: </dt><dd className="inline">{value}</dd></div>
                  ))}
                  {!loading && !error && groups.length > groupLimit && (
                    <Button type="button" variant="outline" onClick={() => setGroupLimit((limit) => limit + 10)}>
                      {t('appointment.morePatients', { shown: groupLimit, total: groups.length })}
                    </Button>
                  )}
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  className="h-auto w-full whitespace-normal py-2 sm:w-auto"
                  data-testid={`merge-keep-${patient.id}`}
                  disabled={saving || loading}
                  onClick={() => {
                    setError(null);
                    setSelectedSourceIds([]);
                    setReview({ target: patient, sources: group.filter((other) => other.id !== patient.id) });
                  }}
                >
                  {t('patientMerge.keep')}
                </Button>
              </div>
            ))}
          </fieldset>
        ))}
        <AlertDialog open={review !== null} onOpenChange={(open) => { if (!open && !saving) { setReview(null); setError(null); } }}>
          <AlertDialogContent className="max-h-[90dvh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('patientMerge.confirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('patientMerge.confirmDescription')}</AlertDialogDescription>
            </AlertDialogHeader>
            {review && (
              <div className="space-y-2 text-sm">
                <p>{t('patientMerge.keeping', { name: `${review.target.firstName} ${review.target.lastName}`.trim() })}</p>
                <p className="break-all">#{review.target.id}</p>
                <p>{t('patientMerge.removing', { n: selectedSourceIds.length })}</p>
                <ul className="space-y-1">
                  {review.sources.map((source) => (
                    <li key={source.id}>
                      <label className="flex items-start gap-2 break-all">
                        <input
                          type="checkbox"
                          className="mt-1"
                          data-testid={`merge-source-${source.id}`}
                          checked={selectedSourceIds.includes(source.id)}
                          disabled={saving}
                          onChange={(event) => setSelectedSourceIds((current) => event.target.checked
                            ? [...current, source.id] : current.filter((id) => id !== source.id))}
                        />
                        <span>
                          {source.firstName} {source.lastName}
                          <span className="block text-xs text-muted-foreground">
                            {[source.phone, source.email, source.dateOfBirth, `#${source.id}`].filter(Boolean).join(' / ')}
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={saving}>{t('patientMerge.cancel')}</AlertDialogCancel>
              <Button type="button" onClick={() => void merge()} disabled={saving || !selectedSourceIds.length} data-testid="confirm-patient-merge">
                {t(saving ? 'patientMerge.merging' : 'patientMerge.confirm')}
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
