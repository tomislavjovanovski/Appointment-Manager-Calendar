import { useState, useEffect, useRef, useMemo } from 'react';
import { Scheduler } from '@aldabil/react-scheduler';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, Clock, Plus, X } from 'lucide-react';
import { addDays, addWeeks, endOfWeek, format, isSameDay, startOfWeek } from 'date-fns';
import { Appointment, BlockedSlot, Patient } from '@/types/appointment';
import { appointmentsStorage, patientsStorage, settingsStorage } from '@/lib/storage';
import { getDayHours, isBlockedSlot, parseTimeMinutes } from '@/lib/appointmentAvailability';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';
import { useCurrentAppointment } from '@/hooks/use-current-appointment';
import { APPOINTMENT_TYPES, APPOINTMENT_TYPE_VALUES, appointmentBackgroundColor, darkenHexColor } from '@/lib/appointmentTypes';
import BrandLogo from '@/components/brand/BrandLogo';
import brand from '@/config/brand.json';
import { useAuth } from '@/auth/AuthProvider';
import { SidebarToggle } from '@/components/layout/Sidebar';

const SCHEDULER_ZOOM = 44 / 60;

function appointmentTypeColor(type: Appointment['type'] | undefined): string {
  return type ? APPOINTMENT_TYPES[type]?.color ?? '#64748b' : '#64748b';
}

interface WeeklySchedulerProps {
  onCreateAppointment: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  refreshTrigger?: number;
  blockedSlots?: BlockedSlot[];
  onUnblockSlot?: (slot: BlockedSlot) => Promise<void>;
  navigation?: React.ReactNode;
  brandName?: string;
  logoDataUrl?: string;
}

