import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserPlus, User, Mail, Phone, MapPin, CalendarDays, ShieldPlus, History } from 'lucide-react';
import { patientsStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/i18n';
import { Patient } from '@/types/appointment';
import { createEmptyPatientForm, normalizePatientForm, validatePatientForm } from '@/lib/patientForm';
import { PatientDeleteButton } from './PatientDeleteButton';
import { PatientAppointmentHistory } from './PatientAppointmentHistory';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, isValid, parseISO } from 'date-fns';

interface CreatePatientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPatientCreated?: () => void;
  onPatientUpdated?: () => void;
  onPatientDeleted?: () => void;
  patient?: Patient | null;
}

export function CreatePatientDialog({ 
  open, 
  onOpenChange, 
  onPatientCreated,
  onPatientUpdated,
  onPatientDeleted,
  patient
}: CreatePatientDialogProps) {
  const { t } = useI18n();
  const emptyForm = useMemo(createEmptyPatientForm, []);
  const [formData, setFormData] = useState(emptyForm);
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [birthDateInvalid, setBirthDateInvalid] = useState(false);
  const isEditMode = Boolean(patient?.id);
  const [activeTab, setActiveTab] = useState('details');

  useEffect(() => {
    setActiveTab('details');
  }, [open, patient?.id]);

  useEffect(() => {
    if (!open) return;

    if (patient) {
      setFormData({
        firstName: patient.firstName ?? '',
        lastName: patient.lastName ?? '',
        embg: patient.embg ?? '',
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
    setBirthDateInvalid(false);
  }, [open, patient, emptyForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedForm = normalizePatientForm(formData);
    const nextErrors = validatePatientForm(normalizedForm);
    if (birthDateInvalid) nextErrors.dateOfBirth = true;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast({
        title: t('common.error'),
        description: nextErrors.embg ? t('createPatient.embgInvalid') : t('createPatient.toastRequired'),
        variant: "destructive",
      });
      return;
    }

    try {
      // Duplicate email check (offline mode / API failure paths)
      const existing = await patientsStorage.getAll();
      if (normalizedForm.email && existing.some((p) => p.email?.toLowerCase?.() === normalizedForm.email.toLowerCase() && p.id !== patient?.id)) {
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
          ...normalizedForm,
        });

        toast({
          title: 'Patient updated',
          description: `${normalizedForm.firstName} ${normalizedForm.lastName} has been updated successfully`,
        });

        onPatientUpdated?.();
      } else {
        await patientsStorage.add({
          ...normalizedForm,
        });

        toast({
          title: t('createPatient.toastCreatedTitle'),
          description: t('createPatient.toastCreatedDesc', { name: `${normalizedForm.firstName} ${normalizedForm.lastName}` }),
        });

        onPatientCreated?.();
      }

      onOpenChange(false);
      
      setFormData(emptyForm);
      setErrors({});
    } catch (error) {
      toast({
        title: t('common.error'),
        description: error instanceof Error ? error.message : t('createPatient.toastFailed'),
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
      <DialogContent className="block h-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-1.5rem)] overflow-y-auto rounded-lg border-border/70 p-0 shadow-2xl sm:max-w-4xl" data-testid="patient-form-dialog">
        <div>
          <div className="shrink-0 border-b border-border/60 bg-muted/20 px-4 py-3 pr-12 sm:px-5 sm:pr-12">
            <DialogHeader className="space-y-0 text-left">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {isEditMode ? <User className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                </div>
                <div className="min-w-0 space-y-1">
                  <DialogTitle className="text-base font-semibold">
                    {isEditMode ? t('createPatient.editTitle') : t('createPatient.title')}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {isEditMode
                      ? t('createPatient.editDescription')
                      : t('createPatient.description')}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {isEditMode && (
              <TabsList className="mx-4 my-2 grid h-auto min-h-10 shrink-0 grid-cols-2 items-stretch gap-1 rounded-lg border border-slate-300 bg-slate-100 p-1 sm:mx-5">
                <TabsTrigger value="details" className="min-h-8 min-w-0 whitespace-normal rounded-md border border-transparent px-2 py-1.5 text-xs transition-colors hover:bg-background/70 data-[state=active]:border-primary/25 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm" data-testid="patient-details-tab">
                  <User className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  {t('patientHistory.details')}
                </TabsTrigger>
                <TabsTrigger value="history" className="min-h-8 min-w-0 whitespace-normal rounded-md border border-transparent px-2 py-1.5 text-xs transition-colors hover:bg-background/70 data-[state=active]:border-primary/25 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm sm:text-sm" data-testid="patient-history-tab">
                  <History className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                  {t('patientHistory.title')}
                </TabsTrigger>
              </TabsList>
            )}
          <div className="grid">
          <TabsContent forceMount value="details" className="col-start-1 row-start-1 mt-0 data-[state=inactive]:invisible data-[state=inactive]:pointer-events-none">
          <form onSubmit={handleSubmit} noValidate>
            <div className="space-y-3 px-4 py-3 sm:px-5">
              <section className="rounded-2xl border border-slate-300 bg-slate-100 p-2.5 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="firstName">{t('createPatient.firstName')}</Label>
                    <Input
                      id="firstName"
                      data-testid="patient-first-name"
                      value={formData.firstName}
                      onChange={(e) => handleInputChange('firstName', e.target.value)}
                      placeholder={t('createPatient.phName')}
                      className="h-9 border-border/70 bg-background/80"
                    />
                    {errors.firstName && <div data-testid="error-first-name-required" className="text-xs font-medium text-destructive">{t('common.error')}</div>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lastName">{t('createPatient.lastName')}</Label>
                    <Input
                      id="lastName"
                      data-testid="patient-last-name"
                      value={formData.lastName}
                      onChange={(e) => handleInputChange('lastName', e.target.value)}
                      placeholder={t('createPatient.phName')}
                      className="h-9 border-border/70 bg-background/80"
                    />
                    {errors.lastName && <div data-testid="error-last-name-required" className="text-xs font-medium text-destructive">{t('common.error')}</div>}
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="patient-embg">{t('createPatient.embg')}</Label>
                    <Input id="patient-embg" data-testid="patient-embg" inputMode="numeric" maxLength={13}
                      value={formData.embg ?? ''} onChange={(event) => handleInputChange('embg', event.target.value)}
                      aria-invalid={Boolean(errors.embg)} className="h-9 border-border/70 bg-background/80" />
                    {errors.embg && <p className="text-sm text-destructive">{t('createPatient.embgInvalid')}</p>}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-300 bg-slate-100 p-2.5 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="min-w-0 space-y-1.5">
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
                    {errors.emailInvalid && <div data-testid="error-email-invalid" className="text-xs font-medium text-destructive">{t('common.error')}</div>}
                    {errors.emailDuplicate && <div data-testid="error-email-duplicate" className="text-xs font-medium text-destructive">{t('common.error')}</div>}
                  </div>
                    <div className="min-w-0 space-y-1.5">
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
                    </div>
                    <div className="min-w-0 space-y-1.5">
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
              </section>

              <section className="rounded-2xl border border-slate-300 bg-slate-100 p-2.5 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="patient-dob" className="flex h-5 items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {t('createPatient.dob')}
                      </Label>
                      <DatePicker
                        format="dd.MM.yyyy"
                        value={formData.dateOfBirth ? parseISO(formData.dateOfBirth) : null}
                        onChange={(date) => {
                          if (date === null) handleInputChange('dateOfBirth', '');
                          else if (isValid(date)) handleInputChange('dateOfBirth', format(date, 'yyyy-MM-dd'));
                        }}
                        onError={(error) => setBirthDateInvalid(error !== null)}
                        slotProps={{
                          textField: {
                            id: 'patient-dob',
                            size: 'small',
                            fullWidth: true,
                            inputProps: { 'data-testid': 'patient-dob' },
                            helperText: birthDateInvalid ? t('createPatient.dobInvalid') : undefined,
                            sx: {
                              '& .MuiInputBase-root': { height: 36, fontSize: 14, backgroundColor: 'hsl(var(--background) / 0.8)' },
                            },
                          },
                          popper: { sx: { zIndex: 2100 } },
                          dialog: { sx: { zIndex: 2100 } },
                        }}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address" className="flex h-5 items-center gap-2">
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
                  <div className="flex min-w-0 flex-col gap-3">
                    <div className="flex flex-1 flex-col gap-1.5">
                      <Label htmlFor="notes" className="flex h-5 shrink-0 items-center">{t('createPatient.notes')}</Label>
                      <Textarea
                        id="notes"
                        data-testid="patient-notes"
                        placeholder={t('createPatient.phNotes')}
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={patient?.registrationDate ? 1 : 3}
                        className="h-9 min-h-9 flex-1 resize-none border-border/70 bg-background/80 py-1.5"
                      />
                    </div>
                    {patient?.registrationDate && (
                      <div className="space-y-1.5">
                        <Label htmlFor="patient-registration-date" className="flex h-5 items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                          {t('patientImport.registrationDate')}
                        </Label>
                        <Input
                          id="patient-registration-date"
                          data-testid="patient-registration-date"
                          value={patient.registrationDate.split('-').reverse().join('.')}
                          readOnly
                          className="h-9 border-border/70 bg-muted/50"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            </div>

            <Separator />

            <DialogFooter className="shrink-0 flex-row justify-between gap-2 bg-background px-4 py-3 sm:px-5">
              <div>
                {isEditMode && patient && (
                  <PatientDeleteButton
                    patient={patient}
                    onDeleted={() => {
                      onPatientDeleted?.();
                      onOpenChange(false);
                    }}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9 border-border/70">
                  {t('createPatient.cancel')}
                </Button>
                <Button
                  type="submit"
                  data-testid="patient-form-submit"
                  className="h-9 bg-primary px-5 text-primary-foreground shadow-sm hover:bg-primary/90"
                >
                  {isEditMode ? t('createPatient.saveChanges') : t('createPatient.submit')}
                </Button>
              </div>
            </DialogFooter>
          </form>
          </TabsContent>
          {isEditMode && (
            <TabsContent forceMount value="history" className="col-start-1 row-start-1 mt-0 px-4 pb-4 pt-1 data-[state=inactive]:invisible data-[state=inactive]:pointer-events-none sm:px-5" data-testid="patient-history">
              <PatientAppointmentHistory
                key={patient?.id}
                patientId={patient?.id}
                active={open && activeTab === 'history'}
              />
            </TabsContent>
          )}
          </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
