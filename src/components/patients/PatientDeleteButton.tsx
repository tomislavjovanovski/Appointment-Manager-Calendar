import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { patientsStorage } from '@/lib/storage';
import type { Patient } from '@/types/appointment';

interface PatientDeleteButtonProps {
  patient: Patient;
  onDeleted: () => void;
  compact?: boolean;
}

export function PatientDeleteButton({ patient, onDeleted, compact = false }: PatientDeleteButtonProps) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const patientName = `${patient.firstName} ${patient.lastName}`.trim();

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await patientsStorage.delete(patient.id);
      setConfirmOpen(false);
      toast({
        title: t('patients.deleteSuccess'),
        description: t('patients.deleteSuccessDescription', { name: patientName }),
      });
      onDeleted();
    } catch (error) {
      toast({
        title: t('patients.deleteFailed'),
        description: error instanceof Error ? error.message : t('patients.deleteFailed'),
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={compact ? 'ghost' : 'destructive'}
        size={compact ? 'icon' : 'sm'}
        className={compact ? 'h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive' : undefined}
        aria-label={t('patients.deleteNamed', { name: patientName })}
        data-testid="delete-patient-btn"
        disabled={deleting}
        onClick={(event) => {
          event.stopPropagation();
          setConfirmOpen(true);
        }}
      >
        <Trash2 className={compact ? 'h-4 w-4' : 'mr-2 h-4 w-4'} />
        {!compact && t('patients.delete')}
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={(open) => {
        if (!deleting) setConfirmOpen(open);
      }}>
        <AlertDialogContent data-testid="delete-patient-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('patients.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('patients.deleteConfirmDescription', { name: patientName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-patient-btn" disabled={deleting}>
              {t('createPatient.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              data-testid="confirm-delete-patient-btn"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? t('patients.deletePending') : t('patients.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
