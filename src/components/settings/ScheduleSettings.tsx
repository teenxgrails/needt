"use client";

import { useEffect, useMemo, useState } from "react";

import { Copy, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
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

import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

import { useSettingsStore } from "@/store/settings";

import { SettingsSection } from "./SettingsSection";

const LOG_SOURCE = "ScheduleSettings";
const GRID_START_HOUR = 8;
const GRID_END_HOUR = 20;
const SLOT_MINUTES = 30;
const SLOT_HEIGHT = 22;

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

type WorkHours = Record<string, { start: string; end: string }>;

interface SmartSchedulingResponse {
  preferences: {
    workHours: WorkHours;
    bufferMinutes: number;
    maxDeepWorkPerDay: number;
    minBreakMinutes: number;
    autoRescheduleOnMiss: boolean;
    enableBodyDoubling: boolean;
    enableTaskBatching: boolean;
    hardStopTime: string;
    bufferMultiplier: number;
  };
}

const DEFAULT_WORK_HOURS: WorkHours = {
  "1": { start: "09:00", end: "17:00" },
  "2": { start: "09:00", end: "17:00" },
  "3": { start: "09:00", end: "17:00" },
  "4": { start: "09:00", end: "17:00" },
  "5": { start: "09:00", end: "17:00" },
};

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const bounded = Math.max(0, Math.min(24 * 60, minutes));
  const hours = Math.floor(bounded / 60);
  const mins = bounded % 60;
  return `${hours.toString().padStart(2, "0")}:${mins
    .toString()
    .padStart(2, "0")}`;
}

function formatHour(hour: number) {
  if (hour === 0) return "12am";
  if (hour === 12) return "12pm";
  return `${hour > 12 ? hour - 12 : hour}${hour >= 12 ? "pm" : "am"}`;
}

function formatRange(range: { start: string; end: string }) {
  const format = (value: string) => {
    const [hour, minute] = value.split(":").map(Number);
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return minute === 0
      ? `${displayHour} ${suffix}`
      : `${displayHour}:${minute.toString().padStart(2, "0")} ${suffix}`;
  };
  return `${format(range.start)} – ${format(range.end)}`;
}

