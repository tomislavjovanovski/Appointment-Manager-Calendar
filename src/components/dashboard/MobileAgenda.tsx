import { useEffect, useMemo, useState } from 'react';
import { addDays, addWeeks, format, isBefore, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight, Clock3, Phone, Plus, UserRound } from 'lucide-react';
import { Appointment, AppointmentSettings, Patient } from '@/types/appointment';
import { appointmentsStorage, patientsStorage, settingsStorage } from '@/lib/storage';
import { getFreeGaps, splitIntoSlots } from '@/lib/appointmentAvailability';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface MobileAgendaProps {
  onCreateAppointment: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  refreshTrigger?: number;
}

export function MobileAgenda({ onCreateAppointment, onAppointmentClick, refreshTrigger = 0 }: MobileAgendaProps) {
  const { dateFnsLocale, t, initialSettings } = useI18n();
  const [settings, setSettings] = useState<AppointmentSettings | null>(() => settingsStorage.getCached() ?? initialSettings);
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      appointmentsStorage.getAll(),
      patientsStorage.getAll().catch(() => null),
      settingsStorage.get().catch(() => null),
    ])
      .then(([data, patientRecords, settingsData]) => {
        if (isMounted) {
          setAppointments(data);
          setPatients(patientRecords);
          if (settingsData) setSettings(settingsData);
        }
      })
      .catch(() => {
        if (isMounted) setAppointments([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const workingDays = settings?.workingDays;
  const visibleDates = useMemo(() => {
    const week = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    const working = workingDays ? week.filter((date) => workingDays.includes(date.getDay())) : week;
    return working.length > 0 ? working : week;
  }, [weekStart, workingDays]);

  useEffect(() => {
    if (!visibleDates.some((date) => isSameDay(date, selectedDate))) setSelectedDate(visibleDates[0]);
  }, [visibleDates, selectedDate]);

  const dayAppointments = appointments
    .filter((appointment) => isSameDay(new Date(appointment.startTime), selectedDate))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  const isWorkingDay = (date: Date) => !settings || settings.workingDays.includes(date.getDay());
  const isFullDay = (date: Date) => Boolean(settings) && !loading && isWorkingDay(date) &&
    !isBefore(date, today) && getFreeGaps(date, settings!, appointments).length === 0;

  const now = new Date();
  const getDaySlots = (date: Date) => {
    if (!settings || !isWorkingDay(date) || isBefore(date, today)) return [];
    const notBefore = isSameDay(date, now) ? now : undefined;
    return splitIntoSlots(getFreeGaps(date, settings, appointments, notBefore));
  };
  const selectedGaps = getDaySlots(selectedDate);
  const timeline = [
    ...dayAppointments.map((appointment) => ({ kind: 'appointment' as const, start: new Date(appointment.startTime), appointment })),
    ...selectedGaps.map((gap) => ({ kind: 'gap' as const, start: gap.start, end: gap.end })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  const selectDate = (date: Date) => setSelectedDate(startOfDay(date));

  const changeWeek = (amount: number) => {
    setWeekStart((currentWeek) => addWeeks(currentWeek, amount));
    setSelectedDate((currentDate) => addWeeks(currentDate, amount));
  };

  const goToThisWeek = () => {
    setWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
    setSelectedDate(today);
  };

  return (
    <section className="space-y-3 md:hidden" data-testid="mobile-agenda">
      <div className="flex items-stretch gap-1.5 rounded-2xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-background px-1.5 py-2.5 shadow-soft">
        <Button type="button" variant="outline" size="icon" aria-label={t('dashboard.previousWeek')} onClick={() => changeWeek(-1)} className="h-auto w-8 shrink-0 self-stretch rounded-xl bg-background/75 shadow-sm">
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div
          className="grid min-w-0 flex-1 gap-1.5 sm:gap-2"
          style={{ gridTemplateColumns: `repeat(${visibleDates.length}, minmax(0, 1fr))` }}
          aria-label={t('mobile.chooseDay')}
        >
          {visibleDates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            const working = isWorkingDay(date);
            const full = isFullDay(date);
            const freeCount = loading ? 0 : getDaySlots(date).length;
            const showCount = !loading && Boolean(settings) && working && !isBefore(date, today);
            const dayLabel = format(date, 'EEEE d MMMM', { locale: dateFnsLocale });
            let statusLabel = '';
            if (full) statusLabel = `, ${t('mobile.fullDay')}`;
            else if (freeCount > 0) statusLabel = `, ${t('mobile.freeSlotsCount', { n: freeCount })}`;
            return (
              <Button
                key={date.toISOString()}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                disabled={!working}
                aria-label={dayLabel + statusLabel}
                onClick={() => selectDate(date)}
                className={cn(
                  'relative h-auto min-w-0 flex-col rounded-xl px-1 py-2 text-center shadow-sm sm:rounded-2xl sm:px-2.5 sm:py-2.5',
                  !isSelected && 'bg-background/75',
                  !working && 'bg-muted/40 opacity-40',
                  full && !isSelected && 'border-destructive/50 bg-destructive/10'
                )}
              >
                <span className="text-[11px] font-medium leading-5 opacity-80 sm:text-[13px]">
                  {isToday ? t('scheduler.nav.today') : format(date, 'EEE', { locale: dateFnsLocale })}
                </span>
                <span className="text-base font-semibold leading-none sm:text-lg">{format(date, 'd')}</span>
                {showCount && (
                  <span
                    aria-hidden="true"
                    data-testid="mobile-day-free-count"
                    className={cn(
                      'absolute -right-1 -top-1.5 min-w-[1.25rem] rounded-full px-1 text-xs font-semibold leading-5 tabular-nums shadow-sm',
                      isSelected && 'bg-background text-primary',
                      !isSelected && freeCount === 0 && 'bg-destructive text-destructive-foreground',
                      !isSelected && freeCount > 0 && 'bg-accent text-accent-foreground'
                    )}
                  >
                    {freeCount}
                  </span>
                )}
              </Button>
            );
          })}
        </div>

        <Button type="button" variant="outline" size="icon" aria-label={t('dashboard.nextWeek')} onClick={() => changeWeek(1)} className="h-auto w-8 shrink-0 self-stretch rounded-xl bg-background/75 shadow-sm">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h3 className="text-base font-semibold">{format(selectedDate, 'EEEE, d MMMM', { locale: dateFnsLocale })}</h3>
          <p className="text-xs text-muted-foreground">{dayAppointments.length === 1 ? t('mobile.appointmentsOne') : t('mobile.appointments', { count: dayAppointments.length })}</p>
        </div>
        {(!isSameDay(weekStart, startOfWeek(today, { weekStartsOn: 1 })) ||
          (isWorkingDay(today) && !isSameDay(selectedDate, today))) && (
          <Button type="button" variant="link" size="sm" onClick={goToThisWeek} className="h-8 px-1">
            {t('scheduler.nav.today')}
          </Button>
        )}
      </div>

      {loading ? (
        <Card className="border-border/70 shadow-soft"><CardContent className="p-6 text-center text-sm text-muted-foreground">{t('mobile.loading')}</CardContent></Card>
      ) : !isWorkingDay(selectedDate) || timeline.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-muted/15 shadow-none">
          <CardContent className="flex flex-col items-center px-5 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Clock3 className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-medium">{isWorkingDay(selectedDate) ? t('calendar.noAppointments') : t('mobile.nonWorkingDay')}</p>
            {isWorkingDay(selectedDate) && <p className="mt-1 text-xs text-muted-foreground">{t('mobile.addHint')}</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {isFullDay(selectedDate) && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{t('mobile.fullDay')}</p>
          )}
          {timeline.map((item) => {
            if (item.kind === 'gap') {
              return (
                <button
                  key={`gap-${item.start.getTime()}`}
                  type="button"
                  data-testid="mobile-free-slot"
                  onClick={() => onCreateAppointment(item.start)}
                  className="flex w-full items-center justify-between gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-left text-sm text-primary transition-transform active:scale-[0.99]"
                >
                  <span className="tabular-nums">
                    <span className="font-semibold">{format(item.start, 'HH:mm')} - {format(item.end, 'HH:mm')}</span>
                    <span className="ml-2 text-xs opacity-80">{t('mobile.freeSlot')}</span>
                  </span>
                  <Plus className="h-4 w-4 shrink-0" />
                </button>
              );
            }
            const { appointment } = item;
            const patient = patients?.find((record) => record.id === appointment.patientId);
            const firstName = patient?.firstName?.trim() || appointment.patientName || t('common.unknown');
            const lastName = patient?.lastName?.trim();
            const phone = patient?.phone?.trim() || t(patients === null ? 'dashboard.phoneUnavailable' : 'dashboard.noPhone');
            return (
            <button
              key={appointment.id}
              data-testid="mobile-appointment"
              type="button"
              onClick={() => onAppointmentClick(appointment)}
              className="flex w-full items-stretch overflow-hidden rounded-2xl border border-border/70 bg-card text-left shadow-soft transition-transform active:scale-[0.99]"
            >
              <div className="w-1 shrink-0 bg-primary" />
              <div className="grid min-w-0 flex-1 grid-cols-[minmax(3.25rem,15fr)_minmax(0,85fr)]">
                <div className="flex flex-col items-center justify-center gap-1 border-r border-border/70 bg-muted/20 px-1 py-2 text-xs tabular-nums">
                  <time dateTime={appointment.startTime} className="font-semibold text-foreground">{format(new Date(appointment.startTime), 'HH:mm')}</time>
                  <span aria-hidden="true" className="text-muted-foreground">-</span>
                  <time dateTime={appointment.endTime} className="text-muted-foreground">{format(new Date(appointment.endTime), 'HH:mm')}</time>
                </div>
                <div className="flex min-w-0 items-start justify-between gap-2 p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1.5 text-sm font-semibold">
                      <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 [overflow-wrap:anywhere]">{[firstName, lastName].filter(Boolean).join(' ')}</span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="mobile-appointment-phone">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words">{phone}</span>
                    </p>
                    <p className="mt-1 border-t border-border/70 pt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{appointment.title || t(`appointment.types.${appointment.type === 'follow-up' ? 'followUp' : appointment.type}`)}</p>
                  </div>
                </div>
              </div>
            </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
