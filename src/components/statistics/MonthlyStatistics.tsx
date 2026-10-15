import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { addMonths, format, isSameMonth, startOfMonth, subMonths } from 'date-fns';
import { BarChart3, ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useI18n } from '@/i18n';
import { appointmentsStorage, settingsStorage } from '@/lib/storage';
import { getMonthStatistics, type TypeKey } from '@/lib/statistics';
import { APPOINTMENT_TYPES } from '@/lib/appointmentTypes';
import type { Appointment, AppointmentSettings } from '@/types/appointment';

interface MonthlyStatisticsProps {
  navigation?: ReactNode;
  refreshTrigger?: number;
}

const difference = (current: number, previous: number) => {
  const value = current - previous;
  if (value > 0) return `+${value}`;
  if (value < 0) return `−${Math.abs(value)}`;
  return '0';
};

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
  const typeLabel = (type: TypeKey) => (type === 'other' ? t('statistics.otherType') : t(APPOINTMENT_TYPES[type].labelKey));
  const typeColor = (type: TypeKey) => (type === 'other' ? '#94a3b8' : APPOINTMENT_TYPES[type].color);

  // "Other" covers appointments with an unknown type and is only shown when used.
  const typeRows = current && previous
    ? current.byType
      .map((entry, index) => ({ ...entry, previous: previous.byType[index].count }))
      .filter((row) => row.type !== 'other' || row.count > 0 || row.previous > 0)
    : [];

  const summary = current ? [
    { id: 'days-worked', label: t('statistics.daysWorked'), value: t('statistics.daysWorkedValue', { worked: current.daysWithAppointments, scheduled: current.scheduledWorkingDays }) },
    { id: 'appointments', label: t('statistics.appointments'), value: String(current.totalAppointments) },
    {
      id: 'patients', label: t('statistics.patients'), value: String(current.uniquePatients),
      detail: t('statistics.patientsDetail', { new: current.newPatients, returning: current.returningPatients }),
    },
    { id: 'hours-worked', label: t('statistics.hoursWorked'), value: formatHours(current.bookedMinutes) },
  ] : [];

  return (
    <div className="space-y-4 md:space-y-6" data-testid="statistics-page">
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
        <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label={t('statistics.previousMonth')} data-testid="statistics-prev-month" onClick={() => setMonth((value) => subMonths(value, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-[9rem] text-center text-base font-semibold capitalize" data-testid="statistics-month-label">
          {format(month, 'LLLL yyyy', { locale: dateFnsLocale })}
        </span>
        <Button type="button" variant="outline" size="icon" className="h-9 w-9" aria-label={t('statistics.nextMonth')} data-testid="statistics-next-month" onClick={() => setMonth((value) => addMonths(value, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isSameMonth(month, new Date()) && (
          <Button type="button" variant="ghost" size="sm" data-testid="statistics-this-month" onClick={() => setMonth(startOfMonth(new Date()))}>
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
          <div className="grid grid-cols-2 gap-2 md:gap-4 lg:grid-cols-4">
            {summary.map((item) => (
              <Card key={item.id} className="border-border/80 shadow-soft" data-testid={`stat-${item.id}`}>
                <CardContent className="p-3 md:p-5">
                  <div className="text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground md:text-xs">{item.label}</div>
                  <div className="mt-1 text-lg font-semibold text-foreground md:text-2xl" data-testid="stat-value">{item.value}</div>
                  {item.detail && <div className="text-xs text-muted-foreground" data-testid="stat-detail">{item.detail}</div>}
                </CardContent>
              </Card>
            ))}
          </div>

          {current.totalAppointments === 0 && (
            <p className="text-sm text-muted-foreground" data-testid="statistics-empty">{t('statistics.noAppointments')}</p>
          )}

          <Card className="overflow-hidden border-border/80 shadow-soft">
            <CardHeader className="border-b border-border/60 bg-muted/20 p-3 md:p-5">
              <CardTitle className="text-base font-semibold tracking-tight">{t('statistics.byType')}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table data-testid="statistics-by-type">
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('statistics.type')}</TableHead>
                    <TableHead className="text-right">{t('statistics.appointments')}</TableHead>
                    <TableHead className="text-right">{t('statistics.hours')}</TableHead>
                    <TableHead className="whitespace-nowrap text-right">{t('statistics.lastMonth')}</TableHead>
                    <TableHead className="text-right">{t('statistics.difference')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {typeRows.map((row) => (
                    <TableRow key={row.type} data-testid={`type-row-${row.type}`}>
                      <TableCell className="font-medium">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: typeColor(row.type) }} aria-hidden="true" />
                          {typeLabel(row.type)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right tabular-nums" data-testid="type-count">{row.count}</TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums" data-testid="type-hours">{formatHours(row.minutes)}</TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground" data-testid="type-previous">{row.previous}</TableCell>
                      <TableCell className="text-right tabular-nums" data-testid="type-difference">{difference(row.count, row.previous)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold" data-testid="type-row-total">
                    <TableCell>{t('statistics.total')}</TableCell>
                    <TableCell className="text-right tabular-nums" data-testid="type-count">{current.totalAppointments}</TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums" data-testid="type-hours">{formatHours(current.bookedMinutes)}</TableCell>
                    <TableCell className="text-right tabular-nums" data-testid="type-previous">{previous.totalAppointments}</TableCell>
                    <TableCell className="text-right tabular-nums" data-testid="type-difference">{difference(current.totalAppointments, previous.totalAppointments)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground">{t('statistics.footnote')}</p>
        </>
      )}
    </div>
  );
}
