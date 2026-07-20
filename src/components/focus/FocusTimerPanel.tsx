"use client";

import { useEffect, useState } from "react";

import { Pause, Play } from "lucide-react";
import { toast } from "sonner";

import { AnimatedCircularProgressBar } from "@/components/ui/animated-circular-progress-bar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  ensureNotificationPermission,
  notifyFocusComplete,
} from "@/lib/focus-notifications";
import { formatClock } from "@/lib/focus-timer";

import { useFocusTimer } from "@/hooks/use-focus-timer";

import { useFocusTimerStore } from "@/store/focusTimer";
import { useTaskStore } from "@/store/task";

import { Task, TaskStatus } from "@/types/task";

interface FocusTimerPanelProps {
  task: Task | null;
}

const DEFAULT_FOCUS_MINUTES = 25;

export function FocusTimerPanel({ task }: FocusTimerPanelProps) {
  const [isChangingState, setIsChangingState] = useState(false);
  const {
    session,
    hydrated,
    isActive,
    isRunning,
    isPaused,
    remainingSeconds,
    elapsedSeconds,
  } = useFocusTimer();
  const start = useFocusTimerStore((state) => state.start);
  const pause = useFocusTimerStore((state) => state.pause);
  const resume = useFocusTimerStore((state) => state.resume);
  const pendingCompletion = useFocusTimerStore(
    (state) => state.pendingCompletion
  );
  const clearPendingCompletion = useFocusTimerStore(
    (state) => state.clearPendingCompletion
  );
  const tasks = useTaskStore((state) => state.tasks);

  const boundTask =
    (session?.taskId &&
      tasks.find((candidate) => candidate.id === session.taskId)) ||
    (!session ? task : null) ||
    null;
  const defaultMinutes = Math.max(
    1,
    boundTask?.estimatedMinutes ?? boundTask?.duration ?? DEFAULT_FOCUS_MINUTES
  );
  const plannedMinutes = session?.plannedMinutes ?? defaultMinutes;
  const totalSeconds = Math.max(1, plannedMinutes * 60);
  const isOpenTimer = isActive && session?.plannedMinutes == null;
  const displaySeconds = isActive
    ? isOpenTimer
      ? elapsedSeconds
      : (remainingSeconds ?? 0)
    : totalSeconds;
  const progressMax = isOpenTimer ? 60 : totalSeconds;
  const progressValue = isActive
    ? isOpenTimer
      ? elapsedSeconds % progressMax
      : Math.min(totalSeconds, elapsedSeconds)
    : 0;

  useEffect(() => {
    if (!pendingCompletion) return;
    notifyFocusComplete(
      "Focus session complete",
      boundTask ? `Nice work on “${boundTask.title}”.` : "Nice focused block."
    );
    toast.success("Focus session complete");
    // The store keeps this completion snapshot until the dialog is handled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCompletion]);

  async function handlePrimaryAction() {
    if (isChangingState) return;
    setIsChangingState(true);
    try {
      if (!isActive) {
        await ensureNotificationPermission();
        await start({
          taskId: boundTask?.id ?? null,
          mode: "POMODORO",
          plannedMinutes: defaultMinutes,
        });
      } else if (isPaused) {
        await resume();
      } else {
        await pause();
      }
    } catch {
      toast.error("Could not update focus session");
    } finally {
      setIsChangingState(false);
    }
  }

  async function finishCompletion(markTaskDone: boolean) {
    const taskId = pendingCompletion?.taskId;
    clearPendingCompletion();
    if (!markTaskDone || !taskId) return;
    try {
      await useTaskStore.getState().updateTask(taskId, {
        status: TaskStatus.COMPLETED,
      });
    } catch {
      toast.error("Could not mark task done");
    }
  }

  const buttonLabel = !hydrated
    ? "Loading"
    : !isActive
      ? "Start focus"
      : isPaused
        ? "Continue"
        : "Pause";

  return (
    <section className="flex w-full max-w-[460px] flex-col items-center text-center">
      <AnimatedCircularProgressBar
        min={0}
        max={progressMax}
        value={progressValue}
        gaugePrimaryColor="var(--color-accent)"
        gaugeSecondaryColor="color-mix(in srgb, var(--text-primary) 10%, transparent)"
        ariaLabel={`${buttonLabel}: ${formatClock(displaySeconds)}`}
        className="size-[min(76vw,340px)] text-[var(--text-primary)]"
      >
        <div className="flex flex-col items-center">
          <time
            className="text-[clamp(2.75rem,12vw,5rem)] font-semibold leading-none tracking-[-0.06em] tabular-nums"
            dateTime={`PT${Math.max(0, displaySeconds)}S`}
          >
            {formatClock(displaySeconds)}
          </time>
          {isPaused && (
            <span className="mt-3 text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Paused
            </span>
          )}
        </div>
      </AnimatedCircularProgressBar>

      <Button
        type="button"
        size="lg"
        onClick={() => void handlePrimaryAction()}
        disabled={!hydrated || isChangingState}
        className="mt-10 h-[52px] min-w-[190px] rounded-full px-10 text-[15px]"
      >
        {isActive && isRunning ? (
          <Pause className="h-4 w-4" />
        ) : (
          <Play className="h-4 w-4" />
        )}
        {buttonLabel}
      </Button>

      <Dialog
        open={Boolean(pendingCompletion)}
        onOpenChange={(open) => {
          if (!open) void finishCompletion(false);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Session complete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">
            Your focus time has been saved.
          </p>
          <DialogFooter>
            {pendingCompletion?.taskId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => void finishCompletion(true)}
              >
                Mark task done
              </Button>
            )}
            <Button type="button" onClick={() => void finishCompletion(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
