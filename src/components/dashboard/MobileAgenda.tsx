import { useEffect, useMemo, useState } from 'react';
import { addDays, addWeeks, format, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Plus, UserRound } from 'lucide-react';
import { Appointment } from '@/types/appointment';
import { appointmentsStorage } from '@/lib/storage';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';

interface MobileAgendaProps {
  onCreateAppointment: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  refreshTrigger?: number;
}

const appointmentStatusClass = (status: Appointment['status']) => {
  switch (status) {
    case 'completed':
      return 'bg-accent text-accent-foreground';
    case 'cancelled':
      return 'bg-destructive text-destructive-foreground';
    case 'no-show':
      return 'bg-warning text-warning-foreground';
    default:
      return 'bg-primary text-primary-foreground';
  }
};

export function MobileAgenda({ onCreateAppointment, onAppointmentClick, refreshTrigger = 0 }: MobileAgendaProps) {
  const { dateFnsLocale, t } = useI18n();
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    appointmentsStorage.getAll()
      .then((data) => {
        if (isMounted) setAppointments(data);
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

  const visibleDates = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart]
  );

  const dayAppointments = appointments
    .filter((appointment) => isSameDay(new Date(appointment.startTime), selectedDate))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

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
    <section className="space-y-4 md:hidden" data-testid="mobile-agenda">
      <div className="rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-background p-4 shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{t('mobile.schedule')}</p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight">{t('mobile.agenda')}</h2>
          </div>
          <Button type="button" variant="outline" size="icon" aria-label={t('dashboard.goToThisWeek')} title={t('dashboard.goToThisWeek')} onClick={goToThisWeek} className="h-10 w-10 rounded-xl bg-background/80">
            <CalendarDays className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2" aria-label={t('mobile.chooseDay')}>
          {visibleDates.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, today);
            return (
              <Button
                key={date.toISOString()}
                type="button"
                variant={isSelected ? 'default' : 'outline'}
                onClick={() => selectDate(date)}
                className={cn(
                  'h-auto min-w-0 flex-col rounded-xl px-1 py-2 text-center shadow-sm sm:rounded-2xl sm:px-2.5 sm:py-2.5',
                  !isSelected && 'bg-background/75'
                )}
              >
                <span className="text-[9px] font-medium opacity-80 sm:text-[11px]">
                  {isToday ? t('scheduler.nav.today') : format(date, 'EEE', { locale: dateFnsLocale })}
                </span>
                <span className="mt-0.5 text-sm font-semibold leading-none sm:text-base">{format(date, 'd')}</span>
              </Button>
            );
          })}
        </div>

        <div className="mt-3 inline-flex w-full items-center rounded-xl border border-border/70 bg-background p-0.5 shadow-sm">
          <Button type="button" variant="ghost" size="icon" aria-label={t('dashboard.previousWeek')} onClick={() => changeWeek(-1)} className="h-8 w-8 shrink-0 rounded-lg">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-0 flex-1 px-2 text-center text-xs font-semibold tabular-nums">
            {format(weekStart, 'd MMM', { locale: dateFnsLocale })} - {format(addDays(weekStart, 6), 'd MMM', { locale: dateFnsLocale })}
          </span>
          <Button type="button" variant="ghost" size="icon" aria-label={t('dashboard.nextWeek')} onClick={() => changeWeek(1)} className="h-8 w-8 shrink-0 rounded-lg">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h3 className="text-base font-semibold">{format(selectedDate, 'EEEE, d MMMM', { locale: dateFnsLocale })}</h3>
          <p className="text-xs text-muted-foreground">{dayAppointments.length === 1 ? t('mobile.appointmentsOne') : t('mobile.appointments', { count: dayAppointments.length })}</p>
        </div>
        <Button type="button" size="sm" onClick={() => onCreateAppointment(selectedDate)} className="h-9 rounded-xl shadow-sm">
          <Plus className="mr-1.5 h-4 w-4" />
          {t('mobile.add')}
        </Button>
      </div>

      {loading ? (
        <Card className="border-border/70 shadow-soft"><CardContent className="p-6 text-center text-sm text-muted-foreground">{t('mobile.loading')}</CardContent></Card>
      ) : dayAppointments.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-muted/15 shadow-none">
          <CardContent className="flex flex-col items-center px-5 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Clock3 className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-medium">{t('calendar.noAppointments')}</p>
            <p className="mt-1 text-xs text-muted-foreground">{t('mobile.addHint')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {dayAppointments.map((appointment) => (
            <button
              key={appointment.id}
              type="button"
              onClick={() => onAppointmentClick(appointment)}
              className="flex w-full items-stretch overflow-hidden rounded-2xl border border-border/70 bg-card text-left shadow-soft transition-transform active:scale-[0.99]"
            >
              <div className="w-1.5 bg-primary" />
              <div className="min-w-0 flex-1 px-3.5 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-sm font-semibold"><UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> <span className="truncate">{appointment.patientName}</span></p>
                    <p className="mt-1 text-xs text-muted-foreground">{appointment.title || t(`appointment.types.${appointment.type === 'follow-up' ? 'followUp' : appointment.type}`)}</p>
                  </div>
                  <Badge className={cn('shrink-0 text-[10px] capitalize', appointmentStatusClass(appointment.status))}>{t(`appointment.status.${appointment.status === 'no-show' ? 'noShow' : appointment.status}`)}</Badge>
                </div>
                <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{format(new Date(appointment.startTime), 'HH:mm')} - {format(new Date(appointment.endTime), 'HH:mm')}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
