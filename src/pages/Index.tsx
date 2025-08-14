import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { AppointmentCalendar } from '@/components/dashboard/AppointmentCalendar';
import { PatientList } from '@/components/patients/PatientList';
import { SettingsPanel } from '@/components/settings/SettingsPanel';
import { Patient, Appointment } from '@/types/appointment';

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const handleCreateAppointment = (date: Date) => {
    // TODO: Open appointment creation dialog
    console.log('Create appointment for:', date);
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
    // TODO: Open patient creation dialog
    console.log('Create new patient');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <AppointmentCalendar
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
        return <SettingsPanel />;
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
    </div>
  );
};

export default Index;
