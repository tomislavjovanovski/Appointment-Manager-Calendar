import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { addMonths, format, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import {
  ArrowDownRight, ArrowUpRight, BarChart3, CalendarCheck, CalendarDays, ChevronLeft, ChevronRight, Clock,
  Loader2, Minus, RefreshCw, UserCheck, UserPlus, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { appointmentsStorage, settingsStorage } from '@/lib/storage';
import { getMonthStatistics, type TypeKey } from '@/lib/statistics';
import { APPOINTMENT_TYPES } from '@/lib/appointmentTypes';
import { cn } from '@/lib/utils';
import type { Appointment, AppointmentSettings } from '@/types/appointment';

interface MonthlyStatisticsProps {
  navigation?: ReactNode;
  refreshTrigger?: number;
}

interface ChangeProps {
  current: number;
  previous: number;
  format: (value: number) => string;
  /** Previous month's value, shown as a tooltip and read by screen readers. */
  previousLabel: string;
  testId: string;
  suffix?: string;
}

function Change({ current, previous, format, previousLabel, testId, suffix }: Readonly<ChangeProps>) {
  const { t } = useI18n();
  const value = current - previous;
  const trend = value > 0 ? 'up' : value < 0 ? 'down' : 'same';
  const Icon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : Minus;
  const tone = {
    up: 'text-emerald-600 dark:text-emerald-400',
    down: 'text-rose-600 dark:text-rose-400',
    same: 'text-muted-foreground',
  }[trend];
  const trendText = { up: t('statistics.trendUp'), down: t('statistics.trendDown'), same: t('statistics.trendSame') }[trend];

  return (
    <span className="flex min-w-0 flex-wrap items-center gap-x-1 text-xs leading-5 text-muted-foreground" title={previousLabel}>
      <span className={cn('inline-flex items-center gap-0.5 whitespace-nowrap font-medium tabular-nums', tone)}>
        <Icon className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
        <span className="sr-only">{trendText}</span>
        <span data-testid={testId} data-trend={trend}>{format(Math.abs(value))}</span>
      </span>
      {suffix && <span>{suffix}</span>}
      <span className="sr-only">({previousLabel})</span>
    </span>
  );
}

export function MonthlyStatistics({ navigation, refreshTrigger = 0 }: Readonly<MonthlyStatisticsProps>) {
  const { t, dateFnsLocale, initialSettings } = useI18n();
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<AppointmentSettings | null>(() => settingsStorage.getCached() ?? initialSettings);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    Promise.all([appointmentsStorage.getAll(), settingsStorage.get()])
      .then(([appointmentData, settingsData]) => {
        if (!active) return;
        setAppointments(appointmentData);
        setSettings(settingsData);
        setStatus('ready');
      })
      .catch(() => {
        if (active) setStatus('error');
      });
    return () => { active = false; };
  }, [refreshTrigger, attempt]);

  const readySettings = status === 'ready' ? settings : null;
  const current = useMemo(() => (readySettings ? getMonthStatistics(appointments, readySettings, month) : null), [readySettings, appointments, month]);
  const previous = useMemo(() => (readySettings ? getMonthStatistics(appointments, readySettings, subMonths(month, 1)) : null), [readySettings, appointments, month]);

  const formatHours = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const rest = minutes % 60;
    return rest ? t('statistics.hoursMinutes', { hours, minutes: rest }) : t('statistics.hoursOnly', { hours });
  };
  const previousMonthName = format(subMonths(month, 1), 'LLLL', { locale: dateFnsLocale });
  const previousLabel = (value: string) => t('statistics.previousValue', { month: previousMonthName, value });
  const vsPrevious = t('statistics.vsMonth', { month: previousMonthName });
  const typeLabel = (type: TypeKey) => (type === 'other' ? t('statistics.otherType') : t(APPOINTMENT_TYPES[type].labelKey));
  const typeColor = (type: TypeKey) => (type === 'other' ? '#94a3b8' : APPOINTMENT_TYPES[type].color);

  // "Other" covers appointments with an unknown type and is only shown when used.
  const typeRows = current && previous
    ? current.byType
      .map((entry, index) => ({ ...entry, previousCount: previous.byType[index].count, previousMinutes: previous.byType[index].minutes }))
      .filter((row) => row.type !== 'other' || row.count > 0 || row.previousCount > 0)
    : [];

  const kpis: { id: string; label: string; icon: ComponentType<{ className?: string }>; value: string; current: number; previous: number; format: (value: number) => string }[] = current && previous ? [
    {
      id: 'days-worked', label: t('statistics.daysWorked'), icon: CalendarCheck,
      value: t('statistics.daysWorkedValue', { worked: current.daysWithAppointments, scheduled: current.scheduledWorkingDays }),
      current: current.daysWithAppointments, previous: previous.daysWithAppointments, format: String,
    },
    {
      id: 'appointments', label: t('statistics.appointments'), icon: CalendarDays, value: String(current.totalAppointments),
      current: current.totalAppointments, previous: previous.totalAppointments, format: String,
    },
    {
      id: 'patients', label: t('statistics.patients'), icon: Users, value: String(current.uniquePatients),
      current: current.uniquePatients, previous: previous.uniquePatients, format: String,
    },
    {
      id: 'hours-worked', label: t('statistics.hoursWorked'), icon: Clock, value: formatHours(current.bookedMinutes),
      current: current.bookedMinutes, previous: previous.bookedMinutes, format: formatHours,
    },
  ] : [];

  // Shares of the month's unique patients; returning is the complement so the two always add up to 100%.
  const totalPatients = current?.uniquePatients ?? 0;
  const newShare = totalPatients ? Math.round(((current?.newPatients ?? 0) / totalPatients) * 100) : 0;
  const returningShare = totalPatients ? 100 - newShare : 0;

  const sectionTitle = 'text-sm font-semibold tracking-tight text-foreground';
  const cardClass = 'border-border/70 shadow-none';

  return (
    <div className="space-y-5 md:space-y-6" data-testid="statistics-page">
      <div className="flex flex-wrap items-center justify-between gap-3 sm:items-start">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2 className="truncate text-xl font-semibold tracking-tight text-foreground md:text-2xl">{t('statistics.title')}</h2>
          </div>
          <p className="hidden max-w-xl pl-[2.75rem] text-sm leading-relaxed text-muted-foreground sm:block">{t('statistics.subtitle')}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:pt-0.5">{navigation}</div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-lg border border-border/70 bg-card p-0.5">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={t('statistics.previousMonth')} data-testid="statistics-prev-month" onClick={() => setMonth((value) => subMonths(value, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="min-w-[9.5rem] px-2 text-center text-sm font-semibold capitalize text-foreground" aria-live="polite" data-testid="statistics-month-label">
            {format(month, 'LLLL yyyy', { locale: dateFnsLocale })}
          </span>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={t('statistics.nextMonth')} data-testid="statistics-next-month" onClick={() => setMonth((value) => addMonths(value, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {!isSameMonth(month, new Date()) && (
          <Button type="button" variant="outline" size="sm" className="h-9" data-testid="statistics-this-month" onClick={() => setMonth(startOfMonth(new Date()))}>
            {t('statistics.thisMonth')}
          </Button>
        )}
      </div>

      {status === 'loading' && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('statistics.loading')}
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-destructive" role="alert" data-testid="statistics-error">
          {t('statistics.loadFailed')}
          <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((value) => value + 1)}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('settings.retry')}
          </Button>
        </div>
      )}

      {current && previous && (
        <>
          <section aria-label={t('statistics.overview')} className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {kpis.map(({ icon: Icon, ...item }) => (
              <Card key={item.id} className={cardClass} data-testid={`stat-${item.id}`}>
                <CardContent className="flex h-full flex-col gap-2 p-3.5 md:p-5 lg:p-4 xl:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="min-w-0 text-xs font-medium leading-tight text-muted-foreground md:text-sm">{item.label}</span>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground md:h-8 md:w-8">
                      <Icon className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="break-words text-xl font-semibold leading-tight tracking-tight text-foreground tabular-nums md:text-3xl lg:text-2xl xl:text-3xl" data-testid="stat-value">{item.value}</div>
                  <div className="mt-auto">
                    <Change
                    current={item.current}
                    previous={item.previous}
                    format={item.format}
                    previousLabel={previousLabel(item.format(item.previous))}
                    suffix={vsPrevious}
                    testId="stat-change"
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>

          <section aria-labelledby="statistics-patients-title" className="space-y-2.5">
            <h3 id="statistics-patients-title" className={sectionTitle}>{t('statistics.patients')}</h3>
            <div className="grid grid-cols-2 gap-3 lg:max-w-xl lg:gap-4" data-testid="statistics-patients">
              {[
                { id: 'new', label: t('statistics.newPatients'), icon: UserPlus, value: current.newPatients, share: newShare },
                { id: 'returning', label: t('statistics.returningPatients'), icon: UserCheck, value: current.returningPatients, share: returningShare },
              ].map(({ icon: Icon, ...item }) => (
                <Card key={item.id} className={cardClass} data-testid={`patients-${item.id}`}>
                  <CardContent className="flex items-start gap-3 p-3.5 md:p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="text-xs leading-snug text-muted-foreground">{item.label}</div>
                      <div className="flex flex-wrap items-baseline gap-x-1.5">
                        <span className="text-xl font-semibold leading-tight text-foreground tabular-nums" data-testid="patients-value">{item.value}</span>
                        <span className="text-xs font-medium text-muted-foreground tabular-nums" aria-hidden="true">·</span>
                        <span className="text-xs font-medium text-muted-foreground tabular-nums" data-testid="patients-percent">{item.share}%</span>
                        <span className="sr-only">{t('statistics.patientShare', { count: item.value, total: totalPatients })}</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <div className="h-full rounded-full bg-primary/60" style={{ width: `${item.share}%` }} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section aria-labelledby="statistics-by-type-title" className="space-y-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <h3 id="statistics-by-type-title" className={sectionTitle}>{t('statistics.byType')}</h3>
              <p className="text-xs text-muted-foreground" data-testid="statistics-compared-with">{t('statistics.changeVs', { month: previousMonthName })}</p>
            </div>

            {current.totalAppointments === 0 && (
              <p className="text-sm text-muted-foreground" data-testid="statistics-empty">{t('statistics.noAppointments')}</p>
            )}

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:gap-4 xl:grid-cols-3" data-testid="statistics-by-type">
              {typeRows.map((row) => {
                const idle = row.count === 0 && row.previousCount === 0;
                return (
                  <li key={row.type} data-testid={`type-row-${row.type}`}>
                    <Card className={cn(cardClass, 'h-full overflow-hidden border-l-4', idle && 'bg-muted/30')} style={{ borderLeftColor: typeColor(row.type) }} data-idle={idle || undefined}>
                      <CardContent className="space-y-3 p-4">
                        <div className={cn('break-words text-sm font-medium leading-snug', idle ? 'text-muted-foreground' : 'text-foreground')}>{typeLabel(row.type)}</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="min-w-0 space-y-0.5">
                            <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('statistics.appointments')}</div>
                            <div className={cn('flex h-8 items-end text-2xl font-semibold leading-none tabular-nums', idle ? 'text-muted-foreground' : 'text-foreground')} data-testid="type-count">{row.count}</div>
                            <Change current={row.count} previous={row.previousCount} format={String} previousLabel={previousLabel(String(row.previousCount))} testId="type-count-change" />
                          </div>
                          <div className="min-w-0 space-y-0.5 border-l border-border/60 pl-3">
                            <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{t('statistics.totalTime')}</div>
                            <div className={cn('flex min-h-8 items-end break-words text-base font-medium leading-tight tabular-nums', idle ? 'text-muted-foreground' : 'text-foreground')} data-testid="type-hours">{formatHours(row.minutes)}</div>
                            <Change current={row.minutes} previous={row.previousMinutes} format={formatHours} previousLabel={previousLabel(formatHours(row.previousMinutes))} testId="type-hours-change" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </section>

          <p className="text-xs text-muted-foreground">{t('statistics.footnote')}</p>
        </>
      )}
    </div>
  );
}
