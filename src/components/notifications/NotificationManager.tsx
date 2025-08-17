import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, Clock, CheckCircle } from 'lucide-react';
import { Appointment, Patient } from '@/types/appointment';
import { NotificationService } from './NotificationService';
import { appointmentsStorage, patientsStorage, settingsStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

export function NotificationManager() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSendScheduledNotifications = async () => {
    setIsLoading(true);
    try {
      const appointments = await appointmentsStorage.getAll();
      const patients = await patientsStorage.getAll();
      const settings = await settingsStorage.get();

      const notificationService = new NotificationService(toast);
      await notificationService.checkAndSendScheduledNotifications(
        appointments,
        patients,
        settings.notifications
      );

      toast({
        title: "Notifications Processed",
        description: "All scheduled notifications have been processed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process notifications.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTodayAppointments = async () => {
    const today = new Date().toISOString().split('T')[0];
    const appointments = await appointmentsStorage.getAll();
    return appointments.filter(app => app.date === today && app.status === 'scheduled');
  };

  const getTomorrowAppointments = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const appointments = await appointmentsStorage.getAll();
    return appointments.filter(app => app.date === tomorrowStr && app.status === 'scheduled');
  };

  const [todayCount, setTodayCount] = useState(0);
  const [tomorrowCount, setTomorrowCount] = useState(0);

  // Load counts on mount
  useState(() => {
    getTodayAppointments().then(apps => setTodayCount(apps.length));
    getTomorrowAppointments().then(apps => setTomorrowCount(apps.length));
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Notification Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Appointments</p>
                <p className="text-2xl font-bold text-foreground">{todayCount}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tomorrow's Appointments</p>
                <p className="text-2xl font-bold text-foreground">{tomorrowCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">Manual Notification Trigger</h4>
          <p className="text-sm text-muted-foreground">
            Send notifications for today's and tomorrow's appointments based on your settings.
          </p>
          <Button
            onClick={handleSendScheduledNotifications}
            disabled={isLoading}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {isLoading ? 'Sending Notifications...' : 'Send Scheduled Notifications'}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p><strong>Automation Tip:</strong> You can set up a scheduled Zap in Zapier to call this function automatically at your configured notification times.</p>
        </div>
      </CardContent>
    </Card>
  );
}