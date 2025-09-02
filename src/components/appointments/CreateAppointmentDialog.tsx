import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { CalendarIcon, Clock, User, Plus, UserPlus } from 'lucide-react';
import { Appointment, Patient } from '@/types/appointment';
import { appointmentsStorage, patientsStorage, settingsStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface CreateAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDate?: Date;
  onAppointmentCreated?: () => void;
}

export function CreateAppointmentDialog({ 
  open, 
  onOpenChange, 
  selectedDate,
  onAppointmentCreated 
}: CreateAppointmentDialogProps) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [showCreatePatient, setShowCreatePatient] = useState(false);
  const [patientFormData, setPatientFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    notes: ''
  });
  const [formData, setFormData] = useState({
    patientId: '',
    date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
    startTime: '09:00',
    duration: 60 as 30 | 60 | 120,
    type: 'consultation' as 'consultation' | 'follow-up' | 'procedure',
    notes: '',
    syncToGoogle: true
  });
  const { toast } = useToast();
  const [timeSlotMinutes, setTimeSlotMinutes] = useState<number>(30);


  useEffect(() => {
    const loadPatients = async () => {
      try {
        const data = await patientsStorage.getAll();
        setPatients(data);
      } catch (error) {
        console.error('Failed to load patients:', error);
        setPatients([]);
        toast({
          title: "Unable to load patients",
          description: "The data service isn't reachable. You can still add a new patient.",
          variant: "destructive",
        });
      }
    };
    if (open) {
      loadPatients();
    }
  }, [open, toast]);

  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({ ...prev, date: format(selectedDate, 'yyyy-MM-dd') }));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (open) {
      settingsStorage.get().then((s: any) => {
        setTimeSlotMinutes(typeof s?.timeSlotMinutes === 'number' ? s.timeSlotMinutes : 30);
      }).catch(() => setTimeSlotMinutes(30));
    }
  }, [open]);

  const calculateEndTime = (startTime: string, duration: number) => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    const endDate = new Date(startDate.getTime() + duration * 60000);
    return format(endDate, 'HH:mm');
  };

  const handleCreatePatient = async () => {
    if (!patientFormData.name || !patientFormData.email || !patientFormData.phone) {
      toast({
        title: "Error",
        description: "Please fill in all required patient fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const newPatient = await patientsStorage.add(patientFormData);
      
      // Refresh patients list
      const updatedPatients = await patientsStorage.getAll();
      setPatients(updatedPatients);
      
      // Auto-select the new patient
      setFormData({ ...formData, patientId: newPatient.id });
      
      // Reset patient form and hide it
      setPatientFormData({
        name: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        address: '',
        emergencyContact: '',
        notes: ''
      });
      setShowCreatePatient(false);
      
      toast({
        title: "Patient created",
        description: `${newPatient.name} has been added successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create patient",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId) {
      toast({
        title: "Error",
        description: "Please select a patient",
        variant: "destructive",
      });
      return;
    }

    const selectedPatient = patients.find(p => p.id === formData.patientId);
    if (!selectedPatient) return;

    const endTime = calculateEndTime(formData.startTime, formData.duration);

    try {
      await appointmentsStorage.add({
        patientId: formData.patientId,
        patientName: selectedPatient.name,
        date: formData.date,
        startTime: formData.startTime,
        endTime,
        duration: formData.duration,
        type: formData.type,
        status: 'scheduled',
        notes: formData.notes
      });

      // Sync to Google Calendar if enabled
      if (formData.syncToGoogle) {
        try {
          const appointment = {
            patientId: formData.patientId,
            patientName: selectedPatient.name,
            date: formData.date,
            startTime: formData.startTime,
            endTime,
            duration: formData.duration,
            type: formData.type,
            status: 'scheduled',
            notes: formData.notes
          };

          const response = await fetch('/api/google/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointment }),
          });
          
          if (response.ok) {
            toast({
              title: "Appointment created",
              description: `Appointment scheduled for ${selectedPatient.name} and synced to Google Calendar`,
            });
          } else {
            toast({
              title: "Partial Success",
              description: "Appointment created but failed to sync to Google Calendar",
            });
          }
        } catch (error) {
          toast({
            title: "Partial Success", 
            description: "Appointment created but failed to sync to Google Calendar",
          });
        }
      } else {
        toast({
          title: "Appointment created",
          description: `Appointment scheduled for ${selectedPatient.name}`,
        });
      }

      onAppointmentCreated?.();
      onOpenChange(false);
      
      // Reset form
      setFormData({
        patientId: '',
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
        startTime: '09:00',
        duration: 60,
        type: 'consultation',
        notes: '',
        syncToGoogle: true
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create appointment",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            Create Appointment & Patient
          </DialogTitle>
          <DialogDescription>
            Schedule a new appointment and manage patient information.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Left Side - Patient */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Patient
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCreatePatient(!showCreatePatient)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {showCreatePatient ? 'Select Existing' : 'Add New'}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showCreatePatient ? (
                <div className="space-y-2">
                  <Label htmlFor="patient">Select Patient *</Label>
                  <Select value={formData.patientId} onValueChange={(value) => setFormData({ ...formData, patientId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a patient" />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <div>
                              <div className="font-medium">{patient.name}</div>
                              <div className="text-xs text-muted-foreground">{patient.email}</div>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="patientName">Name *</Label>
                      <Input
                        id="patientName"
                        value={patientFormData.name}
                        onChange={(e) => setPatientFormData({ ...patientFormData, name: e.target.value })}
                        placeholder="Patient name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="patientEmail">Email *</Label>
                      <Input
                        id="patientEmail"
                        type="email"
                        value={patientFormData.email}
                        onChange={(e) => setPatientFormData({ ...patientFormData, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="patientPhone">Phone *</Label>
                      <Input
                        id="patientPhone"
                        value={patientFormData.phone}
                        onChange={(e) => setPatientFormData({ ...patientFormData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !patientFormData.dateOfBirth && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {patientFormData.dateOfBirth ? format(new Date(patientFormData.dateOfBirth), "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={patientFormData.dateOfBirth ? new Date(patientFormData.dateOfBirth) : undefined}
                            onSelect={(date) => setPatientFormData({ ...patientFormData, dateOfBirth: date ? format(date, 'yyyy-MM-dd') : '' })}
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="patientAddress">Address</Label>
                    <Input
                      id="patientAddress"
                      value={patientFormData.address}
                      onChange={(e) => setPatientFormData({ ...patientFormData, address: e.target.value })}
                      placeholder="123 Main St, City, State 12345"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">Emergency Contact</Label>
                    <Input
                      id="emergencyContact"
                      value={patientFormData.emergencyContact}
                      onChange={(e) => setPatientFormData({ ...patientFormData, emergencyContact: e.target.value })}
                      placeholder="Name & Phone"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="patientNotes">Notes</Label>
                    <Textarea
                      id="patientNotes"
                      value={patientFormData.notes}
                      onChange={(e) => setPatientFormData({ ...patientFormData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={2}
                    />
                  </div>
                  
                  <Button
                    type="button"
                    onClick={handleCreatePatient}
                    className="w-full bg-gradient-to-r from-primary to-medical-purple"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Patient
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right Side - Appointment */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-primary" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="startTime">Start Time *</Label>
                    <Input
                      id="startTime"
                      type="time"
                      step={timeSlotMinutes * 60}
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration</Label>
                    <Select value={formData.duration.toString()} onValueChange={(value) => setFormData({ ...formData, duration: Number(value) as 30 | 60 | 120 })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 hour</SelectItem>
                        <SelectItem value="120">2 hours</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as any })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointmentNotes">Appointment Notes</Label>
                  <Textarea
                    id="appointmentNotes"
                    placeholder="Additional notes for this appointment..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sync-google"
                    checked={formData.syncToGoogle}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncToGoogle: checked as boolean })}
                  />
                  <Label htmlFor="sync-google" className="text-sm">
                    Sync to Google Calendar
                  </Label>
                </div>

                <Separator />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    className="bg-gradient-to-r from-primary to-medical-blue"
                    disabled={!formData.patientId}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Create Appointment
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}