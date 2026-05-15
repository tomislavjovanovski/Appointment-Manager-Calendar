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
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CalendarDays, Clock3, ClipboardList, FileText, UserRound } from "lucide-react";

const appointmentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  patientId: z.string().nullable(),
  type: z.enum(["consultation", "follow-up", "procedure"]).optional(),
  duration: z.enum(["30", "60", "120"]).optional(),
  start: z.string().min(1, "Start is required"),
  end: z.string().min(1, "End is required"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof appointmentSchema>;

type Patient = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // optional explicit mode, otherwise inferred from `appointment`
  mode?: "create" | "edit";
  // legacy initial values
  initialValues?: Partial<FormData>;
  patients?: Patient[];
  onSubmit?: (data: FormData) => Promise<void> | void;
  saving?: boolean;
  // added compatibility props
  selectedDate?: Date | null;
  onAppointmentCreated?: (data: any) => void;
  onUpdated?: (data: any) => void;
  // if provided, dialog acts as edit form
  appointment?: any;
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
  appointment,
}: Props) {
  // Determine effective mode: explicit mode wins, otherwise presence of `appointment` means edit
  const effectiveMode: "create" | "edit" = mode ?? (appointment ? "edit" : "create");

  const mergedInitial = useMemo<Partial<FormData> | undefined>(() => {
    if (!appointment) return initialValues;

    return {
      title: appointment.title,
      patientId: appointment.patientId ?? null,
      type: appointment.type ?? "consultation",
      duration: appointment.duration ? String(appointment.duration) : "30",
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
    const duration = String((mergedInitial as any)?.duration ?? "30") as FormData["duration"];

    return {
      title: mergedInitial?.title ?? "",
      patientId: mergedInitial?.patientId ?? null,
      type: ((mergedInitial as any)?.type ?? "consultation") as FormData["type"],
      duration,
      start: mergedInitial?.start
        ? toDateTimeLocal(mergedInitial.start)
        : toDateTimeLocal(defaultStart),
      end: mergedInitial?.end
        ? toDateTimeLocal(mergedInitial.end)
        : toDateTimeLocal(addMinutes(defaultStart, Number(duration))),
      notes: mergedInitial?.notes ?? "",
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
    }
  }, [open, reset, defaultValues]);

  // local patients state: prefer prop but fall back to localStorage
  const [localPatients, setLocalPatients] = useState<Patient[]>(patients ?? []);

  useEffect(() => {
    if (patients && patients.length) {
      // Only set when a real patients prop is provided
      setLocalPatients(patients);
      return;
    }
    try {
      const raw = localStorage.getItem("medical-patients");
      if (raw) {
        const parsed = JSON.parse(raw);
        const mapped = Array.isArray(parsed)
          ? parsed.map((p: any) => {
              const id = p.id ?? p._id ?? p.patientId ?? String(p.email ?? p.name ?? Math.random());
              const fullName = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
              const name = (p.name ?? fullName) || p.email || "Unknown";
              return { id, name };
            })
          : [];
        setLocalPatients(mapped);
      }
    } catch (e) {
      // ignore parse errors
    }
  }, [patients]);

  const submit = async (data: FormData) => {
    // enrich with patientName if available
    const patient = (localPatients || patients).find((p) => p.id === data.patientId);
    const enriched: any = { ...data, patientName: patient ? patient.name : undefined };

    if (effectiveMode === "create") {
      if (onAppointmentCreated) {
        onAppointmentCreated(enriched);
      }
    } else {
      if (onUpdated) {
        onUpdated(enriched);
      }
    }

    if (onSubmit) {
      await onSubmit(data);
    }

    try {
      onOpenChange(false);
    } catch (e) {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-border/70 p-0 shadow-2xl sm:max-w-[800px]">
        <div className="max-h-[600px] overflow-y-auto">
          <div className="border-b border-border/60 bg-gradient-to-br from-primary/10 via-background to-background px-5 py-4 sm:px-6">
            <DialogHeader className="space-y-2 text-left">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <ClipboardList className="h-4 w-4" />
                </div>
                <div className="space-y-1">
                  <DialogTitle className="text-lg font-semibold tracking-tight">
                    {effectiveMode === "create" ? "Create Appointment" : "Edit Appointment"}
                  </DialogTitle>
                  <DialogDescription className="max-w-2xl text-xs leading-relaxed">
                    Book a patient, choose the visit type and duration, and keep the schedule aligned automatically.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <form onSubmit={handleSubmit(submit)}>
            <div className="space-y-4 px-5 py-5 sm:px-6">
              {/* Box 1: Title and Patient */}
              <section className="rounded-2xl border border-border/60 bg-muted/20 p-3 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-[60%_40%]">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="flex items-center gap-2">
                      <ClipboardList className="h-3.5 w-3.5 text-muted-foreground" />
                      Title
                    </Label>
                    <Input id="title" {...register("title")} className="h-10 border-border/70 bg-background/80" />
                  </div>

                  <div className="space-y-1.5 pr-3">
                    <Label htmlFor="patientId" className="flex items-center gap-2">
                      <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                      Patient
                    </Label>
                    <Select
                      onValueChange={(val) =>
                        setValue("patientId", val ?? null, { shouldDirty: true, shouldValidate: true })
                      }
                      value={watch("patientId") ?? undefined}
                    >
                      <SelectTrigger id="patientId" className="h-10 border-border/70 bg-background/80">
                        <SelectValue placeholder="Select patient" />
                      </SelectTrigger>
                      <SelectContent>
                        {localPatients.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Box 2: Type and Duration */}
              <section className="rounded-2xl border border-border/60 bg-muted/20 p-3 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-[60%_40%]">
                  <div className="space-y-1.5">
                    <Label htmlFor="type">Type</Label>
                    <Select
                      onValueChange={(val) =>
                        setValue("type", (val ?? "consultation") as any, { shouldDirty: true, shouldValidate: true })
                      }
                      value={(watch("type") as any) ?? "consultation"}
                    >
                      <SelectTrigger id="type" className="h-10 border-border/70 bg-background/80">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultation">Consultation</SelectItem>
                        <SelectItem value="follow-up">Follow-up</SelectItem>
                        <SelectItem value="procedure">Procedure</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 pr-3">
                    <Label htmlFor="duration">Duration</Label>
                    <Select
                      onValueChange={(val) =>
                        setValue("duration", (val ?? "30") as any, { shouldDirty: true, shouldValidate: true })
                      }
                      value={(watch("duration") as any) ?? "30"}
                    >
                      <SelectTrigger id="duration" className="h-10 border-border/70 bg-background/80">
                        <SelectValue placeholder="Select duration" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Half Hour (30 min)</SelectItem>
                        <SelectItem value="60">Full Hour (60 min)</SelectItem>
                        <SelectItem value="120">Double Hour (120 min)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>

              {/* Box 3: Date (start/end) and Note */}
              <section className="rounded-2xl border border-border/60 bg-muted/20 p-3 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-[60%_40%]">
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="start" className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                        Start
                      </Label>
                      <Input
                        id="start"
                        type="datetime-local"
                        {...register("start")}
                        className="h-10 border-border/70 bg-background/80"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="end" className="flex items-center gap-2">
                        <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
                        End
                      </Label>
                      <Input
                        id="end"
                        type="datetime-local"
                        {...register("end")}
                        className="h-10 border-border/70 bg-background/80"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 pr-3">
                    <Label htmlFor="notes" className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      {...register("notes")}
                      rows={4}
                      className="min-h-[110px] border-border/70 bg-background/80"
                    />
                  </div>
                </div>
              </section>
            </div>

            <Separator />

            <DialogFooter className="gap-3 px-5 py-3 sm:px-6">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-10 border-border/70">
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !formState.isValid} className="h-10 px-5 shadow-sm">
                {saving ? "Saving..." : effectiveMode === "create" ? "Create" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
