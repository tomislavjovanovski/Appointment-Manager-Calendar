import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, User, Phone, Mail, Calendar } from 'lucide-react';
import { Patient } from '@/types/appointment';
import { patientsStorage, appointmentsStorage } from '@/lib/storage';
import { format } from 'date-fns';

interface PatientListProps {
  onPatientClick: (patient: Patient) => void;
  onCreatePatient: () => void;
}

export function PatientList({ onPatientClick, onCreatePatient }: PatientListProps) {
  const [patients] = useState(() => patientsStorage.getAll());
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredPatients = patients.filter(patient =>
    patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    patient.phone.includes(searchQuery)
  );

  const getPatientAppointmentCount = (patientId: string) => {
    return appointmentsStorage.getByPatient(patientId).length;
  };

  const getLastAppointmentDate = (patientId: string) => {
    const appointments = appointmentsStorage.getByPatient(patientId);
    if (appointments.length === 0) return null;
    
    const sortedAppointments = appointments.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sortedAppointments[0].date;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Patients</h2>
          <p className="text-muted-foreground">Manage your patient database</p>
        </div>
        <Button 
          onClick={onCreatePatient}
          className="bg-gradient-to-r from-accent to-accent-hover hover:opacity-90"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search patients by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Patient List */}
      <div className="grid gap-4">
        {filteredPatients.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'No patients found' : 'No patients yet'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery 
                  ? 'Try adjusting your search criteria'
                  : 'Start by adding your first patient to the system'
                }
              </p>
              {!searchQuery && (
                <Button onClick={onCreatePatient} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Patient
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
                className="cursor-pointer hover:shadow-medium transition-all duration-200 hover:border-primary/20"
                onClick={() => onPatientClick(patient)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-medical-blue rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-lg text-foreground">{patient.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Born {format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}
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
                        {appointmentCount} appointment{appointmentCount !== 1 ? 's' : ''}
                      </Badge>
                      {lastAppointment && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="w-3 h-3" />
                          <span>Last: {format(new Date(lastAppointment), 'MMM d')}</span>
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