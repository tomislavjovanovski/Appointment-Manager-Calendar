import { useState, useEffect, useRef, useMemo } from 'react';
import { Scheduler } from '@aldabil/react-scheduler';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, RotateCcw } from 'lucide-react';
import { addWeeks, endOfWeek, format, startOfWeek } from 'date-fns';
import { Appointment } from '@/types/appointment';
import { appointmentsStorage, settingsStorage } from '@/lib/storage';
import { GoogleCalendarSync } from './GoogleCalendarSync';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

const SCHEDULER_VIEW_DATE_KEY = 'scheduler_view_week_anchor';

function readStoredViewDate(): Date {
  try {
    const raw = localStorage.getItem(SCHEDULER_VIEW_DATE_KEY);
    if (raw) {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return d;
    }
  } catch {
    /* ignore */
  }
  return new Date();
}

function appointmentTypeKey(type: Appointment['type']): 'consultation' | 'followUp' | 'procedure' {
  if (type === 'follow-up') return 'followUp';
  return type;
}

interface WeeklySchedulerProps {
  onCreateAppointment: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  refreshTrigger?: number;
}

export function WeeklyScheduler({ onCreateAppointment, onAppointmentClick, refreshTrigger = 0 }: WeeklySchedulerProps) {
  const initialLoadDoneRef = useRef(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<any>({
    startTime: '09:00',
    endTime: '17:00',
    timeSlotMinutes: 30
  });
  const [loading, setLoading] = useState(true);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [showGoogleSync, setShowGoogleSync] = useState(false);
  const { toast } = useToast();
  const { t, dateFnsLocale } = useI18n();

  const [viewDate, setViewDate] = useState<Date>(() => readStoredViewDate());

  useEffect(() => {
    try {
      localStorage.setItem(SCHEDULER_VIEW_DATE_KEY, viewDate.toISOString());
    } catch {
      /* ignore */
    }
  }, [viewDate]);

  const weekStart = useMemo(
    () => startOfWeek(viewDate, { weekStartsOn: 1 }),
    [viewDate]
  );
  const weekEnd = useMemo(
    () => endOfWeek(viewDate, { weekStartsOn: 1 }),
    [viewDate]
  );

  const weekRangeLabel = useMemo(
    () =>
      `${format(weekStart, 'd MMM', { locale: dateFnsLocale })} – ${format(weekEnd, 'd MMM yyyy', { locale: dateFnsLocale })}`,
    [weekStart, weekEnd, dateFnsLocale]
  );

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const showFullLoading = !initialLoadDoneRef.current;
      try {
        if (showFullLoading) setLoading(true);
        const [appointmentsData, settingsData] = await Promise.all([
          appointmentsStorage.getAll().catch(() => []),
          settingsStorage.get().catch(() => ({
            startTime: '09:00',
            endTime: '17:00',
            timeSlotMinutes: 30
          }))
        ]);

        if (isMounted) {
          setAppointments(appointmentsData);
          setSettings(settingsData);
          initialLoadDoneRef.current = true;
        }
      } catch (error) {
        console.error('Error loading data:', error);
        if (isMounted) {
          setAppointments([]);
          setSettings({
            startTime: '09:00',
            endTime: '17:00',
            timeSlotMinutes: 30
          });
          initialLoadDoneRef.current = true;
        }
      } finally {
        if (isMounted && showFullLoading) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const syncToGoogleCalendar = async (appointment: Appointment) => {
    try {
      const response = await fetch('/api/google/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment }),
      });

      if (response.ok) {
        toast({
          title: t('toast.syncedGoogleTitle'),
          description: t('toast.syncedGoogleDesc', { name: appointment.patientName }),
        });
      }
    } catch (error) {
      toast({
        title: t('toast.syncFailedTitle'),
        description: t('toast.syncFailedDesc'),
        variant: "destructive",
      });
    }
  };

  const appointmentEvents = appointments.map(apt => ({
    event_id: apt.id,
    title: t('dashboard.eventTitle', {
      name: apt.patientName,
      type: t(`appointment.types.${appointmentTypeKey(apt.type)}`),
    }),
    start: new Date(`${apt.date}T${apt.startTime}`),
    end: new Date(`${apt.date}T${apt.endTime}`),
    color: apt.status === 'scheduled' ? '#3b82f6' : 
           apt.status === 'completed' ? '#10b981' :
           apt.status === 'cancelled' ? '#ef4444' : '#f59e0b',
    appointment: apt
  }));

  const googleCalendarEvents = googleEvents.map(event => ({
    event_id: `google-${event.id}`,
    title: event.summary || t('dashboard.googleEventDefault'),
    start: new Date(event.start.dateTime || event.start.date),
    end: new Date(event.end.dateTime || event.end.date),
    color: '#9333ea',
    editable: false,
    google: true
  }));

  const events = [...appointmentEvents, ...googleCalendarEvents];

  const startHour = parseInt(settings.startTime?.split(':')[0] || '9');
  const endHour = parseInt(settings.endTime?.split(':')[0] || '17');
  const step = typeof settings.timeSlotMinutes === 'number' ? settings.timeSlotMinutes : 30;

  const handleEventClick = (event: any) => {
    if (event.google) {
      toast({
        title: t('toast.googleEventTitle'),
        description: t('toast.googleEventDesc'),
      });
      return;
    }
    if (event.appointment) {
      onAppointmentClick(event.appointment);
    }
  };

  const handleCellClick = (start: Date, end: Date) => {
    console.log('Calendar cell clicked:', start, end);
    onCreateAppointment(start);
  };

  const handleEventDrop = async (
    _dragEvent: React.DragEvent<HTMLButtonElement>,
    _droppedOn: Date,
    updatedEvent: any,
    originalEvent: any
  ) => {
    const apt = originalEvent.appointment as Appointment;
    const newDate = format(updatedEvent.start, 'yyyy-MM-dd');
    const startTime = format(updatedEvent.start, 'HH:mm');
    const endTime = format(updatedEvent.end, 'HH:mm');
    try {
      await appointmentsStorage.update(apt.id, { date: newDate, startTime, endTime });
      const updatedAppointments = await appointmentsStorage.getAll().catch(() => appointments);
      setAppointments(updatedAppointments);
      return { ...updatedEvent, appointment: { ...apt, date: newDate, startTime, endTime } };
    } catch (err) {
      console.error('Failed to update appointment on drop', err);
      return originalEvent;
    }
  };

  if (loading) {
    return (
      <Card className="overflow-hidden border-border/80 shadow-soft">
        <CardContent className="flex h-96 flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Clock className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t('dashboard.loadingScheduler')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="scheduler-grid">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <CalendarIcon className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {t('dashboard.weeklySchedule')}
            </h2>
          </div>
          <p className="max-w-xl pl-[2.75rem] text-sm leading-relaxed text-muted-foreground">
            {t('dashboard.workingHours', {
              start: settings.startTime || '09:00',
              end: settings.endTime || '17:00',
            })}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 sm:pt-0.5">
          <Button
            data-testid="sync-google-btn"
            onClick={() => setShowGoogleSync(!showGoogleSync)}
            variant="outline"
            className="h-10 border-border/80 bg-background/80 shadow-sm transition-colors hover:bg-muted/50"
          >
            <RotateCcw className="mr-2 h-4 w-4 opacity-80" />
            {t('dashboard.googleCalendar')}
          </Button>
          <Button
            data-testid="new-appointment-btn"
            onClick={() => onCreateAppointment(new Date())}
            className="h-10 shadow-sm transition-shadow hover:shadow-md"
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('dashboard.newAppointment')}
          </Button>
        </div>
      </div>

      {/* Scheduler */}
      <Card className="overflow-hidden border-border/80 shadow-soft ring-1 ring-border/40">
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-start">
              <div className="inline-flex items-center rounded-xl border border-border/70 bg-background p-0.5 shadow-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setViewDate((d) => addWeeks(d, -1))}
                  aria-label={t('dashboard.previousWeek')}
                  title={t('dashboard.previousWeek')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="min-w-[11rem] px-2 text-center text-sm font-semibold tabular-nums text-foreground sm:min-w-[14rem] sm:px-4">
                  {weekRangeLabel}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setViewDate((d) => addWeeks(d, 1))}
                  aria-label={t('dashboard.nextWeek')}
                  title={t('dashboard.nextWeek')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="h-9 rounded-lg font-medium shadow-sm"
                onClick={() => setViewDate(new Date())}
              >
                {t('dashboard.goToThisWeek')}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 rounded-lg border-border/80 bg-background shadow-sm"
                    title={t('dashboard.pickWeek')}
                  >
                    <CalendarIcon className="mr-1.5 h-4 w-4 opacity-90" />
                    <span className="hidden sm:inline">{t('dashboard.pickWeek')}</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-medium" align="end">
                  <Calendar
                    mode="single"
                    weekStartsOn={1}
                    locale={dateFnsLocale}
                    selected={viewDate}
                    onSelect={(d) => d && setViewDate(d)}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="h-[600px] weekly-scheduler bg-muted/5">
            <Scheduler
              key={weekStart.toISOString()}
              view="week"
              events={events}
              selectedDate={viewDate}
              navigation={false}
              disableViewNavigator
              onSelectedDateChange={setViewDate}
              onEventClick={handleEventClick}
              onCellClick={handleCellClick}
              hourFormat="24"
              editable={false}
              onEventDrop={handleEventDrop}
              disableViewer
              customEditor={() => null}
              week={{
                weekDays: [0, 1, 2, 3, 4, 5, 6],
                weekStartOn: 1,
                startHour: startHour as any,
                endHour: endHour as any,
                step: step as any,
                navigation: false,
                disableGoToDay: true
              }}
              translations={{
                navigation: {
                  month: t('scheduler.nav.month'),
                  week: t('scheduler.nav.week'),
                  day: t('scheduler.nav.day'),
                  today: t('scheduler.nav.today'),
                  agenda: t('scheduler.nav.agenda')
                },
                form: {
                  addTitle: t('scheduler.form.addTitle'),
                  editTitle: t('scheduler.form.editTitle'),
                  confirm: t('scheduler.form.confirm'),
                  delete: t('scheduler.form.delete'),
                  cancel: t('scheduler.form.cancel')
                },
                event: {
                  title: t('scheduler.event.title'),
                  subtitle: t('scheduler.event.subtitle'),
                  start: t('scheduler.event.start'),
                  end: t('scheduler.event.end'),
                  allDay: t('scheduler.event.allDay')
                },
                moreEvents: t('scheduler.moreEvents'),
                noDataToDisplay: t('scheduler.noData'),
                loading: t('scheduler.loading')
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar Integration */}
      {showGoogleSync && <GoogleCalendarSync />}

      {/* Legend */}
      <Card className="border-border/80 shadow-soft">
        <CardHeader className="pb-3 pt-4">
          <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t('dashboard.statusLegend')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 pt-0">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/25 px-3 py-1.5 text-xs font-medium text-foreground">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-blue-500 shadow-sm ring-2 ring-blue-500/20" />
              {t('dashboard.scheduled')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/25 px-3 py-1.5 text-xs font-medium text-foreground">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-emerald-500 shadow-sm ring-2 ring-emerald-500/20" />
              {t('dashboard.completed')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/25 px-3 py-1.5 text-xs font-medium text-foreground">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-red-500 shadow-sm ring-2 ring-red-500/20" />
              {t('dashboard.cancelled')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/25 px-3 py-1.5 text-xs font-medium text-foreground">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-amber-400 shadow-sm ring-2 ring-amber-400/25" />
              {t('dashboard.noShow')}
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/25 px-3 py-1.5 text-xs font-medium text-foreground">
              <span className="h-2.5 w-2.5 shrink-0 rounded-sm bg-violet-500 shadow-sm ring-2 ring-violet-500/20" />
              {t('dashboard.googleCalendarLegend')}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
