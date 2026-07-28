"use client";

import { useState } from "react";

import { Ban, Clock3, RotateCcw, Sunrise, Sunset } from "lucide-react";
import { notify } from "@/lib/notifications";

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

import { useSettingsStore } from "@/store/settings";
import { useTaskStore } from "@/store/task";

type ActionMode = "start-later" | "stop-early" | "block-hours";

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

function dateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function CalendarDayActions({ date }: { date: Date }) {
  const { calendar } = useSettingsStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<ActionMode | null>(null);
  const [startTime, setStartTime] = useState(calendar.workingHours.start);
  const [endTime, setEndTime] = useState(calendar.workingHours.end);
  const [submitting, setSubmitting] = useState(false);

  const createOverride = async (payload: {
    kind: "START_LATER" | "STOP_EARLY" | "BLOCK_HOURS" | "BLOCK_WHOLE_DAY";
    startTime?: string;
    endTime?: string;
  }) => {
    const response = await fetch("/api/flexible-hours", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateKey(date), ...payload }),
    });
    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      throw new Error(data.error || "Could not update flexible hours");
    }
    await useTaskStore.getState().triggerScheduleAllTasks();
    window.dispatchEvent(new Event("needt:flexible-hours-changed"));
  };

  const applyTimedAction = async () => {
    if (!mode) return;
    setSubmitting(true);
    try {
      await createOverride(
        mode === "start-later"
          ? { kind: "START_LATER", startTime: endTime }
          : mode === "stop-early"
            ? { kind: "STOP_EARLY", endTime: startTime }
            : { kind: "BLOCK_HOURS", startTime, endTime }
      );
      setMode(null);
      notify.success("Today's task hours updated");
    } catch (error) {
      notify.error(
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
      await createOverride({ kind: "BLOCK_WHOLE_DAY" });
      notify.success("Whole day blocked");
    } catch (error) {
      notify.error(
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
      const response = await fetch(
        `/api/flexible-hours?date=${dateKey(date)}`,
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Could not reset hours");
      await useTaskStore.getState().triggerScheduleAllTasks();
      window.dispatchEvent(new Event("needt:flexible-hours-changed"));
      notify.success("Task hours reset");
    } catch {
      notify.error("Could not reset task hours");
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
            className="absolute right-2.5 grid h-7 w-7 place-items-center rounded-md text-[var(--text-muted)] opacity-0 transition-[opacity,color,background-color] duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:opacity-100 group-hover/day:opacity-100 group-focus-within/day:opacity-100"
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
