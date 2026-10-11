import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { addMinutes, format, isValid } from "date-fns";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import type { DateTimePickerProps } from "@mui/x-date-pickers/DateTimePicker";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { DialogProps as MuiDialogProps } from "@mui/material/Dialog";
import { PickersLayout, usePickerLayout } from "@mui/x-date-pickers/PickersLayout";
import type { PickersLayoutProps } from "@mui/x-date-pickers/PickersLayout";

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
import { CalendarDays, Check, ChevronsUpDown, Clock3, ClipboardList, FileText, X } from "lucide-react";
import { appointmentsStorage, patientsStorage, settingsStorage } from "@/lib/storage";
import { getAvailableStarts, getAvailableStartDurations, getWorkingTimeSlots } from "@/lib/appointmentAvailability";
import { createEmptyPatientForm, normalizePatientForm, validatePatientForm } from '@/lib/patientForm';
import type { Appointment, AppointmentSettings, Patient as StoredPatient } from "@/types/appointment";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from '@/i18n';

const appointmentSchema = z.object({
  title: z.string().min(1),
  patientId: z.string().nullable(),
  syncToGoogle: z.boolean().optional(),
  type: z.enum(["consultation", "follow-up", "procedure"]).optional(),
  status: z.enum(["scheduled", "completed", "cancelled", "no-show"]).optional(),
  duration: z.enum(["30", "45", "60", "90", "120"]).optional(),
  start: z.string().min(1),
  end: z.string().min(1),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof appointmentSchema>;
type AppointmentDuration = NonNullable<FormData["duration"]>;
type AppointmentType = NonNullable<FormData["type"]>;
type AppointmentStatus = NonNullable<FormData["status"]>;

const PickerAvailabilityContext = createContext<(day: Date) => Date[]>(() => []);

function FreeStartTimes({ day, slots, duration, availableDurations, onSelect }: Readonly<{
  day: Date;
  slots: Date[];
  duration: number;
  availableDurations: Map<number, number>;
  onSelect: (date: Date, duration: number) => void;
}>) {
  const getStarts = useContext(PickerAvailabilityContext);
  const { t } = useI18n();
  const starts = getStarts(day);
  const selectedIsAvailable = starts.some((start) => start.getTime() === day.getTime());
  const selectedEnd = addMinutes(day, duration);
  return (
    <div className="w-full space-y-2 border-t border-border py-2" data-testid="available-starts">
      <p className="text-sm font-medium">{t('appointment.availableTimes')}</p>
      <div className="grid w-full grid-cols-[repeat(auto-fit,minmax(3.25rem,1fr))] gap-1.5">
        {slots.map((start) => {
          const fittingDuration = availableDurations.get(start.getTime());
          const isAvailable = fittingDuration !== undefined;
          const isSelected = selectedIsAvailable && start >= day && start < selectedEnd;
          return (
          <Button
            key={start.getTime()}
            type="button"
            size="sm"
            variant={isSelected ? 'default' : 'outline'}
            aria-pressed={isSelected}
            disabled={!isAvailable && !isSelected}
            className="h-10 w-full min-w-0 px-1 text-xs tabular-nums sm:h-8"
            title={fittingDuration === undefined ? undefined : t('settings.minutes', { n: fittingDuration })}
            aria-label={fittingDuration === undefined ? format(start, 'HH:mm') : `${format(start, 'HH:mm')}, ${t('settings.minutes', { n: fittingDuration })}`}
            onClick={() => { if (fittingDuration !== undefined) onSelect(start, fittingDuration); }}
          >
            {format(start, 'HH:mm')}
          </Button>
          );
        })}
        {availableDurations.size === 0 && <p className="col-span-full text-sm text-muted-foreground">{t('appointment.noAvailableTimes')}</p>}
      </div>
    </div>
  );
}

function AppointmentPickerDialog({ open, onClose, children }: Readonly<MuiDialogProps>) {
  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) onClose?.({}, "backdropClick");
    }}>
      <DialogContent className="z-[2101] w-[calc(100%-2rem)] max-w-[320px] gap-0 overflow-y-auto p-0 max-h-[calc(100dvh-2rem)] [&>button]:hidden">
        <DialogTitle className="sr-only">Date and time</DialogTitle>
        {children}
      </DialogContent>
    </Dialog>
  );
}

