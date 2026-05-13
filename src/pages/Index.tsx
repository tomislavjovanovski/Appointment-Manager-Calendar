import { useState, useEffect, useMemo } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { WeeklyScheduler } from '@/components/dashboard/WeeklyScheduler';
import { PatientList } from '@/components/patients/PatientList';
import { TabbedSettingsPanel } from '@/components/settings/TabbedSettingsPanel';
import AppointmentDialog from '@/components/appointments/AppointmentDialog';
import { CreatePatientDialog } from '@/components/patients/CreatePatientDialog';
import { Patient, Appointment } from '@/types/appointment';
import { appointmentsStorage, patientsStorage } from '@/lib/storage';
import { useI18n } from '@/i18n';

const Index = () => {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [sidebarStats, setSidebarStats] = useState({
    totalPatients: 0,
    totalVisits: 0,
    visitsThisMonth: 0,
  });

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
    setPatientDialogOpen(true);
  };

  const handleCreatePatient = () => {
    setSelectedPatient(null);
    setPatientDialogOpen(true);
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // sanitize stored appointments once on mount to avoid invalid dates causing crashes
  useEffect(() => {
    try {
      const raw = localStorage.getItem('medical-appointments');
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return;
      const cleaned = arr
        .map((a: any) => {
          try {
            const s = new Date(a.start);
            const e = new Date(a.end);
            if (!isFinite(s.getTime()) || !isFinite(e.getTime())) return null;
            return { ...a, start: s.toISOString(), end: e.toISOString() };
          } catch (e) {
            return null;
          }
        })
        .filter(Boolean);
      localStorage.setItem('medical-appointments', JSON.stringify(cleaned));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadSidebarStats = async () => {
      try {
        const [patients, appointments] = await Promise.all([
          patientsStorage.getAll().catch(() => []),
          appointmentsStorage.getAll().catch(() => []),
        ]);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const visitsThisMonth = appointments.filter((appointment: any) => {
          const start = new Date(appointment.startTime ?? appointment.start);
          return (
            isFinite(start.getTime()) &&
            start.getMonth() === currentMonth &&
            start.getFullYear() === currentYear
          );
        }).length;

        if (isMounted) {
          setSidebarStats({
            totalPatients: patients.length,
            totalVisits: appointments.length,
            visitsThisMonth,
          });
        }
      } catch (error) {
        if (isMounted) {
          setSidebarStats({
            totalPatients: 0,
            totalVisits: 0,
            visitsThisMonth: 0,
          });
        }
      }
    };

    loadSidebarStats();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const sidebarStatItems = useMemo(
    () => [
      { label: t('sidebar.totalPatients'), value: sidebarStats.totalPatients },
      { label: t('sidebar.totalVisits'), value: sidebarStats.totalVisits },
      { label: t('sidebar.visitsThisMonth'), value: sidebarStats.visitsThisMonth },
    ],
    [sidebarStats, t]
  );

  // Save new or updated appointment to appointmentsStorage
  const handleSaveAppointment = async (data: any) => {
    try {
      // Resolve patient name from localStorage patients safely
      const rawPatients = localStorage.getItem('medical-patients') || '[]';
      const patientsArr = Array.isArray(JSON.parse(rawPatients)) ? JSON.parse(rawPatients) : [];
      const patientObj = patientsArr.find((p: any) => {
        const id = p.id ?? p._id ?? p.patientId ?? String(p.email ?? p.name ?? '');
        return id === data.patientId;
      });
      let patientName: string | undefined;
      if (patientObj) {
        const fullName = `${patientObj.firstName ?? ''} ${patientObj.lastName ?? ''}`.trim();
        patientName = (patientObj.name ?? fullName) || patientObj.email;
      } else {
        patientName = undefined;
      }

      // normalize dates to ISO strings
      const startISO = new Date(data.start).toISOString();
      const endISO = new Date(data.end).toISOString();
      const durationMs = new Date(endISO).getTime() - new Date(startISO).getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      // Map to valid durations: 30, 60, or 120
      const validDuration = durationMinutes <= 45 ? 30 : durationMinutes <= 90 ? 60 : 120 as 30 | 60 | 120;

      if (selectedAppointment && selectedAppointment.id) {
        // update
        const updatedAppt = {
          id: selectedAppointment.id,
          title: data.title,
          patientId: data.patientId,
          patientName: patientName,
          type: data.type || 'consultation',
          startTime: startISO,
          endTime: endISO,
          duration: validDuration,
          notes: data.notes,
          status: selectedAppointment.status || 'scheduled',
          createdAt: selectedAppointment.createdAt || new Date().toISOString()
        };
        await appointmentsStorage.update(selectedAppointment.id, updatedAppt);
        console.log('Updated appointment:', updatedAppt);
        setSelectedAppointment(null);
        setEditDialogOpen(false);
      } else {
        // create
        const id = Date.now().toString();
        const newAppt = {
          id,
          title: data.title,
          patientId: data.patientId,
          patientName: patientName,
          type: data.type || 'consultation',
          startTime: startISO,
          endTime: endISO,
          duration: validDuration,
          notes: data.notes,
          status: 'scheduled' as const,
          createdAt: new Date().toISOString()
        };
        await appointmentsStorage.add(newAppt);
        console.log('Created appointment:', newAppt);
        console.log('Appointments storage result:', await appointmentsStorage.getAll());
        setAppointmentDialogOpen(false);
      }

      handleRefresh();
    } catch (e) {
      console.error('Failed to save appointment', e);
    }
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
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} stats={sidebarStatItems} />
      <main className="flex-1 min-w-0 bg-gradient-to-b from-muted/25 via-background to-background p-6 md:p-8 lg:px-10 lg:py-9">
        <div className="mx-auto max-w-[1600px]">{renderContent()}</div>
      </main>
      
      <AppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={setAppointmentDialogOpen}
        selectedDate={selectedDate}
        onAppointmentCreated={handleRefresh}
        onSubmit={handleSaveAppointment}
      />
      
      <CreatePatientDialog
        open={patientDialogOpen}
        onOpenChange={(open) => {
          setPatientDialogOpen(open);
          if (!open) setSelectedPatient(null);
        }}
        patient={selectedPatient}
        onPatientCreated={handleRefresh}
        onPatientUpdated={handleRefresh}
      />

      {/* Edit dialog uses same component but with appointment prop */}
      <AppointmentDialog
        open={editDialogOpen}
        onOpenChange={(o)=>{ setEditDialogOpen(o); if(!o) setSelectedAppointment(null);} }
        appointment={selectedAppointment}
        onSubmit={handleSaveAppointment}
        onUpdated={handleRefresh}
      />
    </div>
  );
};

export default Index;
