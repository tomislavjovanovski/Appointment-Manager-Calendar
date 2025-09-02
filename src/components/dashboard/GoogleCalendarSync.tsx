import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle, ExternalLink, Settings, RotateCcw, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GoogleCalendarEvent {
  id: string;
  summary: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  description?: string;
}

export function GoogleCalendarSync() {
  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const response = await fetch('/api/google/status');
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
        title: "Missing Credentials",
        description: "Please enter both Client ID and Client Secret",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/google/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId, clientSecret }),
      });

      const data = await response.json();
      if (data.authUrl) {
        window.open(data.authUrl, '_blank');
        toast({
          title: "Authorization Required",
          description: "Complete the authorization in the new window, then check connection status",
        });
      }
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Failed to initiate Google Calendar connection",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('/api/google/disconnect', { method: 'DELETE' });
      setIsConnected(false);
      setGoogleEvents([]);
      toast({
        title: "Disconnected",
        description: "Google Calendar has been disconnected",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to disconnect Google Calendar",
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
        `/api/google/events?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
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
      const response = await fetch('/api/google/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appointment }),
      });

      if (response.ok) {
        toast({
          title: "Synced to Google Calendar",
          description: `Appointment for ${appointment.patientName} has been added to Google Calendar`,
        });
        fetchGoogleEvents();
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync appointment to Google Calendar",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Google Calendar Integration
            {isConnected ? (
              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="w-3 h-3 mr-1" />
                Not Connected
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <h4 className="font-medium mb-2">Setup Instructions:</h4>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Cloud Console <ExternalLink className="w-3 h-3 inline" /></a></li>
                  <li>Create a new project or select existing one</li>
                  <li>Enable the Google Calendar API</li>
                  <li>Create OAuth 2.0 credentials</li>
                  <li>Add http://localhost:3000/api/google/callback as redirect URI</li>
                  <li>Copy Client ID and Client Secret below</li>
                </ol>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientId">Google Client ID</Label>
                  <Input
                    id="clientId"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="xxx.apps.googleusercontent.com"
                  />
                </div>
                <div>
                  <Label htmlFor="clientSecret">Google Client Secret</Label>
                  <Input
                    id="clientSecret"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="GOCSPX-xxx"
                  />
                </div>
              </div>
              
              <Button onClick={handleConnect} disabled={loading} className="w-full">
                {loading ? 'Connecting...' : 'Connect to Google Calendar'}
              </Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button onClick={fetchGoogleEvents} disabled={syncing} variant="outline">
                  <RotateCcw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Refresh Events'}
                </Button>
                <Button onClick={checkConnectionStatus} variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Check Status
                </Button>
              </div>
              <Button onClick={handleDisconnect} variant="destructive">
                Disconnect
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Google Calendar Events */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Google Calendar Events</CardTitle>
          </CardHeader>
          <CardContent>
            {googleEvents.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No events found in your Google Calendar
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
                    <Badge variant="outline">Google</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}