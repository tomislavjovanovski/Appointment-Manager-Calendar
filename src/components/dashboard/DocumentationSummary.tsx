import { useState } from 'react';
import { format } from 'date-fns';
import { Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { appointmentTimes, localDayDate, type DocumentationDay } from '@/lib/documentationReminders';
import type { Appointment } from '@/types/appointment';
import { cn } from '@/lib/utils';

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

export function DocumentationReviewDetails({ summary, onAppointmentClick, onAcknowledge }: {
  summary: DocumentationDay;
  onAppointmentClick: (appointment: Appointment) => void;
  onAcknowledge: (appointments: Appointment[]) => Promise<void>;
}) {
  const { t } = useI18n();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="basis-full space-y-2">
      <p data-testid="documentation-counts" className="text-xs text-muted-foreground">
        {t('documentation.counts', {
          total: summary.total, completed: summary.completed,
          withNotes: summary.withNotes, withoutNotes: summary.withoutNotes,
        })}
      </p>
      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {summary.pending.map((appointment) => <li key={appointment.id}>
          <button type="button" data-testid="pending-documentation-appointment"
            className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted focus-visible:outline focus-visible:outline-2"
            onClick={() => onAppointmentClick(appointment)}>
            {format(new Date(appointmentTimes(appointment).start), 'HH:mm')} - {appointment.patientName}
            {appointment.title && ` · ${appointment.title}`}
          </button>
        </li>)}
      </ul>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {summary.pending.length > 0 && <Button type="button" size="sm" variant="ghost"
        data-testid="acknowledge-documentation" disabled={saving}
        onClick={async () => {
          setSaving(true);
          setError(null);
          try {
            await onAcknowledge(summary.pending);
          } catch (err) {
            setError(err instanceof Error ? err.message : t('documentation.reviewFailed'));
          } finally {
            setSaving(false);
          }
        }}>{t(saving ? 'appointment.saving' : 'documentation.markReviewed')}</Button>}
    </div>
  );
}
