import { useState, useEffect, useMemo, useRef } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { WeeklyScheduler } from '@/components/dashboard/WeeklyScheduler';
import { PatientList } from '@/components/patients/PatientList';
import { TabbedSettingsPanel } from '@/components/settings/TabbedSettingsPanel';
import AppointmentDialog from '@/components/appointments/AppointmentDialog';
import { CreatePatientDialog } from '@/components/patients/CreatePatientDialog';
import { Patient, Appointment } from '@/types/appointment';
import { appointmentsStorage, patientsStorage } from '@/lib/storage';
import { useI18n } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { MobileAgenda } from '@/components/dashboard/MobileAgenda';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu, Plus } from 'lucide-react';

const rangesOverlap = (
  startA: number,
  endA: number,
  startB: number,
  endB: number
) => startA < endB && startB < endA;

const Index = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const appointmentSaveInFlightRef = useRef(false);
  const [sidebarStats, setSidebarStats] = useState({
    totalPatients: 0,
    totalVisits: 0,
    visitsThisMonth: 0,
  });

  const handleCreateAppointment = (date: Date) => {
    console.log('handleCreateAppointment called with:', date);
    setSelectedAppointment(null);
    setSelectedDate(date);
    setAppointmentDialogOpen(true);
  };

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setSelectedDate(undefined);
    setAppointmentDialogOpen(true);
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

  const activeTabTitle = {
    dashboard: t('sidebar.dashboard'),
    patients: t('sidebar.patients'),
    settings: t('sidebar.settings'),
  }[activeTab] ?? t('sidebar.dashboard');

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setMobileNavigationOpen(false);
  };

  // Save new or updated appointment to appointmentsStorage
  const handleSaveAppointment = async (data: any) => {
    if (appointmentSaveInFlightRef.current) {
      return;
    }

    appointmentSaveInFlightRef.current = true;
    setSavingAppointment(true);

    try {
      const patientsArr = await patientsStorage.getAll().catch(() => []);
      const existingAppointments = await appointmentsStorage.getAll().catch(() => []);
      const patientObj = patientsArr.find((p: any) => {
        const id = p.id ?? p._id ?? p.patientId ?? String(p.email ?? p.name ?? '');
        return id === data.patientId;
      });
      let patientName: string | undefined = data.patientName;
      if (patientObj) {
        const fullName = `${patientObj.firstName ?? ''} ${patientObj.lastName ?? ''}`.trim();
        patientName = (patientObj.name ?? fullName) || patientObj.email;
      }

      // normalize dates to ISO strings
      const startISO = new Date(data.start).toISOString();
      const endISO = new Date(data.end).toISOString();
      const startMs = new Date(startISO).getTime();
      const endMs = new Date(endISO).getTime();
      const durationMs = new Date(endISO).getTime() - new Date(startISO).getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      // Map to valid durations: 30, 60, or 120
      const validDuration = durationMinutes <= 45 ? 30 : durationMinutes <= 90 ? 60 : 120 as 30 | 60 | 120;

      const conflictingAppointment = existingAppointments.find((appointment: any) => {
        if (appointment.id === selectedAppointment?.id) {
          return false;
        }

        const appointmentStart = new Date(appointment.startTime ?? appointment.start).getTime();
        const appointmentEnd = new Date(appointment.endTime ?? appointment.end).getTime();

        if (!Number.isFinite(appointmentStart) || !Number.isFinite(appointmentEnd)) {
          return false;
        }

        return rangesOverlap(startMs, endMs, appointmentStart, appointmentEnd);
      });

      if (conflictingAppointment) {
        const conflictError = new Error('This time range overlaps an existing appointment.');
        conflictError.name = 'SlotConflictError';
        toast({
          title: t('common.error'),
          description: conflictError.message,
          variant: 'destructive',
        });
        throw conflictError;
      }

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
          status: data.status || selectedAppointment.status || 'scheduled',
          createdAt: selectedAppointment.createdAt || new Date().toISOString()
        };
        await appointmentsStorage.update(selectedAppointment.id, updatedAppt);
        console.log('Updated appointment:', updatedAppt);
        setSelectedAppointment(null);
        setAppointmentDialogOpen(false);
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
      if (e instanceof Error && e.name === 'SlotConflictError') {
        throw e;
      }
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : 'Failed to save appointment',
        variant: 'destructive',
      });
      throw e;
    } finally {
      appointmentSaveInFlightRef.current = false;
      setSavingAppointment(false);
    }
  };

  const handleDeleteAppointment = async () => {
    if (!selectedAppointment?.id) {
      return;
    }

    try {
      await appointmentsStorage.delete(selectedAppointment.id);
      setSelectedAppointment(null);
      setSelectedDate(undefined);
      setAppointmentDialogOpen(false);
      handleRefresh();
      toast({
        title: 'Appointment deleted',
      });
    } catch (e) {
      console.error('Failed to delete appointment', e);
      toast({
        title: t('common.error'),
        description: e instanceof Error ? e.message : 'Failed to delete appointment',
        variant: 'destructive',
      });
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <MobileAgenda
              onCreateAppointment={handleCreateAppointment}
              onAppointmentClick={handleAppointmentClick}
              refreshTrigger={refreshTrigger}
            />
            <div className="hidden md:block">
              <WeeklyScheduler
                onCreateAppointment={handleCreateAppointment}
                onAppointmentClick={handleAppointmentClick}
                refreshTrigger={refreshTrigger}
              />
            </div>
          </>
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
        return <div>{t('notFound.message')}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} stats={sidebarStatItems} className="hidden md:flex" />
      <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
        <SheetContent side="left" className="w-[18rem] p-0 sm:max-w-none">
          <SheetHeader className="sr-only">
            <SheetTitle>{t('sidebar.menu')}</SheetTitle>
          </SheetHeader>
          <Sidebar activeTab={activeTab} onTabChange={handleTabChange} stats={sidebarStatItems} className="h-full w-full border-r-0" />
        </SheetContent>
      </Sheet>
      <main className="flex-1 min-w-0 bg-gradient-to-b from-muted/25 via-background to-background p-4 sm:p-6 md:p-8 lg:px-10 lg:py-9">
        <header className="mb-5 flex items-center justify-between md:hidden">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Open navigation"
            onClick={() => setMobileNavigationOpen(true)}
            className="h-10 w-10 rounded-xl bg-background/80 shadow-sm"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold tracking-tight">{activeTabTitle}</h1>
          <Button
            type="button"
            size="icon"
            aria-label={t('dashboard.newAppointment')}
            onClick={() => handleCreateAppointment(new Date())}
            className="h-10 w-10 rounded-xl shadow-sm"
          >
            <Plus className="h-5 w-5" />
          </Button>
        </header>
        <div className="mx-auto max-w-[1600px]">{renderContent()}</div>
      </main>
      
      <AppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={(open) => {
          setAppointmentDialogOpen(open);
          if (!open) {
            setSelectedAppointment(null);
            setSelectedDate(undefined);
          }
        }}
        selectedDate={selectedDate}
        appointment={selectedAppointment}
        onAppointmentCreated={handleRefresh}
        onSubmit={handleSaveAppointment}
        onUpdated={handleRefresh}
        onDelete={handleDeleteAppointment}
        refreshTrigger={refreshTrigger}
        saving={savingAppointment}
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
    </div>
  );
};

export default Index;
