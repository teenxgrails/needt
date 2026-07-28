"use client";

import { useEffect, useRef, useState } from "react";

import { Check, Copy, Pencil, Plus, Trash2 } from "lucide-react";
import { notify } from "@/lib/notifications";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { cn } from "@/lib/utils";
import { randomId } from "@/lib/uuid";
import {
  adjustScheduleWindow,
  copyScheduleDayWindows,
} from "@/lib/work-schedules";

import { useSettingsStore } from "@/store/settings";

import { SettingsSection } from "./SettingsSection";

const GRID_START_HOUR = 0;
const GRID_END_HOUR = 24;
const SLOT_MINUTES = 15;
const SLOT_HEIGHT = 11;
const SLOT_COUNT = ((GRID_END_HOUR - GRID_START_HOUR) * 60) / SLOT_MINUTES;

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
] as const;

interface WorkScheduleWindow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  sortOrder: number;
}

interface WorkSchedule {
  id: string;
  name: string;
  timeZone: string;
  isDefault: boolean;
  windows: WorkScheduleWindow[];
  _count?: { tasks: number };
}

type DraftWindow = Omit<WorkScheduleWindow, "id"> & { id: string };

interface ScheduleDraft {
  id: string | null;
  name: string;
  timeZone: string;
  isDefault: boolean;
  windows: DraftWindow[];
}

type DragState =
  | {
      mode: "create";
      day: number;
      anchorSlot: number;
      windowId: string;
    }
  | {
      mode: "move" | "resize-start" | "resize-end";
      day: number;
      anchorSlot: number;
      windowId: string;
      originalStart: number;
      originalEnd: number;
    };

function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number) {
  const bounded = Math.max(0, Math.min(24 * 60 - 1, minutes));
  return `${String(Math.floor(bounded / 60)).padStart(2, "0")}:${String(
    bounded % 60
  ).padStart(2, "0")}`;
}

function minutesToSlot(minutes: number) {
  return Math.round((minutes - GRID_START_HOUR * 60) / SLOT_MINUTES);
}

function slotToMinutes(slot: number) {
  return GRID_START_HOUR * 60 + slot * SLOT_MINUTES;
}