export function ScheduleSettings() {
  const { calendar, updateAutoScheduleSettings, updateCalendarSettings, user } =
    useSettingsStore();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [scheduleName, setScheduleName] = useState("Work hours");
  const [workHours, setWorkHours] = useState<WorkHours>(DEFAULT_WORK_HOURS);
  const [preferences, setPreferences] = useState<
    SmartSchedulingResponse["preferences"] | null
  >(null);
  const [drag, setDrag] = useState<{
    day: number;
    anchorSlot: number;
  } | null>(null);

  const slotCount = ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const response = await fetch("/api/smart-scheduling-settings");
        if (!response.ok) throw new Error("Failed to load schedule settings");
        const data = (await response.json()) as SmartSchedulingResponse;
        if (cancelled) return;
        setPreferences(data.preferences);
        setWorkHours(data.preferences.workHours || DEFAULT_WORK_HOURS);
        const storedName = window.localStorage.getItem("needt-schedule-name");
        if (storedName) setScheduleName(storedName);
      } catch (error) {
        logger.error(
          "Failed to load schedule settings",
          { error: error instanceof Error ? error.message : "Unknown error" },
          LOG_SOURCE
        );
        toast.error("Could not load schedule settings");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!drag) return;
    const finishDrag = () => setDrag(null);
    window.addEventListener("pointerup", finishDrag, { once: true });
    return () => window.removeEventListener("pointerup", finishDrag);
  }, [drag]);

  const summary = useMemo(() => {
    const entries = Object.entries(workHours);
    if (entries.length === 0) return "No active days";
    const first = entries[0][1];
    const sameRange = entries.every(
      ([, value]) => value.start === first.start && value.end === first.end
    );
    return sameRange
      ? `${DAYS.filter((day) => workHours[day.value])
          .map((day) => day.label)
          .join(", ")} · ${formatRange(first)}`
      : `${entries.length} active days · Custom hours`;
  }, [workHours]);

  const updateDragSelection = (day: number, slot: number) => {
    if (!drag || drag.day !== day) return;
    const startSlot = Math.min(drag.anchorSlot, slot);
    const endSlot = Math.max(drag.anchorSlot, slot) + 1;
    const startMinutes = GRID_START_HOUR * 60 + startSlot * SLOT_MINUTES;
    const endMinutes = GRID_START_HOUR * 60 + endSlot * SLOT_MINUTES;
    setWorkHours((current) => ({
      ...current,
      [day]: {
        start: minutesToTime(startMinutes),
        end: minutesToTime(endMinutes),
      },
    }));
  };

  const startDrag = (day: number, slot: number) => {
    setDrag({ day, anchorSlot: slot });
    const startMinutes = GRID_START_HOUR * 60 + slot * SLOT_MINUTES;
    setWorkHours((current) => ({
      ...current,
      [day]: {
        start: minutesToTime(startMinutes),
        end: minutesToTime(startMinutes + SLOT_MINUTES),
      },
    }));
  };

  const copyDayToAll = (day: number) => {
    const source = workHours[day];
    if (!source) {
      toast.error("Select hours for this day first");
      return;
    }
    setWorkHours(
      Object.fromEntries(
        DAYS.map(({ value }) => [value.toString(), { ...source }])
      )
    );
    toast.success(`${DAYS[day].label} hours copied to every day`);
  };

  const save = async () => {
    if (!preferences) return;
    try {
      setIsSaving(true);
      const response = await fetch("/api/smart-scheduling-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: { ...preferences, workHours },
        }),
      });
      if (!response.ok) throw new Error("Failed to save schedule");
      const data = (await response.json()) as SmartSchedulingResponse;
      setPreferences(data.preferences);
      setWorkHours(data.preferences.workHours || workHours);

      const activeDays = Object.keys(workHours).map(Number).sort();
      const firstRange = workHours[activeDays[0]];
      if (firstRange) {
        const startHour = Math.floor(timeToMinutes(firstRange.start) / 60);
        const endHour = Math.ceil(timeToMinutes(firstRange.end) / 60);
        updateAutoScheduleSettings({
          workDays: JSON.stringify(activeDays),
          workHourStart: startHour,
          workHourEnd: endHour,
        });
        updateCalendarSettings({
          workingHours: {
            ...calendar.workingHours,
            days: activeDays,
            start: firstRange.start,
            end: firstRange.end,
          },
        });
      }

      window.localStorage.setItem(
        "needt-schedule-name",
        scheduleName.trim() || "Work hours"
      );
      setOpen(false);
      toast.success("Schedule saved");
    } catch (error) {
      logger.error(
        "Failed to save schedule settings",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
      toast.error("Could not save schedule", {
        description: error instanceof Error ? error.message : "Try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <SettingsSection
        title="Work schedule"
        description="Choose the days and hours where Needt may place tasks."
      >
        <div className="overflow-hidden rounded-[var(--control-radius)] border border-[var(--border-control)]">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-h-[58px] w-full items-center gap-3 px-4 text-left transition-colors hover:bg-[var(--surface-hover)]"
          >
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium">{scheduleName}</div>
              <div className="mt-0.5 truncate text-[12px] text-[var(--text-secondary)]">
                {isLoading ? "Loading schedule…" : summary}
              </div>
            </div>
            <Pencil className="h-4 w-4 text-[var(--text-secondary)]" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-[var(--control-radius)] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <Plus className="h-4 w-4" />
          Edit work schedule
        </button>
      </SettingsSection>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex h-[min(760px,calc(100dvh-32px))] w-[calc(100vw-32px)] max-w-none grid-cols-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[calc(100vw-32px)]">
          <DialogTitle className="flex h-14 flex-none items-center border-b border-[var(--border-subtle)] px-5 text-[16px]">
            Edit Schedule
          </DialogTitle>
          <DialogDescription className="sr-only">
            Drag across a day to select the hours when Needt can schedule tasks.
          </DialogDescription>

          <div className="flex min-h-0 flex-1">
            <aside className="w-[308px] flex-none border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="schedule-name">Schedule name</Label>
                  <Input
                    id="schedule-name"
                    value={scheduleName}
                    onChange={(event) => setScheduleName(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Schedule Timezone</Label>
                  <Select value={user.timeZone} disabled>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={user.timeZone}>
                        Default ({user.timeZone})
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col bg-[var(--surface-panel)]">
              <div className="grid h-9 flex-none grid-cols-[56px_repeat(7,minmax(94px,1fr))] border-b border-[var(--border-subtle)]">
                <div />
                {DAYS.map((day) => (
                  <div
                    key={day.value}
                    className="flex items-center justify-between border-l border-[var(--border-subtle)] px-2 text-[12px] text-[var(--text-secondary)]"
                  >
                    <span>{day.label}</span>
                    <button
                      type="button"
                      onClick={() => copyDayToAll(day.value)}
                      className="inline-flex h-6 items-center gap-1 rounded-[var(--control-radius)] border border-[var(--border-control)] bg-[var(--surface-control)] px-2 text-[11px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                ))}
              </div>

              <div className="min-h-0 flex-1 overflow-auto">
                <div
                  className="grid min-w-[820px] grid-cols-[56px_repeat(7,minmax(94px,1fr))]"
                  style={{ height: slotCount * SLOT_HEIGHT }}
                >
                  <div className="relative">
                    {Array.from(
                      { length: GRID_END_HOUR - GRID_START_HOUR + 1 },
                      (_, index) => {
                        const hour = GRID_START_HOUR + index;
                        return (
                          <span
                            key={hour}
                            className="absolute right-2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]"
                            style={{ top: index * SLOT_HEIGHT * 2 }}
                          >
                            {formatHour(hour)}
                          </span>
                        );
                      }
                    )}
                  </div>

                  {DAYS.map((day) => {
                    const range = workHours[day.value];
                    const gridStartMinutes = GRID_START_HOUR * 60;
                    const top = range
                      ? ((timeToMinutes(range.start) - gridStartMinutes) /
                          SLOT_MINUTES) *
                        SLOT_HEIGHT
                      : 0;
                    const height = range
                      ? ((timeToMinutes(range.end) -
                          timeToMinutes(range.start)) /
                          SLOT_MINUTES) *
                        SLOT_HEIGHT
                      : 0;

                    return (
                      <div
                        key={day.value}
                        className="relative border-l border-[var(--border-subtle)]"
                      >
                        {range && (
                          <div
                            className="pointer-events-none absolute inset-x-1 z-10 rounded-[4px] border border-[color-mix(in_srgb,var(--color-accent)_45%,var(--border-control))] bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--surface-raised))] px-1.5 py-1 text-[11px] font-medium"
                            style={{
                              top,
                              height: Math.max(height, SLOT_HEIGHT),
                            }}
                          >
                            {formatRange(range)}
                          </div>
                        )}
                        {Array.from({ length: slotCount }, (_, slot) => (
                          <div
                            key={slot}
                            role="button"
                            tabIndex={-1}
                            aria-label={`Set ${day.label} schedule`}
                            className={cn(
                              "border-t border-[var(--border-subtle)]",
                              slot % 2 === 1 && "border-t-transparent"
                            )}
                            style={{ height: SLOT_HEIGHT }}
                            onPointerDown={(event) => {
                              event.preventDefault();
                              startDrag(day.value, slot);
                            }}
                            onPointerEnter={() =>
                              updateDragSelection(day.value, slot)
                            }
                          />
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex h-14 flex-none items-center border-t border-[var(--border-subtle)] px-4">
                <span className="text-[12px] text-[var(--text-secondary)]">
                  Drag to select times.
                </span>
                <div className="ml-auto flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="button" onClick={save} disabled={isSaving}>
                    {isSaving ? "Saving…" : "Save changes"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
