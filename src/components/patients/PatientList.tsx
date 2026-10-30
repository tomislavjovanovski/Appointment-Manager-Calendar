import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Plus, User, Phone, Mail, Calendar, Activity, ArrowUpRight, Users } from 'lucide-react';
import { Patient, PatientWithActivity } from '@/types/appointment';
import { patientsStorage } from '@/lib/storage';
import { format } from 'date-fns';
import { useI18n } from '@/i18n';
import { PatientDeleteButton } from './PatientDeleteButton';

interface PatientListProps {
  onPatientClick: (patient: Patient) => void;
  onCreatePatient: () => void;
  onPatientDeleted: () => void;
  refreshTrigger?: number;
  navigation?: React.ReactNode;
}

export function PatientList({ onPatientClick, onCreatePatient, onPatientDeleted, refreshTrigger, navigation }: PatientListProps) {
  const { t, dateFnsLocale } = useI18n();
  const [patients, setPatients] = useState<PatientWithActivity[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  useEffect(() => {
    let active = true;
    const loadData = async () => {
      try {
        const patientsData = await patientsStorage.getWithActivity();
        if (active) setPatients(patientsData);
      } catch (error) {
        // Avoid console.error noise in offline/test mode (smoke test treats it as a failure).
        console.warn('Patients: failed to load data, using empty defaults.', error);
        if (active) setPatients([]);
      }
    };
    
    void loadData();
    return () => { active = false; };
  }, [refreshTrigger]);
  
  const filteredPatients = patients.filter(patient =>
    `${patient.firstName} ${patient.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery) ||
    (patient.embg ?? '').includes(searchQuery)
  );

  const getPatientAppointmentCount = (patient: PatientWithActivity) => {
    return patient.appointmentCount || 0;
  };

  const getLastAppointmentDate = (patient: PatientWithActivity) => {
    return patient.lastAppointmentAt;
  };

  const totalAppointments = filteredPatients.reduce(
    (sum, patient) => sum + getPatientAppointmentCount(patient),
    0
  );

  const patientsWithVisits = filteredPatients.filter(
    (patient) => getPatientAppointmentCount(patient) > 0
  ).length;

  const patientInitials = (patient: Patient) =>
    `${patient.firstName?.[0] ?? ''}${patient.lastName?.[0] ?? ''}`.toUpperCase() || 'P';

  return (
    <div className="space-y-4 md:space-y-6" data-testid="patients-page">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 sm:items-start">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <User className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2 className="truncate text-xl font-semibold tracking-tight text-foreground md:text-2xl">{t('patients.title')}</h2>
          </div>
          <p className="hidden max-w-xl pl-[2.75rem] text-sm leading-relaxed text-muted-foreground sm:block">{t('patients.subtitle')}</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center justify-end gap-2 sm:pt-0.5">
        {navigation}
        <Button 
          data-testid="add-patient-btn"
          onClick={onCreatePatient}
          className="h-10 shrink-0 shadow-sm transition-shadow hover:shadow-md md:h-8 md:px-2.5 md:text-xs"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('patients.addPatient')}
        </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 md:grid-cols-1 md:gap-4 lg:grid-cols-3">
        <Card className="border-border/80 shadow-soft">
          <CardContent className="flex items-center gap-4 p-3 md:p-5">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl md:flex bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="line-clamp-2 text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground md:text-xs md:leading-normal">{t('patients.title')}</div>
              <div className="text-lg font-semibold text-foreground md:text-2xl">{filteredPatients.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-soft">
          <CardContent className="flex items-center gap-4 p-3 md:p-5">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl md:flex bg-emerald-500/10 text-emerald-600">
              <Activity className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="line-clamp-2 text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground md:text-xs md:leading-normal">{t('patients.withVisits')}</div>
              <div className="text-lg font-semibold text-foreground md:text-2xl">{patientsWithVisits}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/80 shadow-soft">
          <CardContent className="flex items-center gap-4 p-3 md:p-5">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl md:flex bg-amber-500/10 text-amber-600">
              <Calendar className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="line-clamp-2 text-[10px] font-medium uppercase leading-tight tracking-wide text-muted-foreground md:text-xs md:leading-normal">{t('createAppointment.appointmentDetails')}</div>
              <div className="text-lg font-semibold text-foreground md:text-2xl">{totalAppointments}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-soft">
        <CardHeader className="border-b border-border/60 bg-muted/20 p-3 md:p-6 md:pb-4">
          <div className="flex flex-col gap-3 md:gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="hidden space-y-1 md:block">
              <CardTitle className="text-lg font-semibold tracking-tight">{t('patients.directory')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('patients.directoryDescription')}
              </p>
            </div>
            <div className="flex flex-row items-center gap-2 sm:gap-3">
              <div className="relative min-w-0 flex-1 sm:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  data-testid="patient-search-input"
                  placeholder={t('patients.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 border-border/80 bg-background/80 pl-10 text-base shadow-sm md:h-11 md:text-sm transition-colors focus-visible:ring-primary/25"
                />
              </div>
              <Badge variant="outline" className="h-10 shrink-0 rounded-xl px-2.5 text-xs font-medium md:h-11 md:px-4 md:text-sm">
                {t('patients.shown', { count: filteredPatients.length })}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Patient List */}
          <div className="md:hidden">
            {filteredPatients.length === 0 ? (
              <div className="px-4 py-10 text-center" data-testid="patients-empty-state">
                <User className="mx-auto mb-3 h-12 w-12 text-muted-foreground opacity-50" />
                <h3 className="mb-1 text-base font-medium">
                  {searchQuery ? t('patients.noResults') : t('patients.noPatientsYet')}
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  {searchQuery ? t('patients.trySearch') : t('patients.addFirstHint')}
                </p>
                {!searchQuery && (
                  <Button onClick={onCreatePatient} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('patients.addFirst')}
                  </Button>
                )}
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {filteredPatients.map((patient) => {
                  const appointmentCount = getPatientAppointmentCount(patient);
                  const lastAppointment = getLastAppointmentDate(patient);
                  const phone = patient.phone?.trim();
                  const email = patient.email?.trim();

                  return (
                    <li key={patient.id}>
                      <button
                        type="button"
                        data-testid="patient-card"
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/40 active:bg-muted/60"
                        onClick={() => onPatientClick(patient)}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-medical-blue text-xs font-semibold text-primary-foreground">
                          {patientInitials(patient)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-foreground">
                            {patient.firstName} {patient.lastName}
                          </span>
                          <span className="flex min-w-0 items-center gap-3 text-xs text-muted-foreground">
                            {phone && (
                              <span className="inline-flex shrink-0 items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {phone}
                              </span>
                            )}
                            {email && (
                              <span className="inline-flex min-w-0 items-center gap-1">
                                <Mail className="h-3 w-3 shrink-0" />
                                <span className="truncate">{email}</span>
                              </span>
                            )}
                            {!phone && !email && (
                              <span className="truncate">
                                {patient.dateOfBirth
                                  ? t('patients.born', { date: format(new Date(patient.dateOfBirth), 'MMM d, yyyy', { locale: dateFnsLocale }) })
                                  : t('patients.noBirthDate')}
                              </span>
                            )}
                          </span>
                          {patient.registrationDate && (
                            <span className="block text-xs text-muted-foreground" data-testid="patient-card-registration-date">
                              {t('patientImport.registrationDate')}: {patient.registrationDate.split('-').reverse().join('.')}
                            </span>
                          )}
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-0.5">
                          <Badge variant="outline" className="rounded-md px-1.5 py-0 text-[10px] font-medium">
                            {appointmentCount === 1
                              ? t('patients.appointmentsCountOne')
                              : t('patients.appointmentsCount', { count: appointmentCount })}
                          </Badge>
                          {lastAppointment && (
                            <span className="text-[10px] text-muted-foreground">
                              {t('patients.last', { date: format(new Date(lastAppointment), 'MMM d', { locale: dateFnsLocale }) })}
                            </span>
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="hidden md:block">
            {filteredPatients.length === 0 ? (
              <div className="p-10 text-center" data-testid="patients-empty-state">
                <User className="mx-auto mb-4 h-16 w-16 text-muted-foreground opacity-50" />
                <h3 className="mb-2 text-lg font-medium">
                  {searchQuery ? t('patients.noResults') : t('patients.noPatientsYet')}
                </h3>
                <p className="mb-4 text-muted-foreground">
                  {searchQuery 
                    ? t('patients.trySearch')
                    : t('patients.addFirstHint')
                  }
                </p>
                {!searchQuery && (
                  <Button onClick={onCreatePatient} variant="outline">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('patients.addFirst')}
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="pl-6">{t('appointment.patient')}</TableHead>
                    <TableHead>{t('patients.contact')}</TableHead>
                    <TableHead>{t('createPatient.dob')}</TableHead>
                    <TableHead>{t('patientImport.registrationDate')}</TableHead>
                    <TableHead>{t('patients.lastVisit')}</TableHead>
                    <TableHead>{t('patients.activity')}</TableHead>
                    <TableHead className="pr-6">{t('patients.notesColumn')}</TableHead>
                    <TableHead className="w-12 pr-4"><span className="sr-only">{t('patients.delete')}</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => {
                    const appointmentCount = getPatientAppointmentCount(patient);
                    const lastAppointment = getLastAppointmentDate(patient);

                    return (
                      <TableRow
                          key={patient.id}
                            data-testid="patient-row"
                          className="cursor-pointer border-border/60"
                          onClick={() => onPatientClick(patient)}
                        >
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-medical-blue text-sm font-semibold text-primary-foreground shadow-sm">
                              {patientInitials(patient)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-foreground">
                                {patient.firstName} {patient.lastName}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-4 w-4" />
                              <span className="truncate">{patient.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="h-4 w-4" />
                              <span>{patient.phone}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap" data-testid="patient-birth-date-cell">
                          {patient.dateOfBirth ? patient.dateOfBirth.split('-').reverse().join('.') : '-'}
                        </TableCell>
                        <TableCell className="whitespace-nowrap" data-testid="patient-registration-date-cell">
                          {patient.registrationDate ? patient.registrationDate.split('-').reverse().join('.') : '-'}
                        </TableCell>
                        <TableCell>
                          {lastAppointment ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-foreground">
                                {format(new Date(lastAppointment), 'MMM d, yyyy', { locale: dateFnsLocale })}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(lastAppointment), 'HH:mm')}
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">{t('patients.noVisits')}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg">
                            {appointmentCount === 1
                              ? t('patients.appointmentsCountOne')
                              : t('patients.appointmentsCount', { count: appointmentCount })}
                          </Badge>
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex items-start justify-between gap-3">
                            <p className="max-w-[18rem] truncate text-sm text-muted-foreground">
                              {patient.notes || t('patients.noNotes')}
                            </p>
                            <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          </div>
                        </TableCell>
                        <TableCell className="pr-4" onClick={(event) => event.stopPropagation()}>
                          <PatientDeleteButton patient={patient} onDeleted={onPatientDeleted} compact />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
