import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Settings, Clock, Calendar, Download, Upload, Save } from 'lucide-react';
import { AppointmentSettings } from '@/types/appointment';
import { settingsStorage, dataManagement } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

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
  const [settings, setSettings] = useState<AppointmentSettings>(() => settingsStorage.get());
  const { toast } = useToast();

  const handleSave = () => {
    settingsStorage.save(settings);
    toast({
      title: "Settings saved",
      description: "Your appointment settings have been updated successfully.",
    });
  };

  const handleExport = () => {
    const data = dataManagement.exportAll();
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
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        dataManagement.importAll(data);
        setSettings(settingsStorage.get());
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