import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, User, Mail, Phone, MapPin, Contact, CalendarIcon } from 'lucide-react';
import { Patient } from '@/types/appointment';
import { patientsStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useI18n } from '@/i18n';

interface CreatePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientCreated?: () => void;
}

export function CreatePatientDialog({ 
  open, 
  onOpenChange, 
  onPatientCreated 
}: CreatePatientDialogProps) {
  const { t, dateFnsLocale } = useI18n();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    notes: ''
  });
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Record<string, boolean> = {};
    if (!formData.firstName) nextErrors.firstName = true;
    if (!formData.lastName) nextErrors.lastName = true;
    if (!formData.email) nextErrors.emailRequired = true;
    if (!formData.phone) nextErrors.phone = true;
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) nextErrors.emailInvalid = true;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast({
        title: t('common.error'),
        description: t('createPatient.toastRequired'),
        variant: "destructive",
      });
      return;
    }

    try {
      // Duplicate email check (offline mode / API failure paths)
      const existing = await patientsStorage.getAll().catch(() => []);
      if (existing.some((p) => p.email?.toLowerCase?.() === formData.email.toLowerCase())) {
        setErrors((e) => ({ ...e, emailDuplicate: true }));
        toast({
          title: t('common.error'),
          description: t('createPatient.toastFailed'),
          variant: "destructive",
        });
        return;
      }

      await patientsStorage.add({
        ...formData,
        dateOfBirth: formData.dateOfBirth ?? ''
      });

      toast({
        title: t('createPatient.toastCreatedTitle'),
        description: t('createPatient.toastCreatedDesc', { name: `${formData.firstName} ${formData.lastName}` }),
      });

      onPatientCreated?.();
      onOpenChange(false);
      
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        address: '',
        emergencyContact: '',
        notes: ''
      });
      setErrors({});
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('createPatient.toastFailed'),
        variant: "destructive",
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData({ ...formData, [field]: value });
    setErrors((e) => ({ ...e, [field]: false }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto" data-testid="patient-form-dialog">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            {t('createPatient.title')}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {t('createPatient.fullName')}
              </Label>
              <Input
                id="firstName"
                data-testid="patient-first-name"
                value={formData.firstName}
                onChange={(e) => handleInputChange('firstName', e.target.value)}
                placeholder={t('createPatient.phName')}
              />
              {errors.firstName && <div data-testid="error-first-name-required" className="text-xs text-destructive">{t('common.error')}</div>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName" className="flex items-center gap-2">
                <span className="sr-only">{t('createPatient.fullName')}</span>
              </Label>
              <Input
                id="lastName"
                data-testid="patient-last-name"
                value={formData.lastName}
                onChange={(e) => handleInputChange('lastName', e.target.value)}
                placeholder={t('createPatient.phName')}
              />
              {errors.lastName && <div data-testid="error-last-name-required" className="text-xs text-destructive">{t('common.error')}</div>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                {t('createPatient.email')}
              </Label>
              <Input
                id="email"
                data-testid="patient-email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder={t('createPatient.phEmail')}
              />
              {errors.emailRequired && <div data-testid="error-email-required" className="text-xs text-destructive">{t('common.error')}</div>}
              {errors.emailInvalid && <div data-testid="error-email-invalid" className="text-xs text-destructive">{t('common.error')}</div>}
              {errors.emailDuplicate && <div data-testid="error-email-duplicate" className="text-xs text-destructive">{t('common.error')}</div>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                {t('createPatient.phone')}
              </Label>
              <Input
                id="phone"
                data-testid="patient-phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder={t('createPatient.phPhone')}
              />
              {errors.phone && <div data-testid="error-phone-required" className="text-xs text-destructive">{t('common.error')}</div>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('createPatient.dob')}</Label>
            <Input
              type="date"
              data-testid="patient-dob"
              value={formData.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {t('createPatient.address')}
            </Label>
            <Input
              id="address"
              data-testid="patient-address"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              placeholder={t('createPatient.phAddress')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="emergencyContact" className="flex items-center gap-2">
              <Contact className="w-4 h-4" />
              {t('createPatient.emergencyContact')}
            </Label>
            <Input
              id="emergencyContact"
              data-testid="patient-emergency-contact"
              value={formData.emergencyContact}
              onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
              placeholder={t('createPatient.phEmergency')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t('createPatient.notes')}</Label>
            <Textarea
              id="notes"
              data-testid="patient-notes"
              placeholder={t('createPatient.phNotes')}
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('createPatient.cancel')}
            </Button>
            <Button
              type="submit"
              data-testid="patient-form-submit"
              className="bg-gradient-to-r from-accent to-accent-hover"
            >
              {t('createPatient.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
