import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addMinutes } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";import { Switch } from '@/components/ui/switch';import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { CalendarDays, Check, ChevronsUpDown, Clock3, ClipboardList, FileText, UserRound } from "lucide-react";
import { patientsStorage } from "@/lib/storage";
import { createEmptyPatientForm, normalizePatientForm, validatePatientForm } from '@/lib/patientForm';
import type { Appointment, Patient as StoredPatient } from "@/types/appointment";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from '@/i18n';

const appointmentSchema = z.object({
  title: z.string().min(1),
  patientId: z.string().nullable(),
  syncToGoogle: z.boolean().optional(),
  type: z.enum(["consultation", "follow-up", "procedure"]).optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no-show"]).optional(),
  duration: z.enum(["30", "60", "120"]).optional(),
  start: z.string().min(1),
  end: z.string().min(1),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof appointmentSchema>;
type AppointmentDuration = NonNullable<FormData["duration"]>;
type AppointmentType = NonNullable<FormData["type"]>;
type AppointmentStatus = NonNullable<FormData["status"]>;

type PatientOption = { id: string; name: string; searchValue?: string };
type AppointmentDialogAppointment = Partial<Appointment> & {
  duration?: AppointmentDuration | number;
  start?: string;
  end?: string;
};
type AppointmentDialogSubmitData = FormData & {
  patientName?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // optional explicit mode, otherwise inferred from `appointment`
  mode?: "create" | "edit";
  // legacy initial values
  initialValues?: Partial<FormData>;
  patients?: PatientOption[];
  onSubmit?: (data: FormData) => Promise<void> | void;
  saving?: boolean;
  // added compatibility props
  selectedDate?: Date | null;
  onAppointmentCreated?: (data: AppointmentDialogSubmitData) => void;
  onUpdated?: (data: AppointmentDialogSubmitData) => void;
  onDelete?: () => Promise<void> | void;
  // if provided, dialog acts as edit form
  appointment?: AppointmentDialogAppointment;
  refreshTrigger?: number;
};

// helper to convert Date/ISO to datetime-local string (YYYY-MM-DDTHH:mm)
function toDateTimeLocal(value?: string | Date) {
  const d = value ? new Date(value) : new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const YYYY = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const DD = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${YYYY}-${MM}-${DD}T${hh}:${mm}`;
}

// helper to round a date up to the next interval (minutes)
function roundToInterval(date: Date, minutes = 15) {
  const d = new Date(date);
  const ms = 1000 * 60 * minutes;
  return new Date(Math.ceil(d.getTime() / ms) * ms);
}

export default function AppointmentDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  patients,
  onSubmit,
  saving = false,
  selectedDate = null,
  onAppointmentCreated,
  onUpdated,
  onDelete,
  appointment,
  refreshTrigger = 0,
}: Props) {
  const { t } = useI18n();
  // Determine effective mode: explicit mode wins, otherwise presence of `appointment` means edit
  const effectiveMode: "create" | "edit" = mode ?? (appointment ? "edit" : "create");

  const mergedInitial = useMemo<Partial<FormData> | undefined>(() => {
    if (!appointment) return initialValues;

    const normalizedDuration = String(appointment.duration ?? "30") as AppointmentDuration;

    return {
      title: appointment.title,
      patientId: appointment.patientId ?? null,
      type: appointment.type ?? "consultation",
      status: appointment.status ?? "scheduled",
      duration: normalizedDuration,
      start: appointment.startTime ?? appointment.start,
      end: appointment.endTime ?? appointment.end,
      notes: appointment.notes ?? "",
    };
  }, [appointment, initialValues]);

  const defaultValues = useMemo<FormData>(() => {
    const rawDefaultStart =
      selectedDate ?? (mergedInitial?.start ? new Date(mergedInitial.start) : new Date());
    const defaultStart = appointment
      ? new Date(mergedInitial?.start ?? rawDefaultStart)
      : roundToInterval(rawDefaultStart, 15);
    const duration = String(mergedInitial?.duration ?? "30") as AppointmentDuration;

    return {
      title: mergedInitial?.title ?? "",
      patientId: mergedInitial?.patientId ?? null,
      type: (mergedInitial?.type ?? "consultation") as AppointmentType,
      status: (mergedInitial?.status ?? "scheduled") as AppointmentStatus,
      duration,
      start: mergedInitial?.start
        ? toDateTimeLocal(mergedInitial.start)
        : toDateTimeLocal(defaultStart),
      end: mergedInitial?.end
        ? toDateTimeLocal(mergedInitial.end)
        : toDateTimeLocal(addMinutes(defaultStart, Number(duration))),
      notes: mergedInitial?.notes ?? "",
      syncToGoogle: false,
    };
  }, [appointment, mergedInitial, selectedDate]);

  const { register, handleSubmit, setValue, watch, formState, reset } = useForm<FormData>({
    resolver: zodResolver(appointmentSchema),
    mode: "onChange",
    defaultValues,
  });

  const startValue = watch("start");
  const durationValue = watch("duration");
  const endValue = watch("end");
  const statusValue = watch("status");
  const syncToGoogleValue = watch("syncToGoogle");
  const patientIdValue = watch("patientId");
  // local patients state: prefer prop but fall back to the configured storage source
  const [localPatients, setLocalPatients] = useState<PatientOption[]>(patients ?? []);
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [showNewPatientPanel, setShowNewPatientPanel] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState(createEmptyPatientForm);
  const [savingNewPatient, setSavingNewPatient] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionErrorId, setSubmissionErrorId] = useState<string | null>(null);
  const { toast } = useToast();

  const resetNewPatientForm = () => {
    setNewPatientForm(createEmptyPatientForm());
  };

  const buildPatientOption = (patient: StoredPatient): PatientOption => ({
    id: patient.id,
    name: `${patient.firstName ?? ''} ${patient.lastName ?? ''}`.trim() || patient.email || t('common.unknown'),
    searchValue: [patient.firstName, patient.lastName, patient.email, patient.phone].filter(Boolean).join(' '),
  });

  const selectedPatient = localPatients.find((patient) => patient.id === patientIdValue);

  useEffect(() => {
    if (startValue && durationValue) {
      const startDate = new Date(startValue);
      const durationMinutes = Number(durationValue);
      if (isFinite(startDate.getTime()) && [30, 60, 120].includes(durationMinutes)) {
        const expectedEnd = toDateTimeLocal(addMinutes(startDate, durationMinutes));
        if (expectedEnd !== endValue) {
          setValue("end", expectedEnd, { shouldDirty: true, shouldValidate: true });
        }
      }
    }
  }, [startValue, durationValue, endValue, setValue]);

  useEffect(() => {
    if (open) {
      reset(defaultValues);
      setShowNewPatientPanel(false);
      setPatientPickerOpen(false);
      setSubmissionError(null);
      setSubmissionErrorId(null);
      resetNewPatientForm();
    }
  }, [open, reset, defaultValues]);

  useEffect(() => {
    const selectedPatientId = mergedInitial?.patientId ?? null;
    if (!open || !selectedPatientId || !localPatients.length) {
      return;
    }

    const hasMatchingPatient = localPatients.some((patient) => patient.id === selectedPatientId);
    if (hasMatchingPatient && patientIdValue !== selectedPatientId) {
      setValue("patientId", selectedPatientId, { shouldDirty: false, shouldValidate: true });
    }
  }, [open, mergedInitial?.patientId, localPatients, patientIdValue, setValue]);

  useEffect(() => {
    if (patients && patients.length) {
      setLocalPatients((current) => {
        const mergedPatients = new Map(current.map((patient) => [patient.id, patient]));
        patients.forEach((patient) => mergedPatients.set(patient.id, patient));
        return Array.from(mergedPatients.values());
      });
      return;
    }

    if (!open) {
      return;
    }

    let isMounted = true;

    const loadPatients = async () => {
      try {
        const storedPatients = await patientsStorage.getAll();
        const mapped = storedPatients.map((p: StoredPatient & { _id?: string; patientId?: string; name?: string }) => {
          const id = p.id ?? p._id ?? p.patientId ?? String(p.email ?? p.name ?? Math.random());
          const fullName = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
          const name = (p.name ?? fullName) || p.email || t('common.unknown');
          return { id, name, searchValue: [p.firstName, p.lastName, p.email, p.phone].filter(Boolean).join(' ') };
        });

        if (isMounted) {
          setLocalPatients(mapped);
        }
      } catch {
        if (isMounted) {
          setLocalPatients([]);
        }
      }
    };

    loadPatients();

    return () => {
      isMounted = false;
    };
  }, [patients, open, refreshTrigger, t]);

  const saveNewPatient = async () => {
    const patientForm = normalizePatientForm(newPatientForm);
    const validationErrors = validatePatientForm(patientForm);

    if (Object.keys(validationErrors).length > 0) {
      setSubmissionError(validationErrors.emailInvalid
        ? t('appointment.validEmail')
        : t('appointment.requiredName'));
      setSubmissionErrorId('new-patient-panel');
      return null;
    }

    setSavingNewPatient(true);
    setSubmissionError(null);
    setSubmissionErrorId(null);

    try {
      const createdPatient = await patientsStorage.add({
        ...patientForm,
      });

      const created = buildPatientOption(createdPatient);
      setLocalPatients((current) =>
        current.some((patient) => patient.id === created.id) ? current : [...current, created]
      );
      setValue('patientId', created.id, { shouldDirty: true, shouldValidate: true });
      setPatientPickerOpen(false);
      setShowNewPatientPanel(false);
      resetNewPatientForm();

      toast({
        title: t('appointment.patientCreated'),
        description: t('appointment.patientReady', { name: created.name }),
      });

      return created;
    } catch (error) {
      const message = error instanceof Error ? error.message : t('appointment.createFailed');
      setSubmissionError(message);
      setSubmissionErrorId('new-patient-panel');
      return null;
    } finally {
      setSavingNewPatient(false);
    }
  };

  const submit = async (data: FormData) => {
    setSubmissionError(null);
    let patient = (localPatients || patients).find((p) => p.id === data.patientId);
    const enrichedData: AppointmentDialogSubmitData = {
      ...data,
      patientName: patient ? patient.name : undefined,
      syncToGoogle: data.syncToGoogle,
    };

    if (!patient && showNewPatientPanel) {
      const created = await saveNewPatient();
      if (!created) {
        return;
      }

      patient = created;
      enrichedData.patientId = created.id;
      enrichedData.patientName = created.name;
    }

    try {
      if (onSubmit) {
        await onSubmit(enrichedData);
      }
      if (effectiveMode === "create") {
        onAppointmentCreated?.(enrichedData);
      } else {
        onUpdated?.(enrichedData);
      }
      onOpenChange(false);
    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'SlotConflictError') {
        setSubmissionError(error.message);
        setSubmissionErrorId('error-slot-conflict');
        return;
      }
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!onDelete) {
      return;
    }

    try {
      await onDelete();
      setDeleteConfirmOpen(false);
    } catch (error) {
      toast({
        title: t('appointment.deleteFailed'),
        description: error instanceof Error ? error.message : t('appointment.unableToDelete'),
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-border/70 p-0 shadow-2xl sm:max-w-[800px]">
        <div className="max-h-[calc(100dvh-1rem)] overflow-y-auto sm:max-h-[calc(100vh-2rem)]" data-testid="booking-dialog">
          <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-background to-background px-5 py-3 sm:px-6">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-lg font-semibold tracking-tight">
                    {effectiveMode === "create" ? t('createAppointment.title') : t('editAppointment.title')}
                  </DialogTitle>
                  <DialogDescription className="max-w-2xl text-xs leading-relaxed">
                    {t('createAppointment.description')}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          {/* Read-only detail panel used by E2E tests to assert appointment display values */}
          {appointment && (
            <div className="px-5 py-4" data-testid="appointment-detail-dialog">
              <div className="mb-2 text-sm text-muted-foreground">{t('appointment.details')}</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{t('createAppointment.type')}</div>
                  <div data-testid="detail-type" className="font-medium">{(mergedInitial?.type ?? appointment.type) || t('common.unknown')}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{t('createAppointment.duration')}</div>
                  <div data-testid="detail-duration" className="font-medium">{String(mergedInitial?.duration ?? appointment.duration ?? '')}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">{t('editAppointment.notes')}</div>
                  <div data-testid="detail-notes" className="font-medium">{mergedInitial?.notes ?? appointment.notes ?? ''}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-xs text-muted-foreground">{t('appointment.patient')}</div>
                  <div data-testid="detail-patient-name" className="font-medium">{mergedInitial?.patientId ? (localPatients.find(p => p.id === mergedInitial?.patientId)?.name) : (appointment.patientName ?? t('common.unknown'))}</div>
                </div>
              </div>
              <hr className="my-3" />
            </div>
          )}

          <form onSubmit={handleSubmit(submit)}>
            <div className="space-y-3 px-5 py-4 sm:px-6">
              {/* Box 1: Title and Patient */}
              <section className="rounded-2xl border border-slate-300 bg-slate-100 p-2.5 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-[60%_40%]">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="flex items-center gap-2">
                      <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('appointment.title')}
                    </Label>
                    <Input id="title" data-testid="appointment-title-input" {...register("title")} className="h-10 border-border bg-background shadow-sm" />
                  </div>

                  <div className="space-y-1.5 pr-3">
                    <Label htmlFor="patientId" className="flex items-center gap-2">
                      <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('appointment.patient')}
                    </Label>
                    <Popover open={patientPickerOpen} onOpenChange={setPatientPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="patientId"
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-expanded={patientPickerOpen}
                          data-testid="patient-select"
                          className="h-10 w-full justify-between border-border bg-background font-normal shadow-sm hover:bg-background"
                        >
                          <span className="truncate">{selectedPatient?.name ?? t('appointment.selectPatient')}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-muted-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
                        <Command>
                          <CommandInput data-testid="patient-search-input" placeholder={t('appointment.searchPatients')} />
                          <CommandList>
                            <CommandEmpty>{t('appointment.noPatients')}</CommandEmpty>
                            <CommandGroup>
                              {localPatients.map((patient) => (
                                <CommandItem
                                  key={patient.id}
                                  value={`${patient.name} ${patient.searchValue ?? ''}`}
                                  data-testid={`patient-option-${patient.id}`}
                                  onSelect={() => {
                                    setValue('patientId', patient.id, { shouldDirty: true, shouldValidate: true });
                                    setPatientPickerOpen(false);
                                  }}
                                >
                                  <Check className={`mr-2 h-4 w-4 ${patient.id === patientIdValue ? 'opacity-100' : 'opacity-0'}`} />
                                  {patient.name}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="create-new-patient-btn"
                      className="mt-2 h-8 w-full border-border bg-background text-sm shadow-sm"
                      onClick={() => {
                        setShowNewPatientPanel((current) => !current);
                        setSubmissionError(null);
                        setSubmissionErrorId(null);
                      }}
                    >
                      {showNewPatientPanel ? t('appointment.cancelNewPatient') : t('appointment.addNewPatient')}
                    </Button>
                  </div>
                </div>
                {showNewPatientPanel && (
                  <div data-testid="new-patient-panel" className="mt-3 space-y-2 rounded-xl border border-border/80 bg-background p-2.5 shadow-sm">
                    <div className="grid gap-2 sm:grid-cols-3">
                          <Input
                            id="patient-first-name"
                            data-testid="patient-first-name"
                            placeholder={t('appointment.firstName')}
                            value={newPatientForm.firstName}
                            onChange={(e) => setNewPatientForm(f => ({ ...f, firstName: e.target.value }))}
                          />
                          <Input
                            id="patient-last-name"
                            data-testid="patient-last-name"
                            placeholder={t('appointment.lastName')}
                            value={newPatientForm.lastName}
                            onChange={(e) => setNewPatientForm(f => ({ ...f, lastName: e.target.value }))}
                          />
                          <Input
                            id="patient-email"
                            data-testid="patient-email"
                            type="email"
                            placeholder="Email"
                            value={newPatientForm.email}
                            onChange={(e) => setNewPatientForm(f => ({ ...f, email: e.target.value }))}
                          />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
                          <Input
                            id="patient-phone"
                            data-testid="patient-phone"
                            type="tel"
                            placeholder="Phone"
                            value={newPatientForm.phone}
                            onChange={(e) => setNewPatientForm(f => ({ ...f, phone: e.target.value }))}
                          />
                          <Input
                            id="patient-dob"
                            data-testid="patient-dob"
                            type="date"
                            placeholder="YYYY-MM-DD"
                            value={newPatientForm.dateOfBirth}
                            onChange={(e) => setNewPatientForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                          />
                          <Button
                            type="button"
                            data-testid="new-patient-save"
                            disabled={savingNewPatient}
                            onClick={() => void saveNewPatient()}
                            className="h-10 sm:self-stretch"
                          >
                            {savingNewPatient ? t('appointment.saving') : t('appointment.savePatient')}
                          </Button>
                    </div>
                          {submissionError && submissionErrorId === 'new-patient-panel' && (
                            <div
                              data-testid="new-patient-inline-error"
                              role="alert"
                              className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive-foreground"
                            >
                              {submissionError}
                            </div>
                          )}
                  </div>
                )}
              </section>

              {/* Box 2: Type and Duration */}
              <section className="rounded-2xl border border-slate-300 bg-slate-100 p-2.5 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-[60%_40%]">
                  <div className="space-y-1.5">
                    <Label htmlFor="type">{t('createAppointment.type')}</Label>
                    <Select
                      onValueChange={(val) =>
                        setValue("type", (val ?? "consultation") as AppointmentType, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      value={watch("type") ?? "consultation"}
                    >
                      <SelectTrigger
                        id="type"
                        data-testid="appointment-type-select"
                        className="h-10 border-border bg-background shadow-sm"
                      >
                        <SelectValue placeholder={t('appointment.selectType')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation" data-testid="appointment-type-option-consultation">{t('appointment.types.consultation')}</SelectItem>
                        <SelectItem value="follow-up" data-testid="appointment-type-option-follow-up">{t('appointment.types.followUp')}</SelectItem>
                        <SelectItem value="procedure" data-testid="appointment-type-option-procedure">{t('appointment.types.procedure')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 pr-3">
                    <Label htmlFor="duration">{t('createAppointment.duration')}</Label>
                    <Select
                      onValueChange={(val) =>
                        setValue("duration", (val ?? "30") as AppointmentDuration, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      value={watch("duration") ?? "30"}
                    >
                      <SelectTrigger
                        id="duration"
                        data-testid="duration-select"
                        className="h-10 border-border bg-background shadow-sm"
                      >
                        <SelectValue placeholder={t('appointment.selectDuration')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30" data-testid="duration-option-30">{t('appointment.halfHour')}</SelectItem>
                        <SelectItem value="60" data-testid="duration-option-60">{t('appointment.fullHour')}</SelectItem>
                        <SelectItem value="120" data-testid="duration-option-120">{t('appointment.doubleHour')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {effectiveMode === "edit" && (
                <section className="rounded-2xl border border-slate-300 bg-slate-100 p-2.5 shadow-sm">
                  <div className="space-y-1.5 pr-3">
                    <Label htmlFor="status">{t('editAppointment.status')}</Label>
                    <Select
                      onValueChange={(val) =>
                        setValue("status", (val ?? "scheduled") as FormData["status"], {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                      value={statusValue ?? "scheduled"}
                    >
                      <SelectTrigger
                        id="status"
                        data-testid="appointment-status-select"
                        className="h-10 border-border bg-background shadow-sm"
                      >
                        <SelectValue placeholder={t('appointment.selectStatus')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled" data-testid="appointment-status-option-scheduled">{t('appointment.status.scheduled')}</SelectItem>
                        <SelectItem value="completed" data-testid="appointment-status-option-completed">{t('appointment.status.completed')}</SelectItem>
                        <SelectItem value="cancelled" data-testid="appointment-status-option-cancelled">{t('appointment.status.cancelled')}</SelectItem>
                        <SelectItem value="no-show" data-testid="appointment-status-option-no-show">{t('appointment.status.noShow')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </section>
              )}

              {/* Box 3: Date (start/end) and Note */}
              <section className="rounded-2xl border border-slate-300 bg-slate-100 p-2.5 shadow-sm">
                <div className="grid gap-3 sm:grid-cols-[60%_40%]">
                  <div className="space-y-2.5">
                    <div className="space-y-1.5">
                      <Label htmlFor="start" className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {t('appointment.start')}
                      </Label>
                      <Input
                        id="start"
                        data-testid="appointment-start-input"
                        type="datetime-local"
                        {...register("start")}
                        className="h-10 border-border bg-background shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="end" className="flex items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                        {t('appointment.end')}
                      </Label>
                      <Input
                        id="end"
                        data-testid="appointment-end-input"
                        type="datetime-local"
                        {...register("end")}
                        className="h-10 border-border bg-background shadow-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pr-3">
                    <Label htmlFor="notes" className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('editAppointment.notes')}
                    </Label>
                    <Textarea
                      id="notes"
                      data-testid="appointment-notes"
                      {...register("notes")}
                      rows={3}
                      className="min-h-[88px] border-border bg-background shadow-sm"
                    />
                  </div>
                </div>
              </section>

              {/* Google sync toggle and submission errors */}
              <div className="px-3">
                <div className="flex items-center gap-3">
                  <input
                    id="google-sync-toggle"
                    data-testid="google-sync-toggle"
                    type="checkbox"
                    checked={!!syncToGoogleValue}
                    onChange={(e) => setValue('syncToGoogle', e.target.checked as any, { shouldDirty: true })}
                  />
                  <label htmlFor="google-sync-toggle" className="text-sm text-muted-foreground">{t('appointment.syncGoogle')}</label>
                </div>
                {submissionError && submissionErrorId === 'error-slot-conflict' && (
                  <div data-testid="error-slot-conflict" role="alert" className="mt-2 rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive-foreground">
                    {submissionError}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            <DialogFooter className="gap-3 px-5 py-2 sm:px-6">
              {effectiveMode === "edit" && onDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  data-testid="delete-appointment-btn"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="h-10"
                >
                  {t('appointment.delete')}
                </Button>
              )}
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 border-border/70">
                {t('editAppointment.cancel')}
              </Button>
              <Button
                type="submit"
                data-testid="booking-submit-btn"
                disabled={saving || !formState.isValid}
                className="h-10 px-5 shadow-sm"
              >
                {saving ? t('appointment.saving') : effectiveMode === "create" ? t('appointment.create') : t('appointment.save')}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent data-testid="delete-appointment-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('appointment.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('appointment.deleteConfirmDescription')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-btn">{t('editAppointment.cancel')}</AlertDialogCancel>
            <AlertDialogAction data-testid="confirm-delete-btn" onClick={() => void handleDelete()}>
              {t('appointment.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
