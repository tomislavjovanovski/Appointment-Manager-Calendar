import { useEffect, useState } from 'react';
import { format, isValid } from 'date-fns';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useI18n } from '@/i18n';
import { APPOINTMENT_TYPES } from '@/lib/appointmentTypes';
import { appointmentsStorage } from '@/lib/storage';
import type { Appointment } from '@/types/appointment';

interface PatientAppointmentHistoryProps {
  patientId?: string | null;
  active: boolean;
  currentAppointmentId?: string;
}

export function PatientAppointmentHistory({
  patientId,
  active,
  currentAppointmentId,
}: PatientAppointmentHistoryProps) {
  const { t, dateFnsLocale } = useI18n();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [historyState, setHistoryState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [historyRetry, setHistoryRetry] = useState(0);

  useEffect(() => {
    if (!active || !patientId) return;
    let cancelled = false;
    setAppointments([]);
    setHistoryState('loading');
    appointmentsStorage.getByPatient(patientId).then((records) => {
      if (cancelled) return;
      setAppointments([...records].sort((first, second) =>
        (Date.parse(second.startTime) || 0) - (Date.parse(first.startTime) || 0)
      ));
      setHistoryState('ready');
    }).catch(() => {
      if (!cancelled) setHistoryState('error');
    });
    return () => { cancelled = true; };
  }, [active, patientId, historyRetry]);

  if (!patientId) {
    return <p className="py-6 text-sm text-muted-foreground">{t('patientHistory.selectPatient')}</p>;
  }

  return (
    <>
      {historyState === 'loading' && <output className="block py-6 text-sm text-muted-foreground">{t('patientHistory.loading')}</output>}
      {historyState === 'error' && (
        <div role="alert" className="space-y-3 py-6">
          <p className="text-sm text-destructive">{t('patientHistory.error')}</p>
          <Button type="button" variant="outline" onClick={() => setHistoryRetry((value) => value + 1)}>
            <RotateCw className="mr-2 h-4 w-4" />{t('patientHistory.retry')}
          </Button>
        </div>
      )}
      {historyState === 'ready' && (appointments.length === 0 ? (
        <p className="py-6 text-sm text-muted-foreground">{t('patientHistory.empty')}</p>
      ) : (
        <ol className="space-y-2">
          {appointments.map((appointment) => {
            const date = new Date(appointment.startTime);
            const appointmentType = APPOINTMENT_TYPES[appointment.type];
            return (
              <li
                key={appointment.id}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_1px_minmax(0,2fr)] items-stretch gap-3 rounded-lg border border-slate-200 border-l-4 bg-slate-50 px-3 py-2.5"
                style={{ borderLeftColor: appointmentType?.color ?? '#64748b' }}
                data-testid="patient-history-entry"
              >
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                  <time dateTime={isValid(date) ? appointment.startTime : undefined} className="block text-sm font-medium">
                    {isValid(date) ? format(date, 'PP', { locale: dateFnsLocale }) : t('patientHistory.unknownDate')}
                  </time>
                  <span className="block break-words text-xs font-medium text-muted-foreground" data-testid="patient-history-type">
                    {appointmentType ? t(appointmentType.labelKey) : appointment.type}
                  </span>
                  {appointment.id === currentAppointmentId && (
                    <span className="text-xs font-medium text-primary" data-testid="current-appointment-label">
                      {t('patientHistory.currentAppointment')}
                    </span>
                  )}
                </div>
                <Separator orientation="vertical" />
                <p className="min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed [overflow-wrap:anywhere]">
                  {appointment.notes?.trim() ? appointment.notes : t('patientHistory.noNotes')}
                </p>
              </li>
            );
          })}
        </ol>
      ))}
    </>
  );
}
