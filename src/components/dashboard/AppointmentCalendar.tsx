import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Plus, User } from 'lucide-react';
import { format, isSameDay } from 'date-fns';
import { Appointment } from '@/types/appointment';
import { appointmentsStorage } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface AppointmentCalendarProps {
  onCreateAppointment: (date: Date) => void;
  onAppointmentClick: (appointment: Appointment) => void;
}

export function AppointmentCalendar({ onCreateAppointment, onAppointmentClick }: AppointmentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [appointments] = useState(() => appointmentsStorage.getAll());
  
  const selectedDateAppointments = appointments.filter(apt => 
    isSameDay(new Date(apt.date), selectedDate)
  ).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const getDurationColor = (duration: number) => {
    switch (duration) {
      case 30: return 'bg-accent';
      case 60: return 'bg-primary';
      case 120: return 'bg-medical-orange';
      default: return 'bg-muted';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-primary';
      case 'completed': return 'bg-accent';
      case 'cancelled': return 'bg-destructive';
      case 'no-show': return 'bg-warning';
      default: return 'bg-muted';
    }
  };

  const hasAppointments = (date: Date) => {
    return appointments.some(apt => isSameDay(new Date(apt.date), date));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendar */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Calendar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => date && setSelectedDate(date)}
            className="w-full"
            modifiers={{
              hasAppointments: (date) => hasAppointments(date)
            }}
            modifiersStyles={{
              hasAppointments: {
                fontWeight: 'bold',
                backgroundColor: 'hsl(var(--primary) / 0.1)',
                color: 'hsl(var(--primary))'
              }
            }}
          />
          <Button 
            onClick={() => onCreateAppointment(selectedDate)}
            className="w-full mt-4 bg-gradient-to-r from-primary to-medical-purple hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Appointment
          </Button>
        </CardContent>
      </Card>

      {/* Selected Date Appointments */}
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{format(selectedDate, 'EEEE, MMMM d, yyyy')}</span>
            <Badge variant="outline" className="text-xs">
              {selectedDateAppointments.length} appointments
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedDateAppointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No appointments scheduled</p>
                <p className="text-sm">Click "New Appointment" to add one</p>
              </div>
            ) : (
              selectedDateAppointments.map((appointment) => (
                <div
                  key={appointment.id}
                  onClick={() => onAppointmentClick(appointment)}
                  className="p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{appointment.patientName}</span>
                    </div>
                    <Badge 
                      className={cn(
                        'text-xs text-white',
                        getStatusColor(appointment.status)
                      )}
                    >
                      {appointment.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {appointment.startTime} - {appointment.endTime}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        'text-xs',
                        getDurationColor(appointment.duration)
                      )}
                    >
                      {appointment.duration}min
                    </Badge>
                  </div>
                  {appointment.notes && (
                    <p className="text-xs text-muted-foreground mt-1 truncate">
                      {appointment.notes}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}