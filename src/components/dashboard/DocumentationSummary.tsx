import { useRef, useState } from 'react';
import { format } from 'date-fns';
import { ClipboardList, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/i18n';
import { appointmentTimes, hasMeaningfulNote, localDayDate, type DocumentationDay } from '@/lib/documentationReminders';
import type { Appointment } from '@/types/appointment';
import { cn } from '@/lib/utils';
import { appointmentTypeLabel, getAppointmentType } from '@/lib/appointmentTypes';

interface Props {
  summaries: DocumentationDay[];
  latestEnded: Appointment | null;
  dismissed: ReadonlySet<string>;
  onDismiss: (key: string) => void;
  onReview: (day: string) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export function DocumentationSummary({ summaries, latestEnded, dismissed, onDismiss, onReview, onAppointmentClick }: Props) {
  const { t, dateFnsLocale } = useI18n();
  const [selectedDay, setSelectedDay] = useState('');
  const pendingDays = summaries.filter((summary) => summary.withoutNotes > 0);
  const summary = pendingDays.find((day) => day.day === selectedDay) ?? pendingDays[0];
  const latestDay = latestEnded ? format(new Date(appointmentTimes(latestEnded).start), 'yyyy-MM-dd') : null;
  // Today's gentle prompt takes precedence over unresolved older days during working hours.
  const showLatest = latestEnded && !summaries.some((day) => day.day === latestDay) &&
    !dismissed.has(`appointment:${latestEnded.id}`);
  if (!showLatest && !summary) return null;
  const key = showLatest ? `appointment:${latestEnded.id}` : `day:${summary.day}`;
  const acknowledged = !showLatest && summary.pending.every((appointment) => appointment.documentationReviewedAt);
  const quiet = dismissed.has(key) || acknowledged;

  return (
    <div data-testid={showLatest ? 'latest-documentation-banner' : 'documentation-summary'}
      data-day={showLatest ? latestDay : summary.day} data-dismissed={quiet ? 'true' : 'false'}
      className={cn(
        'ml-auto flex min-w-0 flex-wrap items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs',
        quiet ? 'border-border bg-muted/40 text-muted-foreground'
          : showLatest ? 'border-orange-300 bg-orange-100 text-orange-950 dark:border-orange-700 dark:bg-orange-950 dark:text-orange-100'
            : 'border-orange-400 bg-orange-200 text-orange-950 dark:border-orange-600 dark:bg-orange-900 dark:text-orange-50'
      )}>
      <Pencil className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <p className="min-w-0" role={quiet ? undefined : 'status'}>
        {showLatest
          ? t('documentation.latestEnded', { name: latestEnded.patientName })
          : t('documentation.gentleSummary', {
            count: summary.withoutNotes,
            date: format(localDayDate(summary.day), 'd MMM', { locale: dateFnsLocale }),
          })}
      </p>
      {!showLatest && pendingDays.length > 1 && (
        <select aria-label={t('documentation.chooseDay')} className="rounded border bg-background px-1 py-1 text-xs text-foreground"
          value={summary.day} onChange={(event) => setSelectedDay(event.target.value)}>
          {pendingDays.map((day) => <option key={day.day} value={day.day}>
            {format(localDayDate(day.day), 'd MMM', { locale: dateFnsLocale })}
          </option>)}
        </select>
      )}
      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs font-semibold hover:bg-black/5 hover:text-inherit dark:hover:bg-white/10"
        data-testid={showLatest ? 'edit-latest-documentation' : 'review-documentation'}
        onClick={() => showLatest ? onAppointmentClick(latestEnded) : onReview(summary.day)}>
        {t(showLatest ? 'documentation.editNotes' : 'documentation.reviewShort')}
      </Button>
      {!quiet && <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 hover:bg-black/5 hover:text-inherit dark:hover:bg-white/10"
        data-testid="dismiss-documentation" aria-label={t('documentation.dismiss')} onClick={() => onDismiss(key)}>
        <X className="h-3 w-3" aria-hidden="true" />
      </Button>}
    </div>
  );
}

export function DocumentationReviewDialog({ summary, onClose, onSaveNotes, onAcknowledge }: {
  summary: DocumentationDay;
  onClose: () => void;
  onSaveNotes: (notes: { id: string; notes: string }[]) => Promise<void>;
  onAcknowledge: (appointments: Appointment[]) => Promise<void>;
}) {
  const { t, dateFnsLocale, initialSettings } = useI18n();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);
  const notesToSave = summary.pending
    .map((appointment) => ({ id: appointment.id, notes: drafts[appointment.id] ?? '' }))
    .filter(({ notes }) => hasMeaningfulNote(notes));

  const persist = async (action: () => Promise<void>, failureKey: 'documentation.saveFailed' | 'documentation.reviewFailed') => {
    if (inFlight.current) return;
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(`${t(failureKey)}${err instanceof Error ? ` ${err.message}` : ''}`);
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !inFlight.current) onClose(); }}>
      <DialogContent className="w-[calc(100%-1rem)] border-border/70 p-0 shadow-2xl sm:max-w-[800px] md:shadow-medium">
        <form data-testid="documentation-dialog"
          className="flex max-h-[calc(100dvh-2rem)] min-h-0 flex-col overflow-hidden rounded-[inherit]"
          onSubmit={(event) => {
            event.preventDefault();
            if (notesToSave.length) void persist(() => onSaveNotes(notesToSave), 'documentation.saveFailed');
          }}>
          <div className="shrink-0 border-b border-border/60 bg-gradient-to-br from-primary/10 via-background to-background px-5 py-3 pr-10 sm:px-6 sm:pr-10">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <ClipboardList className="h-4 w-4" aria-hidden="true" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-lg font-semibold tracking-tight">{t('documentation.title')} · {format(localDayDate(summary.day), 'd MMM yyyy', { locale: dateFnsLocale })}</DialogTitle>
                  <DialogDescription className="text-xs leading-relaxed">{t('documentation.bulkDescription')}</DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>
          <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4 sm:px-6" aria-busy={saving}>
            <p data-testid="documentation-counts" className="text-xs text-muted-foreground">
              {t('documentation.counts', {
                total: summary.total, completed: summary.completed,
                withNotes: summary.withNotes, withoutNotes: summary.withoutNotes,
              })}
            </p>
            <ul className="space-y-3">
              {summary.pending.map((appointment) => (
                <li key={appointment.id} data-testid="pending-documentation-appointment"
                  data-appointment-id={appointment.id} className="grid grid-cols-[minmax(0,2fr)_minmax(0,3fr)] items-center gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
                  <div data-testid="documentation-appointment-details" className="min-w-0 space-y-1 break-words">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(appointmentTimes(appointment).start), 'd MMM', { locale: dateFnsLocale })} · {format(new Date(appointmentTimes(appointment).start), 'HH:mm')} – {format(new Date(appointmentTimes(appointment).end), 'HH:mm')}
                    </p>
                    <p className="text-sm font-semibold">{appointment.patientName}</p>
                    <p className="text-xs text-muted-foreground">{appointmentTypeLabel(getAppointmentType(appointment.type, initialSettings), t)} · {t(`appointment.status.${appointment.status === 'no-show' ? 'noShow' : appointment.status}`)}</p>
                    {appointment.title && <p className="text-xs text-muted-foreground">{appointment.title}</p>}
                  </div>
                  <div data-testid="documentation-note-column" className="min-w-0">
                    <Label htmlFor={`documentation-note-${appointment.id}`} className="sr-only">{t('editAppointment.notes')}</Label>
                    <Textarea id={`documentation-note-${appointment.id}`} data-testid="documentation-note"
                      rows={2} className="min-h-16 border-border bg-background shadow-sm" disabled={saving}
                      value={drafts[appointment.id] ?? appointment.notes ?? ''}
                      onChange={(event) => setDrafts((current) => ({ ...current, [appointment.id]: event.target.value }))} />
                  </div>
                </li>
              ))}
            </ul>
            {summary.pending.length === 0 && <p role="status" className="text-sm">{t('documentation.resolved')}</p>}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {summary.pending.some((appointment) => !appointment.documentationReviewedAt) && (
              <Button type="button" size="sm" variant="ghost" className="h-auto whitespace-normal text-left"
                data-testid="acknowledge-documentation" disabled={saving}
                onClick={() => void persist(() => onAcknowledge(summary.pending.filter((appointment) => !appointment.documentationReviewedAt)), 'documentation.reviewFailed')}>
                {t('documentation.markReviewed')}
              </Button>
            )}
          </div>
          <DialogFooter className="shrink-0 flex-row gap-2 border-t border-border/60 bg-background/95 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 [&>button]:flex-1 sm:gap-3 sm:space-x-0 sm:px-6 sm:py-3 sm:[&>button]:flex-none">
            <Button type="button" variant="outline" data-testid="close-documentation" disabled={saving} onClick={onClose} className="h-10">{t('editAppointment.cancel')}</Button>
            <Button type="submit" data-testid="save-documentation-notes" disabled={saving || notesToSave.length === 0} className="h-10 px-5 shadow-sm">
              {t(saving ? 'appointment.saving' : 'documentation.saveNotes')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