function AppointmentPickerLayout(props: Readonly<PickersLayoutProps<Date | null, Date, NonNullable<DateTimePickerProps<Date>["view"]>>>) {
  const { content, actionBar } = usePickerLayout(props);
  const getStarts = useContext(PickerAvailabilityContext);
  const selectedDate = props.value && isValid(props.value) ? props.value : new Date();
  const available = getStarts(selectedDate);
  if (props.wrapperVariant === "desktop") return <PickersLayout {...props} />;

  const changeTime = (part: "hours" | "minutes", value: string) => {
    const date = available.find((start) => part === 'hours'
      ? start.getHours() === Number(value)
      : start.getHours() === selectedDate.getHours() && start.getMinutes() === Number(value));
    if (date) props.onChange(date);
  };

  return (
    <div className="flex w-[320px] max-w-full flex-col bg-background" data-testid="mobile-appointment-picker">
      {content}
      <div className="grid grid-cols-2 gap-3 border-t border-border px-4 py-3">
        <label className="space-y-1 text-sm font-medium">
          <span>HH</span>
          <select
            aria-label="Hour"
            value={selectedDate.getHours()}
            onChange={(event) => changeTime("hours", event.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          >
            {Array.from({ length: 24 }, (_, hour) => (
              <option key={hour} value={hour} disabled={!available.some((start) => start.getHours() === hour)}>{String(hour).padStart(2, "0")}</option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-medium">
          <span>mm</span>
          <select
            aria-label="Minute"
            value={selectedDate.getMinutes()}
            onChange={(event) => changeTime("minutes", event.target.value)}
            className="h-11 w-full rounded-md border border-input bg-background px-3 text-base"
          >
            {[0, 15, 30, 45].map((minute) => (
              <option key={minute} value={minute} disabled={!available.some((start) => start.getHours() === selectedDate.getHours() && start.getMinutes() === minute)}>{String(minute).padStart(2, "0")}</option>
            ))}
          </select>
        </label>
      </div>
      {actionBar}
    </div>
  );
}

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
  const isMobilePicker = useMediaQuery("(max-width: 639px)");
  // Determine effective mode: explicit mode wins, otherwise presence of `appointment` means edit
  const effectiveMode: "create" | "edit" = mode ?? (appointment ? "edit" : "create");

  const mergedInitial = useMemo<Partial<FormData> | undefined>(() => {
    if (!appointment) return initialValues;

    const normalizedDuration = String(appointment.duration ?? "60") as AppointmentDuration;

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
    const defaultStart = appointment || selectedDate
      ? new Date(mergedInitial?.start ?? rawDefaultStart)
      : roundToInterval(rawDefaultStart, 15);
    const duration = String(mergedInitial?.duration ?? "60") as AppointmentDuration;

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
  const patientIdValue = watch("patientId");
  // local patients state: prefer prop but fall back to the configured storage source
  const [localPatients, setLocalPatients] = useState<PatientOption[]>(patients ?? []);
  const [patientPickerOpen, setPatientPickerOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState(createEmptyPatientForm);
  const [savingNewPatient, setSavingNewPatient] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionErrorId, setSubmissionErrorId] = useState<string | null>(null);
  const pickerContainerRef = useRef<HTMLDivElement>(null);
  const [openTimePicker, setOpenTimePicker] = useState<"start" | null>(null);
  const [availabilitySettings, setAvailabilitySettings] = useState<AppointmentSettings | null>(null);
  const [occupiedAppointments, setOccupiedAppointments] = useState<Appointment[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(true);
  const [availabilityError, setAvailabilityError] = useState(false);
  const initialSlotSelectedRef = useRef(false);
  const { toast } = useToast();

  const getStarts = (day: Date) => availabilitySettings && !availabilityLoading && !availabilityError
    ? getAvailableStarts(day, Number(durationValue ?? '60'), availabilitySettings, occupiedAppointments, appointment?.id)
    : [];
  const selectedStart = new Date(startValue);
  const startIsAvailable = getStarts(selectedStart).some((start) => start.getTime() === selectedStart.getTime());

  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    setAvailabilityLoading(true);
    setAvailabilityError(false);
    void Promise.all([settingsStorage.get(), appointmentsStorage.getAll()]).then(([settings, appointments]) => {
      if (isMounted) {
        setAvailabilitySettings(settings);
        setOccupiedAppointments(appointments);
      }
    }).catch(() => {
      if (isMounted) setAvailabilityError(true);
    }).finally(() => {
      if (isMounted) setAvailabilityLoading(false);
    });
    return () => { isMounted = false; };
  }, [open, refreshTrigger]);

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
      if (Number.isFinite(startDate.getTime()) && [30, 45, 60, 90, 120].includes(durationMinutes)) {
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
      setPatientPickerOpen(false);
      setSubmissionError(null);
      setSubmissionErrorId(null);
      setOpenTimePicker(null);
      initialSlotSelectedRef.current = false;
      resetNewPatientForm();
    }
  }, [open, reset, defaultValues]);

  useEffect(() => {
    if (!open || effectiveMode !== 'create' || !selectedDate || availabilityLoading ||
        availabilityError || !availabilitySettings || initialSlotSelectedRef.current) return;
    initialSlotSelectedRef.current = true;
    const start = new Date(defaultValues.start);
    const fittingDuration = getAvailableStartDurations(start, 60, availabilitySettings, occupiedAppointments).get(start.getTime());
    if (fittingDuration === undefined) return;
    setValue('duration', String(fittingDuration) as AppointmentDuration, { shouldValidate: true });
    setValue('start', toDateTimeLocal(start), { shouldValidate: true });
    setValue('end', toDateTimeLocal(addMinutes(start, fittingDuration)), { shouldValidate: true });
  }, [open, effectiveMode, selectedDate, availabilityLoading, availabilityError, availabilitySettings, occupiedAppointments, defaultValues, setValue]);

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
    if (!startIsAvailable) {
      setSubmissionError(t('appointment.unavailableStart'));
      setSubmissionErrorId('error-slot-conflict');
      return;
    }
    const patient = localPatients.find((p) => p.id === data.patientId);
    const enrichedData: AppointmentDialogSubmitData = {
      ...data,
      patientName: patient ? patient.name : undefined,
      syncToGoogle: false,
    };

    if (!patient) {
      const created = await saveNewPatient();
      if (!created) {
        return;
      }

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
      <DialogContent
        ref={pickerContainerRef}
        className="border-border/70 p-0 shadow-2xl sm:max-w-[800px]"
        onInteractOutside={(event) => {
          if (openTimePicker) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (openTimePicker) {
            event.preventDefault();
            setOpenTimePicker(null);
          }
        }}
      >
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
                <div className="grid gap-3 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                  <section aria-label={t('appointment.title')} className="min-w-0 space-y-1.5 rounded-2xl border border-slate-300 bg-slate-100 p-2.5 shadow-sm">
                    <div className="relative">
                      <Label htmlFor="title" className="absolute left-3 top-0 z-10 -translate-y-1/2 bg-background px-1 text-xs leading-none text-muted-foreground">
                        {t('appointment.title')}
                      </Label>
                      <Input id="title" data-testid="appointment-title-input" {...register("title")} className="h-10 border-border bg-background shadow-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="relative min-w-0">
                        <Label id="appointment-type-label" htmlFor="type" className="absolute left-3 top-0 z-10 -translate-y-1/2 bg-background px-1 text-xs leading-none text-muted-foreground">{t('createAppointment.type')}</Label>
                        <Select
                          onValueChange={(val) => setValue("type", (val ?? "consultation") as AppointmentType, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })}
                          value={watch("type") ?? "consultation"}
                        >
                          <SelectTrigger id="type" aria-labelledby="appointment-type-label" data-testid="appointment-type-select" className="h-10 border-border bg-background shadow-sm">
                            <SelectValue placeholder={t('appointment.selectType')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consultation" data-testid="appointment-type-option-consultation">{t('appointment.types.consultation')}</SelectItem>
                            <SelectItem value="follow-up" data-testid="appointment-type-option-follow-up">{t('appointment.types.followUp')}</SelectItem>
                            <SelectItem value="procedure" data-testid="appointment-type-option-procedure">{t('appointment.types.procedure')}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="relative min-w-0">
                        <Label id="appointment-duration-label" htmlFor="duration" className="absolute left-3 top-0 z-10 -translate-y-1/2 bg-background px-1 text-xs leading-none text-muted-foreground">{t('createAppointment.duration')}</Label>
                        <Select
                          onValueChange={(val) => setValue("duration", (val ?? "60") as AppointmentDuration, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })}
                          value={watch("duration") ?? "60"}
                        >
                          <SelectTrigger id="duration" aria-labelledby="appointment-duration-label" data-testid="duration-select" className="h-10 border-border bg-background shadow-sm">
                            <SelectValue placeholder={t('appointment.selectDuration')} />
                          </SelectTrigger>
                          <SelectContent>
                            {[30, 45, 60, 90, 120].map((minutes) => (
                              <SelectItem key={minutes} value={String(minutes)} data-testid={`duration-option-${minutes}`}>
                                {t('settings.minutes', { n: minutes })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </section>

                  <section aria-label={t('appointment.patient')} className="relative flex min-w-0 flex-col gap-1.5 rounded-2xl border border-slate-300 bg-slate-100 p-2.5 shadow-sm">
                    <Label id="appointment-patient-label" htmlFor="patientId" className="absolute left-6 top-2.5 z-10 -translate-y-1/2 bg-background px-1 text-xs leading-none text-muted-foreground">
                      {t('appointment.patient')}
                    </Label>
                    <Popover open={patientPickerOpen} onOpenChange={setPatientPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="patientId"
                          type="button"
                          variant="outline"
                          role="combobox"
                          aria-labelledby="appointment-patient-label"
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
                    {selectedPatient ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="mt-auto h-10 w-full text-sm"
                        disabled={saving || savingNewPatient || formState.isSubmitting}
                        onClick={() => {
                          setValue('patientId', null, { shouldDirty: true, shouldValidate: true });
                          setSubmissionError(null);
                        }}
                      >
                        <X className="mr-2 h-4 w-4" />
                        {t('appointment.addNewPatient')}
                      </Button>
                    ) : (
                      <div data-testid="new-patient-panel" className="mt-2 grid grid-cols-2 gap-2 sm:mt-auto">
                        <Input
                          id="patient-first-name"
                          data-testid="patient-first-name"
                          aria-label={t('appointment.firstName')}
                          autoComplete="given-name"
                          placeholder={t('appointment.firstName')}
                          value={newPatientForm.firstName}
                          disabled={saving || savingNewPatient || formState.isSubmitting}
                          onChange={(event) => setNewPatientForm((current) => ({ ...current, firstName: event.target.value }))}
                        />
                        <Input
                          id="patient-last-name"
                          data-testid="patient-last-name"
                          aria-label={t('appointment.lastName')}
                          autoComplete="family-name"
                          placeholder={t('appointment.lastName')}
                          value={newPatientForm.lastName}
                          disabled={saving || savingNewPatient || formState.isSubmitting}
                          onChange={(event) => setNewPatientForm((current) => ({ ...current, lastName: event.target.value }))}
                        />
                      </div>
                    )}
                    {submissionError && submissionErrorId === 'new-patient-panel' && (
                      <p data-testid="new-patient-inline-error" role="alert" className="text-sm text-destructive">{submissionError}</p>
                    )}
                  </section>
                </div>

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
              <PickerAvailabilityContext.Provider value={getStarts}>
              <section className="space-y-3 rounded-2xl border border-slate-300 bg-slate-100 p-2.5 shadow-sm">
                {availabilityLoading ? (
                  <p role="status" className="text-sm text-muted-foreground">{t('appointment.loadingAvailability')}</p>
                ) : availabilityError ? (
                  <p role="alert" className="text-sm text-destructive">{t('appointment.availabilityFailed')}</p>
                ) : (
                  <>
                    <FreeStartTimes
                      day={selectedStart}
                      duration={Number(durationValue ?? '60')}
                      slots={availabilitySettings ? getWorkingTimeSlots(selectedStart, availabilitySettings) : []}
                      availableDurations={availabilitySettings
                        ? getAvailableStartDurations(selectedStart, 60, availabilitySettings, occupiedAppointments, appointment?.id)
                        : new Map()}
                      onSelect={(date, fittingDuration) => {
                        setValue('duration', String(fittingDuration) as AppointmentDuration, { shouldDirty: true, shouldValidate: true });
                        setValue('start', toDateTimeLocal(date), { shouldDirty: true, shouldValidate: true });
                        setValue('end', toDateTimeLocal(addMinutes(date, fittingDuration)), { shouldDirty: true, shouldValidate: true });
                      }}
                    />
                    {!startIsAvailable && <p role="alert" className="text-sm text-destructive">{t('appointment.unavailableStart')}</p>}
                  </>
                )}
                <div className="grid gap-3 sm:grid-cols-[minmax(210px,30fr)_minmax(145px,15fr)_minmax(0,65fr)]">
                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="start" className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        {t('appointment.start')}
                      </Label>
                      <DateTimePicker
                        ampm={false}
                        format="dd/MM/yyyy HH:mm"
                        slots={{ layout: AppointmentPickerLayout, dialog: AppointmentPickerDialog }}
                        views={isMobilePicker ? ["year", "month", "day"] : undefined}
                        closeOnSelect={false}
                        minutesStep={15}
                        timeSteps={{ minutes: 15 }}
                        desktopModeMediaQuery="(min-width: 640px)"
                        disabled={availabilityLoading || availabilityError}
                        shouldDisableDate={(date) => !availabilitySettings?.workingDays.includes(date.getDay())}
                        shouldDisableTime={(date, view) => {
                          const available = getStarts(date);
                          return !available.some((start) => start.getHours() === date.getHours() &&
                            (view === 'hours' || start.getMinutes() === date.getMinutes()));
                        }}
                        open={openTimePicker === "start"}
                        onOpen={() => setOpenTimePicker("start")}
                        onClose={() => setOpenTimePicker(null)}
                        value={startValue ? new Date(startValue) : null}
                        onChange={(date) => {
                          if (date && isValid(date)) {
                            setValue("start", toDateTimeLocal(date), {
                              shouldDirty: true,
                              shouldValidate: true,
                            });
                          }
                        }}
                        slotProps={{
                          textField: {
                            id: "start",
                            size: "small",
                            fullWidth: true,
                            onClick: (event) => {
                              if (!(event.target as HTMLElement).closest('button')) setOpenTimePicker("start");
                            },
                            onKeyDown: (event) => {
                              if ((event.target as HTMLElement).closest('button')) return;
                              if (event.key === "Enter" || event.key === "ArrowDown") {
                                event.preventDefault();
                                setOpenTimePicker("start");
                              }
                            },
                            inputProps: { "data-testid": "appointment-start-input", "aria-haspopup": "dialog" },
                          },
                          popper: { container: () => pickerContainerRef.current, sx: { zIndex: 2100 } },
                          desktopTrapFocus: { disableEnforceFocus: true },
                        }}
                      />
                    </div>

                    <div className="min-w-0 space-y-1.5">
                      <Label htmlFor="end" className="flex items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                        {t('appointment.end')}
                      </Label>
                      <Input
                        id="end"
                        data-testid="appointment-end-input"
                        readOnly
                        value={endValue && isValid(new Date(endValue)) ? format(new Date(endValue), "dd/MM/yyyy HH:mm") : ""}
                        className="h-10 border-border bg-muted/50 shadow-sm"
                      />
                    </div>

                  <div className="min-w-0 space-y-1.5">
                    <Label htmlFor="notes" className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      {t('editAppointment.notes')}
                    </Label>
                    <Textarea
                      id="notes"
                      data-testid="appointment-notes"
                      {...register("notes")}
                      rows={1}
                      className="h-10 min-h-10 border-border bg-background shadow-sm"
                    />
                  </div>
                </div>
              </section>
              </PickerAvailabilityContext.Provider>

              {/* Google sync toggle and submission errors */}
              <div className="px-3">
                <div className="flex items-center gap-3">
                  <input
                    id="google-sync-toggle"
                    data-testid="google-sync-toggle"
                    type="checkbox"
                    disabled
                    checked={false}
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
                disabled={saving || savingNewPatient || formState.isSubmitting || !formState.isValid || !startIsAvailable ||
                  (!selectedPatient && (!newPatientForm.firstName.trim() || !newPatientForm.lastName.trim()))}
                className="h-10 px-5 shadow-sm"
              >
                {saving || savingNewPatient || formState.isSubmitting ? t('appointment.saving') : effectiveMode === "create" ? t('appointment.create') : t('appointment.save')}
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
