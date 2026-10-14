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

const isScheduledOnDate = (appointment: Appointment, isoDate: string) => {
  const start = new Date(appointment.startTime);
  return (
    Number.isFinite(start.getTime()) &&
    start.toISOString().split('T')[0] === isoDate &&
    appointment.status === 'scheduled'
  );
};

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
    return appointments.filter((app) => isScheduledOnDate(app, today));
  };

  const getTomorrowAppointments = async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    const appointments = await appointmentsStorage.getAll();
    return appointments.filter((app) => isScheduledOnDate(app, tomorrowStr));
  };

  const [todayCount, setTodayCount] = useState(0);
  const [tomorrowCount, setTomorrowCount] = useState(0);

  useEffect(() => {
    getTodayAppointments().then(apps => setTodayCount(apps.length));
    getTomorrowAppointments().then(apps => setTomorrowCount(apps.length));
  }, []);

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center gap-2 text-base font-semibold sm:text-lg">
          <Bell className="h-5 w-5 shrink-0 text-primary" />
          {t('notifications.managerTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-lg border border-border p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('notifications.today')}</p>
                <p className="text-xl font-bold text-foreground sm:text-2xl">{todayCount}</p>
              </div>
              <Clock className="h-6 w-6 shrink-0 text-blue-500 sm:h-8 sm:w-8" />
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 sm:p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('notifications.tomorrow')}</p>
                <p className="text-xl font-bold text-foreground sm:text-2xl">{tomorrowCount}</p>
              </div>
              <CheckCircle className="h-6 w-6 shrink-0 text-green-500 sm:h-8 sm:w-8" />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">{t('notifications.manualTitle')}</h4>
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
