import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
import { CalendarDays, Check, Clock3, ClipboardList, FileText, X } from "lucide-react";
import { appointmentsStorage, patientsStorage, settingsStorage } from "@/lib/storage";
import { getAvailableStarts, getAvailableStartDurations, getWorkingTimeSlots } from "@/lib/appointmentAvailability";
import { createEmptyPatientForm, normalizePatientForm, validatePatientForm } from '@/lib/patientForm';
import { findExactPatients, normalizePatientName } from '../../../server/patientMatching.js';
import type { Appointment, AppointmentSettings, Patient as StoredPatient } from "@/types/appointment";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from '@/i18n';
import { APPOINTMENT_TYPES, APPOINTMENT_TYPE_VALUES, APPOINTMENT_DURATIONS, DEFAULT_APPOINTMENT_TYPE_DURATIONS } from '@/lib/appointmentTypes';

const appointmentSchema = z.object({
  title: z.string(),
  patientId: z.string().nullable(),
  syncToGoogle: z.boolean().optional(),
  type: z.enum(APPOINTMENT_TYPE_VALUES).optional(),
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

function FreeStartTimes({ day, slots, starts, duration, availableDurations, onSelect }: Readonly<{
  day: Date;
  slots: Date[];
  starts: Date[];
  duration: number;
  availableDurations: Map<number, number>;
  onSelect: (date: Date, duration: number) => void;
}>) {
  const { t } = useI18n();
  const selectedIsAvailable = starts.some((start) => start.getTime() === day.getTime());
  const selectedEnd = addMinutes(day, duration);
  return (
    <div className="w-full space-y-2 pb-1" data-testid="available-starts">
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
  onBlockSlot?: (start: Date, end: Date) => Promise<void>;
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
  onBlockSlot,
  appointment,
  refreshTrigger = 0,
}: Props) {
  const { t } = useI18n();
  const isMobilePicker = useMediaQuery("(max-width: 639px)");
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
    const defaultStart = appointment || selectedDate
      ? new Date(mergedInitial?.start ?? rawDefaultStart)
      : roundToInterval(rawDefaultStart, 15);
    const type = mergedInitial?.type ?? (effectiveMode === "create"
      ? settingsStorage.getCached()?.defaultAppointmentType ?? "procedure"
      : "consultation");
    const duration = String(mergedInitial?.duration ??
      (effectiveMode === "create"
        ? settingsStorage.getCached()?.appointmentTypeDurations?.[type] ?? DEFAULT_APPOINTMENT_TYPE_DURATIONS[type]
        : 30)) as AppointmentDuration;

    return {
      title: mergedInitial?.title ?? "",
      patientId: mergedInitial?.patientId ?? null,
      type,
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
  }, [appointment, effectiveMode, mergedInitial, selectedDate]);

  const { register, handleSubmit, setValue, watch, formState, reset } = useForm<FormData>({
    resolver: zodResolver(appointmentSchema),
    mode: "onChange",
    defaultValues,
  });

  const startValue = watch("start");
  const durationValue = watch("duration");
  const endValue = watch("end");
  const patientIdValue = watch("patientId");
  // local patients state: prefer prop but fall back to the configured storage source
  const [localPatients, setLocalPatients] = useState<PatientOption[]>(patients ?? []);
  const [suggestionLimit, setSuggestionLimit] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [newPatientForm, setNewPatientForm] = useState(createEmptyPatientForm);
  const [suggestionQuery, setSuggestionQuery] = useState({ firstName: '', lastName: '' });
  const [patientRecords, setPatientRecords] = useState<StoredPatient[]>([]);
  const [patientLoadError, setPatientLoadError] = useState(false);
  const [patientsLoading, setPatientsLoading] = useState(true);
  const [savingNewPatient, setSavingNewPatient] = useState(false);
  const [blockingSlot, setBlockingSlot] = useState(false);
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

  const blockSelectedSlot = async () => {
    if (!selectedDate || !onBlockSlot || !availabilitySettings) return;
    const end = new Date(selectedDate);
    end.setMinutes(end.getMinutes() + availabilitySettings.timeSlotMinutes);
    setBlockingSlot(true);
    try {
      await onBlockSlot(selectedDate, end);
      onOpenChange(false);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : t('appointment.blockFailed'));
    } finally {
      setBlockingSlot(false);
    }
  };

  const getStarts = useCallback((day: Date) => availabilitySettings && !availabilityLoading && !availabilityError
    ? getAvailableStarts(day, Number(durationValue ?? '30'), availabilitySettings, occupiedAppointments, appointment?.id)
    : [], [availabilitySettings, availabilityLoading, availabilityError, durationValue, occupiedAppointments, appointment?.id]);
  const selectedStart = useMemo(() => new Date(startValue), [startValue]);
  const selectedStarts = useMemo(() => getStarts(selectedStart), [getStarts, selectedStart]);
  const startIsAvailable = selectedStarts.some((start) => start.getTime() === selectedStart.getTime());
  const workingSlots = useMemo(() => availabilitySettings
    ? getWorkingTimeSlots(selectedStart, availabilitySettings) : [], [selectedStart, availabilitySettings]);
  const availableDurations = useMemo(() => availabilitySettings
    ? getAvailableStartDurations(selectedStart, Number(durationValue ?? '30'), availabilitySettings, occupiedAppointments, appointment?.id)
    : new Map<number, number>(), [selectedStart, durationValue, availabilitySettings, occupiedAppointments, appointment?.id]);

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
  const selectedPatientRecord = patientRecords.find((patient) => patient.id === patientIdValue);
  const exactPatients = useMemo(() => findExactPatients(patientRecords, {
    firstName: newPatientForm.firstName, lastName: newPatientForm.lastName,
  }), [patientRecords, newPatientForm.firstName, newPatientForm.lastName]);
  const patientNameIndex = useMemo(() => patientRecords.map((patient) => ({
    patient, first: normalizePatientName(patient.firstName), last: normalizePatientName(patient.lastName),
  })), [patientRecords]);
  const patientNameCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const entry of patientNameIndex) {
      const key = JSON.stringify([entry.first, entry.last]);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [patientNameIndex]);
  const patientDistinction = (patient: StoredPatient) => {
    const key = JSON.stringify([normalizePatientName(patient.firstName), normalizePatientName(patient.lastName)]);
    if ((patientNameCounts.get(key) ?? 0) < 2) return '';
    return patient.phone || patient.dateOfBirth || patient.email || `#${patient.id}`;
  };
  const suggestedPatients = useMemo(() => {
    const first = normalizePatientName(suggestionQuery.firstName);
    const last = normalizePatientName(suggestionQuery.lastName);
    if (!first && !last) return [];
    const exactMatches = findExactPatients(patientRecords, suggestionQuery);
    const exactIds = new Set(exactMatches.map((patient) => patient.id));
    return [...exactMatches, ...patientNameIndex.filter((entry) =>
      !exactIds.has(entry.patient.id) && entry.first.startsWith(first) && entry.last.startsWith(last)
    ).map((entry) => entry.patient)];
  }, [patientNameIndex, patientRecords, suggestionQuery]);
  const suggestionsPending = suggestionQuery.firstName !== newPatientForm.firstName ||
    suggestionQuery.lastName !== newPatientForm.lastName;
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => {
      setSuggestionQuery({ firstName: newPatientForm.firstName, lastName: newPatientForm.lastName });
      setSuggestionLimit(10);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [open, newPatientForm.firstName, newPatientForm.lastName]);

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
    }
    setSuggestionQuery({ firstName: '', lastName: '' });
    setSuggestionLimit(10);
    setSubmissionError(null);
    setSubmissionErrorId(null);
    setOpenTimePicker(null);
    initialSlotSelectedRef.current = false;
    resetNewPatientForm();
  }, [open, reset, defaultValues]);

  useEffect(() => {
    if (!open || effectiveMode !== 'create' || availabilityLoading ||
        availabilityError || !availabilitySettings || initialSlotSelectedRef.current) return;
    initialSlotSelectedRef.current = true;
    const type = mergedInitial?.type ?? availabilitySettings.defaultAppointmentType ?? 'procedure';
    if (!formState.dirtyFields.type) {
      setValue('type', type, { shouldValidate: true });
    }
    if (mergedInitial?.duration || formState.dirtyFields.duration || formState.dirtyFields.type) return;
    const start = new Date(defaultValues.start);
    const preferredDuration = availabilitySettings.appointmentTypeDurations?.[type] ?? DEFAULT_APPOINTMENT_TYPE_DURATIONS[type];
    const fittingDuration = selectedDate
      ? getAvailableStartDurations(start, preferredDuration, availabilitySettings, occupiedAppointments).get(start.getTime())
      : preferredDuration;
    if (fittingDuration === undefined) return;
    setValue('duration', String(fittingDuration) as AppointmentDuration, { shouldValidate: true });
    setValue('start', toDateTimeLocal(start), { shouldValidate: true });
    setValue('end', toDateTimeLocal(addMinutes(start, fittingDuration)), { shouldValidate: true });
  }, [open, effectiveMode, selectedDate, availabilityLoading, availabilityError, availabilitySettings, occupiedAppointments, defaultValues, mergedInitial, formState.dirtyFields.duration, formState.dirtyFields.type, setValue]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let isMounted = true;

    const loadPatients = async () => {
      setPatientsLoading(true);
      setPatientLoadError(false);
      try {
        const storedPatients = await patientsStorage.getAll();
        const mapped = storedPatients.map((p: StoredPatient & { _id?: string; patientId?: string; name?: string }) => {
          const id = p.id ?? p._id ?? p.patientId ?? String(p.email ?? p.name ?? Math.random());
          const fullName = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
          const name = (p.name ?? fullName) || p.email || t('common.unknown');
          return { id, name, searchValue: [p.firstName, p.lastName, p.email, p.phone].filter(Boolean).join(' ') };
        });

        if (isMounted) {
          setPatientRecords(storedPatients);
          setLocalPatients(mapped);
        }
      } catch (error) {
        if (isMounted) {
          setPatientLoadError(true);
          console.error('Unable to load patients for appointment booking:', error);
        }
      } finally {
        if (isMounted) setPatientsLoading(false);
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
      if (exactPatients.length > 1) {
        setSubmissionError(t('appointment.ambiguousPatient'));
        setSubmissionErrorId('new-patient-panel');
        return null;
      }
      const { patient: createdPatient, reused } = await patientsStorage.resolve(patientForm);

      const created = buildPatientOption(createdPatient);
      setLocalPatients((current) =>
        current.some((patient) => patient.id === created.id) ? current : [...current, created]
      );
      setValue('patientId', created.id, { shouldDirty: true, shouldValidate: true });
      resetNewPatientForm();

      toast({
        title: t(reused ? 'appointment.patientReused' : 'appointment.patientCreated'),
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
    const type = data.type ?? 'consultation';
    const enrichedData: AppointmentDialogSubmitData = {
      ...data,
      title: data.title.trim() || t(APPOINTMENT_TYPES[type].labelKey),
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
        onOpenAutoFocus={(event) => {
          // Auto-focusing the title on mobile opens the keyboard and iOS password AutoFill.
          if (isMobilePicker || window.matchMedia('(pointer: coarse)').matches) {
            event.preventDefault();
            (event.currentTarget as HTMLElement | null)?.focus({ preventScroll: true });
          }
        }}
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

          <form autoComplete="off" onSubmit={handleSubmit(submit)}>
            <div className="space-y-3 px-5 py-4 sm:px-6">
              {/* Box 1: Title and Patient */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <section aria-label={t('appointment.title')} className="min-w-0 space-y-1.5 rounded-2xl border border-slate-300 bg-slate-100 p-2.5 shadow-sm">
                    <div className="relative">
                      <Label htmlFor="title" className="absolute left-3 top-0 z-10 -translate-y-1/2 bg-background px-1 text-xs leading-none text-muted-foreground">
                        {t('appointment.title')}
                      </Label>
                      <Input
                        id="title"
                        data-testid="appointment-title-input"
                        autoComplete="off"
                        {...register("title")}
                        placeholder={t(APPOINTMENT_TYPES[watch("type") ?? 'procedure'].labelKey)}
                        className="h-10 border-border bg-background shadow-sm"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="relative min-w-0">
                        <Label id="appointment-type-label" htmlFor="type" className="absolute left-3 top-0 z-10 -translate-y-1/2 bg-background px-1 text-xs leading-none text-muted-foreground">{t('createAppointment.type')}</Label>
                        <Select
                          disabled={availabilityLoading || availabilityError}
                          onValueChange={(val) => {
                            const type = APPOINTMENT_TYPE_VALUES.find((type) => type === val);
                            if (!type) throw new Error('Invalid appointment type');
                            setValue("type", type, { shouldDirty: true, shouldValidate: true });
                            const duration = availabilitySettings?.appointmentTypeDurations?.[type] ?? DEFAULT_APPOINTMENT_TYPE_DURATIONS[type];
                            setValue("duration", String(duration) as AppointmentDuration, { shouldDirty: true, shouldValidate: true });
                          }}
                          value={watch("type") ?? "procedure"}
                        >
                          <SelectTrigger id="type" aria-labelledby="appointment-type-label" data-testid="appointment-type-select" className="h-10 border-border bg-background shadow-sm">
                            <SelectValue placeholder={t('appointment.selectType')}>
                              <span className="inline-flex min-w-0 items-center gap-2">
                                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: APPOINTMENT_TYPES[watch("type") ?? "procedure"].color }} aria-hidden="true" />
                                <span className="truncate">{t(APPOINTMENT_TYPES[watch("type") ?? "procedure"].labelKey)}</span>
                              </span>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {APPOINTMENT_TYPE_VALUES.map((type) => (
                              <SelectItem key={type} value={type} data-testid={`appointment-type-option-${type}`} className="focus:bg-muted focus:text-foreground data-[highlighted]:bg-muted data-[highlighted]:text-foreground">
                                <span className="inline-flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: APPOINTMENT_TYPES[type].color }} aria-hidden="true" />
                                  <span className="flex flex-col">
                                    <span>{t(APPOINTMENT_TYPES[type].labelKey)}</span>
                                    <span className="text-xs text-muted-foreground">{t(APPOINTMENT_TYPES[type].descriptionKey)}</span>
                                  </span>
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="relative min-w-0">
                        <Label id="appointment-duration-label" htmlFor="duration" className="absolute left-3 top-0 z-10 -translate-y-1/2 bg-background px-1 text-xs leading-none text-muted-foreground">{t('createAppointment.duration')}</Label>
                        <Select
                          onValueChange={(val) => setValue("duration", (val ?? "30") as AppointmentDuration, {
                            shouldDirty: true,
                            shouldValidate: true,
                          })}
                          value={watch("duration") ?? "30"}
                        >
                          <SelectTrigger id="duration" aria-labelledby="appointment-duration-label" data-testid="duration-select" className="h-10 border-border bg-background shadow-sm">
                            <SelectValue placeholder={t('appointment.selectDuration')} />
                          </SelectTrigger>
                          <SelectContent>
                            {APPOINTMENT_DURATIONS.map((minutes) => (
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
                    <Label id="appointment-patient-label" htmlFor={selectedPatient ? undefined : 'patient-first-name'} className="text-sm font-medium">
                      {t('appointment.patient')}
                    </Label>
                    {selectedPatient ? (
                      <div className="space-y-2">
                        <div data-testid="selected-patient" role="status" className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                          <Check className="h-4 w-4 shrink-0 text-primary" />
                          <span className="min-w-0 break-words">
                            {selectedPatient.name}
                            {selectedPatientRecord && patientDistinction(selectedPatientRecord) && (
                              <span className="block text-xs text-muted-foreground">{patientDistinction(selectedPatientRecord)}</span>
                            )}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          data-testid="change-patient-btn"
                          className="h-10 w-full text-sm"
                          disabled={saving || savingNewPatient || formState.isSubmitting}
                          onClick={() => {
                            setValue('patientId', null, { shouldDirty: true, shouldValidate: true });
                            setSubmissionError(null);
                            resetNewPatientForm();
                            setSuggestionQuery({ firstName: '', lastName: '' });
                          }}
                        >
                          <X className="mr-2 h-4 w-4" />
                          {t('appointment.changePatient')}
                        </Button>
                      </div>
                    ) : (
                      <div data-testid="new-patient-panel" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <Input
                          id="patient-first-name"
                          data-testid="patient-first-name"
                          aria-label={t('appointment.firstName')}
                          aria-describedby="patient-search-hint"
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
                          aria-describedby="patient-search-hint"
                          autoComplete="family-name"
                          placeholder={t('appointment.lastName')}
                          value={newPatientForm.lastName}
                          disabled={saving || savingNewPatient || formState.isSubmitting}
                          onChange={(event) => setNewPatientForm((current) => ({ ...current, lastName: event.target.value }))}
                        />
                        <Input
                          id="patient-phone"
                          data-testid="patient-phone"
                          type="tel"
                          aria-label={t('createPatient.phone')}
                          autoComplete="tel"
                          placeholder={t('createPatient.phone')}
                          value={newPatientForm.phone}
                          disabled={saving || savingNewPatient || formState.isSubmitting}
                          onChange={(event) => setNewPatientForm((current) => ({ ...current, phone: event.target.value }))}
                          className="col-span-2 sm:col-span-1"
                        />
                      </div>
                    )}
                    {!selectedPatient && (
                      <p id="patient-search-hint" data-testid="patient-search-hint" role="status" aria-live="polite" className="text-xs text-muted-foreground">
                        {t(!newPatientForm.firstName.trim() && !newPatientForm.lastName.trim()
                          ? 'appointment.nameSearchHint'
                          : patientLoadError
                            ? 'appointment.patientLoadFailed'
                            : suggestionsPending || patientsLoading
                              ? 'appointment.searchingPatients'
                              : suggestedPatients.length > 0
                                ? 'appointment.nameMatchesFound'
                                : 'appointment.noNameMatches')}
                      </p>
                    )}
                    {patientLoadError && selectedPatient && (
                      <p role="alert" className="text-sm text-destructive">{t('appointment.patientLoadFailed')}</p>
                    )}
                    {!selectedPatient && !suggestionsPending && suggestedPatients.length > 0 && (
                      <div className="space-y-1" data-testid="patient-name-matches">
                        <div className="max-h-40 space-y-1 overflow-y-auto">
                          {suggestedPatients.slice(0, suggestionLimit).map((patient) => (
                            <Button
                              key={patient.id}
                              type="button"
                              variant="outline"
                              className="h-auto min-h-9 w-full justify-start whitespace-normal px-3 py-2 text-left text-sm"
                              data-testid={`patient-name-match-${patient.id}`}
                              disabled={saving || savingNewPatient || formState.isSubmitting}
                              onClick={() => {
                                setValue('patientId', patient.id, { shouldDirty: true, shouldValidate: true });
                                setSubmissionError(null);
                                resetNewPatientForm();
                              }}
                            >
                              <span>{`${patient.firstName} ${patient.lastName}`.trim()}</span>
                              {patientDistinction(patient) && <span className="text-xs text-muted-foreground">{patientDistinction(patient)}</span>}
                            </Button>
                          ))}
                          {suggestedPatients.length > suggestionLimit && (
                            <Button type="button" variant="ghost" data-testid="more-patient-matches" className="w-full whitespace-normal text-xs" onClick={() => setSuggestionLimit((limit) => limit + 10)}>
                              {t('appointment.morePatients', { shown: suggestionLimit, total: suggestedPatients.length })}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {submissionError && submissionErrorId === 'new-patient-panel' && (
                      <p data-testid="new-patient-inline-error" role="alert" className="text-sm text-destructive">{submissionError}</p>
                    )}
                  </section>
                </div>

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
                      starts={selectedStarts}
                      duration={Number(durationValue ?? '30')}
                      slots={workingSlots}
                      availableDurations={availableDurations}
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

              {submissionError && submissionErrorId === 'error-slot-conflict' && (
                <div data-testid="error-slot-conflict" role="alert" className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-sm text-destructive-foreground">
                  {submissionError}
                </div>
              )}
            </div>

            <DialogFooter className="sticky bottom-0 z-10 flex-row gap-2 border-t border-border/60 bg-background/95 px-4 pb-[calc(0.5rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur [&>button]:flex-1 sm:gap-3 sm:space-x-0 sm:px-6 sm:py-3 sm:[&>button]:flex-none">
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
              {effectiveMode === "create" && selectedDate && onBlockSlot && (
                <Button
                  type="button"
                  variant="ghost"
                  data-testid="block-slot-btn"
                  disabled={blockingSlot || saving || availabilityLoading}
                  onClick={() => void blockSelectedSlot()}
                  title={t('appointment.blockSlot')}
                  aria-label={t('appointment.blockSlot')}
                  className="h-10 min-w-0 justify-start truncate px-2 text-left text-destructive hover:bg-destructive/10 hover:text-destructive sm:mr-auto sm:px-3"
                >
                  {blockingSlot ? t('appointment.blockingSlot') : t('appointment.blockSlotShort')}
                </Button>
              )}
              <Button type="button" variant="outline" data-testid="cancel-booking-btn" onClick={() => onOpenChange(false)} className="h-10 border-border/70">
                {t('editAppointment.cancel')}
              </Button>
              <Button
                type="submit"
                data-testid="booking-submit-btn"
                disabled={saving || savingNewPatient || formState.isSubmitting || !formState.isValid || !startIsAvailable ||
                  (!selectedPatient && !newPatientForm.firstName.trim())}
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
