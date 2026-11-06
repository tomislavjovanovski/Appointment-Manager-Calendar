import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { APP_NAVIGATION, Sidebar, SidebarToggle } from '@/components/layout/Sidebar';
import { useAuth } from '@/auth/AuthProvider';
import { WeeklyScheduler } from '@/components/dashboard/WeeklyScheduler';
import { PatientList } from '@/components/patients/PatientList';
import { MonthlyStatistics } from '@/components/statistics/MonthlyStatistics';
import { TabbedSettingsPanel } from '@/components/settings/TabbedSettingsPanel';
import AppointmentDialog from '@/components/appointments/AppointmentDialog';
import { CreatePatientDialog } from '@/components/patients/CreatePatientDialog';
import { Patient, Appointment, AppointmentSettings, BlockedSlot } from '@/types/appointment';
import { appointmentsStorage, patientsStorage, settingsStorage } from '@/lib/storage';
import { useI18n } from '@/i18n';
import { useToast } from '@/hooks/use-toast';
import { MobileAgenda } from '@/components/dashboard/MobileAgenda';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Menu, Plus } from 'lucide-react';
import { format, isSameDay, isSameMonth, isSameWeek, isValid } from 'date-fns';
import { DocumentationSummary, DocumentationReviewDialog } from '@/components/dashboard/DocumentationSummary';
import { useDocumentationReminders } from '@/hooks/use-documentation-reminders';
import { appointmentTimes } from '@/lib/documentationReminders';
import BrandLogo from '@/components/brand/BrandLogo';
import brand from '@/config/brand.json';

const rangesOverlap = (
  startA: number,
  endA: number,
  startB: number,
  endB: number
) => startA < endB && startB < endA;

