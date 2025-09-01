import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { appointmentsStorage } from '@/lib/storage';
import { Appointment } from '@/types/appointment';
import { useToast } from '@/hooks/use-toast';

interface EditAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment | null;
  onUpdated?: () => void;
}

export function EditAppointmentDialog({ open, onOpenChange, appointment, onUpdated }: EditAppointmentDialogProps) {
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
      toast({ title: 'Appointment updated' });
      onUpdated?.();
      onOpenChange(false);
    } catch (e) {
      toast({ title: 'Failed to update appointment', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Appointment</DialogTitle>
          <DialogDescription>
            Update the appointment type, status, and notes.
          </DialogDescription>
        </DialogHeader>

        {appointment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v)=> setType(v as Appointment['type'])}>
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
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v)=> setStatus(v as Appointment['status'])}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no-show">No Show</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e)=> setNotes(e.target.value)} rows={4} />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={()=> onOpenChange(false)}>Cancel</Button>
              <Button onClick={handleSave}>Save Changes</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
