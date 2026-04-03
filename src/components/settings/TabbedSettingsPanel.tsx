import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Clock, Calendar, Download, Upload, Save, Mail, MessageSquare, Bell, Puzzle, Database } from 'lucide-react';
import { AppointmentSettings } from '@/types/appointment';
import { settingsStorage, dataManagement } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GoogleCalendarSync } from '@/components/dashboard/GoogleCalendarSync';
import { NotificationManager } from '@/components/notifications/NotificationManager';
import { useI18n } from '@/i18n';
import type { AppLocale } from '@/i18n/types';

const DAYS_OF_WEEK = [
  { id: 0, shortKey: 'sun' as const },
  { id: 1, shortKey: 'mon' as const },
  { id: 2, shortKey: 'tue' as const },
  { id: 3, shortKey: 'wed' as const },
  { id: 4, shortKey: 'thu' as const },
  { id: 5, shortKey: 'fri' as const },
  { id: 6, shortKey: 'sat' as const },
];

export function TabbedSettingsPanel() {
  const { t, setLocale } = useI18n();
  const [settings, setSettings] = useState<AppointmentSettings>({
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
  const { toast } = useToast();
  
  useEffect(() => {
    const loadSettings = async () => {
      const data = await settingsStorage.get();
      setSettings(data);
    };
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      await settingsStorage.save(settings);
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

  return (
    <div className="space-y-6">
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
        <TabsList className="grid h-11 w-full grid-cols-3 gap-1 rounded-xl border border-border/60 bg-muted/40 p-1 shadow-sm">
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
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t('settings.langEnglish')}</SelectItem>
                  <SelectItem value="mk">{t('settings.langMacedonian')}</SelectItem>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">{t('settings.startTime')}</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={settings.startTime}
                    onChange={(e) => setSettings({ ...settings, startTime: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">{t('settings.endTime')}</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={settings.endTime}
                    onChange={(e) => setSettings({ ...settings, endTime: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="breakTime">{t('settings.breakTime')}</Label>
                  <Input
                    id="breakTime"
                    type="number"
                    min="0"
                    max="60"
                    value={settings.breakTime}
                    onChange={(e) => setSettings({ ...settings, breakTime: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <Label>{t('settings.timeSlotInterval')}</Label>
                  <Select
                    value={String(settings.timeSlotMinutes ?? 30)}
                    onValueChange={(value) => setSettings({ ...settings, timeSlotMinutes: parseInt(value) as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">{t('settings.slot15')}</SelectItem>
                      <SelectItem value="30">{t('settings.slot30')}</SelectItem>
                      <SelectItem value="60">{t('settings.slot60')}</SelectItem>
                    </SelectContent>
                  </Select>
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
            </CardContent>
          </Card>

          {/* Appointment Sizes */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.appointmentDurationTypes')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(settings.appointmentSizes).map(([key, size]) => {
                const labelKey =
                  key === 'half' ? 'settings.sizeHalf' : key === 'full' ? 'settings.sizeFull' : 'settings.sizeDouble';
                return (
                <div key={key} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div>
                    <div className="font-medium">{t(labelKey)}</div>
                    <div className="text-sm text-muted-foreground">{t('settings.minutes', { n: size.duration })}</div>
                  </div>
                  <Badge variant="outline" className="bg-primary/10 text-primary">
                    {t('settings.minutesShort', { n: size.duration })}
                  </Badge>
                </div>
              );
              })}
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
                    <Input
                      id="emailTime"
                      type="time"
                      value={settings.notifications.emailNotificationTime}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, emailNotificationTime: e.target.value }
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
                    <Input
                      id="smsTime"
                      type="time"
                      value={settings.notifications.smsNotificationTime}
                      onChange={(e) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, smsNotificationTime: e.target.value }
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

        {/* Save Button - Always visible */}
        <Button onClick={handleSave} className="w-full bg-gradient-to-r from-accent to-accent-hover">
          <Save className="w-4 h-4 mr-2" />
          {t('settings.save')}
        </Button>
      </Tabs>
    </div>
  );
}