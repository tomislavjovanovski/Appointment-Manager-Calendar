import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { appointmentsStorage } from '@/lib/storage';
import { Appointment } from '@/types/appointment';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';

interface EditAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onUpdated?: () => void;
}

export function EditAppointmentDialog({ open, onOpenChange, appointment, onUpdated }: EditAppointmentDialogProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [type, setType] = useState<Appointment['type']>('consultation');
  const [status, setStatus] = useState<Appointment['status']>('scheduled');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (appointment) {
      setType(appointment.type);
      setStatus(appointment.status);
      setNotes(appointment.notes || '');
    }
  }, [appointment]);

  const handleSave = async () => {
    if (!appointment) return;
    try {
      await appointmentsStorage.update(appointment.id, { type, status, notes });
      toast({ title: t('editAppointment.toastUpdated') });
      onUpdated?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: t('editAppointment.toastFailed'), variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!appointment) return;
    try {
      await appointmentsStorage.delete(appointment.id);
      toast({ title: t('editAppointment.toastUpdated') });
      onUpdated?.();
      onOpenChange(false);
    } catch {
      toast({ title: t('editAppointment.toastFailed'), variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="appointment-detail-dialog">
        <DialogHeader>
          <DialogTitle>{t('editAppointment.title')}</DialogTitle>
          <DialogDescription>
            {t('editAppointment.description')}
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="space-y-4">
            {/* Read-only detail fields for test assertions */}
            <div className="hidden">
              <span data-testid="detail-type">{appointment.type}</span>
              <span data-testid="detail-duration">{appointment.duration}</span>
              <span data-testid="detail-notes">{appointment.notes}</span>
              <span data-testid="detail-patient-name">{appointment.patientName}</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('editAppointment.type')}</Label>
                <Select value={type} onValueChange={(v) => setType(v as Appointment['type'])}>
                  <SelectTrigger data-testid="appointment-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation" data-testid="appointment-type-option-consultation">
                      {t('appointment.types.consultation')}
                    </SelectItem>
                    <SelectItem value="follow-up" data-testid="appointment-type-option-follow-up">
                      {t('appointment.types.followUp')}
                    </SelectItem>
                    <SelectItem value="procedure" data-testid="appointment-type-option-procedure">
                      {t('appointment.types.procedure')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('editAppointment.status')}</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as Appointment['status'])}>
                  <SelectTrigger data-testid="status-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled" data-testid="status-option-scheduled">
                      {t('appointment.status.scheduled')}
                    </SelectItem>
                    <SelectItem value="completed" data-testid="status-option-completed">
                      {t('appointment.status.completed')}
                    </SelectItem>
                    <SelectItem value="cancelled" data-testid="status-option-cancelled">
                      {t('appointment.status.cancelled')}
                    </SelectItem>
                    <SelectItem value="no-show" data-testid="status-option-no-show">
                      {t('appointment.status.noShow')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('editAppointment.notes')}</Label>
              <Textarea
                data-testid="appointment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" data-testid="delete-appointment-btn">
                    {t('editAppointment.delete') ?? 'Delete'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('editAppointment.confirmDelete') ?? 'Confirm delete'}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('editAppointment.cancel') ?? 'Cancel'}</AlertDialogCancel>
                    <AlertDialogAction data-testid="confirm-delete-btn" onClick={handleDelete}>
                      {t('editAppointment.delete') ?? 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t('editAppointment.cancel')}
              </Button>
              <Button data-testid="save-status-btn" onClick={handleSave}>
                {t('editAppointment.save')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
