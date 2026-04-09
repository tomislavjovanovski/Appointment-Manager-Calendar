import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserPlus, User, Mail, Phone, MapPin, Contact, CalendarIcon } from 'lucide-react';
import { Patient } from '@/types/appointment';
import { patientsStorage } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
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
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    emergencyContact: '',
    notes: ''
  });
  const [birthDate, setBirthDate] = useState<Date>();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.phone) {
      toast({
        title: t('common.error'),
        description: t('createPatient.toastRequired'),
        variant: "destructive",
      });
      return;
    }

    try {
      await patientsStorage.add({
        ...formData,
        dateOfBirth: birthDate ? format(birthDate, 'yyyy-MM-dd') : ''
      });

      toast({
        title: t('createPatient.toastCreatedTitle'),
        description: t('createPatient.toastCreatedDesc', { name: formData.name }),
      });

      onPatientCreated?.();
      onOpenChange(false);
      
      setFormData({
        name: '',
        email: '',
        phone: '',
        dateOfBirth: '',
        address: '',
        emergencyContact: '',
        notes: ''
      });
      setBirthDate(undefined);
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
          <div className="space-y-2">
            <Label htmlFor="name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              {t('createPatient.fullName')}
            </Label>
            <Input
              id="name"
              data-testid="patient-first-name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder={t('createPatient.phName')}
              required
            />
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
                required
              />
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
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('createPatient.dob')}</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  data-testid="patient-dob"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !birthDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthDate ? format(birthDate, "PPP", { locale: dateFnsLocale }) : <span>{t('createPatient.pickDate')}</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  locale={dateFnsLocale}
                  selected={birthDate}
                  onSelect={setBirthDate}
                  disabled={(date) =>
                    date > new Date() || date < new Date("1900-01-01")
                  }
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
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
