import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { UserPlus, User, Mail, Phone, MapPin, CalendarDays, ShieldPlus } from 'lucide-react';
import { patientsStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { Patient } from '@/types/appointment';

interface CreatePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientCreated?: () => void;
  onPatientUpdated?: () => void;
  patient?: Patient | null;
}

export function CreatePatientDialog({ 
  open, 
  onOpenChange, 
  onPatientCreated,
  onPatientUpdated,
  patient
}: CreatePatientDialogProps) {
  const { t } = useI18n();
  const emptyForm = useMemo(() => ({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    notes: ''
  }), []);
  const [formData, setFormData] = useState(emptyForm);
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const isEditMode = Boolean(patient?.id);

  useEffect(() => {
    if (!open) return;

    if (patient) {
      setFormData({
        firstName: patient.firstName ?? '',
        lastName: patient.lastName ?? '',
        email: patient.email ?? '',
        phone: patient.phone ?? '',
        dateOfBirth: patient.dateOfBirth ?? '',
        address: patient.address ?? '',
        emergencyContact: patient.emergencyContact ?? '',
        notes: patient.notes ?? '',
      });
    } else {
      setFormData(emptyForm);
    }

    setErrors({});
  }, [open, patient, emptyForm]);

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
      if (existing.some((p) => p.email?.toLowerCase?.() === formData.email.toLowerCase() && p.id !== patient?.id)) {
        setErrors((e) => ({ ...e, emailDuplicate: true }));
        toast({
          title: t('common.error'),
          description: t('createPatient.toastFailed'),
          variant: "destructive",
        });
        return;
      }

      if (patient?.id) {
        await patientsStorage.update(patient.id, {
          ...formData,
          dateOfBirth: formData.dateOfBirth ?? ''
        });

        toast({
          title: 'Patient updated',
          description: `${formData.firstName} ${formData.lastName} has been updated successfully`,
        });

        onPatientUpdated?.();
      } else {
        await patientsStorage.add({
          ...formData,
          dateOfBirth: formData.dateOfBirth ?? ''
        });

        toast({
          title: t('createPatient.toastCreatedTitle'),
          description: t('createPatient.toastCreatedDesc', { name: `${formData.firstName} ${formData.lastName}` }),
        });

        onPatientCreated?.();
      }

      onOpenChange(false);
      
      setFormData(emptyForm);
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
      <DialogContent className="overflow-hidden border-border/70 p-0 shadow-2xl sm:max-w-4xl" data-testid="patient-form-dialog">
        <div className="max-h-[70vh] overflow-y-auto">
          <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-background to-background px-5 py-4 sm:px-6">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  {isEditMode ? <User className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-lg font-semibold tracking-tight">
                    {isEditMode ? 'Edit Patient' : t('createPatient.title')}
                  </DialogTitle>
                  <DialogDescription className="max-w-2xl text-xs leading-relaxed">
                    {isEditMode
                      ? 'Update contact details, birth date, and patient notes in one place.'
                      : 'Create a patient profile with contact details, birth date, and care notes.'}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-3 px-5 py-4 sm:px-6">
              {/* Box 1: First name and Last name */}
              <section className="rounded-2xl border border-border/60 bg-muted/20 p-3 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-[60%_40%]">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      data-testid="patient-first-name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder="Ava"
                      className="h-9 border-border/70 bg-background/80"
                    />
                    {errors.firstName && <div data-testid="error-first-name-required" className="text-xs font-medium text-destructive">{t('common.error')}</div>}
                  </div>
                  <div className="space-y-1.5 pr-3">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      data-testid="patient-last-name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder="Petrova"
                      className="h-9 border-border/70 bg-background/80"
                    />
                    {errors.lastName && <div data-testid="error-last-name-required" className="text-xs font-medium text-destructive">{t('common.error')}</div>}
                  </div>
                </div>
              </section>

              {/* Box 2: Email and Phone/Emergency Contact */}
              <section className="rounded-2xl border border-border/60 bg-muted/20 p-3 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-[60%_40%]">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('createPatient.email')}
                    </Label>
                    <Input
                      id="email"
                      data-testid="patient-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      placeholder={t('createPatient.phEmail')}
                      className="h-9 border-border/70 bg-background/80"
                    />
                    {errors.emailRequired && <div data-testid="error-email-required" className="text-xs font-medium text-destructive">{t('common.error')}</div>}
                    {errors.emailInvalid && <div data-testid="error-email-invalid" className="text-xs font-medium text-destructive">{t('common.error')}</div>}
                    {errors.emailDuplicate && <div data-testid="error-email-duplicate" className="text-xs font-medium text-destructive">{t('common.error')}</div>}
                  </div>
                  <div className="space-y-3 pr-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {t('createPatient.phone')}
                      </Label>
                      <Input
                        id="phone"
                        data-testid="patient-phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder={t('createPatient.phPhone')}
                        className="h-9 border-border/70 bg-background/80"
                      />
                      {errors.phone && <div data-testid="error-phone-required" className="text-xs font-medium text-destructive">{t('common.error')}</div>}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="emergencyContact" className="flex items-center gap-2">
                        <ShieldPlus className="h-3.5 w-3.5 text-muted-foreground" />
                        {t('createPatient.emergencyContact')}
                      </Label>
                      <Input
                        id="emergencyContact"
                        data-testid="patient-emergency-contact"
                        value={formData.emergencyContact}
                        onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                        placeholder={t('createPatient.phEmergency')}
                        className="h-9 border-border/70 bg-background/80"
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Box 3: Date/Address and Notes */}
              <section className="rounded-2xl border border-border/60 bg-muted/20 p-3 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-[60%_40%]">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="patient-dob" className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {t('createPatient.dob')}
                      </Label>
                      <Input
                        id="patient-dob"
                        type="date"
                        data-testid="patient-dob"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                        className="h-9 border-border/70 bg-background/80"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        {t('createPatient.address')}
                      </Label>
                      <Input
                        id="address"
                        data-testid="patient-address"
                        value={formData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        placeholder={t('createPatient.phAddress')}
                        className="h-9 border-border/70 bg-background/80"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5 pr-3">
                    <Label htmlFor="notes">{t('createPatient.notes')}</Label>
                    <Textarea
                      id="notes"
                      data-testid="patient-notes"
                      placeholder={t('createPatient.phNotes')}
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      rows={3}
                      className="min-h-[72px] border-border/70 bg-background/80"
                    />
                  </div>
                </div>
              </section>
            </div>

            <Separator />

            <DialogFooter className="gap-3 px-5 py-3 sm:px-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 border-border/70">
                {t('createPatient.cancel')}
              </Button>
              <Button
                type="submit"
                data-testid="patient-form-submit"
                className="h-9 bg-primary px-5 text-primary-foreground shadow-sm hover:bg-primary/90"
              >
                {isEditMode ? 'Save Changes' : t('createPatient.submit')}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
