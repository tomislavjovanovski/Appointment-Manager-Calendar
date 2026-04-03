import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, User, Phone, Mail, Calendar } from 'lucide-react';
import { Patient } from '@/types/appointment';
import { patientsStorage, appointmentsStorage } from '@/lib/storage';
import { format } from 'date-fns';
import { useI18n } from '@/i18n';

interface PatientListProps {
  onPatientClick: (patient: Patient) => void;
  onCreatePatient: () => void;
  refreshTrigger?: number;
}

export function PatientList({ onPatientClick, onCreatePatient, refreshTrigger }: PatientListProps) {
  const { t, dateFnsLocale } = useI18n();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [appointmentCounts, setAppointmentCounts] = useState<Record<string, number>>({});
  const [lastAppointments, setLastAppointments] = useState<Record<string, string | null>>({});
  
  useEffect(() => {
    const loadData = async () => {
      try {
        const patientsData = await patientsStorage.getAll().catch(() => []);
        setPatients(patientsData);
        
        // Load appointment data for each patient
        const counts: Record<string, number> = {};
        const lastDates: Record<string, string | null> = {};
        
        for (const patient of patientsData) {
          const appointments = await appointmentsStorage.getByPatient(patient.id).catch(() => []);
          counts[patient.id] = appointments.length;
          
          if (appointments.length > 0) {
            const sortedAppointments = appointments.sort((a, b) => 
              new Date(b.date).getTime() - new Date(a.date).getTime()
            );
            lastDates[patient.id] = sortedAppointments[0].date;
          } else {
            lastDates[patient.id] = null;
          }
        }
        
        setAppointmentCounts(counts);
        setLastAppointments(lastDates);
      } catch (error) {
        console.error('Error loading patient data:', error);
        setPatients([]);
        setAppointmentCounts({});
        setLastAppointments({});
      }
    };
    
    loadData();
  }, [refreshTrigger]);
  
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery)
  );

  const getPatientAppointmentCount = (patientId: string) => {
    return appointmentCounts[patientId] || 0;
  };

  const getLastAppointmentDate = (patientId: string) => {
    return lastAppointments[patientId];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <User className="h-5 w-5" strokeWidth={2} />
            </span>
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">{t('patients.title')}</h2>
          </div>
          <p className="max-w-xl pl-[2.75rem] text-sm leading-relaxed text-muted-foreground">{t('patients.subtitle')}</p>
        </div>
        <Button 
          onClick={onCreatePatient}
          className="h-10 shrink-0 shadow-sm transition-shadow hover:shadow-md"
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('patients.addPatient')}
        </Button>
      </div>

      {/* Search */}
      <Card className="border-border/80 shadow-soft">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('patients.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 border-border/80 bg-background/80 pl-10 shadow-sm transition-colors focus-visible:ring-primary/25"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patient List */}
      <div className="grid gap-4">
        {filteredPatients.length === 0 ? (
          <Card className="border-border/80 py-12 text-center shadow-soft">
            <CardContent>
              <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? t('patients.noResults') : t('patients.noPatientsYet')}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? t('patients.trySearch')
                  : t('patients.addFirstHint')
                }
              </p>
              {!searchQuery && (
                <Button onClick={onCreatePatient} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('patients.addFirst')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map((patient) => {
            const appointmentCount = getPatientAppointmentCount(patient.id);
            const lastAppointment = getLastAppointmentDate(patient.id);
            
            return (
              <Card 
                key={patient.id} 
                className="cursor-pointer border-border/80 shadow-soft transition-all duration-200 hover:border-primary/25 hover:shadow-medium"
                onClick={() => onPatientClick(patient)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-medical-blue shadow-sm ring-2 ring-primary/10">
                          <User className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">{patient.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {patient.dateOfBirth ? 
                              t('patients.born', { date: format(new Date(patient.dateOfBirth), 'MMM d, yyyy', { locale: dateFnsLocale }) }) 
                              : t('patients.noBirthDate')
                            }
                          </p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span>{patient.email}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{patient.phone}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right space-y-2">
                      <Badge variant="outline" className="text-xs">
                        {appointmentCount === 1
                          ? t('patients.appointmentsCountOne')
                          : t('patients.appointmentsCount', { count: appointmentCount })}
                      </Badge>
                      {lastAppointment && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>{t('patients.last', { date: format(new Date(lastAppointment), 'MMM d', { locale: dateFnsLocale }) })}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {patient.notes && (
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {patient.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}