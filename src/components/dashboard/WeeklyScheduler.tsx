import { useState, useEffect } from 'react';
import { Scheduler } from '@aldabil/react-scheduler';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, Plus, RotateCcw } from 'lucide-react';
import { format } from 'date-fns';
import { Appointment } from '@/types/appointment';
import { appointmentsStorage, settingsStorage } from '@/lib/storage';
import { GoogleCalendarSync } from './GoogleCalendarSync';
import { useToast } from '@/hooks/use-toast';

interface WeeklySchedulerProps {
  onCreateAppointment: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export function WeeklyScheduler({ onCreateAppointment, onAppointmentClick }: WeeklySchedulerProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [settings, setSettings] = useState<any>({
    startTime: '09:00',
    endTime: '17:00',
    timeSlotMinutes: 30
  });
  const [loading, setLoading] = useState(true);
  const [googleEvents, setGoogleEvents] = useState<any[]>([]);
  const [showGoogleSync, setShowGoogleSync] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      try {
        setLoading(true);
        const [appointmentsData, settingsData] = await Promise.all([
          appointmentsStorage.getAll().catch(() => []),
          settingsStorage.get().catch(() => ({
            startTime: '09:00',
            endTime: '17:00', 
            timeSlotMinutes: 30
          }))
        ]);
        
        if (isMounted) {
          setAppointments(appointmentsData);
          setSettings(settingsData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        if (isMounted) {
          setAppointments([]);
          setSettings({
            startTime: '09:00',
            endTime: '17:00',
            timeSlotMinutes: 30
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, []); // Only run once on mount

  const syncToGoogleCalendar = async (appointment: Appointment) => {
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
      }
    } catch (error) {
      toast({
        title: "Sync Failed",
        description: "Failed to sync appointment to Google Calendar",
        variant: "destructive",
      });
    }
  };

  // Convert appointments to scheduler events
  const appointmentEvents = appointments.map(apt => ({
    event_id: apt.id,
    title: `${apt.patientName} - ${apt.type}`,
    start: new Date(`${apt.date}T${apt.startTime}`),
    end: new Date(`${apt.date}T${apt.endTime}`),
    color: apt.status === 'scheduled' ? '#3b82f6' : 
           apt.status === 'completed' ? '#10b981' :
           apt.status === 'cancelled' ? '#ef4444' : '#f59e0b',
    appointment: apt
  }));

  // Convert Google Calendar events to scheduler events
  const googleCalendarEvents = googleEvents.map(event => ({
    event_id: `google-${event.id}`,
    title: event.summary || 'Google Calendar Event',
    start: new Date(event.start.dateTime || event.start.date),
    end: new Date(event.end.dateTime || event.end.date),
    color: '#9333ea', // Purple for Google events
    editable: false,
    google: true
  }));

  const events = [...appointmentEvents, ...googleCalendarEvents];

// Working hours
const startHour = parseInt(settings.startTime?.split(':')[0] || '9');
const endHour = parseInt(settings.endTime?.split(':')[0] || '17');
const step = typeof settings.timeSlotMinutes === 'number' ? settings.timeSlotMinutes : 30;

const handleEventClick = (event: any) => {
  if (event.google) {
    toast({
      title: "Google Calendar Event",
      description: "This is a Google Calendar event. Edit it in Google Calendar.",
    });
    return;
  }
  if (event.appointment) {
    onAppointmentClick(event.appointment);
  }
};

const handleCellClick = (start: Date, end: Date) => {
  console.log('Calendar cell clicked:', start, end);
  onCreateAppointment(start);
};

const handleEventDrop = async (
  _dragEvent: React.DragEvent<HTMLButtonElement>,
  _droppedOn: Date,
  updatedEvent: any,
  originalEvent: any
) => {
  const apt = originalEvent.appointment as Appointment;
  const newDate = format(updatedEvent.start, 'yyyy-MM-dd');
  const startTime = format(updatedEvent.start, 'HH:mm');
  const endTime = format(updatedEvent.end, 'HH:mm');
  try {
    await appointmentsStorage.update(apt.id, { date: newDate, startTime, endTime });
    // Reload data manually after successful update
    const updatedAppointments = await appointmentsStorage.getAll().catch(() => appointments);
    setAppointments(updatedAppointments);
    return { ...updatedEvent, appointment: { ...apt, date: newDate, startTime, endTime } };
  } catch (err) {
    console.error('Failed to update appointment on drop', err);
    return originalEvent; // Return original on error
  }
};

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <Clock className="w-8 h-8 mx-auto mb-2 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading scheduler...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-primary" />
            Weekly Schedule
          </h2>
          <p className="text-muted-foreground">
            Working hours: {settings.startTime || '09:00'} - {settings.endTime || '17:00'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowGoogleSync(!showGoogleSync)}
            variant="outline"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Google Calendar
          </Button>
          <Button
            onClick={() => onCreateAppointment(new Date())}
            className="bg-gradient-to-r from-primary to-primary-foreground"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </div>
      </div>

      {/* Scheduler */}
      <Card>
        <CardContent className="p-0">
          <div className="h-[600px]">
            <Scheduler
              view="week"
              events={events}
              selectedDate={new Date()}
              onSelectedDateChange={() => {}}
              onEventClick={handleEventClick}
              onCellClick={handleCellClick}
              hourFormat="24"
              editable
              disableViewer
              customEditor={() => null}
              onEventDrop={handleEventDrop}
              week={{
                weekDays: [0, 1, 2, 3, 4, 5, 6],
                weekStartOn: 1, // Monday
                startHour: startHour as any,
                endHour: endHour as any,
                step: step as any,
                navigation: true,
                disableGoToDay: false
              }}
              translations={{
                navigation: {
                  month: "Month",
                  week: "Week",
                  day: "Day",
                  today: "Today",
                  agenda: "Agenda"
                },
                form: {
                  addTitle: "Add Event",
                  editTitle: "Edit Event",
                  confirm: "Confirm",
                  delete: "Delete",
                  cancel: "Cancel"
                },
                event: {
                  title: "Title",
                  subtitle: "Subtitle", 
                  start: "Start",
                  end: "End",
                  allDay: "All Day"
                },
                moreEvents: "More...",
                noDataToDisplay: "No appointments scheduled",
                loading: "Loading..."
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Google Calendar Integration */}
      {showGoogleSync && <GoogleCalendarSync />}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-6 text-sm flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span>Scheduled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>Cancelled</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-500"></div>
              <span>No Show</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-500"></div>
              <span>Google Calendar</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}