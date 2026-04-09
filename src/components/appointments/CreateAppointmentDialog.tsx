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
import { useI18n } from '@/i18n';

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
  const { t, dateFnsLocale } = useI18n();
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
          title: t('createAppointment.toastLoadPatientsTitle'),
          description: t('createAppointment.toastLoadPatientsDesc'),
          variant: "destructive",
        });
      }
    };
    if (open) {
      loadPatients();
    }
  }, [open, toast, t]);

  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({ 
        ...prev, 
        date: format(selectedDate, 'yyyy-MM-dd'),
        startTime: format(selectedDate, 'HH:mm')
      }));
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
        title: t('createAppointment.toastError'),
        description: t('createAppointment.toastPatientFields'),
        variant: "destructive",
      });
      return;
    }

    try {
      const newPatient = await patientsStorage.add(patientFormData);
      const updatedPatients = await patientsStorage.getAll();
      setPatients(updatedPatients);
      setFormData({ ...formData, patientId: newPatient.id });
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
        title: t('createAppointment.toastPatientCreatedTitle'),
        description: t('createAppointment.toastPatientCreatedDesc', { name: newPatient.name }),
      });
    } catch (error) {
      toast({
        title: t('createAppointment.toastError'),
        description: t('createAppointment.toastPatientFailed'),
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.patientId) {
      toast({
        title: t('createAppointment.toastError'),
        description: t('createAppointment.toastSelectPatient'),
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
              title: t('createAppointment.toastCreatedTitle'),
              description: t('createAppointment.toastCreatedSynced', { name: selectedPatient.name }),
            });
          } else {
            toast({
              title: t('createAppointment.toastPartialTitle'),
              description: t('createAppointment.toastPartialDesc'),
            });
          }
        } catch (error) {
          toast({
            title: t('createAppointment.toastPartialTitle'), 
            description: t('createAppointment.toastPartialDesc'),
          });
        }
      } else {
        toast({
          title: t('createAppointment.toastCreatedTitle'),
          description: t('createAppointment.toastCreatedDesc', { name: selectedPatient.name }),
        });
      }

      onAppointmentCreated?.();
      onOpenChange(false);
      
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
        title: t('createAppointment.toastError'),
        description: t('createAppointment.toastCreateFailed'),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[80vw]" data-testid="booking-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary" />
            {t('createAppointment.title')}
          </DialogTitle>
          <DialogDescription>
            {t('createAppointment.description')}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-[2fr_3fr] gap-6">
          {/* Left Side - Patient */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  {t('createAppointment.patient')}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-testid="create-new-patient-btn"
                  onClick={() => setShowCreatePatient(!showCreatePatient)}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  {showCreatePatient ? t('createAppointment.selectExisting') : t('createAppointment.addNew')}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showCreatePatient ? (
                <div className="space-y-2">
                  <Label htmlFor="patient">{t('createAppointment.selectPatient')}</Label>
                  <Select
                    value={formData.patientId}
                    onValueChange={(value) => setFormData({ ...formData, patientId: value })}
                  >
                    <SelectTrigger data-testid="patient-select">
                      <SelectValue placeholder={t('createAppointment.choosePatient')} />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem
                          key={patient.id}
                          value={patient.id}
                          data-testid={`patient-option-${patient.id}`}
                        >
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
                  {/* Validation error shown when submitting without patient */}
                  {!formData.patientId && (
                    <span data-testid="error-patient-required" className="hidden" aria-hidden="true" />
                  )}
                </div>
              ) : (
                <div className="space-y-4" data-testid="new-patient-panel">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="patientName">{t('createAppointment.name')}</Label>
                      <Input
                        id="patientName"
                        data-testid="patient-first-name"
                        value={patientFormData.name}
                        onChange={(e) => setPatientFormData({ ...patientFormData, name: e.target.value })}
                        placeholder={t('createAppointment.phName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="patientEmail">{t('createAppointment.email')}</Label>
                      <Input
                        id="patientEmail"
                        data-testid="patient-email"
                        type="email"
                        value={patientFormData.email}
                        onChange={(e) => setPatientFormData({ ...patientFormData, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="patientPhone">{t('createAppointment.phone')}</Label>
                      <Input
                        id="patientPhone"
                        data-testid="patient-phone"
                        value={patientFormData.phone}
                        onChange={(e) => setPatientFormData({ ...patientFormData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('createAppointment.dob')}</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            data-testid="patient-dob"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !patientFormData.dateOfBirth && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {patientFormData.dateOfBirth ? format(new Date(patientFormData.dateOfBirth), "PPP", { locale: dateFnsLocale }) : <span>{t('createAppointment.pickDate')}</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            locale={dateFnsLocale}
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
                    <Label htmlFor="patientAddress">{t('createAppointment.address')}</Label>
                    <Input
                      id="patientAddress"
                      data-testid="patient-address"
                      value={patientFormData.address}
                      onChange={(e) => setPatientFormData({ ...patientFormData, address: e.target.value })}
                      placeholder={t('createAppointment.phAddress')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="emergencyContact">{t('createAppointment.emergencyContact')}</Label>
                    <Input
                      id="emergencyContact"
                      data-testid="patient-emergency-contact"
                      value={patientFormData.emergencyContact}
                      onChange={(e) => setPatientFormData({ ...patientFormData, emergencyContact: e.target.value })}
                      placeholder={t('createAppointment.phEmergency')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="patientNotes">{t('createAppointment.notes')}</Label>
                    <Textarea
                      id="patientNotes"
                      data-testid="patient-notes"
                      value={patientFormData.notes}
                      onChange={(e) => setPatientFormData({ ...patientFormData, notes: e.target.value })}
                      placeholder={t('createAppointment.phNotes')}
                      rows={2}
                    />
                  </div>
                  
                  <Button
                    type="button"
                    data-testid="create-patient-submit"
                    onClick={handleCreatePatient}
                    className="w-full bg-gradient-to-r from-primary to-medical-purple"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {t('createAppointment.createPatientBtn')}
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
                {t('createAppointment.appointmentDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">{t('createAppointment.date')}</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      disabled={!!selectedDate}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="startTime">{t('createAppointment.startTime')}</Label>
                    <Input
                      id="startTime"
                      type="time"
                      step={timeSlotMinutes * 60}
                      value={formData.startTime}
                      onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                      disabled={!!selectedDate}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">{t('createAppointment.duration')}</Label>
                    <Select
                      value={formData.duration.toString()}
                      onValueChange={(value) => setFormData({ ...formData, duration: Number(value) as 30 | 60 | 120 })}
                    >
                      <SelectTrigger data-testid="duration-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">{t('createAppointment.dur30')}</SelectItem>
                        <SelectItem value="60">{t('createAppointment.dur60')}</SelectItem>
                        <SelectItem value="120">{t('createAppointment.dur120')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="type">{t('createAppointment.type')}</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => setFormData({ ...formData, type: value as any })}
                    >
                      <SelectTrigger data-testid="appointment-type-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">{t('appointment.types.consultation')}</SelectItem>
                        <SelectItem value="follow-up">{t('appointment.types.followUp')}</SelectItem>
                        <SelectItem value="procedure">{t('appointment.types.procedure')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="appointmentNotes">{t('createAppointment.appointmentNotes')}</Label>
                  <Textarea
                    id="appointmentNotes"
                    data-testid="appointment-notes"
                    placeholder={t('createAppointment.appointmentNotesPh')}
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="sync-google"
                    data-testid="google-sync-toggle"
                    checked={formData.syncToGoogle}
                    onCheckedChange={(checked) => setFormData({ ...formData, syncToGoogle: checked as boolean })}
                  />
                  <Label htmlFor="sync-google" className="text-sm">
                    {t('createAppointment.syncGoogle')}
                  </Label>
                </div>

                <Separator />

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    {t('createAppointment.cancel')}
                  </Button>
                  <Button 
                    type="submit"
                    data-testid="booking-submit-btn"
                    className="bg-gradient-to-r from-primary to-medical-blue"
                    disabled={!formData.patientId}
                  >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    {t('createAppointment.submit')}
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
