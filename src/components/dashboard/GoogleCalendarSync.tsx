import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, ExternalLink, Settings, RotateCcw, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { buildApiUrl } from '@/lib/storage';

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
}

export function GoogleCalendarSync() {
  const { t } = useI18n();
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch(buildApiUrl('/google/status'));
      const data = await response.json();
      setIsConnected(data.connected);
      if (data.connected) {
        fetchGoogleEvents();
      }
    } catch (error) {
      console.error('Failed to check Google Calendar status:', error);
    }
  };

  const handleConnect = async () => {
    if (!clientId || !clientSecret) {
      toast({
        title: t('google.toastMissingCredsTitle'),
        description: t('google.toastMissingCredsDesc'),
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/google/auth'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret }),
      });

      const data = await response.json();
      if (data.authUrl) {
        window.open(data.authUrl, '_blank');
        toast({
          title: t('google.toastAuthTitle'),
          description: t('google.toastAuthDesc'),
        });
      }
    } catch (error) {
      toast({
        title: t('google.toastConnectFailedTitle'),
        description: t('google.toastConnectFailedDesc'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(buildApiUrl('/google/disconnect'), { method: 'DELETE' });
      setIsConnected(false);
      setGoogleEvents([]);
      toast({
        title: t('google.toastDisconnectedTitle'),
        description: t('google.toastDisconnectedDesc'),
      });
    } catch (error) {
      toast({
        title: t('google.toastDisconnectErrTitle'),
        description: t('google.toastDisconnectErrDesc'),
        variant: "destructive",
      });
    }
  };

  const fetchGoogleEvents = async () => {
    setSyncing(true);
    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 30); // Next 30 days

      const response = await fetch(
        `${buildApiUrl('/google/events')}?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      
      if (response.ok) {
        const events = await response.json();
        setGoogleEvents(events);
      }
    } catch (error) {
      console.error('Failed to fetch Google Calendar events:', error);
    } finally {
      setSyncing(false);
    }
  };

  const syncAppointmentToGoogle = async (appointment: any) => {
    try {
      const response = await fetch(buildApiUrl('/google/events'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment }),
      });

      if (response.ok) {
        toast({
          title: t('toast.syncedGoogleTitle'),
          description: t('toast.syncedGoogleDesc', { name: appointment.patientName }),
        });
        fetchGoogleEvents();
      }
    } catch (error) {
      toast({
        title: t('toast.syncFailedTitle'),
        description: t('toast.syncFailedDesc'),
        variant: "destructive",
      });
    }
  };

  return (
    <fieldset disabled className="min-w-0 space-y-4 opacity-60 sm:space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base font-semibold sm:text-lg">
            <Calendar className="h-5 w-5 shrink-0 text-primary" />
            {t('google.title')}
            {isConnected ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                <CheckCircle className="w-3 h-3 mr-1" />
                {t('google.connected')}
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="w-3 h-3 mr-1" />
                {t('google.notConnected')}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          {!isConnected ? (
            <div className="space-y-4">
              <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950 sm:p-4">
                <h4 className="font-medium mb-2">{t('google.setupTitle')}</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>
                    {t('google.step1Prefix')}{' '}
                    <span className="text-primary">
                      {t('google.consoleName')} <ExternalLink className="w-3 h-3 inline" />
                    </span>
                  </li>
                  <li>{t('google.step2')}</li>
                  <li>{t('google.step3')}</li>
                  <li>{t('google.step4')}</li>
                  <li>{t('google.step5')}</li>
                  <li>{t('google.step6')}</li>
                </ol>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientId">{t('google.clientId')}</Label>
                  <Input
                    id="clientId"
                    disabled
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="xxx.apps.googleusercontent.com"
                  />
                </div>
                <div>
                  <Label htmlFor="clientSecret">{t('google.clientSecret')}</Label>
                  <Input
                    id="clientSecret"
                    disabled
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="GOCSPX-xxx"
                  />
                </div>
              </div>
              
              <Button onClick={handleConnect} disabled className="w-full">
                {loading ? t('google.connecting') : t('google.connect')}
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={fetchGoogleEvents} disabled variant="outline">
                  <RotateCcw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? t('google.syncing') : t('google.refreshEvents')}
                </Button>
                <Button onClick={checkConnectionStatus} disabled variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  {t('google.checkStatus')}
                </Button>
              </div>
              <Button onClick={handleDisconnect} disabled variant="destructive">
                {t('google.disconnect')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Calendar Events */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>{t('google.recentEvents')}</CardTitle>
          </CardHeader>
          <CardContent>
            {googleEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                {t('google.noEvents')}
              </p>
            ) : (
              <div className="space-y-2">
                {googleEvents.slice(0, 10).map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <h4 className="font-medium">{event.summary}</h4>
                      <p className="text-sm text-muted-foreground">
                        {event.start.dateTime ? 
                          new Date(event.start.dateTime).toLocaleString() :
                          new Date(event.start.date!).toLocaleDateString()
                        }
                      </p>
                    </div>
                    <Badge variant="outline">{t('google.badge')}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </fieldset>
  );
}
