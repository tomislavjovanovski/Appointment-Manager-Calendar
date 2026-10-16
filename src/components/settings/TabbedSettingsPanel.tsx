import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Clock, Calendar, Download, Upload, Save, Mail, MessageSquare, Bell, Puzzle, Database, Activity, RefreshCw, Server, Trash2, Building2, Languages, type LucideIcon } from 'lucide-react';
import { AppointmentSettings } from '@/types/appointment';
import { settingsStorage, dataManagement } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoogleCalendarSync } from '@/components/dashboard/GoogleCalendarSync';
import { NotificationManager } from '@/components/notifications/NotificationManager';
import { useI18n } from '@/i18n';
import { normalizeLocale, type AppLocale } from '@/i18n/types';
import { buildApiUrl } from '@/lib/storage';
import { authFetch } from '@/lib/auth';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { format, isValid, parse } from 'date-fns';
import { getDayHours } from '@/lib/appointmentAvailability';
import { cn } from '@/lib/utils';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/auth/AuthProvider';
import { APPOINTMENT_TYPES, APPOINTMENT_TYPE_VALUES, APPOINTMENT_DURATIONS, DEFAULT_APPOINTMENT_TYPE_DURATIONS } from '@/lib/appointmentTypes';

function SettingsTimeInput({ id, testId, value, onChange }: Readonly<{
  id: string;
  testId?: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  const [open, setOpen] = useState(false);

  return (
    <TimePicker
      ampm={false}
      format="HH:mm"
      minutesStep={15}
      timeSteps={{ minutes: 15 }}
      desktopModeMediaQuery="(min-width: 640px)"
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      value={parse(value, 'HH:mm', new Date())}
      onChange={(time) => {
        if (time && isValid(time)) onChange(format(time, 'HH:mm'));
      }}
      slotProps={{
        textField: {
          id,
          size: 'small',
          fullWidth: true,
          onClick: (event) => {
            if (!(event.target as HTMLElement).closest('button')) setOpen(true);
          },
          onKeyDown: (event) => {
            if ((event.target as HTMLElement).closest('button')) return;
            if (event.key === 'Enter' || event.key === 'ArrowDown') {
              event.preventDefault();
              setOpen(true);
            }
          },
          inputProps: { 'data-testid': testId, 'aria-haspopup': 'dialog' },
        },
        popper: { sx: { zIndex: 2100 } },
        dialog: { sx: { zIndex: 2100 } },
      }}
    />
  );
}

const DAYS_OF_WEEK = [
  { id: 0, shortKey: 'sun' as const },
  { id: 1, shortKey: 'mon' as const },
  { id: 2, shortKey: 'tue' as const },
  { id: 3, shortKey: 'wed' as const },
  { id: 4, shortKey: 'thu' as const },
  { id: 5, shortKey: 'fri' as const },
  { id: 6, shortKey: 'sat' as const },
];

type ApiHealthResponse = {
  ok: boolean;
  dataDir: string;
  patientsCount: number;
  appointmentsCount: number;
};

export function TabbedSettingsPanel({ onSettingsSaved, navigation }: Readonly<{
  onSettingsSaved?: (settings: AppointmentSettings) => void;
  navigation?: React.ReactNode;
}>) {
  const { t, setLocale } = useI18n();
  const { user, saveSidebarCollapsed, savingSidebarPreference } = useAuth();
  const [settings, setSettings] = useState<AppointmentSettings>(() => settingsStorage.getCached() ?? {
    locale: 'mk',
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    appointmentSizes: {
      half: { duration: 30, label: 'Half Hour' },
      full: { duration: 60, label: 'Full Hour' },
      double: { duration: 120, label: 'Double Hour' }
    },
    breakTime: 15,
    timeSlotMinutes: 15,
    notifications: {
      emailWebhookUrl: '',
      smsWebhookUrl: '',
      emailNotificationTime: '09:00',
      smsNotificationTime: '09:00',
      enableDayBeforeEmail: true,
      enableSameDayEmail: true,
      enableSameDaySMS: true,
      emailTemplate: '',
      smsTemplate: ''
    }
  });
  const [apiHealth, setApiHealth] = useState<ApiHealthResponse | null>(null);
  const [apiHealthLoading, setApiHealthLoading] = useState(false);
  const [apiHealthError, setApiHealthError] = useState<string | null>(null);
  const [lastHealthCheck, setLastHealthCheck] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const { toast } = useToast();
  const apiHealthUrl = buildApiUrl('/health');

  const loadApiHealth = useCallback(async () => {
    setApiHealthLoading(true);
    setApiHealthError(null);

    try {
      const response = await authFetch(buildApiUrl('/health/details'));
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || t('settings.apiHealthLoadFailed'));
      }

      setApiHealth(payload as ApiHealthResponse);
      setLastHealthCheck(new Date().toISOString());
    } catch (error) {
      setApiHealth(null);
      setApiHealthError(error instanceof Error ? error.message : t('settings.apiHealthLoadFailed'));
    } finally {
      setApiHealthLoading(false);
    }
  }, [t]);
  
  useEffect(() => {
    const loadSettings = async () => {
      const data = await settingsStorage.get();
      setSettings(data);
    };
    loadSettings();
    void loadApiHealth();
  }, [loadApiHealth]);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    setLogoError(null);
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 128 * 1024) {
      setLogoError(t('settings.logoInvalid'));
      return;
    }

    setLogoUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Unable to read logo.'));
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      setSettings((current) => ({ ...current, logoDataUrl: dataUrl }));
    } catch {
      setLogoError(t('settings.logoInvalid'));
    } finally {
      setLogoUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const savedSettings = await settingsStorage.save(settings);
      onSettingsSaved?.(savedSettings);
      setLocale(normalizeLocale(settings.locale));
      toast({
        title: t('settings.savedTitle'),
        description: t('settings.savedDesc'),
      });
    } catch (error) {
      toast({
        title: t('settings.saveErrorTitle'),
        description: t('settings.saveErrorDesc'),
        variant: "destructive"
      });
    }
  };

  const handleExport = async () => {
    const data = await dataManagement.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `medical-appointments-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: t('settings.exportToastTitle'),
      description: t('settings.exportToastDesc'),
    });
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        await dataManagement.importAll(data);
        const newSettings = await settingsStorage.get();
        setSettings(newSettings);
        onSettingsSaved?.(newSettings);
        setLocale(normalizeLocale(newSettings.locale));
        toast({
          title: t('settings.importToastTitle'),
          description: t('settings.importToastDesc'),
        });
      } catch (error) {
        toast({
          title: t('settings.importErrorTitle'),
          description: t('settings.importErrorDesc'),
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const toggleWorkingDay = (dayId: number) => {
    const newWorkingDays = settings.workingDays.includes(dayId)
      ? settings.workingDays.filter(d => d !== dayId)
      : [...settings.workingDays, dayId].sort();
    
    setSettings({ ...settings, workingDays: newWorkingDays });
  };

  const setDayHours = (weekday: number, patch: Partial<{ startTime: string; endTime: string }>) => {
    setSettings((current) => ({
      ...current,
      dailyHours: { ...current.dailyHours, [weekday]: { ...getDayHours(current, weekday), ...patch } },
    }));
  };

  const resetDayHours = (weekday: number) => {
    setSettings((current) => {
      const { [weekday]: _removed, ...rest } = current.dailyHours ?? {};
      return { ...current, dailyHours: rest };
    });
  };

  const tabs = [
    { value: 'general', icon: Settings, label: t('settings.tabGeneral') },
    { value: 'integration', icon: Puzzle, label: t('settings.tabIntegration') },
    { value: 'data', icon: Database, label: t('settings.tabData') },
    { value: 'api-health', icon: Activity, label: t('settings.tabApiHealth') },
  ];

  const workingDaysOrdered = [...DAYS_OF_WEEK].sort((a, b) => ((a.id + 6) % 7) - ((b.id + 6) % 7));

  return (
    <div className="w-full space-y-4 sm:space-y-6" data-testid="settings-page">
      <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings className="h-5 w-5" strokeWidth={2} />
          </span>
          <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{t('settings.title')}</h2>
        </div>
        <p className="hidden max-w-2xl pl-[2.75rem] text-sm leading-relaxed text-muted-foreground sm:block">{t('settings.subtitle')}</p>
      </div>
      <div className="ml-auto flex items-center justify-end sm:pt-0.5">{navigation}</div>
      </div>

      <Tabs defaultValue="general" className="space-y-4 sm:space-y-6">
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 shadow-sm lg:grid-cols-4">
          {tabs.map(({ value, icon: Icon, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="flex h-10 min-w-0 items-center justify-center gap-2 rounded-lg px-2 text-xs data-[state=active]:shadow-sm sm:text-sm"
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* General */}
        <TabsContent value="general" className="mt-0 space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <SettingsSection icon={Building2} title={t('settings.practiceSection')}>
              <div className="space-y-2">
                <Label htmlFor="practiceName">{t('settings.practiceName')}</Label>
                <Input
                  id="practiceName"
                  data-testid="practice-name-input"
                  value={settings.practiceName ?? ''}
                  onChange={(e) => setSettings({ ...settings, practiceName: e.target.value })}
                  placeholder={t('settings.clinicName')}
                  className="text-base sm:text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandLogo">{t('settings.logo')}</Label>
                <div className="flex items-center gap-3">
                  {settings.logoDataUrl && (
                    <img src={settings.logoDataUrl} alt={t('settings.logo')} className="h-12 w-12 shrink-0 rounded-md border border-border bg-background object-contain p-1" />
                  )}
                  <Input
                    id="brandLogo"
                    data-testid="settings-logo-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={logoUploading}
                    onChange={(event) => void handleLogoUpload(event)}
                    className="min-w-0 flex-1"
                  />
                  {settings.logoDataUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0"
                      disabled={logoUploading}
                      aria-label={t('settings.removeLogo')}
                      title={t('settings.removeLogo')}
                      onClick={() => {
                        setSettings((current) => ({ ...current, logoDataUrl: '' }));
                        setLogoError(null);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {logoError && <p role="alert" className="text-sm text-destructive">{logoError}</p>}
              </div>
            </SettingsSection>

            <SettingsSection icon={Languages} title={t('settings.language')} description={t('settings.languageHint')}>
              <Select
                value={settings.locale ?? 'mk'}
                onValueChange={(value) => setSettings({ ...settings, locale: value as AppLocale })}
              >
                <SelectTrigger data-testid="settings-locale-select" aria-label={t('settings.language')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem data-testid="settings-locale-option-en" value="en">{t('settings.langEnglish')}</SelectItem>
                  <SelectItem data-testid="settings-locale-option-mk" value="mk">{t('settings.langMacedonian')}</SelectItem>
                </SelectContent>
              </Select>
            </SettingsSection>
          </div>

          <SettingsSection icon={Settings} title={t('settings.desktopSidebar')} description={t('settings.desktopSidebarHint')}>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="desktop-sidebar-collapsed">{t('settings.collapseSidebar')}</Label>
              <Switch
                id="desktop-sidebar-collapsed"
                data-testid="settings-sidebar-collapsed"
                checked={user?.preferences?.desktopSidebarCollapsed === true}
                disabled={savingSidebarPreference}
                onCheckedChange={(collapsed) => {
                  void saveSidebarCollapsed(collapsed).catch(() => {
                    toast({ title: t('settings.saveErrorTitle'), description: t('settings.sidebarSaveError'), variant: 'destructive' });
                  });
                }}
              />
            </div>
          </SettingsSection>

          <SettingsSection icon={Clock} title={t('settings.typeDurations')} description={t('settings.typeDurationsHint')}>
            <p className="text-sm text-muted-foreground">{t('settings.defaultAppointmentTypeHint')}</p>
            <RadioGroup
              aria-label={t('settings.defaultAppointmentType')}
              value={settings.defaultAppointmentType ?? 'procedure'}
              onValueChange={(value) => {
                const type = APPOINTMENT_TYPE_VALUES.find((type) => type === value);
                if (!type) throw new Error('Invalid default appointment type');
                setSettings((current) => ({ ...current, defaultAppointmentType: type }));
              }}
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {APPOINTMENT_TYPE_VALUES.map((type) => (
                <div key={type} className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label htmlFor={`default-duration-${type}`} className="flex min-w-0 items-center gap-2 leading-snug">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: APPOINTMENT_TYPES[type].color }} aria-hidden="true" />
                      {t(APPOINTMENT_TYPES[type].labelKey)}
                    </Label>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <RadioGroupItem value={type} id={`default-type-${type}`} data-testid={`settings-default-type-${type}`} aria-label={`${t(APPOINTMENT_TYPES[type].labelKey)} — ${t('settings.defaultAppointmentType')}`} />
                      <Label htmlFor={`default-type-${type}`} className="cursor-pointer text-xs">{t('settings.defaultTypeShort')}</Label>
                    </div>
                  </div>
                  <Select
                    value={String(settings.appointmentTypeDurations?.[type] ?? DEFAULT_APPOINTMENT_TYPE_DURATIONS[type])}
                    onValueChange={(value) => {
                      const duration = APPOINTMENT_DURATIONS.find((minutes) => String(minutes) === value);
                      if (duration === undefined) throw new Error('Invalid appointment duration');
                      setSettings((current) => ({
                        ...current,
                        appointmentTypeDurations: { ...current.appointmentTypeDurations, [type]: duration },
                      }));
                    }}
                  >
                    <SelectTrigger id={`default-duration-${type}`} data-testid={`settings-type-duration-${type}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPOINTMENT_DURATIONS.map((minutes) => (
                        <SelectItem key={minutes} value={String(minutes)} data-testid={`settings-duration-option-${minutes}`}>{t('settings.minutes', { n: minutes })}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </RadioGroup>
          </SettingsSection>

          <SettingsSection icon={Clock} title={t('settings.workingHours')} contentClassName="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">{t('settings.startTime')}</Label>
                <SettingsTimeInput
                  id="startTime"
                  testId="settings-start-time-input"
                  value={settings.startTime}
                  onChange={(startTime) => setSettings({ ...settings, startTime })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">{t('settings.endTime')}</Label>
                <SettingsTimeInput
                  id="endTime"
                  testId="settings-end-time-input"
                  value={settings.endTime}
                  onChange={(endTime) => setSettings({ ...settings, endTime })}
                />
              </div>
              <div className="col-span-2 space-y-2 sm:col-span-1">
                <Label>{t('settings.timeSlotInterval')}</Label>
                <Select
                  value={String(settings.timeSlotMinutes ?? 30)}
                  onValueChange={(value) => setSettings({ ...settings, timeSlotMinutes: parseInt(value) as any })}
                >
                  <SelectTrigger data-testid="settings-slot-interval-select" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem data-testid="settings-slot-interval-option-15" value="15">{t('settings.slot15')}</SelectItem>
                    <SelectItem data-testid="settings-slot-interval-option-30" value="30">{t('settings.slot30')}</SelectItem>
                    <SelectItem data-testid="settings-slot-interval-option-60" value="60">{t('settings.slot60')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="col-span-2 -mt-1 text-xs text-muted-foreground sm:col-span-3">{t('settings.timeSlotIntervalHint')}</p>
            </div>

            <div className="space-y-3 border-t border-border/60 pt-5">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4 text-primary" />
                {t('settings.workingDays')}
              </h3>
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = settings.workingDays.includes(day.id);
                  return (
                    <button
                      type="button"
                      key={day.id}
                      data-testid={`working-day-toggle-${day.shortKey}`}
                      data-selected={isSelected ? 'true' : 'false'}
                      aria-pressed={isSelected}
                      onClick={() => toggleWorkingDay(day.id)}
                      className={`min-w-0 rounded-lg border-2 px-1 py-2.5 text-center text-xs font-medium transition-all sm:py-3 ${
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background hover:border-primary/50'
                      }`}
                    >
                      {t(`days.short.${day.shortKey}`)}
                    </button>
                  );
                })}
              </div>
            </div>

            {settings.workingDays.length > 0 && (
              <div className="space-y-3 border-t border-border/60 pt-5">
                <div>
                  <h3 className="text-sm font-semibold">{t('settings.dailyHours')}</h3>
                  <p className="text-xs text-muted-foreground">{t('settings.dailyHoursHint')}</p>
                </div>
                <div className="space-y-2">
                  {workingDaysOrdered
                    .filter((day) => settings.workingDays.includes(day.id))
                    .map((day) => {
                      const hours = getDayHours(settings, day.id);
                      const isCustom = Boolean(settings.dailyHours?.[day.id]);
                      return (
                        <div
                          key={day.id}
                          data-testid={`day-hours-${day.shortKey}`}
                          className="grid grid-cols-2 items-center gap-2 rounded-lg border border-border/60 p-2.5 sm:grid-cols-[3.5rem_1fr_1fr_auto] sm:border-0 sm:p-0"
                        >
                          <span className="text-sm font-medium">{t(`days.short.${day.shortKey}`)}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={!isCustom}
                            onClick={() => resetDayHours(day.id)}
                            className="h-8 justify-self-end px-2 text-xs sm:order-last"
                          >
                            {t('settings.resetDayHours')}
                          </Button>
                          <SettingsTimeInput
                            id={`dayStart-${day.id}`}
                            value={hours.startTime}
                            onChange={(startTime) => setDayHours(day.id, { startTime })}
                          />
                          <SettingsTimeInput
                            id={`dayEnd-${day.id}`}
                            value={hours.endTime}
                            onChange={(endTime) => setDayHours(day.id, { endTime })}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </SettingsSection>
        </TabsContent>

        {/* Integration */}
        <TabsContent value="integration" className="mt-0 space-y-4 sm:space-y-6">
          <SettingsSection icon={Bell} title={t('settings.notificationSettings')}>
            <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
              <div className="space-y-4 rounded-xl border border-border/60 p-3 sm:p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <Mail className="h-4 w-4 text-primary" />
                  {t('settings.emailZapier')}
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="emailWebhook">{t('settings.emailWebhook')}</Label>
                  <Input
                    id="emailWebhook"
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="text-base sm:text-sm"
                    value={settings.notifications.emailWebhookUrl}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailWebhookUrl: e.target.value }
                    })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="emailTime">{t('settings.notificationTime')}</Label>
                    <SettingsTimeInput
                      id="emailTime"
                      value={settings.notifications.emailNotificationTime}
                      onChange={(emailNotificationTime) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, emailNotificationTime }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.emailSettingsLabel')}</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="dayBeforeEmail"
                        checked={settings.notifications.enableDayBeforeEmail}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, enableDayBeforeEmail: checked as boolean }
                        })}
                      />
                      <Label htmlFor="dayBeforeEmail" className="text-sm font-normal">{t('settings.dayBeforeReminder')}</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="sameDayEmail"
                        checked={settings.notifications.enableSameDayEmail}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, enableSameDayEmail: checked as boolean }
                        })}
                      />
                      <Label htmlFor="sameDayEmail" className="text-sm font-normal">{t('settings.sameDayReminder')}</Label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailTemplate">{t('settings.emailTemplate')}</Label>
                  <Textarea
                    id="emailTemplate"
                    placeholder={t('settings.emailTemplatePlaceholder')}
                    rows={4}
                    className="text-base sm:text-sm"
                    value={settings.notifications.emailTemplate}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailTemplate: e.target.value }
                    })}
                  />
                  <p className="text-xs text-muted-foreground">{t('settings.emailTemplateHint')}</p>
                </div>
              </div>

              <div className="space-y-4 rounded-xl border border-border/60 p-3 sm:p-4">
                <h4 className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  {t('settings.smsZapier')}
                </h4>
                <div className="space-y-2">
                  <Label htmlFor="smsWebhook">{t('settings.smsWebhook')}</Label>
                  <Input
                    id="smsWebhook"
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    className="text-base sm:text-sm"
                    value={settings.notifications.smsWebhookUrl}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, smsWebhookUrl: e.target.value }
                    })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="smsTime">{t('settings.smsTime')}</Label>
                    <SettingsTimeInput
                      id="smsTime"
                      value={settings.notifications.smsNotificationTime}
                      onChange={(smsNotificationTime) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, smsNotificationTime }
                      })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('settings.smsSettingsLabel')}</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="sameDaySMS"
                        checked={settings.notifications.enableSameDaySMS}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, enableSameDaySMS: checked as boolean }
                        })}
                      />
                      <Label htmlFor="sameDaySMS" className="text-sm font-normal">{t('settings.sameDaySms')}</Label>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smsTemplate">{t('settings.smsTemplate')}</Label>
                  <Textarea
                    id="smsTemplate"
                    placeholder={t('settings.smsTemplatePlaceholder')}
                    rows={4}
                    className="text-base sm:text-sm"
                    value={settings.notifications.smsTemplate}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, smsTemplate: e.target.value }
                    })}
                  />
                  <p className="text-xs text-muted-foreground">{t('settings.smsTemplateHint')}</p>
                </div>
              </div>
            </div>

            <div className="space-y-0.5 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p><strong>{t('settings.zapierHelpTitle')}</strong></p>
              <p>1. {t('settings.zapierHelp1')}</p>
              <p>2. {t('settings.zapierHelp2')}</p>
              <p>3. {t('settings.zapierHelp3')}</p>
              <p>4. {t('settings.zapierHelp4')}</p>
            </div>
          </SettingsSection>

          <NotificationManager />

          <GoogleCalendarSync />
        </TabsContent>

        {/* Data */}
        <TabsContent value="data" className="mt-0 space-y-4 sm:space-y-6">
          <SettingsSection icon={Database} title={t('settings.dataTitle')}>
            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              <Button onClick={handleExport} variant="outline" className="h-11 w-full">
                <Download className="mr-2 h-4 w-4" />
                {t('settings.export')}
              </Button>
              <div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  id="import-file"
                />
                <Button asChild variant="outline" className="h-11 w-full">
                  <label htmlFor="import-file" className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    {t('settings.import')}
                  </label>
                </Button>
              </div>
            </div>
            <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p><strong>{t('settings.exportHelp')}</strong> {t('settings.exportHelpText')}</p>
              <p><strong>{t('settings.importHelp')}</strong> {t('settings.importHelpText')}</p>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* API health */}
        <TabsContent value="api-health" className="mt-0 space-y-4 sm:space-y-6">
          <SettingsSection
            icon={Server}
            title={t('settings.apiHealthTitle')}
            description={t('settings.apiHealthSubtitle')}
            action={(
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0"
                onClick={loadApiHealth}
                disabled={apiHealthLoading}
                aria-label={t('settings.apiHealthRefresh')}
              >
                <RefreshCw className={`h-4 w-4 sm:mr-2 ${apiHealthLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{t('settings.apiHealthRefresh')}</span>
              </Button>
            )}
          >
            <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
              <HealthStat label={t('settings.apiHealthStatus')}>
                <Badge variant={apiHealth?.ok ? 'default' : 'destructive'}>
                  {apiHealth?.ok ? t('settings.apiHealthOnline') : t('settings.apiHealthOffline')}
                </Badge>
              </HealthStat>
              <HealthStat label={t('settings.apiHealthPatients')}>
                <span className="text-xl font-semibold sm:text-2xl">{apiHealth?.patientsCount ?? '—'}</span>
              </HealthStat>
              <HealthStat label={t('settings.apiHealthAppointments')}>
                <span className="text-xl font-semibold sm:text-2xl">{apiHealth?.appointmentsCount ?? '—'}</span>
              </HealthStat>
              <HealthStat label={t('settings.apiHealthLastChecked')}>
                <span className="break-words text-sm font-medium">
                  {lastHealthCheck ? new Date(lastHealthCheck).toLocaleString() : '—'}
                </span>
              </HealthStat>
            </div>

            <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>{t('settings.apiHealthEndpoint')}</Label>
                <p className="break-all rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs text-foreground sm:text-sm">{apiHealthUrl}</p>
              </div>
              <div className="space-y-2">
                <Label>{t('settings.apiHealthDataDir')}</Label>
                <p className="break-all rounded-lg bg-muted/40 px-3 py-2 font-mono text-xs text-foreground sm:text-sm">{apiHealth?.dataDir ?? '—'}</p>
              </div>
            </div>

            {apiHealthError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                <strong>{t('settings.apiHealthErrorLabel')}</strong> {apiHealthError}
              </div>
            )}

            <div className="space-y-1 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
              <p><strong>{t('settings.apiHealthHowItWorks')}</strong></p>
              <p>{t('settings.apiHealthHowItWorksText')}</p>
            </div>
          </SettingsSection>
        </TabsContent>

        <div className="sticky bottom-0 z-10 -mx-4 border-t border-border/60 bg-background/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
          <Button onClick={handleSave} disabled={logoUploading} data-testid="save-settings-btn" className="h-11 w-full bg-gradient-to-r from-accent to-accent-hover">
            <Save className="mr-2 h-4 w-4" />
            {t('settings.save')}
          </Button>
        </div>
      </Tabs>
    </div>
  );
}

function SettingsSection({ icon: Icon, title, description, action, contentClassName, children }: Readonly<{
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  contentClassName?: string;
  children: React.ReactNode;
}>) {
  return (
    <Card className="min-w-0">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 p-4 sm:p-6">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
            <Icon className="h-5 w-5 shrink-0 text-primary" />
            <span className="truncate">{title}</span>
          </CardTitle>
          {description && <CardDescription className="text-xs sm:text-sm">{description}</CardDescription>}
        </div>
        {action}
      </CardHeader>
      <CardContent className={cn('space-y-4 p-4 pt-0 sm:p-6 sm:pt-0', contentClassName)}>
        {children}
      </CardContent>
    </Card>
  );
}

function HealthStat({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <div className="min-w-0 rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
      <div className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:text-xs">{label}</div>
      <div className="mt-1.5 sm:mt-2">{children}</div>
    </div>
  );
}