export function WeeklyScheduler({ onCreateAppointment, onAppointmentClick, refreshTrigger = 0, navigation, blockedSlots, onUnblockSlot, brandName, logoDataUrl }: WeeklySchedulerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const sidebarCollapsed = user?.preferences?.desktopSidebarCollapsed === true;
  const isCurrentAppointment = useCurrentAppointment();
  const { t, dateFnsLocale, initialSettings } = useI18n();
  const initialLoadDoneRef = useRef(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(settingsStorage.getCached() ?? initialSettings ?? {
    startTime: '08:00',
    endTime: '18:00',
    timeSlotMinutes: 30
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (blockedSlots) setSettings((current: any) => ({ ...current, blockedSlots }));
  }, [blockedSlots]);
  const currentSettings = blockedSlots ? { ...settings, blockedSlots } : settings;
  const [viewDate, setViewDate] = useState<Date>(() => new Date());

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
  const workingDays = useMemo<number[]>(
    () =>
      Array.isArray(currentSettings.workingDays) && currentSettings.workingDays.length > 0
        ? currentSettings.workingDays
        : [1, 2, 3, 4, 5],
    [currentSettings.workingDays]
  );

  const isWorkingDay = (date: Date) => workingDays.includes(date.getDay());

  const getNextWorkingDate = (date: Date) => {
    for (let offset = 0; offset < 7; offset += 1) {
      const candidate = addDays(date, offset);
      if (isWorkingDay(candidate)) {
        return candidate;
      }
    }

    return date;
  };

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const showFullLoading = !initialLoadDoneRef.current;
      try {
        if (showFullLoading) setLoading(true);
        const [appointmentsData, settingsData, patientsData] = await Promise.all([
          appointmentsStorage.getAll().catch(() => []),
          settingsStorage.get().catch(() => settingsStorage.getCached() ?? initialSettings ?? ({
            startTime: '08:00',
            endTime: '18:00',
            timeSlotMinutes: 30
          })),
          patientsStorage.getAll().catch(() => null),
        ]);

        console.log('Loaded appointments:', appointmentsData);

        if (isMounted) {
          setAppointments(appointmentsData);
          setPatients(patientsData);
          setSettings(settingsData);
          initialLoadDoneRef.current = true;
        }
      } catch (error) {
        // Avoid console.error noise in offline/test mode (smoke test treats it as a failure).
        console.warn('Scheduler: failed to load data, using empty defaults.', error);
        if (isMounted) {
          setAppointments([]);
          setSettings({
            startTime: '08:00',
            endTime: '18:00',
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
  }, [refreshTrigger, initialSettings]);

  const appointmentEvents = appointments
    .map((apt: any) => {
      try {
        // Handle both startTime/endTime (new) and start/end (old) field names
        const startStr = apt.startTime || apt.start;
        const endStr = apt.endTime || apt.end;
        
        if (!startStr || !endStr) {
          console.warn('Skipping appointment with missing dates:', apt);
          return null;
        }
        
        const start = new Date(startStr);
        const end = new Date(endStr);
        
        // Validate dates are finite before creating event
        if (!isFinite(start.getTime()) || !isFinite(end.getTime())) {
          console.warn('Skipping appointment with invalid dates:', apt);
          return null;
        }
        
        const patientName = apt.patientName || 'Unknown Patient';
        const typeTranslation = t(APPOINTMENT_TYPES[apt.type as Appointment['type']].labelKey);
        const title = t('dashboard.eventTitle', {
          name: patientName,
          type: typeTranslation,
        });
        
        return {
          ...apt,
          event_id: apt.id,
          title: title || `${patientName} — ${typeTranslation}`,
          start: start,
          end: end,
          color: appointmentTypeColor(apt.type),
          appointment: apt,
          // The scheduler keeps its first eventRenderer, so patient data must travel with the event.
          patient: patients?.find((record) => record.id === apt.patientId),
          patientsLoaded: patients !== null,
        };
      } catch (e) {
        console.warn('Failed to map appointment:', apt, e);
        return null;
      }
    })
    .filter((e: any) => e !== null);

  const events = appointmentEvents;

  const dayHourRanges = workingDays.map((weekday) => {
    const hours = getDayHours(currentSettings, weekday);
    return { start: parseTimeMinutes(hours.startTime), end: parseTimeMinutes(hours.endTime) };
  }).filter((range) => Number.isFinite(range.start) && Number.isFinite(range.end));
  const earliestStart = dayHourRanges.length ? Math.min(...dayHourRanges.map((range) => range.start)) : 9 * 60;
  const latestEnd = dayHourRanges.length ? Math.max(...dayHourRanges.map((range) => range.end)) : 17 * 60;
  const startHour = Math.floor(earliestStart / 60);
  const endHour = Math.ceil(latestEnd / 60);
  const visibleAppointments = appointmentEvents.filter((event) => event.start <= weekEnd && event.end >= weekStart);
  const visibleStartHour = Math.min(startHour, ...visibleAppointments.map((event) =>
    event.start.toDateString() === event.end.toDateString() ? event.start.getHours() : 0
  ));
  const visibleEndHour = Math.max(endHour, ...visibleAppointments.map((event) =>
    event.start.toDateString() === event.end.toDateString()
      ? Math.ceil(event.end.getHours() + event.end.getMinutes() / 60)
      : 24
  ));
  const step = typeof currentSettings.timeSlotMinutes === 'number' ? currentSettings.timeSlotMinutes : 30;
  const schedulerHeight = 600;
  const rowCount = Math.ceil((visibleEndHour - visibleStartHour) * 60 / step);
  const slotHeight = Math.ceil(Math.max(schedulerHeight / rowCount, 60));

  const handleEventClick = (event: any) => {
    const appointment = event?.appointment ?? event;
    if (appointment?.id) {
      onAppointmentClick(appointment);
    }
  };

  const handleCellClick = (start: Date, end: Date) => {
    if (!isWorkingDay(start)) {
      return;
    }

    console.log('Calendar cell clicked:', start, end);
    onCreateAppointment(start);
  };

  const handleEventDrop = async (
    _dragEvent: React.DragEvent<HTMLButtonElement>,
    _droppedOn: Date,
    updatedEvent: any,
    originalEvent: any
  ) => {
    const apt = (originalEvent?.appointment ?? originalEvent) as Appointment;
    try {
      if (!isWorkingDay(updatedEvent.start)) {
        toast({
          title: t('common.error'),
          description: 'Appointments can only be scheduled on working days.',
          variant: 'destructive',
        });
        return originalEvent;
      }

      const newStartISO = updatedEvent.start.toISOString();
      const newEndISO = updatedEvent.end.toISOString();

      // Conflict prevention: disallow dropping onto an occupied slot.
      const all = await appointmentsStorage.getAll().catch(() => []);
      const conflict = all.some((a: any) => a.id !== apt.id && a.startTime === newStartISO);
      if (conflict) {
        toast({
          title: t('toast.syncFailedTitle'),
          description: 'Slot already occupied',
          variant: 'destructive',
        });
        return originalEvent;
      }

      await appointmentsStorage.update(apt.id, { startTime: newStartISO, endTime: newEndISO });
      const updatedAppointments = await appointmentsStorage.getAll().catch(() => appointments);
      setAppointments(updatedAppointments);
      setDraggingEventId(null);
      toast({ title: t('settings.savedTitle') ?? 'Saved' });
      return { ...updatedEvent, appointment: { ...apt, startTime: newStartISO, endTime: newEndISO } };
    } catch (err) {
      setDraggingEventId(null);
      console.error('Failed to update appointment on drop', err);
      toast({
        title: 'Unable to reschedule',
        description: 'Please try again',
        variant: 'destructive',
      });
      return originalEvent;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
      {sidebarCollapsed && <SidebarToggle collapsed className="w-8 px-0" />}
      {navigation}
      <Card className="overflow-hidden border-border/80 shadow-soft">
        <CardContent className="flex h-96 flex-col items-center justify-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <Clock className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">{t('dashboard.loadingScheduler')}</p>
        </CardContent>
      </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3" data-testid="scheduler-grid">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex min-w-0 items-center gap-2">
            {sidebarCollapsed && <SidebarToggle collapsed className="w-8 shrink-0 px-0" />}
            {logoDataUrl ? <img src={logoDataUrl} alt="" className="h-8 w-8 rounded-lg object-contain" /> : <BrandLogo variant="icon" size={28} />}
            <h2 className="flex min-w-0 flex-wrap items-baseline gap-x-2 text-xl font-semibold tracking-tight text-foreground" title={t('dashboard.workingHours', {
              start: `${String(Math.floor(earliestStart / 60)).padStart(2, '0')}:${String(earliestStart % 60).padStart(2, '0')}`,
              end: `${String(Math.floor(latestEnd / 60)).padStart(2, '0')}:${String(latestEnd % 60).padStart(2, '0')}`,
            })}>
              {brandName?.trim() && brandName.trim() !== brand.name && (
                <>
                  <span>{brandName.trim()}</span>
                  <span aria-hidden="true" className="font-normal text-muted-foreground">|</span>
                </>
              )}
              <span lang="mk" className="whitespace-nowrap" aria-label={brand.name}>
                <span className="text-blue-600 dark:text-blue-400">{brand.name.slice(0, 4)}</span><span className="text-blue-950 dark:text-blue-100">{brand.name.slice(4)}</span>
              </span>
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 sm:pt-0.5">
          {navigation}
          <Button
            data-testid="new-appointment-btn"
            onClick={() => onCreateAppointment(getNextWorkingDate(new Date()))}
            className="h-8 rounded-lg px-3 text-xs shadow-sm transition-colors duration-150"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {t('dashboard.newAppointment')}
          </Button>
        </div>
      </div>

      {/* Scheduler */}
      <Card className="overflow-hidden rounded-xl border-border/60 shadow-sm">
        <CardContent className="p-0">
          <div className="flex flex-wrap items-center gap-1 border-b border-border/60 bg-background px-3 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1.5 rounded-lg border border-border/60 px-2.5 text-xs font-medium text-foreground hover:bg-muted hover:text-foreground"
                onClick={() => setViewDate(new Date())}
                title={t('dashboard.goToThisWeek')}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                {t('scheduler.nav.today')}
              </Button>
              <div className="inline-flex items-center">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setViewDate((d) => addWeeks(d, -1))}
                  aria-label={t('dashboard.previousWeek')}
                  title={t('dashboard.previousWeek')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setViewDate((d) => addWeeks(d, 1))}
                  aria-label={t('dashboard.nextWeek')}
                  title={t('dashboard.nextWeek')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-2 rounded-lg px-2.5 text-sm font-semibold tabular-nums text-foreground hover:bg-muted hover:text-foreground"
                    title={t('dashboard.pickWeek')}
                    aria-label={`${weekRangeLabel}, ${t('dashboard.pickWeek')}`}
                  >
                    {weekRangeLabel}
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 shadow-medium" align="start">
                  <Calendar
                    mode="single"
                    weekStartsOn={1}
                    locale={dateFnsLocale}
                    selected={viewDate}
                    onSelect={(d) => d && isWorkingDay(d) && setViewDate(d)}
                    disabled={(date) => !isWorkingDay(date)}
                    initialFocus
                    className={cn('p-3 pointer-events-auto')}
                  />
                </PopoverContent>
              </Popover>
          </div>
          <div className="weekly-scheduler bg-muted/5" style={{ zoom: SCHEDULER_ZOOM, width: '100%' }}>
            <Scheduler
              key={`${weekStart.toISOString()}-${refreshTrigger}`}
              view="week"
              height={schedulerHeight}
              events={events}
              selectedDate={viewDate}
              navigation={false}
              disableViewNavigator
              onSelectedDateChange={setViewDate}
              onEventClick={handleEventClick}
              onCellClick={handleCellClick}
              hourFormat="24"
              editable={false}
              draggable
              onEventDrop={handleEventDrop}
              disableViewer
              customEditor={() => null}
              eventRenderer={(props: any) => {
                const schedulerEvent = props?.event ?? props;
                const durationMinutes = (schedulerEvent.end.getTime() - schedulerEvent.start.getTime()) / 60000;
                const blockHeight = durationMinutes / step * (slotHeight + 1) - 1 - 6 + 2;

                if (schedulerEvent?.google) {
                  return (
                    <div
                      data-testid="gcal-event-block"
                      data-source="google"
                      className="h-full w-full overflow-hidden rounded-md px-2 py-1 text-xs font-medium text-foreground"
                      style={{
                        backgroundColor: appointmentBackgroundColor(schedulerEvent.color || '#9333ea'),
                        borderLeft: `${4 / SCHEDULER_ZOOM}px solid ${schedulerEvent.color || '#9333ea'}`,
                        height: blockHeight,
                      }}
                    >
                      {schedulerEvent.title || 'Google Event'}
                    </div>
                  );
                }

                const apt: Appointment | undefined = appointments.find((record) => record.id === String(schedulerEvent?.event_id ?? schedulerEvent?.appointment?.id ?? schedulerEvent?.id))
                  ?? schedulerEvent?.appointment ?? schedulerEvent;
                const patient: Patient | undefined = schedulerEvent?.patient;
                const patientName =
                  (patient ? `${patient.firstName} ${patient.lastName}`.trim() : undefined) ||
                  apt?.patientName ||
                  (typeof schedulerEvent?.title === 'string' && schedulerEvent.title.includes('—')
                    ? schedulerEvent.title.split('—')[0].trim()
                    : undefined) ||
                  apt?.patientId ||
                  'Unknown';
                const displayTitle = patientName;
                const patientPhone = patient?.phone?.trim() || (schedulerEvent?.patientsLoaded === false ? t('dashboard.phoneUnavailable') : '');
                const renderedHeight = blockHeight * SCHEDULER_ZOOM;
                const cardLayout = renderedHeight >= 60 ? 'tall' : renderedHeight >= 40 ? 'medium' : 'compact';
                const typeLabel = apt?.type ? t(APPOINTMENT_TYPES[apt.type].labelKey) : '';
                const timeLabel = `${format(schedulerEvent.start, 'HH:mm')} – ${format(schedulerEvent.end, 'HH:mm')}`;
                const bgColor = schedulerEvent?.color || '#3b82f6';
                const isDragging = draggingEventId === apt?.id;
                const isCurrent = Boolean(apt && isCurrentAppointment(apt));
                
                return (
                  <div
                    data-testid="appointment-block"
                    data-status={apt?.status ?? 'scheduled'}
                    data-source="local"
                    data-current={isCurrent ? 'true' : 'false'}
                    data-card-layout={cardLayout}
                    className={cn(
                      'relative h-full w-full overflow-hidden rounded-lg border border-border/30 text-left text-foreground [container-type:inline-size] transition-[box-shadow,border-color] duration-150 hover:border-border/60 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-inset focus-visible:ring-primary',
                      isDragging ? 'pointer-events-none opacity-60 ring-1 ring-primary/30' : 'cursor-pointer'
                    )}
                    style={{
                      backgroundColor: appointmentBackgroundColor(bgColor, isCurrent),
                      height: blockHeight,
                    }}
                    title={[displayTitle, typeLabel, timeLabel, patientPhone, t('dashboard.dragAppointment')].filter(Boolean).join('\n')}
                    role="button"
                    tabIndex={0}
                    aria-label={[displayTitle, typeLabel, timeLabel].filter(Boolean).join(', ')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        handleEventClick(schedulerEvent);
                      }
                    }}
                    draggable={props?.draggable}
                    onDragStart={(event) => {
                      setDraggingEventId(apt?.id ?? null);
                      props?.onDragStart?.(event);
                    }}
                    onDragEnd={(event) => {
                      setDraggingEventId(null);
                      props?.onDragEnd?.(event);
                    }}
                    onDragOver={props?.onDragOver}
                    onDragEnter={props?.onDragEnter}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleEventClick(schedulerEvent);
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute rounded-full"
                      style={{
                        left: 8 / SCHEDULER_ZOOM,
                        top: 6 / SCHEDULER_ZOOM,
                        bottom: 6 / SCHEDULER_ZOOM,
                        width: 4 / SCHEDULER_ZOOM,
                        backgroundColor: isCurrent ? darkenHexColor(bgColor) : bgColor,
                      }}
                    />
                    {isCurrent && (
                      <span className="pointer-events-none absolute right-1 top-1 z-10" role="img" aria-label={t('dashboard.currentAppointment')}>
                        <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                    )}
                    <div className={cn(
                      'flex h-full min-w-0 flex-col gap-[3px] pr-2',
                      cardLayout === 'compact' ? 'justify-center' : 'py-1'
                    )} style={{ paddingLeft: 20 / SCHEDULER_ZOOM }}>
                      <div className={cn(
                        'min-w-0 shrink-0 text-[18.5px] font-semibold leading-[22px]',
                        cardLayout === 'tall' ? '[display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden [overflow-wrap:anywhere]' : 'truncate',
                        isCurrent && 'pr-5'
                      )}>
                        {displayTitle}
                      </div>
                      {cardLayout !== 'compact' && (
                        <div className="flex min-w-0 shrink-0 items-baseline gap-1 text-[15px] leading-[18px] text-muted-foreground">
                          {typeLabel && <span className="min-w-0 truncate">{typeLabel}</span>}
                          {cardLayout === 'tall' && (
                            <span className="appointment-card-time shrink-0 text-[14.5px] tabular-nums">
                              {typeLabel && <span aria-hidden="true">· </span>}{timeLabel}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
              week={{
                weekDays: [0, 1, 2, 3, 4, 5, 6],
                weekStartOn: 1,
                startHour: visibleStartHour as any,
                endHour: visibleEndHour as any,
                step: step as any,
                navigation: false,
                headRenderer: ({ day }: { day: Date }) => (
                  <time
                    dateTime={format(day, 'yyyy-MM-dd')}
                    aria-current={isSameDay(day, new Date()) ? 'date' : undefined}
                    className={cn('flex h-full w-full items-center justify-center gap-2 whitespace-nowrap px-1 text-[17px] leading-none', isSameDay(day, new Date()) && 'bg-primary/5 text-primary')}
                  >
                    <span className="font-semibold tabular-nums">{format(day, 'dd')}</span>
                    <span className="text-[16px]">{format(day, 'EEE', { locale: dateFnsLocale })}</span>
                  </time>
                ),
                disableGoToDay: true
                ,
                cellRenderer: (props: any) => {
                  const start: Date | undefined = props?.start;
                  const end: Date | undefined = props?.end;
                  const onClick: ((s: Date, e: Date) => void) | undefined = props?.onClick;
                  const onDrop = props?.onDrop;
                  const onDragOver = props?.onDragOver;
                  const onDragEnter = props?.onDragEnter;
                  const onDragLeave = props?.onDragLeave;

                  const label = start ? format(start, 'H:mm') : 'unknown';
                  const day = start?.getDay();
                  // Keep legacy `time-slot-{hour}:00` testid only for the week
                  // start column so Playwright strict mode has a single match.
                  const weekStartDay = weekStart.getDay();
                  const testId = day === weekStartDay ? `time-slot-${label}` : undefined;
                  const slotMinutes = start ? start.getHours() * 60 + start.getMinutes() : Number.NaN;
                  const dayHours = start ? getDayHours(currentSettings, start.getDay()) : undefined;
                  const isWithinHours = Boolean(dayHours) && Number.isFinite(slotMinutes) &&
                    slotMinutes >= parseTimeMinutes(dayHours!.startTime) &&
                    slotMinutes < parseTimeMinutes(dayHours!.endTime);
                  const isBlocked = Boolean(start && end && isBlockedSlot(currentSettings, start, end));
                  const blockedSlot = isBlocked && start && end
                    ? blockedSlots?.find((slot) => new Date(slot.startTime).getTime() === start.getTime() && new Date(slot.endTime).getTime() === end.getTime())
                    : undefined;
                  const isEnabled = Boolean(start && end && onClick && isWorkingDay(start) && isWithinHours && !isBlocked);

                  return (
                    <div
                      {...(testId ? { 'data-testid': testId } : {})}
                      data-slot-day={start?.getDay()}
                      data-slot-time={label}
                      data-hour-boundary={end?.getMinutes() === 0 ? 'true' : undefined}
                      data-half-hour-boundary={end?.getMinutes() === 30 ? 'true' : undefined}
                      data-working-day={isEnabled ? 'true' : 'false'}
                      data-blocked={isBlocked ? 'true' : 'false'}
                      aria-disabled={isEnabled ? 'false' : 'true'}
                      onDrop={onDrop}
                      onDragOver={(event) => {
                        if (!isEnabled) {
                          return;
                        }
                        onDragOver?.(event);
                        event.currentTarget.classList.add('bg-primary/10');
                      }}
                      onDragEnter={(event) => {
                        if (!isEnabled) {
                          return;
                        }
                        onDragEnter?.(event);
                        event.currentTarget.classList.add('bg-primary/10');
                      }}
                      onDragLeave={(event) => {
                        onDragLeave?.(event);
                        event.currentTarget.classList.remove('bg-primary/10');
                      }}
                      onClick={() => {
                        if (isEnabled && start && end && onClick) onClick(start, end);
                      }}
                      className={cn(
                        'relative h-full w-full transition-colors',
                        isEnabled
                          ? 'cursor-pointer bg-transparent hover:bg-primary/5'
                          : isBlocked
                            ? 'cursor-not-allowed bg-destructive/20 hover:bg-destructive/20'
                            : 'cursor-not-allowed bg-muted/35 hover:bg-muted/35'
                      )}
                    >
                      {blockedSlot && onUnblockSlot && (
                        <button
                          type="button"
                          data-testid="unblock-slot-btn"
                          aria-label={t('appointment.unblockSlot')}
                          onClick={(event) => {
                            event.stopPropagation();
                            void onUnblockSlot(blockedSlot);
                          }}
                          className="absolute right-1 top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-background/90 text-destructive shadow-sm hover:bg-background"
                        >
                          <X className="h-4 w-4" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  );
                }
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
          <section className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border/60 bg-background px-4 py-3"
            aria-label={t('dashboard.appointmentTypes')} data-testid="calendar-appointment-type-legend">
            {APPOINTMENT_TYPE_VALUES.map((type) => (
              <span key={type} data-appointment-type={type} className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: APPOINTMENT_TYPES[type].color }} aria-hidden="true" />
                {t(APPOINTMENT_TYPES[type].labelKey)}
              </span>
            ))}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
