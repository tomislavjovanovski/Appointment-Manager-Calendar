import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { WeeklyScheduler } from '@/components/dashboard/WeeklyScheduler';
import { PatientList } from '@/components/patients/PatientList';
import { TabbedSettingsPanel } from '@/components/settings/TabbedSettingsPanel';
import { CreateAppointmentDialog } from '@/components/appointments/CreateAppointmentDialog';
import { CreatePatientDialog } from '@/components/patients/CreatePatientDialog';
import { EditAppointmentDialog } from '@/components/appointments/EditAppointmentDialog';
import { Patient, Appointment } from '@/types/appointment';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [patientProfileOpen, setPatientProfileOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const handleCreateAppointment = (date: Date) => {
    console.log('handleCreateAppointment called with:', date);
    setSelectedDate(date);
    setAppointmentDialogOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setEditDialogOpen(true);
  };
  
  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientProfileOpen(true);
  };

  const handleCreatePatient = () => {
    setPatientDialogOpen(true);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <WeeklyScheduler
            onCreateAppointment={handleCreateAppointment}
            onAppointmentClick={handleAppointmentClick}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'patients':
        return (
          <PatientList
            onPatientClick={handlePatientClick}
            onCreatePatient={handleCreatePatient}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'settings':
        return <TabbedSettingsPanel />;
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 min-w-0 bg-gradient-to-b from-muted/25 via-background to-background p-6 md:p-8 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-[1600px]">{renderContent()}</div>
      </main>
      
      <CreateAppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={setAppointmentDialogOpen}
        selectedDate={selectedDate}
        onAppointmentCreated={handleRefresh}
      />
      
      <CreatePatientDialog
        open={patientDialogOpen}
        onOpenChange={setPatientDialogOpen}
        onPatientCreated={handleRefresh}
      />

      <EditAppointmentDialog
        open={editDialogOpen}
        onOpenChange={(o)=>{ setEditDialogOpen(o); if(!o) setSelectedAppointment(null);} }
        appointment={selectedAppointment}
        onUpdated={handleRefresh}
      />

      <Dialog
        open={patientProfileOpen}
        onOpenChange={(o) => {
          setPatientProfileOpen(o);
          if (!o) setSelectedPatient(null);
        }}
      >
        <DialogContent data-testid="patient-profile-panel">
          <DialogHeader>
            <DialogTitle>
              {selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : 'Patient'}
            </DialogTitle>
          </DialogHeader>
          {selectedPatient && (
            <div className="space-y-2 text-sm">
              <div><strong>Email:</strong> {selectedPatient.email}</div>
              <div><strong>Phone:</strong> {selectedPatient.phone}</div>
              <div><strong>DOB:</strong> {selectedPatient.dateOfBirth}</div>
              <div><strong>Address:</strong> {selectedPatient.address}</div>
              <div><strong>Emergency contact:</strong> {selectedPatient.emergencyContact}</div>
              <div><strong>Notes:</strong> {selectedPatient.notes}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
