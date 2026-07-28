"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { notify } from "@/lib/notifications";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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

import { logger } from "@/lib/logger";

import { useDurationMemoryStore } from "@/store/durationMemory";
import { useTaskStore } from "@/store/task";

import { Task } from "@/types/task";

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
  const router = useRouter();
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const remember = useDurationMemoryStore((state) => state.remember);
  const recall = useDurationMemoryStore((state) => state.recall);

  const [duration, setDuration] = useState(30);
  const [startFocus, setStartFocus] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [confirmOutsideWorkHours, setConfirmOutsideWorkHours] = useState(false);
  const commandKey = useRef(crypto.randomUUID());

  // Prefer a learned duration for similar tasks, then the task's own duration.
  const defaultDuration = useMemo(() => {
    if (!task) return 30;
    return recall(task.title) ?? task.duration ?? 30;
  }, [task, recall]);

  useEffect(() => {
    if (open) {
      setDuration(defaultDuration);
      setStartFocus(true);
      setConfirmOutsideWorkHours(false);
      commandKey.current = crypto.randomUUID();
    }
  }, [open, defaultDuration]);

  const handleStart = async () => {
    if (!task) return;
    setIsStarting(true);
    try {
      const response = await fetch(`/api/tasks/${task.id}/start-now`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": commandKey.current,
        },
        body: JSON.stringify({
          durationMinutes: duration,
          startFocus,
          confirmOutsideWorkHours,
        }),
      });
      const result = (await response.json()) as {
        error?: string;
        requiresConfirmation?: boolean;
      };
      if (
        response.status === 409 &&
        result.error === "OUTSIDE_WORK_HOURS" &&
        result.requiresConfirmation
      ) {
        setConfirmOutsideWorkHours(true);
        return;
      }
      if (!response.ok) throw new Error(result.error || "Could not start task.");

      // Learn the chosen duration for future similar tasks.
      remember(task.title, duration);
      await fetchTasks();

      logger.info(
        "Started task now",
        { taskId: task.id, duration, startFocus },
        LOG_SOURCE
      );
      onOpenChange(false);
      notify.success(startFocus ? "Focus session started." : "Task started.");
      if (startFocus) router.push("/focus");
    } catch (error) {
      notify.error(
        error instanceof Error ? error.message : "Could not start task."
      );
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
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[400px]">
        <DialogHeader className="border-b border-[var(--border-subtle)] px-5 py-4 pr-12">
          <DialogTitle className="text-[16px]">Start task now</DialogTitle>
          <DialogDescription className="line-clamp-2 pt-0.5 text-[13px] text-[var(--text-secondary)]">
            {task?.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div className="space-y-2">
            <label className="text-[13px] font-medium text-[var(--text-primary)]">
              How long are you going to work on this task now?
            </label>
            <Select
              value={String(duration)}
              onValueChange={(value) => setDuration(Number(value))}
            >
              <SelectTrigger className="h-[var(--control-height-sm)]">
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

          <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-[var(--text-primary)]">
            <Checkbox
              checked={startFocus}
              onCheckedChange={(checked) => setStartFocus(checked === true)}
            />
            Start focus on this task
          </label>

          <p className="text-[12px] text-[var(--text-muted)]">
            {confirmOutsideWorkHours
              ? "This is outside your Work Hours. Confirm to create a locked block anyway."
              : "We’ll move current task(s) to a different time."}
          </p>
        </div>

        <DialogFooter className="gap-2 border-t border-[var(--border-subtle)] px-5 py-3 sm:space-x-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isStarting}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="min-w-[76px]"
            onClick={handleStart}
            disabled={isStarting || !task}
          >
            {isStarting
              ? "Starting…"
              : confirmOutsideWorkHours
                ? "Start anyway"
                : "Start"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
