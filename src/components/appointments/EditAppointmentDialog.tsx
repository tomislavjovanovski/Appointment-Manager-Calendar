import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('editAppointment.title')}</DialogTitle>
          <DialogDescription>
            {t('editAppointment.description')}
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('editAppointment.type')}</Label>
                <Select value={type} onValueChange={(v)=> setType(v as Appointment['type'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consultation">{t('appointment.types.consultation')}</SelectItem>
                    <SelectItem value="follow-up">{t('appointment.types.followUp')}</SelectItem>
                    <SelectItem value="procedure">{t('appointment.types.procedure')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('editAppointment.status')}</Label>
                <Select value={status} onValueChange={(v)=> setStatus(v as Appointment['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">{t('appointment.status.scheduled')}</SelectItem>
                    <SelectItem value="completed">{t('appointment.status.completed')}</SelectItem>
                    <SelectItem value="cancelled">{t('appointment.status.cancelled')}</SelectItem>
                    <SelectItem value="no-show">{t('appointment.status.noShow')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('editAppointment.notes')}</Label>
              <Textarea value={notes} onChange={(e)=> setNotes(e.target.value)} rows={4} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=> onOpenChange(false)}>{t('editAppointment.cancel')}</Button>
              <Button onClick={handleSave}>{t('editAppointment.save')}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
