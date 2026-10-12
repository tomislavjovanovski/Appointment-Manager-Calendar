import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Clock, Calendar, Download, Upload, Save, Mail, MessageSquare, Bell, Puzzle, Database, Activity, RefreshCw, Server, Trash2 } from 'lucide-react';
import { AppointmentSettings } from '@/types/appointment';
import { settingsStorage, dataManagement } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoogleCalendarSync } from '@/components/dashboard/GoogleCalendarSync';
import { NotificationManager } from '@/components/notifications/NotificationManager';
import { useI18n } from '@/i18n';
import type { AppLocale } from '@/i18n/types';
import { buildApiUrl } from '@/lib/storage';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { format, isValid, parse } from 'date-fns';
import { getDayHours } from '@/lib/appointmentAvailability';

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

export function TabbedSettingsPanel({ onSettingsSaved }: Readonly<{
  onSettingsSaved?: (settings: AppointmentSettings) => void;
}>) {
  const { t, setLocale } = useI18n();
  const [settings, setSettings] = useState<AppointmentSettings>(() => settingsStorage.getCached() ?? {
    locale: 'en',
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
      const response = await fetch(buildApiUrl('/health'));
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
      setLocale(settings.locale === 'mk' ? 'mk' : 'en');
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
        setLocale(newSettings.locale === 'mk' ? 'mk' : 'en');
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

  return (
    <div className="space-y-6" data-testid="settings-page">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Settings className="h-5 w-5" strokeWidth={2} />
          </span>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t('settings.title')}</h2>
        </div>
        <p className="max-w-2xl pl-[2.75rem] text-sm leading-relaxed text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid h-11 w-full grid-cols-4 gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 shadow-sm">
          <TabsTrigger value="general" className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm">
            <Settings className="w-4 h-4" />
            {t('settings.tabGeneral')}
          </TabsTrigger>
          <TabsTrigger value="integration" className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm">
            <Puzzle className="w-4 h-4" />
            {t('settings.tabIntegration')}
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm">
            <Database className="w-4 h-4" />
            {t('settings.tabData')}
          </TabsTrigger>
          <TabsTrigger value="api-health" className="flex items-center gap-2 rounded-lg data-[state=active]:shadow-sm">
            <Activity className="w-4 h-4" />
            {t('settings.tabApiHealth')}
          </TabsTrigger>
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                {t('settings.language')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Label>{t('settings.language')}</Label>
              <Select
                value={settings.locale ?? 'en'}
                onValueChange={(value) =>
                  setSettings({ ...settings, locale: value as AppLocale })
                }
              >
                <SelectTrigger data-testid="settings-locale-select" className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem data-testid="settings-locale-option-en" value="en">{t('settings.langEnglish')}</SelectItem>
                  <SelectItem data-testid="settings-locale-option-mk" value="mk">{t('settings.langMacedonian')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">{t('settings.languageHint')}</p>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                {t('settings.workingHours')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="practiceName">{t('settings.practiceName')}</Label>
                <Input
                  id="practiceName"
                  data-testid="practice-name-input"
                  value={settings.practiceName ?? ''}
                  onChange={(e) => setSettings({ ...settings, practiceName: e.target.value })}
                  placeholder={t('settings.clinicName')}
                  className="max-w-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brandLogo">{t('settings.logo')}</Label>
                <div className="flex flex-wrap items-center gap-3">
                  {settings.logoDataUrl && (
                    <img src={settings.logoDataUrl} alt={t('settings.logo')} className="h-16 w-16 shrink-0 border border-border bg-background object-contain p-1" />
                  )}
                  <Input
                    id="brandLogo"
                    data-testid="settings-logo-input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={logoUploading}
                    onChange={(event) => void handleLogoUpload(event)}
                    className="max-w-sm"
                  />
                  {settings.logoDataUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">{t('settings.startTime')}</Label>
                  <SettingsTimeInput
                    id="startTime"
                    testId="settings-start-time-input"
                    value={settings.startTime}
                    onChange={(startTime) => setSettings({ ...settings, startTime })}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">{t('settings.endTime')}</Label>
                  <SettingsTimeInput
                    id="endTime"
                    testId="settings-end-time-input"
                    value={settings.endTime}
                    onChange={(endTime) => setSettings({ ...settings, endTime })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>{t('settings.timeSlotInterval')}</Label>
                  <Select
                    value={String(settings.timeSlotMinutes ?? 30)}
                    onValueChange={(value) => setSettings({ ...settings, timeSlotMinutes: parseInt(value) as any })}
                  >
                    <SelectTrigger data-testid="settings-slot-interval-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem data-testid="settings-slot-interval-option-15" value="15">{t('settings.slot15')}</SelectItem>
                      <SelectItem data-testid="settings-slot-interval-option-30" value="30">{t('settings.slot30')}</SelectItem>
                      <SelectItem data-testid="settings-slot-interval-option-60" value="60">{t('settings.slot60')}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-1 text-xs text-muted-foreground">{t('settings.timeSlotIntervalHint')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Working Days */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {t('settings.workingDays')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isSelected = settings.workingDays.includes(day.id);
                  return (
                    <div
                      key={day.id}
                      data-testid={`working-day-toggle-${day.shortKey}`}
                      data-selected={isSelected ? 'true' : 'false'}
                      onClick={() => toggleWorkingDay(day.id)}
                      className={`
                        p-3 text-center rounded-lg border-2 cursor-pointer transition-all
                        ${isSelected 
                          ? 'border-primary bg-primary text-primary-foreground' 
                          : 'border-border bg-background hover:border-primary/50'
                        }
                      `}
                    >
                      <div className="text-xs font-medium">{t(`days.short.${day.shortKey}`)}</div>
                    </div>
                  );
                })}
              </div>

              {settings.workingDays.length > 0 && (
                <div className="mt-6 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold">{t('settings.dailyHours')}</h3>
                    <p className="text-xs text-muted-foreground">{t('settings.dailyHoursHint')}</p>
                  </div>
                  {[...DAYS_OF_WEEK]
                    .sort((a, b) => ((a.id + 6) % 7) - ((b.id + 6) % 7))
                    .filter((day) => settings.workingDays.includes(day.id))
                    .map((day) => {
                      const hours = getDayHours(settings, day.id);
                      const isCustom = Boolean(settings.dailyHours?.[day.id]);
                      return (
                        <div key={day.id} data-testid={`day-hours-${day.shortKey}`} className="grid grid-cols-[3rem_1fr_1fr_auto] items-center gap-2">
                          <span className="text-sm font-medium">{t(`days.short.${day.shortKey}`)}</span>
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
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={!isCustom}
                            onClick={() => resetDayHours(day.id)}
                            className="h-8 px-2 text-xs"
                          >
                            {t('settings.resetDayHours')}
                          </Button>
                        </div>
                      );
                    })}
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        {/* Integration Tab */}
        <TabsContent value="integration" className="space-y-6">
          {/* Notification Manager */}
          <NotificationManager />
          
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                {t('settings.notificationSettings')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Zapier Webhooks */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {t('settings.emailZapier')}
                </h4>
                <div>
                  <Label htmlFor="emailWebhook">{t('settings.emailWebhook')}</Label>
                  <Input
                    id="emailWebhook"
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    value={settings.notifications.emailWebhookUrl}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailWebhookUrl: e.target.value }
                    })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
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
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="dayBeforeEmail"
                        checked={settings.notifications.enableDayBeforeEmail}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, enableDayBeforeEmail: checked as boolean }
                        })}
                      />
                      <Label htmlFor="dayBeforeEmail" className="text-sm">{t('settings.dayBeforeReminder')}</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sameDayEmail"
                        checked={settings.notifications.enableSameDayEmail}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, enableSameDayEmail: checked as boolean }
                        })}
                      />
                      <Label htmlFor="sameDayEmail" className="text-sm">{t('settings.sameDayReminder')}</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="emailTemplate">{t('settings.emailTemplate')}</Label>
                  <Textarea
                    id="emailTemplate"
                    placeholder={t('settings.emailTemplatePlaceholder')}
                    rows={4}
                    value={settings.notifications.emailTemplate}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, emailTemplate: e.target.value }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.emailTemplateHint')}
                  </p>
                </div>
              </div>

              {/* SMS Settings */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  {t('settings.smsZapier')}
                </h4>
                <div>
                  <Label htmlFor="smsWebhook">{t('settings.smsWebhook')}</Label>
                  <Input
                    id="smsWebhook"
                    placeholder="https://hooks.zapier.com/hooks/catch/..."
                    value={settings.notifications.smsWebhookUrl}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, smsWebhookUrl: e.target.value }
                    })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
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
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="sameDaySMS"
                        checked={settings.notifications.enableSameDaySMS}
                        onCheckedChange={(checked) => setSettings({
                          ...settings,
                          notifications: { ...settings.notifications, enableSameDaySMS: checked as boolean }
                        })}
                      />
                      <Label htmlFor="sameDaySMS" className="text-sm">{t('settings.sameDaySms')}</Label>
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="smsTemplate">{t('settings.smsTemplate')}</Label>
                  <Textarea
                    id="smsTemplate"
                    placeholder={t('settings.smsTemplatePlaceholder')}
                    rows={3}
                    value={settings.notifications.smsTemplate}
                    onChange={(e) => setSettings({
                      ...settings,
                      notifications: { ...settings.notifications, smsTemplate: e.target.value }
                    })}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {t('settings.smsTemplateHint')}
                  </p>
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p><strong>{t('settings.zapierHelpTitle')}</strong></p>
                <p>1. {t('settings.zapierHelp1')}</p>
                <p>2. {t('settings.zapierHelp2')}</p>
                <p>3. {t('settings.zapierHelp3')}</p>
                <p>4. {t('settings.zapierHelp4')}</p>
              </div>
            </CardContent>
          </Card>

          {/* Google Calendar Integration */}
          <GoogleCalendarSync />
        </TabsContent>

        {/* Data Management Tab */}
        <TabsContent value="data" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                {t('settings.dataTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button onClick={handleExport} variant="outline" className="flex-1">
                  <Download className="w-4 h-4 mr-2" />
                  {t('settings.export')}
                </Button>
                
                <div className="flex-1">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className="hidden"
                    id="import-file"
                  />
                  <Button asChild variant="outline" className="w-full">
                    <label htmlFor="import-file" className="cursor-pointer">
                      <Upload className="w-4 h-4 mr-2" />
                      {t('settings.import')}
                    </label>
                  </Button>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
                <p><strong>{t('settings.exportHelp')}</strong> {t('settings.exportHelpText')}</p>
                <p><strong>{t('settings.importHelp')}</strong> {t('settings.importHelpText')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api-health" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Server className="w-5 h-5 text-primary" />
                    {t('settings.apiHealthTitle')}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">{t('settings.apiHealthSubtitle')}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={loadApiHealth}
                  disabled={apiHealthLoading}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${apiHealthLoading ? 'animate-spin' : ''}`} />
                  {t('settings.apiHealthRefresh')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('settings.apiHealthStatus')}
                  </div>
                  <div className="mt-2">
                    <Badge variant={apiHealth?.ok ? 'default' : 'destructive'}>
                      {apiHealth?.ok ? t('settings.apiHealthOnline') : t('settings.apiHealthOffline')}
                    </Badge>
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('settings.apiHealthPatients')}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {apiHealth?.patientsCount ?? '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('settings.apiHealthAppointments')}
                  </div>
                  <div className="mt-2 text-2xl font-semibold text-foreground">
                    {apiHealth?.appointmentsCount ?? '—'}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t('settings.apiHealthLastChecked')}
                  </div>
                  <div className="mt-2 text-sm font-medium text-foreground break-words">
                    {lastHealthCheck ? new Date(lastHealthCheck).toLocaleString() : '—'}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-background p-4">
                  <Label>{t('settings.apiHealthEndpoint')}</Label>
                  <p className="mt-2 break-all rounded-lg bg-muted/40 px-3 py-2 font-mono text-sm text-foreground">
                    {apiHealthUrl}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background p-4">
                  <Label>{t('settings.apiHealthDataDir')}</Label>
                  <p className="mt-2 break-all rounded-lg bg-muted/40 px-3 py-2 font-mono text-sm text-foreground">
                    {apiHealth?.dataDir ?? '—'}
                  </p>
                </div>
              </div>

              {apiHealthError && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                  <strong>{t('settings.apiHealthErrorLabel')}</strong> {apiHealthError}
                </div>
              )}

              <div className="rounded-xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
                <p><strong>{t('settings.apiHealthHowItWorks')}</strong></p>
                <p>{t('settings.apiHealthHowItWorksText')}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Save Button - Always visible */}
        <Button onClick={handleSave} disabled={logoUploading} data-testid="save-settings-btn" className="w-full bg-gradient-to-r from-accent to-accent-hover">
          <Save className="w-4 h-4 mr-2" />
          {t('settings.save')}
        </Button>
      </Tabs>
    </div>
  );
}
