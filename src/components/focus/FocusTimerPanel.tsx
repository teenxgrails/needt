"use client";

import { useCallback, useEffect, useState } from "react";

import NumberFlow from "@number-flow/react";
import { Headphones, Pause, Play, Square } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { formatClock } from "@/lib/focus-timer";
import {
  ensureNotificationPermission,
  notifyFocusComplete,
} from "@/lib/focus-notifications";
import { springSoft } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { useFocusTimer } from "@/hooks/use-focus-timer";

import { useFocusTimerStore, type FocusMode } from "@/store/focusTimer";
import { useTaskStore } from "@/store/task";

import { Task, TaskStatus } from "@/types/task";

interface FocusTimerPanelProps {
  task: Task | null;
  immersive?: boolean;
  onRunningChange?: (running: boolean) => void;
}

interface FocusPayload {
  stats: {
    focusScore: number;
    currentStreak: number;
    longestStreak: number;
    lifetimeMinutes: number;
  };
  weeklyReport: {
    focusMinutes: number;
    sessionsCompleted: number;
    bestDay: string | null;
    estimateAccuracyPercent: number | null;
    dailyMinutes: { label: string; minutes: number }[];
    streakStatus: { current: number; longest: number; atRisk: boolean };
  };
}

const modeLabels: Record<FocusMode, string> = {
  POMODORO: "Pomodoro",
  FLOW: "Flow",
  DEEP_FOCUS: "Deep Focus",
};

