import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { WeeklyScheduler } from '@/components/dashboard/WeeklyScheduler';
import { PatientList } from '@/components/patients/PatientList';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { NotificationManager } from '@/components/notifications/NotificationManager';
import { CreateAppointmentDialog } from '@/components/appointments/CreateAppointmentDialog';
import { CreatePatientDialog } from '@/components/patients/CreatePatientDialog';
import { Patient, Appointment } from '@/types/appointment';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleCreateAppointment = (date: Date) => {
    setSelectedDate(date);
    setAppointmentDialogOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    // TODO: Open appointment details dialog
    console.log('Appointment clicked:', appointment);
  };

  const handlePatientClick = (patient: Patient) => {
    // TODO: Open patient details dialog
    console.log('Patient clicked:', patient);
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
          />
        );
      case 'patients':
        return (
          <PatientList
            onPatientClick={handlePatientClick}
            onCreatePatient={handleCreatePatient}
          />
        );
      case 'settings':
        return (
          <div className="space-y-6">
            <SettingsPanel />
            <NotificationManager />
          </div>
        );
      default:
        return <div>Page not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 p-6">
        {renderContent()}
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
    </div>
  );
};

export default Index;
