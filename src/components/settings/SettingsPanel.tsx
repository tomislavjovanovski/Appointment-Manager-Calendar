import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Settings, Clock, Calendar, Download, Upload, Save, Mail, MessageSquare, Bell } from 'lucide-react';
import { AppointmentSettings } from '@/types/appointment';
import { settingsStorage, dataManagement } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const DAYS_OF_WEEK = [
  { id: 0, name: 'Sunday', short: 'Sun' },
  { id: 1, name: 'Monday', short: 'Mon' },
  { id: 2, name: 'Tuesday', short: 'Tue' },
  { id: 3, name: 'Wednesday', short: 'Wed' },
  { id: 4, name: 'Thursday', short: 'Thu' },
  { id: 5, name: 'Friday', short: 'Fri' },
  { id: 6, name: 'Saturday', short: 'Sat' },
];

export function SettingsPanel() {
  const [settings, setSettings] = useState<AppointmentSettings>({
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
      toast({
        title: "Settings saved",
        description: "Your appointment settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "Failed to save settings. Please try again.",
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
      title: "Data exported",
      description: "Your backup file has been downloaded successfully.",
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
        toast({
          title: "Data imported",
          description: "Your data has been restored successfully.",
        });
      } catch (error) {
        toast({
          title: "Import failed",
          description: "The file format is invalid or corrupted.",
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
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          Settings
        </h2>
        <p className="text-muted-foreground">Configure your appointment system</p>
      </div>

      <div className="grid gap-6">
        {/* Working Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Working Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={settings.startTime}
                  onChange={(e) => setSettings({ ...settings, startTime: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="endTime">End Time</Label>
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
                <Label htmlFor="breakTime">Break Time (minutes)</Label>
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
                <Label>Time Slot Interval</Label>
                <Select
                  value={String(settings.timeSlotMinutes ?? 30)}
                  onValueChange={(value) => setSettings({ ...settings, timeSlotMinutes: parseInt(value) as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
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
              Working Days
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
                    <div className="text-xs font-medium">{day.short}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Appointment Sizes */}
        <Card>
          <CardHeader>
            <CardTitle>Appointment Duration Types</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(settings.appointmentSizes).map(([key, size]) => (
              <div key={key} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div>
                  <div className="font-medium">{size.label}</div>
                  <div className="text-sm text-muted-foreground">{size.duration} minutes</div>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary">
                  {size.duration}min
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notification Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Zapier Webhooks */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email Notifications (Zapier)
              </h4>
              <div>
                <Label htmlFor="emailWebhook">Email Webhook URL</Label>
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
                  <Label htmlFor="emailTime">Notification Time</Label>
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
                  <Label>Email Settings</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="dayBeforeEmail"
                      checked={settings.notifications.enableDayBeforeEmail}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, enableDayBeforeEmail: checked as boolean }
                      })}
                    />
                    <Label htmlFor="dayBeforeEmail" className="text-sm">Day before reminder</Label>
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
                    <Label htmlFor="sameDayEmail" className="text-sm">Same day reminder</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="emailTemplate">Email HTML Template (Optional)</Label>
                <Textarea
                  id="emailTemplate"
                  placeholder="Use template variables: PATIENT_NAME, DATE, TIME, TYPE, DURATION, NOTES"
                  rows={4}
                  value={settings.notifications.emailTemplate}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, emailTemplate: e.target.value }
                  })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Leave empty to use default template. HTML is supported.
                </p>
              </div>
            </div>

            {/* SMS Settings */}
            <div className="space-y-4 pt-4 border-t">
              <h4 className="font-medium flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                SMS Notifications (Zapier + Twilio)
              </h4>
              <div>
                <Label htmlFor="smsWebhook">SMS Webhook URL</Label>
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
                  <Label htmlFor="smsTime">SMS Time</Label>
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
                  <Label>SMS Settings</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sameDaySMS"
                      checked={settings.notifications.enableSameDaySMS}
                      onCheckedChange={(checked) => setSettings({
                        ...settings,
                        notifications: { ...settings.notifications, enableSameDaySMS: checked as boolean }
                      })}
                    />
                    <Label htmlFor="sameDaySMS" className="text-sm">Same day SMS</Label>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="smsTemplate">SMS Message Template</Label>
                <Textarea
                  id="smsTemplate"
                  placeholder="Hi PATIENT_NAME, reminder: You have a TYPE appointment today at TIME."
                  rows={3}
                  value={settings.notifications.smsTemplate}
                  onChange={(e) => setSettings({
                    ...settings,
                    notifications: { ...settings.notifications, smsTemplate: e.target.value }
                  })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use placeholders: PATIENT_NAME, DATE, TIME, TYPE
                </p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p><strong>Setup Instructions:</strong></p>
              <p>1. Create Zaps in Zapier with Webhook triggers</p>
              <p>2. Connect email service (Gmail, SendGrid) for emails</p>
              <p>3. Connect Twilio for SMS (set to Macedonian numbers)</p>
              <p>4. Paste the webhook URLs above</p>
            </div>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={handleExport} variant="outline" className="flex-1">
                <Download className="w-4 h-4 mr-2" />
                Export Data
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
                    Import Data
                  </label>
                </Button>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
              <p><strong>Export:</strong> Download all your patients, appointments, and settings as a backup file.</p>
              <p><strong>Import:</strong> Restore data from a previously exported backup file.</p>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button onClick={handleSave} className="w-full bg-gradient-to-r from-accent to-accent-hover">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    </div>
  );
}