const Index = () => {
  const { t, initialSettings } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [brandSettings, setBrandSettings] = useState<Pick<AppointmentSettings, 'practiceName' | 'logoDataUrl' | 'appointmentTypes'>>(initialSettings ?? {});
  const brandName = brandSettings.practiceName?.trim() || t('sidebar.appName');
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [appointmentDialogOpen, setAppointmentDialogOpen] = useState(false);
  const [patientDialogOpen, setPatientDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [blockedSlots, setBlockedSlots] = useState<BlockedSlot[]>(initialSettings?.blockedSlots ?? []);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [savingAppointment, setSavingAppointment] = useState(false);
  const appointmentSaveInFlightRef = useRef(false);
  const [sidebarAppointments, setSidebarAppointments] = useState<Appointment[]>([]);
  const [documentationReviewDay, setDocumentationReviewDay] = useState<string | null>(null);
  const [dismissedDocumentation, setDismissedDocumentation] = useState<Set<string>>(() => new Set());
  const [patientSummary, setPatientSummary] = useState({ total: 0, newThisMonth: 0 });
  const [patientStatsError, setPatientStatsError] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(false);
  const [today, setToday] = useState(() => new Date());
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

  const handleBlockSlot = async (start: Date, end: Date) => {
    const settings = await settingsStorage.get();
    const blockedSlots = settings.blockedSlots ?? [];
    const alreadyBlocked = blockedSlots.some((slot) =>
      new Date(slot.startTime).getTime() === start.getTime() && new Date(slot.endTime).getTime() === end.getTime()
    );
    if (alreadyBlocked) return;
    const nextBlockedSlots = [
        ...blockedSlots,
        { id: `blocked-${Date.now()}`, startTime: start.toISOString(), endTime: end.toISOString() },
    ];
    await settingsStorage.update({ blockedSlots: nextBlockedSlots });
    setBlockedSlots(nextBlockedSlots);
    toast({ title: t('appointment.blockedTitle'), description: t('appointment.blockedDescription') });
  };

  const handleUnblockSlot = async (slot: BlockedSlot) => {
    const settings = await settingsStorage.get();
    const nextBlockedSlots = (settings.blockedSlots ?? []).filter((candidate) => candidate.id !== slot.id);
    await settingsStorage.update({ blockedSlots: nextBlockedSlots });
    setBlockedSlots(nextBlockedSlots);
    toast({ title: t('appointment.unblockedTitle'), description: t('appointment.unblockedDescription') });
  };
  
  const handlePatientClick = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientDialogOpen(true);
  };

  const handleCreatePatient = () => {
    setSelectedPatient(null);
    setPatientDialogOpen(true);
  };

  const handleRefresh = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  const documentation = useDocumentationReminders(sidebarAppointments, handleRefresh);
  const selectedDocumentationSummary = documentation.summaries.find((summary) => summary.day === documentationReviewDay);

  const handleDocumentationReview = (day: string) => {
    setDocumentationReviewDay(day);
    setActiveTab('dashboard');
  };

  const handleDocumentationNotesSave = async (notes: { id: string; notes: string }[]) => {
    try {
      // The JSON store writes whole files; avoid parallel read-modify-write updates.
      for (const note of notes) {
        const updated = await appointmentsStorage.update(note.id, { notes: note.notes });
        setSidebarAppointments((current) => current.map((record) => record.id === updated.id ? updated : record));
      }
    } finally {
      handleRefresh();
    }
  };

  const handleDocumentationAcknowledgement = async (appointments: Appointment[]) => {
    const documentationReviewedAt = new Date().toISOString();
    try {
      // The JSON store writes whole files; avoid parallel read-modify-write updates.
      for (const appointment of appointments) {
        const updated = await appointmentsStorage.update(appointment.id, { documentationReviewedAt });
        setSidebarAppointments((current) => current.map((record) => record.id === updated.id ? updated : record));
      }
    } finally {
      handleRefresh();
    }
  };

  const selectedNeedsReminderReview = selectedAppointment &&
    !sidebarAppointments.find((appointment) => appointment.id === selectedAppointment.id)?.documentationReviewedAt &&
    (documentation.previousIds.has(selectedAppointment.id) ||
     documentation.summaries.some((summary) => summary.pending.some((appointment) => appointment.id === selectedAppointment.id)));
  const selectedNeedsReview = selectedNeedsReminderReview ||
    (selectedAppointment && documentation.latestEnded?.id === selectedAppointment.id);

  useEffect(() => {
    document.title = brandName === brand.name ? brand.name : `${brandName} | ${brand.name}`;
    return () => { document.title = brand.name; };
  }, [brandName]);

  useEffect(() => {
    const timer = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);


  useEffect(() => {
    let isMounted = true;

    const loadSidebarStats = async () => {
      setOverviewLoading(true);
      setOverviewError(false);
      setPatientStatsError(false);
      try {
        const [patients, appointments] = await Promise.all([
          patientsStorage.getSummary().catch(() => {
            if (isMounted) setPatientStatsError(true);
            return null;
          }),
          appointmentsStorage.getAll(),
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
          setSidebarAppointments(appointments);
          if (patients) setPatientSummary(patients);
          setSidebarStats({
            totalPatients: patients?.total ?? 0,
            totalVisits: appointments.length,
            visitsThisMonth,
          });
        }
      } catch (error) {
        if (isMounted) {
          setOverviewError(true);
          setSidebarStats({
            totalPatients: 0,
            totalVisits: 0,
            visitsThisMonth: 0,
          });
        }
      } finally {
        if (isMounted) setOverviewLoading(false);
      }
    };

    loadSidebarStats();

    return () => {
      isMounted = false;
    };
  }, [refreshTrigger]);

  const sidebarStatItems = useMemo(
    () => [
      { label: t('sidebar.today'), value: sidebarAppointments.filter((appointment) => isValid(new Date(appointment.startTime)) && isSameDay(new Date(appointment.startTime), today)).length },
      { label: t('sidebar.thisWeek'), value: sidebarAppointments.filter((appointment) => isSameWeek(new Date(appointment.startTime), today, { weekStartsOn: 1 })).length },
      { label: t('sidebar.thisMonth'), value: sidebarAppointments.filter((appointment) => isSameMonth(new Date(appointment.startTime), today)).length },
      { label: t('sidebar.allTime'), value: sidebarStats.totalVisits },
    ],
    [sidebarStats, sidebarAppointments, today, t]
  );

  const patientStatItems = [
    { label: t('sidebar.totalPatients'), value: patientSummary.total },
    { label: t('sidebar.newPatientsMonth'), value: patientSummary.newThisMonth },
  ];

  const activeTabTitle = {
    dashboard: t('sidebar.dashboard'),
    patients: t('sidebar.patients'),
    statistics: t('sidebar.statistics'),
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
      const [patientsArr, existingAppointments] = await Promise.all([
        patientsStorage.getAll(),
        appointmentsStorage.getAll(),
      ]);
      const patientObj = patientsArr.find((p: any) => {
        const id = p.id ?? p._id ?? p.patientId ?? String(p.email ?? p.name ?? '');
        return id === data.patientId;
      });
      let patientName: string | undefined = data.patientName;
      if (patientObj) {
        const fullName = `${patientObj.firstName ?? ''} ${patientObj.lastName ?? ''}`.trim();
        const legacyName = 'name' in patientObj && typeof patientObj.name === 'string' ? patientObj.name : undefined;
        patientName = (legacyName ?? fullName) || patientObj.email;
      }

      const originalTimes = selectedAppointment ? appointmentTimes(selectedAppointment) : null;
      const unchangedSchedule = originalTimes &&
        format(new Date(originalTimes.start), "yyyy-MM-dd'T'HH:mm") === data.start &&
        format(new Date(originalTimes.end), "yyyy-MM-dd'T'HH:mm") === data.end &&
        Number(data.duration) === selectedAppointment.duration;
      // Preserve exact persisted timestamps when only editing documentation/status.
      const startISO = new Date(unchangedSchedule ? originalTimes.start : data.start).toISOString();
      const endISO = new Date(unchangedSchedule ? originalTimes.end : data.end).toISOString();
      const startMs = new Date(startISO).getTime();
      const endMs = new Date(endISO).getTime();
      const durationMs = new Date(endISO).getTime() - new Date(startISO).getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));
      const validDuration = durationMinutes as 30 | 45 | 60 | 90 | 120;

      const conflictingAppointment = !unchangedSchedule && existingAppointments.find((appointment: any) => {
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
          startTime: unchangedSchedule ? selectedAppointment.startTime ?? startISO : startISO,
          endTime: unchangedSchedule ? selectedAppointment.endTime ?? endISO : endISO,
          duration: unchangedSchedule ? selectedAppointment.duration : validDuration,
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
          type: data.type || 'procedure',
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

  const renderNavigationTabs = () => (
    <TabsList aria-label={t('sidebar.menu')} className="hidden h-auto justify-start gap-0.5 rounded-lg border border-border/60 bg-background/80 p-0.5 shadow-sm md:inline-flex">
      {APP_NAVIGATION.map((item) => {
        const Icon = item.icon;
        return (
          <TabsTrigger
            key={item.id}
            value={item.id}
            data-testid={item.testId}
            className="gap-1.5 rounded-md px-2.5 py-1.5 text-xs hover:bg-muted hover:text-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none"
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            {t(item.nameKey)}
          </TabsTrigger>
        );
      })}
    </TabsList>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <>
            <MobileAgenda
              onCreateAppointment={handleCreateAppointment}
              onAppointmentClick={handleAppointmentClick}
              refreshTrigger={refreshTrigger}
              blockedSlots={blockedSlots}
              onUnblockSlot={handleUnblockSlot}
              documentationReminderIds={documentation.previousIds}
            />
            <div className="hidden md:block">
              <WeeklyScheduler
                brandName={brandName}
                logoDataUrl={brandSettings.logoDataUrl}
                navigation={renderNavigationTabs()}
                onCreateAppointment={handleCreateAppointment}
                onAppointmentClick={handleAppointmentClick}
                refreshTrigger={refreshTrigger}
                blockedSlots={blockedSlots}
                onUnblockSlot={handleUnblockSlot}
                documentationReminderIds={documentation.previousIds}
                onAppointmentsChanged={handleRefresh}
                documentationBanner={<DocumentationSummary
                  summaries={overviewError ? [] : documentation.summaries}
                  latestEnded={overviewError ? null : documentation.latestEnded}
                  dismissed={dismissedDocumentation}
                  onDismiss={(key) => setDismissedDocumentation((current) => new Set(current).add(key))}
                  onReview={handleDocumentationReview}
                  onAppointmentClick={handleAppointmentClick}
                />}
              />
            </div>
          </>
        );
      case 'patients':
        return (
          <PatientList
            navigation={renderNavigationTabs()}
            onPatientClick={handlePatientClick}
            onCreatePatient={handleCreatePatient}
            onPatientDeleted={handleRefresh}
            refreshTrigger={refreshTrigger}
          />
        );
      case 'statistics':
        return <MonthlyStatistics navigation={renderNavigationTabs()} refreshTrigger={refreshTrigger} />;
      case 'settings':
        return <TabbedSettingsPanel navigation={renderNavigationTabs()} onSettingsSaved={(settings) => {
          setBrandSettings(settings);
          handleRefresh();
        }} onPatientsMerged={() => setRefreshTrigger((value) => value + 1)} />;
      default:
        return <div>{t('notFound.message')}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        stats={sidebarStatItems}
        patientStats={patientStatItems}
        patientStatsError={patientStatsError || overviewError}
        brandName={brandName}
        logoDataUrl={brandSettings.logoDataUrl}
        settings={brandSettings}
        overviewLoading={overviewLoading}
        overviewError={overviewError}
        onOverviewRetry={handleRefresh}
        showNavigation={false}
        className="hidden md:flex"
      />
      <Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}>
        <SheetContent side="left" className="w-[18rem] p-0 sm:max-w-none">
          <SheetHeader className="sr-only">
            <SheetTitle>{t('sidebar.menu')}</SheetTitle>
          </SheetHeader>
          <Sidebar activeTab={activeTab} onTabChange={handleTabChange} stats={sidebarStatItems} patientStats={patientStatItems} patientStatsError={patientStatsError || overviewError} overviewLoading={overviewLoading} overviewError={overviewError} brandName={brandName} logoDataUrl={brandSettings.logoDataUrl} settings={brandSettings} className="h-full w-full border-r-0" />
        </SheetContent>
      </Sheet>
      <main className="flex-1 min-w-0 bg-gradient-to-b from-muted/25 via-background to-background p-4 sm:p-6 md:bg-none md:bg-workspace md:px-3 md:py-4">
        {activeTab !== 'dashboard' && user?.preferences?.desktopSidebarCollapsed === true && (
          <div className="mb-2 hidden md:block">
            <SidebarToggle collapsed className="w-8 px-0" />
          </div>
        )}
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
          <div className="flex min-w-0 flex-col items-center gap-1">
            <BrandLogo variant="horizontal" size={24} wordmarkClassName="text-base" />
            <h1 className="text-xs font-medium text-muted-foreground">{activeTabTitle}</h1>
          </div>
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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsContent value={activeTab} className="mt-0">{renderContent()}</TabsContent>
        </Tabs>
      </main>
      
      {selectedDocumentationSummary && activeTab === 'dashboard' && (
        <DocumentationReviewDialog key={selectedDocumentationSummary.day}
          summary={selectedDocumentationSummary}
          onClose={() => setDocumentationReviewDay(null)}
          onSaveNotes={handleDocumentationNotesSave}
          onAcknowledge={handleDocumentationAcknowledgement}
        />
      )}
      <AppointmentDialog
        open={appointmentDialogOpen}
        onOpenChange={(open) => {
          setAppointmentDialogOpen(open);
          if (!open) {
            setSelectedAppointment(null);
            setSelectedDate(undefined);
            handleRefresh();
          }
        }}
        selectedDate={selectedDate}
        appointment={selectedAppointment}
        onAppointmentCreated={handleRefresh}
        onSubmit={handleSaveAppointment}
        onUpdated={handleRefresh}
        onDelete={handleDeleteAppointment}
        onReviewDocumentation={selectedNeedsReview && selectedAppointment ? async () => {
          await handleDocumentationAcknowledgement([selectedAppointment]);
        } : undefined}
        onBlockSlot={handleBlockSlot}
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
        onPatientDeleted={handleRefresh}
      />
    </div>
  );
};

export default Index;
