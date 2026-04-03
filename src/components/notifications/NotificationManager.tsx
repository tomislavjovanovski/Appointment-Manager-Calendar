import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Send, Clock, CheckCircle } from 'lucide-react';
import { Appointment, Patient } from '@/types/appointment';
import { NotificationService } from './NotificationService';
import { appointmentsStorage, patientsStorage, settingsStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';

export function NotificationManager() {
  const { t } = useI18n();
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
        settings.notifications,
        settings.locale ?? 'en'
      );

      toast({
        title: t('notifications.processedTitle'),
        description: t('notifications.processedDesc'),
      });
    } catch (error) {
      toast({
        title: t('notifications.errorTitle'),
        description: t('notifications.errorDesc'),
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

  useEffect(() => {
    getTodayAppointments().then(apps => setTodayCount(apps.length));
    getTomorrowAppointments().then(apps => setTomorrowCount(apps.length));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          {t('notifications.managerTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('notifications.today')}</p>
                <p className="text-2xl font-bold text-foreground">{todayCount}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('notifications.tomorrow')}</p>
                <p className="text-2xl font-bold text-foreground">{tomorrowCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium">{t('notifications.manualTitle')}</h4>
          <p className="text-sm text-muted-foreground">
            {t('notifications.manualDesc')}
          </p>
          <Button
            onClick={handleSendScheduledNotifications}
            disabled={isLoading}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {isLoading ? t('notifications.sending') : t('notifications.send')}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <p><strong>{t('notifications.automationTip')}</strong> {t('notifications.automationText')}</p>
        </div>
      </CardContent>
    </Card>
  );
}