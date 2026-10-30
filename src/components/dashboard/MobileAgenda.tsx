import { startTransition, useEffect, useMemo, useRef, useState } from 'react';
import { addDays, addWeeks, differenceInCalendarDays, format, isBefore, isSameDay, startOfDay, startOfWeek } from 'date-fns';
import { Camera, ChevronLeft, ChevronRight, Clock3, Phone, Plus, UserRound, X } from 'lucide-react';
import { Appointment, AppointmentSettings, BlockedSlot, Patient } from '@/types/appointment';
import { appointmentsStorage, patientsStorage, settingsStorage } from '@/lib/storage';
import { getFreeGaps, splitIntoSlots } from '@/lib/appointmentAvailability';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useI18n } from '@/i18n';
import { useCurrentAppointment } from '@/hooks/use-current-appointment';
import { APPOINTMENT_TYPES, appointmentBackgroundColor, darkenHexColor } from '@/lib/appointmentTypes';
import { createScheduleSnapshot, SnapshotItem } from '@/lib/scheduleSnapshot';
import { SnapshotDialog } from './SnapshotDialog';

interface MobileAgendaProps {
  onCreateAppointment: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
  refreshTrigger?: number;
  blockedSlots?: BlockedSlot[];
  onUnblockSlot?: (slot: BlockedSlot) => Promise<void>;
}

