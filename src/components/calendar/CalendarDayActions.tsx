"use client";

import { useState } from "react";

import { Ban, Clock3, RotateCcw, Sunrise, Sunset } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { APP_NAME } from "@/lib/app-config";
import { newDate } from "@/lib/date-utils";

import { useCalendarStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";
import { useTaskStore } from "@/store/task";

import { CalendarFeed } from "@/types/calendar";

type ActionMode = "start-later" | "stop-early" | "block-hours";

const DAY_BLOCK_MARKER = "[NEEDT_DAY_BLOCK]";

const ACTIONS = [
  {
    mode: "start-later" as const,
    title: "Start tasks later",
    description: "Move tasks to when you're ready.",
    icon: Sunrise,
  },
  {
    mode: "stop-early" as const,
    title: "Stop tasks early",
    description: "Reschedule today's tasks for later.",
    icon: Sunset,
  },
  {
    mode: "block-hours" as const,
    title: "Block out hours",
    description: "Block specific hours.",
    icon: Ban,
  },
] as const;

function atTime(date: Date, value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  const result = newDate(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

function sameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function CalendarDayActions({ date }: { date: Date }) {
  const { addEvent, events, feeds, removeEvent } = useCalendarStore();
  const { autoSchedule, calendar, updateAutoScheduleSettings } =
    useSettingsStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<ActionMode | null>(null);
  const [startTime, setStartTime] = useState(calendar.workingHours.start);
  const [endTime, setEndTime] = useState(calendar.workingHours.end);
  const [submitting, setSubmitting] = useState(false);

  const ensureLocalFeed = async () => {
    let feed = feeds.find((candidate) => candidate.type === "LOCAL");
    if (!feed) {
      const response = await fetch("/api/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: APP_NAME,
          type: "LOCAL",
          color: "#6366F1",
          enabled: true,
        }),
      });
      if (!response.ok) throw new Error("Could not create a local calendar");
      feed = (await response.json()) as CalendarFeed;
      await useCalendarStore.getState().loadFromDatabase();
    }

    let selected: string[] = [];
    try {
      selected = JSON.parse(autoSchedule.selectedCalendars || "[]");
    } catch {
      selected = [];
    }
    if (!selected.includes(feed.id)) {
      updateAutoScheduleSettings({
        selectedCalendars: JSON.stringify([...selected, feed.id]),
      });
    }
    return feed;
  };

  const createBlock = async (start: Date, end: Date, allDay = false) => {
    if (end <= start) throw new Error("End time must be after start time");
    const feed = await ensureLocalFeed();
    await addEvent({
      title: "Unavailable",
      description: DAY_BLOCK_MARKER,
      start,
      end,
      feedId: feed.id,
      allDay,
      isRecurring: false,
      isMaster: false,
    });
    await useTaskStore.getState().triggerScheduleAllTasks();
  };

  const applyTimedAction = async () => {
    if (!mode) return;
    setSubmitting(true);
    try {
      const start =
        mode === "start-later"
          ? atTime(date, calendar.workingHours.start)
          : atTime(date, startTime);
      const end =
        mode === "stop-early"
          ? atTime(date, calendar.workingHours.end)
          : atTime(date, mode === "start-later" ? endTime : endTime);
      await createBlock(start, end);
      setMode(null);
      toast.success("Today's task hours updated");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update hours"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const blockWholeDay = async () => {
    setMenuOpen(false);
    setSubmitting(true);
    try {
      const start = newDate(date);
      start.setHours(0, 0, 0, 0);
      const end = newDate(start);
      end.setDate(end.getDate() + 1);
      await createBlock(start, end, true);
      toast.success("Whole day blocked");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not block day"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetHours = async () => {
    setMenuOpen(false);
    setSubmitting(true);
    try {
      const blocks = events.filter(
        (event) =>
          event.description?.includes(DAY_BLOCK_MARKER) &&
          sameLocalDay(newDate(event.start), date)
      );
      await Promise.all(blocks.map((event) => removeEvent(event.id)));
      await useTaskStore.getState().triggerScheduleAllTasks();
      toast.success("Task hours reset");
    } catch {
      toast.error("Could not reset task hours");
    } finally {
      setSubmitting(false);
    }
  };

  const openAction = (nextMode: ActionMode) => {
    setStartTime(calendar.workingHours.start);
    setEndTime(calendar.workingHours.end);
    if (nextMode === "start-later") setEndTime("10:00");
    if (nextMode === "stop-early") setStartTime("16:00");
    setMenuOpen(false);
    setMode(nextMode);
  };

  const selectedAction = ACTIONS.find((action) => action.mode === mode);

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            onClick={(event) => event.stopPropagation()}
            aria-label="Adjust task hours"
            className="absolute right-2.5 grid h-7 w-7 place-items-center rounded-md text-[var(--text-muted)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <Clock3 className="h-3.5 w-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" sideOffset={6} className="w-[290px] p-1.5">
          {ACTIONS.map((action) => (
            <button
              key={action.mode}
              type="button"
              onClick={() => openAction(action.mode)}
              className="flex min-h-12 w-full gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[var(--menu-item-hover)]"
            >
              <action.icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-secondary)]" />
              <span>
                <span className="block text-[13px] font-medium text-[var(--text-primary)]">
                  {action.title}
                </span>
                <span className="mt-0.5 block text-[12px] text-[var(--text-secondary)]">
                  {action.description}
                </span>
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => void blockWholeDay()}
            className="flex min-h-12 w-full gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[var(--menu-item-hover)]"
          >
            <Ban className="mt-0.5 h-4 w-4 text-[var(--text-secondary)]" />
            <span>
              <span className="block text-[13px] font-medium">
                Block out whole day
              </span>
              <span className="mt-0.5 block text-[12px] text-[var(--text-secondary)]">
                Blocks whole day.
              </span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => void resetHours()}
            disabled={submitting}
            className="flex min-h-12 w-full gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors duration-150 hover:bg-[var(--menu-item-hover)] disabled:opacity-50"
          >
            <RotateCcw className="mt-0.5 h-4 w-4 text-[var(--text-secondary)]" />
            <span>
              <span className="block text-[13px] font-medium">Reset hours</span>
              <span className="mt-0.5 block text-[12px] text-[var(--text-secondary)]">
                All hours will be unblocked.
              </span>
            </span>
          </button>
        </PopoverContent>
      </Popover>

      <Dialog
        open={Boolean(mode)}
        onOpenChange={(open) => !open && setMode(null)}
      >
        <DialogContent className="gap-0 p-0 sm:max-w-[460px]">
          <DialogHeader className="border-b border-[var(--border-subtle)] px-5 py-4 pr-14">
            <DialogTitle>{selectedAction?.title}</DialogTitle>
            <DialogDescription>{selectedAction?.description}</DialogDescription>
          </DialogHeader>
          <div className="flex items-end gap-3 px-5 py-5">
            {mode !== "start-later" && (
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="day-action-start">Start</Label>
                <Input
                  id="day-action-start"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </div>
            )}
            {mode !== "stop-early" && (
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="day-action-end">
                  {mode === "start-later" ? "Start tasks at" : "End"}
                </Label>
                <Input
                  id="day-action-end"
                  type="time"
                  value={endTime}
                  onChange={(event) => setEndTime(event.target.value)}
                />
              </div>
            )}
            {mode === "stop-early" && (
              <div className="flex-1 space-y-1.5">
                <Label htmlFor="day-action-stop">Stop tasks at</Label>
                <Input
                  id="day-action-stop"
                  type="time"
                  value={startTime}
                  onChange={(event) => setStartTime(event.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter className="border-t border-[var(--border-subtle)] px-5 py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting}
              onClick={() => void applyTimedAction()}
            >
              {submitting ? "Applying…" : "Apply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