function formatTime(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${suffix}`;
}

function formatRange(window: Pick<DraftWindow, "startTime" | "endTime">) {
  return `${formatTime(window.startTime)} – ${formatTime(window.endTime)}`;
}

function createWindowId() {
  return `draft-${randomId()}`;
}

function defaultWindows(): DraftWindow[] {
  return [1, 2, 3, 4, 5].map((dayOfWeek, sortOrder) => ({
    id: createWindowId(),
    dayOfWeek,
    startTime: "09:00",
    endTime: "17:00",
    sortOrder,
  }));
}

function toDraft(schedule: WorkSchedule): ScheduleDraft {
  return {
    id: schedule.id,
    name: schedule.name,
    timeZone: schedule.timeZone,
    isDefault: schedule.isDefault,
    windows: schedule.windows.map((window) => ({ ...window })),
  };
}

export function ScheduleSettings() {
  const { user } = useSettingsStore();
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copySourceDay, setCopySourceDay] = useState<number | null>(null);
  const [copyTargetDays, setCopyTargetDays] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedWindowId, setSelectedWindowId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const copyInteraction = useRef(false);
  const dayColumns = useRef(new Map<number, HTMLDivElement>());
  // Scroll the grid to its default 6am starting position exactly once per
  // dialog open. An inline ref callback would re-run on every re-render
  // (including every setDraft() while dragging to create/resize a window),
  // snapping the scroll position back mid-interaction — this flag makes it
  // apply only the first time the scroll container mounts, and gets reset
  // when the dialog closes so it re-applies next time it opens.
  const hasScrolledToDefault = useRef(false);
  const [draft, setDraft] = useState<ScheduleDraft>({
    id: null,
    name: "Work Hours",
    timeZone: user.timeZone,
    isDefault: false,
    windows: [],
  });

  const loadSchedules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/work-schedules");
      if (!response.ok) throw new Error("Failed to load schedules");
      const data = (await response.json()) as { schedules: WorkSchedule[] };
      setSchedules(data.schedules);
    } catch {
      notify.error("Could not load work schedules");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSchedules();
  }, []);

  const openExisting = (schedule: WorkSchedule) => {
    setDraft(toDraft(schedule));
    setSelectedWindowId(null);
    setEditorOpen(true);
  };

  const openNew = () => {
    setDraft({
      id: null,
      name: "New schedule",
      timeZone: user.timeZone,
      isDefault: schedules.length === 0,
      windows: defaultWindows(),
    });
    setSelectedWindowId(null);
    setEditorOpen(true);
  };

  const selectedWindow = draft.windows.find(
    (window) => window.id === selectedWindowId
  );

  const summary = (schedule: WorkSchedule) => {
    const activeDays = new Set(
      schedule.windows.map((window) => window.dayOfWeek)
    );
    if (activeDays.size === 0) return "No active hours";
    const ranges = new Set(
      schedule.windows.map((window) => `${window.startTime}-${window.endTime}`)
    );
    return `${activeDays.size} active days · ${
      ranges.size === 1 ? formatRange(schedule.windows[0]) : "Custom hours"
    }`;
  };

  const updateWindow = (
    id: string,
    updates: Partial<Pick<DraftWindow, "startTime" | "endTime">>
  ) => {
    setDraft((current) => ({
      ...current,
      windows: current.windows.map((window) =>
        window.id === id ? { ...window, ...updates } : window
      ),
    }));
  };

  const slotFromPointer = (day: number, clientY: number) => {
    const column = dayColumns.current.get(day);
    if (!column) return 0;
    const rect = column.getBoundingClientRect();
    return Math.max(
      0,
      Math.min(SLOT_COUNT - 1, Math.floor((clientY - rect.top) / SLOT_HEIGHT))
    );
  };

  const beginCreate = (day: number, slot: number) => {
    const windowId = createWindowId();
    setDraft((current) => ({
      ...current,
      windows: [
        ...current.windows,
        {
          id: windowId,
          dayOfWeek: day,
          startTime: minutesToTime(slotToMinutes(slot)),
          endTime: minutesToTime(slotToMinutes(slot + 1)),
          sortOrder: current.windows.length,
        },
      ],
    }));
    setSelectedWindowId(windowId);
    setDrag({ mode: "create", day, anchorSlot: slot, windowId });
  };

  const beginExistingDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    window: DraftWindow,
    mode: "move" | "resize-start" | "resize-end"
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedWindowId(window.id);
    setDrag({
      mode,
      day: window.dayOfWeek,
      anchorSlot: slotFromPointer(window.dayOfWeek, event.clientY),
      windowId: window.id,
      originalStart: minutesToSlot(timeToMinutes(window.startTime)),
      originalEnd: minutesToSlot(timeToMinutes(window.endTime)),
    });
  };

  const updateDrag = (day: number, slot: number) => {
    if (!drag || drag.day !== day) return;
    if (drag.mode === "create") {
      const start = Math.min(drag.anchorSlot, slot);
      const end = Math.max(drag.anchorSlot, slot) + 1;
      updateWindow(drag.windowId, {
        startTime: minutesToTime(slotToMinutes(start)),
        endTime: minutesToTime(slotToMinutes(end)),
      });
      return;
    }

    const delta = slot - drag.anchorSlot;
    setDraft((current) => ({
      ...current,
      windows: current.windows.map((window) =>
        window.id === drag.windowId
          ? adjustScheduleWindow(
              {
                ...window,
                startTime: minutesToTime(slotToMinutes(drag.originalStart)),
                endTime: minutesToTime(slotToMinutes(drag.originalEnd)),
              },
              drag.mode,
              delta * SLOT_MINUTES,
              GRID_START_HOUR * 60,
              GRID_END_HOUR * 60
            )
          : window
      ),
    }));
  };

  const finishDrag = () => setDrag(null);

  const openCopy = (day: number) => {
    if (!draft.windows.some((window) => window.dayOfWeek === day)) {
      notify.error("Add hours to this day first");
      return;
    }
    copyInteraction.current = true;
    setCopySourceDay(day);
    setCopyTargetDays([]);
    setCopyOpen(true);
  };

  const closeCopy = () => {
    setCopyOpen(false);
    window.setTimeout(() => {
      copyInteraction.current = false;
    }, 0);
  };

  const applyCopy = () => {
    if (copySourceDay === null || copyTargetDays.length === 0) return;
    setDraft((current) => ({
      ...current,
      windows: copyScheduleDayWindows(
        current.windows,
        copySourceDay,
        copyTargetDays,
        createWindowId
      ),
    }));
    closeCopy();
    notify.success(
      `Copied ${DAYS[copySourceDay].label} to ${copyTargetDays
        .map((day) => DAYS[day].label)
        .join(", ")}`
    );
  };

  const save = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(
        draft.id ? `/api/work-schedules/${draft.id}` : "/api/work-schedules",
        {
          method: draft.id ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name,
            timeZone: draft.timeZone,
            isDefault: draft.isDefault,
            windows: draft.windows.map((window, sortOrder) => ({
              dayOfWeek: window.dayOfWeek,
              startTime: window.startTime,
              endTime: window.endTime,
              sortOrder,
            })),
          }),
        }
      );
      const data = (await response.json()) as { error?: string };
      if (!response.ok)
        throw new Error(data.error || "Failed to save schedule");
      await loadSchedules();
      window.dispatchEvent(new Event("needt:work-schedule-changed"));
      setEditorOpen(false);
      notify.success(draft.id ? "Schedule saved" : "Schedule created");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not save schedule"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!draft.id) return;
    const response = await fetch(`/api/work-schedules/${draft.id}`, {
      method: "DELETE",
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) {
      notify.error(data.error || "Could not delete schedule");
      return;
    }
    await loadSchedules();
    window.dispatchEvent(new Event("needt:work-schedule-changed"));
    setEditorOpen(false);
    notify.success("Schedule deleted");
  };

  return (
    <>
      <SettingsSection
        title="Work schedules"
        description="Choose the saved hours where Needt may place tasks."
      >
        <div className="overflow-hidden rounded-[var(--control-radius)] border border-[var(--border-control)]">
          {schedules.map((schedule) => (
            <button
              key={schedule.id}
              type="button"
              onClick={() => openExisting(schedule)}
              className="flex min-h-[58px] w-full items-center gap-3 border-t border-[var(--border-subtle)] px-4 text-left first:border-t-0 hover:bg-[var(--surface-hover)]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-[14px] font-medium">
                  {schedule.name}
                  {schedule.isDefault && (
                    <span className="rounded bg-[var(--surface-control)] px-1.5 py-0.5 text-[10px] font-normal text-[var(--text-secondary)]">
                      Default
                    </span>
                  )}
                </div>
                <div className="mt-0.5 truncate text-[12px] text-[var(--text-secondary)]">
                  {summary(schedule)}
                  {schedule._count?.tasks
                    ? ` · ${schedule._count.tasks} tasks`
                    : ""}
                </div>
              </div>
              <Pencil className="h-4 w-4 text-[var(--text-secondary)]" />
            </button>
          ))}
          {isLoading && (
            <div className="px-4 py-5 text-[13px] text-[var(--text-secondary)]">
              Loading schedules…
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={openNew}
          className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-[var(--control-radius)] text-[13px] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          <Plus className="h-4 w-4" />
          Create new schedule
        </button>
      </SettingsSection>

      <Dialog
        open={editorOpen}
        onOpenChange={(open) => {
          if (open || !copyInteraction.current) setEditorOpen(open);
          if (!open) hasScrolledToDefault.current = false;
        }}
      >
        <DialogContent className="flex h-[min(820px,calc(100dvh-32px))] w-[calc(100vw-32px)] max-w-none grid-cols-none flex-col gap-0 overflow-hidden p-0 sm:max-w-[calc(100vw-32px)]">
          <DialogTitle className="flex h-14 flex-none items-center border-b border-[var(--border-subtle)] px-5 text-[16px]">
            {draft.id ? "Edit schedule" : "Create new schedule"}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Create precise work windows or move and resize existing windows in
            15-minute increments.
          </DialogDescription>

          <div className="flex min-h-0 flex-1">
            <aside className="w-[300px] flex-none overflow-y-auto border-r border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5">
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="schedule-name">Schedule name</Label>
                  <Input
                    id="schedule-name"
                    value={draft.name}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schedule-timezone">Schedule timezone</Label>
                  <Input
                    id="schedule-timezone"
                    value={draft.timeZone}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        timeZone: event.target.value,
                      }))
                    }
                  />
                </div>
                <label className="flex min-h-9 items-center justify-between gap-3 text-[13px]">
                  <span>Default schedule</span>
                  <Switch
                    checked={draft.isDefault}
                    disabled={
                      Boolean(draft.id) &&
                      schedules.find((schedule) => schedule.id === draft.id)
                        ?.isDefault
                    }
                    onCheckedChange={(isDefault) =>
                      setDraft((current) => ({ ...current, isDefault }))
                    }
                  />
                </label>

                {selectedWindow && (
                  <div className="space-y-3 border-t border-[var(--border-subtle)] pt-4">
                    <div className="text-[13px] font-medium">
                      {DAYS[selectedWindow.dayOfWeek].label} hours
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="schedule-window-start">Start</Label>
                        <Input
                          id="schedule-window-start"
                          type="time"
                          step={900}
                          value={selectedWindow.startTime}
                          onChange={(event) =>
                            updateWindow(selectedWindow.id, {
                              startTime: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="schedule-window-end">End</Label>
                        <Input
                          id="schedule-window-end"
                          type="time"
                          step={900}
                          value={selectedWindow.endTime}
                          onChange={(event) =>
                            updateWindow(selectedWindow.id, {
                              endTime: event.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-[var(--color-danger)]"
                      onClick={() => {
                        setDraft((current) => ({
                          ...current,
                          windows: current.windows.filter(
                            (window) => window.id !== selectedWindow.id
                          ),
                        }));
                        setSelectedWindowId(null);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove interval
                    </Button>
                  </div>
                )}
              </div>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col bg-[var(--surface-panel)]">
              <div className="grid h-9 flex-none grid-cols-[54px_repeat(7,minmax(100px,1fr))] border-b border-[var(--border-subtle)]">
                <div />
                {DAYS.map((day) => (
                  <div
                    key={day.value}
                    className="flex items-center justify-between border-l border-[var(--border-subtle)] px-2 text-[12px] text-[var(--text-secondary)]"
                  >
                    <span>{day.label}</span>
                    <button
                      type="button"
                      onClick={() => openCopy(day.value)}
                      className="inline-flex h-6 items-center gap-1 rounded-[var(--control-radius)] border border-[var(--border-control)] bg-[var(--surface-control)] px-2 text-[11px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </button>
                  </div>
                ))}
              </div>

              <div
                className="min-h-0 flex-1 overflow-auto"
                ref={(node) => {
                  if (node && !hasScrolledToDefault.current) {
                    node.scrollTop = (6 - GRID_START_HOUR) * 4 * SLOT_HEIGHT;
                    hasScrolledToDefault.current = true;
                  }
                }}
              >
                <div
                  className="grid min-w-[820px] grid-cols-[54px_repeat(7,minmax(100px,1fr))]"
                  style={{ height: SLOT_COUNT * SLOT_HEIGHT }}
                >
                  <div className="relative">
                    {Array.from(
                      { length: GRID_END_HOUR - GRID_START_HOUR + 1 },
                      (_, index) => {
                        const hour = GRID_START_HOUR + index;
                        return (
                          <span
                            key={index}
                            className="absolute right-2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]"
                            style={{ top: index * SLOT_HEIGHT * 4 }}
                          >
                            {hour === 24
                              ? "12 AM"
                              : formatTime(minutesToTime(hour * 60))}
                          </span>
                        );
                      }
                    )}
                  </div>

                  {DAYS.map((day) => (
                    <div
                      key={day.value}
                      ref={(node) => {
                        if (node) dayColumns.current.set(day.value, node);
                        else dayColumns.current.delete(day.value);
                      }}
                      className="relative border-l border-[var(--border-subtle)]"
                      onPointerMove={(event) => {
                        if (drag?.day === day.value) {
                          updateDrag(
                            day.value,
                            slotFromPointer(day.value, event.clientY)
                          );
                        }
                      }}
                      onPointerUp={finishDrag}
                    >
                      {Array.from({ length: SLOT_COUNT }, (_, slot) => (
                        <div
                          key={slot}
                          role="button"
                          tabIndex={-1}
                          aria-label={`Add ${day.label} hours at ${formatTime(
                            minutesToTime(slotToMinutes(slot))
                          )}`}
                          className={cn(
                            "border-t border-[var(--border-subtle)]",
                            slot % 4 !== 0 && "border-t-transparent"
                          )}
                          style={{ height: SLOT_HEIGHT }}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            beginCreate(day.value, slot);
                          }}
                        />
                      ))}

                      {draft.windows
                        .filter((window) => window.dayOfWeek === day.value)
                        .map((window) => {
                          const startSlot = minutesToSlot(
                            timeToMinutes(window.startTime)
                          );
                          const endSlot = minutesToSlot(
                            timeToMinutes(window.endTime)
                          );
                          return (
                            <div
                              key={window.id}
                              role="button"
                              tabIndex={0}
                              aria-label={`${day.label} ${formatRange(window)}`}
                              className={cn(
                                "absolute inset-x-1 z-10 cursor-grab touch-none overflow-hidden rounded-[4px] border bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--surface-raised))] px-1.5 py-1 text-[11px] font-medium",
                                selectedWindowId === window.id
                                  ? "border-[var(--color-accent)]"
                                  : "border-[color-mix(in_srgb,var(--color-accent)_45%,var(--border-control))]"
                              )}
                              style={{
                                top: startSlot * SLOT_HEIGHT,
                                height: Math.max(
                                  SLOT_HEIGHT,
                                  (endSlot - startSlot) * SLOT_HEIGHT
                                ),
                              }}
                              onPointerDown={(event) =>
                                beginExistingDrag(event, window, "move")
                              }
                              onPointerMove={(event) => {
                                if (drag?.windowId === window.id) {
                                  updateDrag(
                                    day.value,
                                    slotFromPointer(day.value, event.clientY)
                                  );
                                }
                              }}
                              onPointerUp={finishDrag}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Delete" ||
                                  event.key === "Backspace"
                                ) {
                                  setDraft((current) => ({
                                    ...current,
                                    windows: current.windows.filter(
                                      (item) => item.id !== window.id
                                    ),
                                  }));
                                }
                              }}
                            >
                              <div
                                className="absolute inset-x-0 top-0 h-2 cursor-ns-resize"
                                onPointerDown={(event) =>
                                  beginExistingDrag(
                                    event,
                                    window,
                                    "resize-start"
                                  )
                                }
                              />
                              <span className="pointer-events-none">
                                {formatRange(window)}
                              </span>
                              <div
                                className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize"
                                onPointerDown={(event) =>
                                  beginExistingDrag(event, window, "resize-end")
                                }
                              />
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex min-h-14 flex-none items-center border-t border-[var(--border-subtle)] px-4">
                <span className="text-[12px] text-[var(--text-secondary)]">
                  Drag empty space to add. Drag or resize a block in 15-minute
                  steps.
                </span>
                <div className="ml-auto flex gap-2">
                  {draft.id && schedules.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={remove}
                      className="text-[var(--color-danger)]"
                    >
                      Delete
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditorOpen(false)}
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

      <Dialog
        open={copyOpen}
        onOpenChange={(open) => {
          if (open) {
            setCopyOpen(true);
          } else {
            closeCopy();
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogTitle>Copy hours to days</DialogTitle>
          <DialogDescription>
            Choose the days that should receive every interval from{" "}
            {copySourceDay === null ? "" : DAYS[copySourceDay].label}.
          </DialogDescription>
          <div className="space-y-1 py-2">
            {DAYS.filter((day) => day.value !== copySourceDay).map((day) => {
              const checked = copyTargetDays.includes(day.value);
              return (
                <label
                  key={day.value}
                  className="flex min-h-10 cursor-pointer items-center gap-3 rounded-[var(--control-radius)] px-2 hover:bg-[var(--surface-hover)]"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(next) =>
                      setCopyTargetDays((current) =>
                        next
                          ? [...current, day.value]
                          : current.filter((value) => value !== day.value)
                      )
                    }
                  />
                  <span className="flex-1 text-[13px]">{day.label}</span>
                  {checked && (
                    <Check className="h-4 w-4 text-[var(--color-accent)]" />
                  )}
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={closeCopy}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={applyCopy}
              disabled={copyTargetDays.length === 0}
            >
              Copy hours
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