export function MobileAgenda({ onCreateAppointment, onAppointmentClick, refreshTrigger = 0, blockedSlots, onUnblockSlot }: MobileAgendaProps) {
  const { dateFnsLocale, t, initialSettings } = useI18n();
  const isCurrentAppointment = useCurrentAppointment();
  const [settings, setSettings] = useState<AppointmentSettings | null>(() => settingsStorage.getCached() ?? initialSettings);
  const today = useMemo(() => startOfDay(new Date()), []);
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today, { weekStartsOn: 1 }));
  const initialDateAdjustedRef = useRef(false);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [agendaStart, setAgendaStart] = useState(today);
  const [dayCount, setDayCount] = useState(() => 7 - differenceInCalendarDays(today, startOfWeek(today, { weekStartsOn: 1 })));
  const controlsRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef(new Map<string, HTMLElement>());
  const pendingScrollRef = useRef<Date | null>(null);
  const scrollTargetRef = useRef<number | null>(null);

  const currentSettings = useMemo(() =>
    blockedSlots && settings ? { ...settings, blockedSlots } : settings,
  [blockedSlots, settings]);

  useEffect(() => {
    if (!currentSettings || initialDateAdjustedRef.current) return;

    const nextWorkingDate = Array.from({ length: 7 }, (_, offset) => addDays(today, offset))
      .find((date) => currentSettings.workingDays.includes(date.getDay()));
    if (!nextWorkingDate) return;

    initialDateAdjustedRef.current = true;
    setSelectedDate(nextWorkingDate);
    setWeekStart(startOfWeek(nextWorkingDate, { weekStartsOn: 1 }));
    setAgendaStart(nextWorkingDate);
    setDayCount(7 - differenceInCalendarDays(nextWorkingDate, startOfWeek(nextWorkingDate, { weekStartsOn: 1 })));
  }, [currentSettings, today]);

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

  const workingDays = currentSettings?.workingDays;
  const visibleDates = useMemo(() => {
    const week = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
    const working = workingDays ? week.filter((date) => workingDays.includes(date.getDay())) : week;
    return working.length > 0 ? working : week;
  }, [weekStart, workingDays]);

  const agendaDates = useMemo(() =>
    Array.from({ length: dayCount }, (_, index) => addDays(agendaStart, index))
      .filter((date) => !workingDays?.length || workingDays.includes(date.getDay())),
  [agendaStart, dayCount, workingDays]);

  const isWorkingDay = (date: Date) => !currentSettings || currentSettings.workingDays.includes(date.getDay());
  const isFullDay = (date: Date) => Boolean(currentSettings) && !loading && isWorkingDay(date) &&
    !isBefore(date, today) && getFreeGaps(date, currentSettings!, appointments).length === 0;

  const now = new Date();
  const getDaySlots = (date: Date) => {
    if (!currentSettings || !isWorkingDay(date) || isBefore(date, today)) return [];
    const notBefore = isSameDay(date, now) ? now : undefined;
    return splitIntoSlots(getFreeGaps(date, currentSettings, appointments, notBefore));
  };
  const daySchedules = useMemo(() => {
    const now = new Date();
    return new Map(agendaDates.map((date) => {
      const dayAppointments = appointments
        .filter((appointment) => isSameDay(new Date(appointment.startTime), date))
        .sort((a, b) => a.startTime.localeCompare(b.startTime));
      const working = !currentSettings || currentSettings.workingDays.includes(date.getDay());
      const freeGaps = currentSettings && working && !isBefore(date, today)
        ? getFreeGaps(date, currentSettings, appointments) : [];
      const gaps = splitIntoSlots(isSameDay(date, now) && currentSettings
        ? getFreeGaps(date, currentSettings, appointments, now) : freeGaps);
      const timeline = [
        ...dayAppointments.map((appointment) => ({ kind: 'appointment' as const, start: new Date(appointment.startTime), appointment })),
        ...gaps.map((gap) => ({ kind: 'gap' as const, start: gap.start, end: gap.end })),
        ...(blockedSlots ?? []).filter((slot) => isSameDay(new Date(slot.startTime), date))
          .map((slot) => ({ kind: 'blocked' as const, start: new Date(slot.startTime), end: new Date(slot.endTime), slot })),
      ].sort((a, b) => a.start.getTime() - b.start.getTime());
      return [format(date, 'yyyy-MM-dd'), {
        dayAppointments, timeline, freeCount: gaps.length,
        full: Boolean(currentSettings) && !loading && working && !isBefore(date, today) && freeGaps.length === 0,
      }];
    }));
  }, [agendaDates, appointments, blockedSlots, currentSettings, loading, today]);

  const patientsById = useMemo(() => new Map(patients?.map((patient) => [patient.id, patient])), [patients]);
  const scrollToDate = (date: Date) => {
    const element = dayRefs.current.get(format(date, 'yyyy-MM-dd'));
    if (!element || !controlsRef.current) return false;
    const top = window.scrollY + element.getBoundingClientRect().top - controlsRef.current.getBoundingClientRect().height - 12;
    scrollTargetRef.current = Math.max(0, Math.min(top, document.documentElement.scrollHeight - window.innerHeight));
    window.scrollTo({
      top: scrollTargetRef.current,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth',
    });
    return true;
  };

  const selectDate = (date: Date) => {
    const target = startOfDay(date);
    setSelectedDate(target);
    setWeekStart(startOfWeek(target, { weekStartsOn: 1 }));
    if (!scrollToDate(target)) {
      pendingScrollRef.current = target;
      setAgendaStart(startOfWeek(target, { weekStartsOn: 1 }));
      setDayCount(7);
    }
  };

  const changeWeek = (amount: number) => {
    const targetWeekStart = addWeeks(weekStart, amount);
    const week = Array.from({ length: 7 }, (_, index) => addDays(targetWeekStart, index));
    selectDate(week.find(isWorkingDay) ?? targetWeekStart);
  };

  const [snapshotting, setSnapshotting] = useState(false);
  const [snapshot, setSnapshot] = useState<{ blob: Blob; fileName: string; title: string } | null>(null);
  const takeSnapshot = async () => {
    setSnapshotting(true);
    try {
      const days = visibleDates.filter(isWorkingDay).map((date) => {
        const dayAppointments = appointments.filter((appointment) => isSameDay(new Date(appointment.startTime), date));
        const items: SnapshotItem[] = [
          ...dayAppointments.map((appointment) => ({
            at: new Date(appointment.startTime).getTime(),
            item: {
              kind: 'appointment', count: 1,
              start: format(new Date(appointment.startTime), 'HH:mm'), end: format(new Date(appointment.endTime), 'HH:mm'),
            } satisfies SnapshotItem,
          })),
          ...getDaySlots(date).map((gap) => ({
            at: gap.start.getTime(),
            item: { kind: 'free', start: format(gap.start, 'HH:mm'), end: format(gap.end, 'HH:mm') } satisfies SnapshotItem,
          })),
          ...(currentSettings?.blockedSlots ?? []).filter((slot) => isSameDay(new Date(slot.startTime), date)).map((slot) => ({
            at: new Date(slot.startTime).getTime(),
            item: { kind: 'blocked', start: format(new Date(slot.startTime), 'HH:mm'), end: format(new Date(slot.endTime), 'HH:mm') } satisfies SnapshotItem,
          })),
        ].sort((a, b) => a.at - b.at).map(({ item }) => item);
        return {
          title: format(date, 'EEEE, d MMMM', { locale: dateFnsLocale }),
          subtitle: items.some((item) => item.kind === 'free')
            ? t('mobile.freeSlotsCount', { n: items.filter((item) => item.kind === 'free').length })
            : t('mobile.noFreeSlots'),
          items,
          emptyLabel: t('mobile.noFreeSlots'),
        };
      });
      const first = visibleDates[0];
      const last = visibleDates[visibleDates.length - 1];
      const title = `${format(first, 'd MMM', { locale: dateFnsLocale })} - ${format(last, 'd MMM yyyy', { locale: dateFnsLocale })}`;
      const blob = await createScheduleSnapshot({
        title,
        days,
        freeLabel: t('mobile.freeSlot'),
        blockedLabel: t('appointment.blockedShort'),
        bookedLabel: (count) => t('mobile.snapshotBooked', { count }),
      });
      setSnapshot({ blob, title, fileName: `schedule-${format(first, 'yyyy-MM-dd')}.png` });
    } catch (error) {
      console.error('Snapshot failed', error);
    } finally {
      setSnapshotting(false);
    }
  };

  const goToThisWeek = () => {
    selectDate(Array.from({ length: 7 }, (_, index) => addDays(today, index)).find(isWorkingDay) ?? today);
  };

  useEffect(() => {
    if (!loading && pendingScrollRef.current && scrollToDate(pendingScrollRef.current)) {
      pendingScrollRef.current = null;
    }
  }, [agendaDates, loading]);

  useEffect(() => {
    if (loading) return;
    let frame = 0;
    const updateDay = () => {
      frame = 0;
      const controls = controlsRef.current;
      if (!controls || controls.getBoundingClientRect().width === 0 || pendingScrollRef.current) return;
      if (scrollTargetRef.current !== null) {
        if (Math.abs(window.scrollY - scrollTargetRef.current) < 2) scrollTargetRef.current = null;
        return;
      }
      const controlsBottom = controls.getBoundingClientRect().bottom;
      const edge = window.innerHeight - 16;
      let activeDate = agendaDates[0];
      for (const date of agendaDates) {
        const element = dayRefs.current.get(format(date, 'yyyy-MM-dd'));
        if (!element) continue;
        const heading = element.querySelector('h3');
        if (!heading || heading.getBoundingClientRect().bottom > edge) break;
        const top = element.getBoundingClientRect().top;
        activeDate = date;
        if (top >= controlsBottom) break;
      }
      if (activeDate) {
        setSelectedDate((current) => isSameDay(current, activeDate) ? current : activeDate);
        const nextWeek = startOfWeek(activeDate, { weekStartsOn: 1 });
        setWeekStart((current) => isSameDay(current, nextWeek) ? current : nextWeek);
      }
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(updateDay);
    };
    const endNavigation = () => { scrollTargetRef.current = null; };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('scrollend', endNavigation);
    window.addEventListener('wheel', endNavigation, { passive: true });
    window.addEventListener('touchstart', endNavigation, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scrollend', endNavigation);
      window.removeEventListener('wheel', endNavigation);
      window.removeEventListener('touchstart', endNavigation);
      cancelAnimationFrame(frame);
    };
  }, [agendaDates, loading]);

  useEffect(() => {
    const lastDate = agendaDates[agendaDates.length - 1];
    const lastDay = lastDate && dayRefs.current.get(format(lastDate, 'yyyy-MM-dd'));
    if (loading || !lastDay) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        observer.disconnect();
        startTransition(() => setDayCount((count) => count + 7));
      }
    });
    observer.observe(lastDay);
    return () => observer.disconnect();
  }, [loading, agendaDates]);

  return (
    <section className="space-y-3 md:hidden" data-testid="mobile-agenda">
      <SnapshotDialog snapshot={snapshot} onClose={() => setSnapshot(null)} />
      <div ref={controlsRef} className="sticky top-0 z-30 space-y-1 bg-background py-2" data-testid="mobile-agenda-controls">
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
            const schedule = daySchedules.get(format(date, 'yyyy-MM-dd'));
            const full = schedule?.full ?? isFullDay(date);
            const freeCount = loading ? 0 : schedule?.freeCount ?? getDaySlots(date).length;
            const showCount = !loading && Boolean(currentSettings) && working && !isBefore(date, today);
            const dayLabel = format(date, 'EEEE d MMMM', { locale: dateFnsLocale });
            let statusLabel = '';
            if (full) statusLabel = `, ${t('mobile.fullDay')}`;
            else if (freeCount > 0) statusLabel = `, ${t('mobile.freeSlotsCount', { n: freeCount })}`;
            return (
              <Button
                key={date.toISOString()}
                type="button"
                variant="outline"
                disabled={!working}
                aria-pressed={isSelected}
                data-date={format(date, 'yyyy-MM-dd')}
                aria-label={dayLabel + statusLabel}
                onClick={() => selectDate(date)}
                className={cn(
                  'relative h-auto min-w-0 flex-col rounded-xl border border-input bg-background px-1 py-2 text-center text-foreground shadow-sm transition-shadow duration-500 ease-in-out hover:bg-background hover:text-foreground motion-reduce:transition-none sm:rounded-2xl sm:px-2.5 sm:py-2.5',
                  isSelected && 'shadow-md',
                  !working && 'bg-muted/40 opacity-40',
                  full && 'border-destructive/50 bg-destructive/10 hover:bg-destructive/10'
                )}
              >
                <span className="text-[11px] font-medium leading-5 opacity-80 sm:text-[13px]">
                  {isToday ? t('scheduler.nav.today') : format(date, 'EEE', { locale: dateFnsLocale })}
                </span>
                <span className="text-base font-semibold leading-none sm:text-lg">{format(date, 'd')}</span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'pointer-events-none absolute -inset-px flex flex-col items-center justify-center gap-2 rounded-[inherit] border border-primary bg-primary px-1 py-2 text-primary-foreground transition-opacity duration-500 ease-in-out motion-reduce:transition-none sm:px-2.5 sm:py-2.5',
                    isSelected ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <span className="text-[11px] font-medium leading-5 opacity-80 sm:text-[13px]">
                    {isToday ? t('scheduler.nav.today') : format(date, 'EEE', { locale: dateFnsLocale })}
                  </span>
                  <span className="text-base font-semibold leading-none sm:text-lg">{format(date, 'd')}</span>
                </span>
                {showCount && (
                  <span
                    aria-hidden="true"
                    data-testid="mobile-day-free-count"
                    className={cn(
                      'absolute -right-1 -top-1.5 z-10 min-w-[1.25rem] overflow-hidden rounded-full px-1 text-xs font-semibold leading-5 tabular-nums shadow-sm',
                      freeCount === 0 ? 'bg-destructive text-destructive-foreground' : 'bg-accent text-accent-foreground'
                    )}
                  >
                    {freeCount}
                    <span
                      className={cn(
                        'absolute inset-0 flex items-center justify-center rounded-[inherit] bg-background text-primary transition-opacity duration-500 ease-in-out motion-reduce:transition-none',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    >
                      {freeCount}
                    </span>
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

      <div className="flex h-8 items-center gap-2 px-1">
        <p className="mr-auto text-sm font-semibold">{format(selectedDate, 'MMMM yyyy', { locale: dateFnsLocale })}</p>
        {(!isSameDay(weekStart, startOfWeek(today, { weekStartsOn: 1 })) ||
          (isWorkingDay(today) && !isSameDay(selectedDate, today))) && (
          <Button type="button" variant="link" size="sm" onClick={goToThisWeek} className="ml-auto h-8 px-1">
            {t('scheduler.nav.today')}
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void takeSnapshot()}
          disabled={loading || snapshotting}
          aria-label={t('mobile.snapshotLabel')}
          title={t('mobile.snapshotLabel')}
          data-testid="mobile-snapshot-btn"
          className="h-8 gap-1.5 rounded-lg px-2.5"
        >
          <Camera className="h-4 w-4" />
          {t('mobile.snapshot')}
        </Button>
      </div>
      </div>

      {loading ? (
        <Card className="border-border/70 shadow-soft"><CardContent className="p-6 text-center text-sm text-muted-foreground">{t('mobile.loading')}</CardContent></Card>
      ) : agendaDates.map((date) => {
        const dateKey = format(date, 'yyyy-MM-dd');
        const { dayAppointments, timeline, full } = daySchedules.get(dateKey)!;
        return (
        <section key={dateKey} ref={(element) => {
          if (element) dayRefs.current.set(dateKey, element);
          else dayRefs.current.delete(dateKey);
        }} data-testid="mobile-agenda-day" data-date={dateKey} className="space-y-2.5 border-t border-border/70 pt-3">
          <div className="px-1">
            <h3 className="text-base font-semibold">{format(date, 'EEEE, d MMMM', { locale: dateFnsLocale })}</h3>
            <p className="text-xs text-muted-foreground">{dayAppointments.length === 1 ? t('mobile.appointmentsOne') : t('mobile.appointments', { count: dayAppointments.length })}</p>
          </div>
        {!isWorkingDay(date) || timeline.length === 0 ? (
        <Card className="border-dashed border-border/80 bg-muted/15 shadow-none">
          <CardContent className="flex flex-col items-center px-5 py-10 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Clock3 className="h-5 w-5" /></span>
            <p className="mt-3 text-sm font-medium">{isWorkingDay(date) ? t('calendar.noAppointments') : t('mobile.nonWorkingDay')}</p>
            {isWorkingDay(date) && <p className="mt-1 text-xs text-muted-foreground">{t('mobile.addHint')}</p>}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2.5">
          {full && (
            <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{t('mobile.fullDay')}</p>
          )}
          {timeline.map((item) => {
            if (item.kind === 'blocked') {
              return (
                <div
                  key={`blocked-${item.slot.id}`}
                  data-testid="mobile-blocked-slot"
                  className="flex w-full items-center justify-between gap-2 rounded-2xl border border-destructive/30 bg-destructive/20 px-3 py-2 text-left text-sm text-destructive"
                >
                  <span className="tabular-nums">
                    <span className="font-semibold">{format(item.start, 'HH:mm')} - {format(item.end, 'HH:mm')}</span>
                    <span className="ml-2 text-xs opacity-80">{t('appointment.blockedShort')}</span>
                  </span>
                  {onUnblockSlot && (
                    <button
                      type="button"
                      data-testid="unblock-slot-btn"
                      aria-label={t('appointment.unblockSlot')}
                      onClick={() => void onUnblockSlot(item.slot)}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-background/80 hover:bg-background"
                    >
                      <X className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
              );
            }
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
            const patient = patientsById.get(appointment.patientId);
            const firstName = patient?.firstName?.trim() || appointment.patientName || t('common.unknown');
            const lastName = patient?.lastName?.trim();
            const phone = patient?.phone?.trim() || t(patients === null ? 'dashboard.phoneUnavailable' : 'dashboard.noPhone');
            const isCurrent = isCurrentAppointment(appointment);
            return (
            <button
              key={appointment.id}
              data-testid="mobile-appointment"
              data-current={isCurrent ? 'true' : 'false'}
              type="button"
              onClick={() => onAppointmentClick(appointment)}
              className="relative flex w-full items-stretch overflow-hidden rounded-2xl border border-border/70 text-left text-foreground shadow-soft transition-transform active:scale-[0.99]"
              style={{ backgroundColor: appointmentBackgroundColor(APPOINTMENT_TYPES[appointment.type].color, isCurrent) }}
            >
              {isCurrent && (
                <span className="pointer-events-none absolute right-2.5 top-2.5" role="img" aria-label={t('dashboard.currentAppointment')}>
                  <Clock3 className="h-4 w-4 motion-safe:animate-pulse" aria-hidden="true" />
                </span>
              )}
              <div className="w-1 shrink-0" style={{ backgroundColor: isCurrent ? darkenHexColor(APPOINTMENT_TYPES[appointment.type].color) : APPOINTMENT_TYPES[appointment.type].color }} />
              <div className="grid min-w-0 flex-1 grid-cols-[minmax(3.25rem,15fr)_minmax(0,85fr)]">
                <div className="flex flex-col items-center justify-center gap-1 border-r border-border/70 bg-muted/20 px-1 py-2 text-xs tabular-nums">
                  <time dateTime={appointment.startTime} className="font-semibold text-foreground">{format(new Date(appointment.startTime), 'HH:mm')}</time>
                  <span aria-hidden="true" className="text-muted-foreground">-</span>
                  <time dateTime={appointment.endTime} className="text-muted-foreground">{format(new Date(appointment.endTime), 'HH:mm')}</time>
                </div>
                <div className="flex min-w-0 items-start justify-between gap-2 p-2.5">
                  <div className="min-w-0 flex-1">
                    <div className={cn('flex items-start gap-1.5 text-sm font-semibold', isCurrent && 'pr-6')}>
                      <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 [overflow-wrap:anywhere]">{[firstName, lastName].filter(Boolean).join(' ')}</span>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="mobile-appointment-phone">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 break-words">{phone}</span>
                    </p>
                    <p className="mt-1 border-t border-border/70 pt-1 text-xs text-muted-foreground [overflow-wrap:anywhere]">{appointment.title || t(APPOINTMENT_TYPES[appointment.type].labelKey)}</p>
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
      })}
    </section>
  );
}
