"use client";

import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";

import { useDurationMemoryStore } from "@/store/durationMemory";
import { useFocusModeStore } from "@/store/focusMode";
import { useTaskStore } from "@/store/task";

import { Task, TaskStatus } from "@/types/task";

const LOG_SOURCE = "StartTaskModal";

const DURATION_OPTIONS = [5, 15, 30, 45, 60, 90, 120];

interface StartTaskModalProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function StartTaskModal({
  task,
  open,
  onOpenChange,
}: StartTaskModalProps) {
  const updateTask = useTaskStore((state) => state.updateTask);
  const remember = useDurationMemoryStore((state) => state.remember);
  const recall = useDurationMemoryStore((state) => state.recall);
  const switchToTask = useFocusModeStore((state) => state.switchToTask);

  const [duration, setDuration] = useState(30);
  const [startFocus, setStartFocus] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  // Prefer a learned duration for similar tasks, then the task's own duration.
  const defaultDuration = useMemo(() => {
    if (!task) return 30;
    return recall(task.title) ?? task.duration ?? 30;
  }, [task, recall]);

  useEffect(() => {
    if (open) {
      setDuration(defaultDuration);
      setStartFocus(true);
    }
  }, [open, defaultDuration]);

  const handleStart = async () => {
    if (!task) return;
    setIsStarting(true);
    try {
      const now = newDate();
      const end = newDate(now.getTime() + duration * 60 * 1000);

      // Allocate this block now and let the existing scheduling engine move
      // other tasks around the locked block (updateTask triggers a reschedule).
      await updateTask(task.id, {
        duration,
        scheduledStart: now,
        scheduledEnd: end,
        isAutoScheduled: true,
        scheduleLocked: true,
        status: TaskStatus.IN_PROGRESS,
      });

      // Learn the chosen duration for future similar tasks.
      remember(task.title, duration);

      if (startFocus) {
        switchToTask(task.id);
      }

      logger.info(
        "Started task now",
        { taskId: task.id, duration, startFocus },
        LOG_SOURCE
      );
      onOpenChange(false);
    } catch (error) {
      logger.error(
        "Failed to start task",
        { error: error instanceof Error ? error.message : "Unknown error" },
        LOG_SOURCE
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Start task now</DialogTitle>
          <DialogDescription className="truncate text-[var(--text-hi)]">
            {task?.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-[var(--text-hi)]">
              How long are you going to work on this task now?
            </label>
            <Select
              value={String(duration)}
              onValueChange={(value) => setDuration(Number(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map((minutes) => (
                  <SelectItem key={minutes} value={String(minutes)}>
                    {minutes} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--text-hi)]">
            <input
              type="checkbox"
              checked={startFocus}
              onChange={(event) => setStartFocus(event.target.checked)}
              className="h-4 w-4 rounded border-[var(--line-strong)] bg-[var(--raised)] accent-[var(--accent)]"
            />
            Start focus on this task
          </label>

          <p className="text-xs text-[var(--text-lo)]">
            We&apos;ll move current task(s) to a different time.
          </p>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isStarting}
          >
            Cancel
          </Button>
          <Button onClick={handleStart} disabled={isStarting || !task}>
            {isStarting ? "Starting…" : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