const RING_RADIUS = 92;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function FocusTimerPanel({
  task,
  immersive = false,
  onRunningChange,
}: FocusTimerPanelProps) {
  const [mode, setMode] = useState<FocusMode>("POMODORO");
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [deepMinutes, setDeepMinutes] = useState(50);
  const [report, setReport] = useState<FocusPayload | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const {
    session,
    isActive,
    isRunning,
    isPaused,
    remainingSeconds,
    elapsedSeconds,
  } = useFocusTimer();
  const start = useFocusTimerStore((state) => state.start);
  const pause = useFocusTimerStore((state) => state.pause);
  const resume = useFocusTimerStore((state) => state.resume);
  const stop = useFocusTimerStore((state) => state.stop);
  const pendingCompletion = useFocusTimerStore(
    (state) => state.pendingCompletion
  );
  const clearPendingCompletion = useFocusTimerStore(
    (state) => state.clearPendingCompletion
  );
  const tasks = useTaskStore((state) => state.tasks);

  // The bound task is whatever the active session points at; otherwise the
  // task selected on the page (if any).
  const boundTask =
    (session?.taskId && tasks.find((t) => t.id === session.taskId)) ||
    (!session ? task : null) ||
    null;

  const plannedMinutes =
    mode === "POMODORO" ? workMinutes : mode === "DEEP_FOCUS" ? deepMinutes : null;

  const activePlanned = session?.plannedMinutes ?? null;
  const activeTotalSeconds = activePlanned ? activePlanned * 60 : 0;
  const progress =
    activePlanned && activeTotalSeconds > 0
      ? Math.min(1, 1 - (remainingSeconds ?? 0) / activeTotalSeconds)
      : isActive
        ? 1
        : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - progress);

  const displaySeconds = isActive
    ? session?.plannedMinutes == null
      ? elapsedSeconds
      : (remainingSeconds ?? 0)
    : (plannedMinutes ?? 0) * 60;

  const loadReport = useCallback(async () => {
    const response = await fetch("/api/focus");
    if (response.ok) setReport(await response.json());
  }, []);

  useEffect(() => {
    loadReport().catch(() => undefined);
  }, [loadReport]);

  useEffect(() => {
    onRunningChange?.(isRunning);
  }, [onRunningChange, isRunning]);

  // When a session completes, notify + toast, and refresh stats.
  useEffect(() => {
    if (!pendingCompletion) return;
    notifyFocusComplete(
      "Focus session complete",
      boundTask ? `Nice work on “${boundTask.title}”.` : "Nice focused block."
    );
    toast.success("Focus session complete");
    loadReport().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCompletion]);

  async function handleStart() {
    await ensureNotificationPermission();
    try {
      await start({
        taskId: boundTask?.id ?? null,
        mode,
        plannedMinutes,
      });
    } catch {
      toast.error("Could not start focus session");
    }
  }

  async function handleStop() {
    try {
      await stop({ completed: mode === "FLOW" });
      await loadReport();
    } catch {
      toast.error("Could not stop focus session");
    }
  }

  async function finishCompletion(markTaskDone: boolean) {
    const hadTask = Boolean(pendingCompletion?.taskId);
    clearPendingCompletion();
    if (markTaskDone && hadTask && pendingCompletion?.taskId) {
      try {
        await useTaskStore
          .getState()
          .updateTask(pendingCompletion.taskId, {
            status: TaskStatus.COMPLETED,
          });
      } catch {
        toast.error("Could not mark task done");
      }
    }
    await loadReport();
  }

  async function startBreak() {
    clearPendingCompletion();
    await start({ taskId: null, mode: "POMODORO", plannedMinutes: breakMinutes });
  }

  const isDeepLocked = session?.mode === "DEEP_FOCUS" && isRunning;
  const running = isActive;

  return (
    <motion.section
      layout={!prefersReducedMotion}
      animate={{
        scale: immersive && !prefersReducedMotion ? 1.025 : 1,
        y: immersive && !prefersReducedMotion ? 24 : 0,
      }}
      transition={prefersReducedMotion ? { duration: 0 } : springSoft}
      className={cn(
        "relative overflow-hidden border-b border-[var(--border-subtle)] pb-10",
        immersive &&
          "glass my-auto rounded-2xl border border-white/10 px-7 py-8 shadow-[0_24px_80px_-40px_rgba(111,116,255,0.7)]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase text-[var(--text-muted)]">
            Focus session
          </p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
            {boundTask ? boundTask.title : "Free session"}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {boundTask
              ? "Focused on this task"
              : "No task bound — this logs focus time only"}
          </p>
        </div>
        <Select
          value={session?.mode ?? mode}
          onValueChange={(value) => setMode(value as FocusMode)}
          disabled={running}
        >
          <SelectTrigger className="w-36">
            <SelectValue>{modeLabels[session?.mode ?? mode]}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="POMODORO">Pomodoro</SelectItem>
            <SelectItem value="FLOW">Flow</SelectItem>
            <SelectItem value="DEEP_FOCUS">Deep Focus</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mt-8 flex flex-col items-center gap-8 lg:flex-row">
        <div className="shrink-0">
          <div className="relative grid h-52 w-52 place-items-center rounded-full">
            <svg
              aria-label={`${Math.round(progress * 100)}% focus progress`}
              className="absolute inset-0 h-full w-full -rotate-90"
              viewBox="0 0 208 208"
            >
              <circle
                cx="104"
                cy="104"
                r={RING_RADIUS}
                fill="none"
                stroke="var(--border-control)"
                strokeWidth="8"
              />
              <motion.circle
                cx="104"
                cy="104"
                r={RING_RADIUS}
                fill="none"
                stroke="var(--accent)"
                strokeLinecap="round"
                strokeWidth="8"
                strokeDasharray={RING_CIRCUMFERENCE}
                initial={false}
                animate={{ strokeDashoffset: ringOffset }}
                transition={prefersReducedMotion ? { duration: 0 } : springSoft}
              />
            </svg>
            <div className="grid h-[184px] w-[184px] place-items-center rounded-full border border-[var(--border-control)] bg-[var(--surface-canvas)] text-center">
              <div>
                <div className="text-5xl font-semibold tabular-nums text-[var(--text-primary)]">
                  {formatClock(displaySeconds)}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-normal text-[var(--text-muted)]">
                  {isPaused ? "Paused" : modeLabels[session?.mode ?? mode]}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {!running && (
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs">
                Work
                <Input
                  type="number"
                  min="1"
                  value={workMinutes}
                  onChange={(event) =>
                    setWorkMinutes(Math.max(1, Number(event.target.value)))
                  }
                />
              </label>
              <label className="text-xs">
                Break
                <Input
                  type="number"
                  min="1"
                  value={breakMinutes}
                  onChange={(event) =>
                    setBreakMinutes(Math.max(1, Number(event.target.value)))
                  }
                />
              </label>
              <label className="text-xs">
                Deep
                <Input
                  type="number"
                  min="1"
                  value={deepMinutes}
                  onChange={(event) =>
                    setDeepMinutes(Math.max(1, Number(event.target.value)))
                  }
                />
              </label>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!running ? (
              <Button type="button" size="sm" onClick={handleStart}>
                <Play className="h-4 w-4" />
                {boundTask ? "Start focus" : "Start free session"}
              </Button>
            ) : (
              <>
                {session?.mode !== "DEEP_FOCUS" &&
                  (isPaused ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => resume()}
                    >
                      <Play className="h-4 w-4" />
                      Resume
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => pause()}
                    >
                      <Pause className="h-4 w-4" />
                      Pause
                    </Button>
                  ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isDeepLocked}
                  onClick={handleStop}
                >
                  <Square className="h-4 w-4" />
                  {session?.mode === "FLOW" ? "Finish" : "Stop"}
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-muted)]">
            <Headphones className="h-3.5 w-3.5" />
            Soundscape: rain, brown noise, or silence can plug in here.
          </div>
        </div>
      </div>

      {isDeepLocked && (
        <div className="mt-5 border-l-2 border-[var(--accent)] bg-[var(--surface-raised)] px-3 py-2 text-xs text-[var(--text-secondary)]">
          Deep Focus is a commitment block. It completes when the timer ends.
        </div>
      )}

      {report && (
        <>
          <div className="mt-8 grid grid-cols-2 border-y border-[var(--border-subtle)] sm:grid-cols-4">
            {[
              { label: "Focus score", value: report.stats.focusScore },
              {
                label: "Streak",
                value: report.stats.currentStreak,
                suffix: "d",
              },
              {
                label: "Focus hours",
                value: report.stats.lifetimeMinutes / 60,
                suffix: "h",
              },
              {
                label: "This week",
                value: report.weeklyReport.focusMinutes / 60,
                suffix: "h",
              },
            ].map(({ label, value, suffix }) => (
              <div
                key={label}
                className="border-r border-[var(--border-subtle)] px-3 py-4 last:border-r-0"
              >
                <div className="text-[11px] text-[var(--text-muted)]">
                  {label}
                </div>
                <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                  <NumberFlow
                    value={value}
                    suffix={suffix}
                    format={{ maximumFractionDigits: 1 }}
                    transformTiming={{ duration: 220, easing: "ease-out" }}
                    respectMotionPreference
                  />
                </div>
              </div>
            ))}
          </div>
          <WeekBarChart data={report.weeklyReport.dailyMinutes} />
        </>
      )}

      {report?.weeklyReport.streakStatus.atRisk && (
        <div className="glass--subtle mt-3 border-amber-300/30 bg-amber-500/10 p-2 text-xs text-amber-100">
          One completed session today keeps your{" "}
          <NumberFlow
            value={report.stats.currentStreak}
            transformTiming={{ duration: 180, easing: "ease-out" }}
            respectMotionPreference
          />
          -day streak warm.
        </div>
      )}

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
            {pendingCompletion?.taskId
              ? "Mark the task done, or log the time and keep going."
              : "Nice block. Keep the momentum going?"}
          </p>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            {pendingCompletion?.taskId && (
              <Button
                type="button"
                variant="outline"
                onClick={() => finishCompletion(true)}
              >
                Mark task done
              </Button>
            )}
            <Button type="button" variant="outline" onClick={() => startBreak()}>
              Start break
            </Button>
            <Button type="button" onClick={() => finishCompletion(false)}>
              Log and continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.section>
  );
}

function WeekBarChart({ data }: { data: { label: string; minutes: number }[] }) {
  const max = Math.max(1, ...data.map((day) => day.minutes));
  return (
    <div className="mt-6">
      <div className="mb-2 text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
        This week
      </div>
      <div className="flex items-end gap-2" style={{ height: 96 }}>
        {data.map((day, index) => (
          <div
            key={`${day.label}-${index}`}
            className="flex flex-1 flex-col items-center gap-1"
          >
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t bg-[var(--accent)]"
                style={{
                  height: `${Math.round((day.minutes / max) * 100)}%`,
                  minHeight: day.minutes > 0 ? 4 : 2,
                  opacity: day.minutes > 0 ? 1 : 0.25,
                }}
                title={`${day.minutes} min`}
              />
            </div>
            <span className="text-[10px] text-[var(--text-muted)]">
              {day.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
