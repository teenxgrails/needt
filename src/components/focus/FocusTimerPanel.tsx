"use client";

import { type CSSProperties, useEffect, useState } from "react";

import { Check, Flame, Pause, Play, Square } from "lucide-react";

import { HabitPanel } from "@/components/focus/HabitPanel";
import { WeeklyFocusTarget } from "@/components/focus/WeeklyFocusTarget";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";

import {
  ensureNotificationPermission,
  notifyFocusComplete,
} from "@/lib/focus-notifications";
import { formatClock } from "@/lib/focus-timer";
import { notify } from "@/lib/notifications";

import { useFocusTimer } from "@/hooks/use-focus-timer";

import { useFocusTimerStore } from "@/store/focusTimer";
import { useTaskStore } from "@/store/task";

import { Task, TaskStatus } from "@/types/task";

interface FocusTimerPanelProps {
  task: Task | null;
}

interface FocusReport {
  stats: {
    focusScore: number;
    currentStreak: number;
    longestStreak: number;
    lifetimeMinutes: number;
  } | null;
  weeklyReport: {
    focusMinutes: number;
    sessionsCompleted: number;
    estimateAccuracyPercent: number | null;
    dailyMinutes: Array<{ label: string; minutes: number }>;
    streakStatus: { current: number; longest: number; atRisk: boolean };
  } | null;
  upgradeRequired: boolean;
}

const DEFAULT_FOCUS_MINUTES = 25;
type Strictness = "NORMAL" | "TIMEOUT" | "DEEP_FOCUS";

export function FocusTimerPanel({ task }: FocusTimerPanelProps) {
  const [isChangingState, setIsChangingState] = useState(false);
  const [duration, setDuration] = useState(DEFAULT_FOCUS_MINUTES);
  const [intention, setIntention] = useState("");
  const [strictness, setStrictness] = useState<Strictness>("NORMAL");
  const [report, setReport] = useState<FocusReport | null>(null);
  const [exitReadyAt, setExitReadyAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const timer = useFocusTimer();
  const start = useFocusTimerStore((state) => state.start);
  const pause = useFocusTimerStore((state) => state.pause);
  const resume = useFocusTimerStore((state) => state.resume);
  const stop = useFocusTimerStore((state) => state.stop);
  const fetchActive = useFocusTimerStore((state) => state.fetchActive);
  const pendingCompletion = useFocusTimerStore(
    (state) => state.pendingCompletion
  );
  const clearPendingCompletion = useFocusTimerStore(
    (state) => state.clearPendingCompletion
  );
  const tasks = useTaskStore((state) => state.tasks);

  const boundTask =
    (timer.session?.taskId &&
      tasks.find((candidate) => candidate.id === timer.session?.taskId)) ||
    (!timer.session ? task : null) ||
    null;
  const suggestedMinutes = Math.max(
    5,
    boundTask?.estimatedMinutes ?? boundTask?.duration ?? DEFAULT_FOCUS_MINUTES
  );
  const plannedMinutes = timer.session?.plannedMinutes ?? duration;
  const totalSeconds = Math.max(1, plannedMinutes * 60);
  const displaySeconds = timer.isActive
    ? timer.session?.plannedMinutes == null
      ? timer.elapsedSeconds
      : (timer.remainingSeconds ?? 0)
    : duration * 60;
  const progress = timer.isActive
    ? Math.min(100, (timer.elapsedSeconds / totalSeconds) * 100)
    : 0;
  const exitSeconds = exitReadyAt
    ? Math.max(0, Math.ceil((exitReadyAt - now) / 1000))
    : null;

  useEffect(() => {
    if (!timer.isActive) setDuration(suggestedMinutes);
  }, [suggestedMinutes, timer.isActive]);

  useEffect(() => {
    void fetch("/api/focus", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: FocusReport) => setReport(data))
      .catch(() => setReport(null));
  }, [pendingCompletion]);

  useEffect(() => {
    if (!exitReadyAt) return;
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, [exitReadyAt]);

  useEffect(() => {
    if (!pendingCompletion) return;
    notifyFocusComplete(
      "Focus session complete",
      boundTask ? `Nice work on “${boundTask.title}”.` : "Nice focused block."
    );
    notify.success("Focus session complete");
  }, [boundTask, pendingCompletion]);

  async function handlePrimaryAction() {
    if (isChangingState) return;
    setIsChangingState(true);
    try {
      if (!timer.isActive) {
        await ensureNotificationPermission();
        await start({
          taskId: boundTask?.id ?? null,
          mode: "POMODORO",
          plannedMinutes: duration,
          intention,
          strictness,
        });
      } else if (timer.isPaused) {
        await resume();
      } else {
        await pause();
      }
    } catch {
      notify.error("Could not update focus session");
    } finally {
      setIsChangingState(false);
    }
  }

  async function endSession() {
    if (exitReadyAt == null) {
      const response = await fetch("/api/focus/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request-stop",
          sessionId: timer.session?.id,
        }),
      });
      const result = (await response.json()) as {
        waitSeconds?: number;
        readyAt?: string;
        error?: string;
      };
      if (!response.ok) {
        notify.error(
          result.error === "DEEP_FOCUS_LOCKED"
            ? "Deep Focus cannot be ended early"
            : "Could not prepare early exit"
        );
        return;
      }
      setNow(Date.now());
      setExitReadyAt(
        result.readyAt
          ? new Date(result.readyAt).getTime()
          : Date.now() + (result.waitSeconds ?? 5) * 1000
      );
      return;
    }
    if (Date.now() < exitReadyAt) return;
    try {
      await stop({ completed: false });
      setExitReadyAt(null);
      notify.warning("Focus session ended early");
    } catch {
      notify.error("The exit delay is still active");
    }
  }

  async function finishCompletion(action: "done" | "task" | "break") {
    const taskId = pendingCompletion?.taskId;
    clearPendingCompletion();
    if (action === "task" && taskId) {
      await useTaskStore.getState().updateTask(taskId, {
        status: TaskStatus.COMPLETED,
      });
    }
    if (action === "break") {
      const longBreak =
        (report?.weeklyReport?.sessionsCompleted ?? 0) > 0 &&
        (report?.weeklyReport?.sessionsCompleted ?? 0) % 4 === 0;
      await start({
        mode: "POMODORO",
        plannedMinutes: longBreak ? 15 : 5,
        phase: longBreak ? "LONG_BREAK" : "SHORT_BREAK",
        source: "focus-break",
      });
    }
  }

  async function addFiveMinutes() {
    if (!timer.session) return;
    const response = await fetch("/api/focus/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "extend",
        sessionId: timer.session.id,
        minutes: 5,
      }),
    });
    if (!response.ok) {
      notify.error("Could not extend this session");
      return;
    }
    await fetchActive();
    notify.success("Added 5 minutes");
  }

  const bars =
    report?.weeklyReport?.dailyMinutes ??
    Array.from({ length: 7 }, (_, index) => ({
      label: ["M", "T", "W", "T", "F", "S", "S"][index],
      minutes: 0,
    }));
  const maxBar = Math.max(25, ...bars.map((bar) => bar.minutes));
  const streak = report?.stats?.currentStreak ?? 0;
  const hasAnalytics = Boolean(report?.stats && report.weeklyReport);
  const nextTask = tasks.find(
    (candidate) =>
      candidate.id !== boundTask?.id &&
      candidate.status !== TaskStatus.COMPLETED
  );
  const modeLabel =
    strictness === "DEEP_FOCUS"
      ? "Deep Focus"
      : strictness === "TIMEOUT"
        ? "Timeout"
        : "Normal";

  return (
    <div
      data-testid="focus-flat-canvas"
      className="mx-auto w-full max-w-5xl px-1 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:px-5 sm:pb-10"
    >
      <section className="relative border-b border-[var(--border-subtle)] pb-8">
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-muted)]">
                {timer.session?.phase === "SHORT_BREAK" ||
                timer.session?.phase === "LONG_BREAK"
                  ? "Recovery"
                  : timer.isPaused
                    ? "Paused"
                    : "Focus"}
              </p>
              <h1 className="mt-2 line-clamp-1 text-xl font-semibold sm:text-2xl">
                {boundTask?.title || intention || "Make this block count"}
              </h1>
              <p className="mt-1 line-clamp-1 text-xs text-[var(--text-muted)]">
                {nextTask ? `Next: ${nextTask.title}` : "Your queue is clear"}
              </p>
            </div>
            <div className="flex items-center gap-2 py-1.5 text-xs text-[var(--text-secondary)]">
              <span>{modeLabel}</span>
              <span aria-hidden="true">·</span>
              <Flame className="h-4 w-4 text-amber-500" />
              {streak} day{streak === 1 ? "" : "s"}
            </div>
          </div>

          <div className="flex min-h-[360px] flex-col items-center justify-center py-8 sm:min-h-[430px]">
            <time
              dateTime={`PT${Math.max(0, displaySeconds)}S`}
              className="text-[clamp(4rem,14vw,8rem)] font-semibold leading-none tracking-[-0.07em] tabular-nums"
            >
              {formatClock(displaySeconds)}
            </time>
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {exitSeconds != null && exitSeconds > 0
                ? `Early exit available in ${exitSeconds} seconds`
                : `${Math.ceil(displaySeconds / 60)} minutes remaining`}
            </div>
            {timer.isPaused && (
              <span className="mt-4 text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
                Paused
              </span>
            )}

            <div className="mt-10 w-full max-w-xl">
              <div className="mb-3 flex items-center justify-between text-sm">
                <span className="text-[var(--text-secondary)]">
                  {timer.isActive ? "Progress" : "Duration"}
                </span>
                <span className="font-medium tabular-nums">
                  {timer.isActive
                    ? `${Math.floor(timer.elapsedSeconds / 60)}m / ${plannedMinutes}m`
                    : `${duration} min`}
                </span>
              </div>
              <div
                className="mb-6 grid grid-cols-3 border border-[var(--border-subtle)]"
                aria-label="Focus mode"
              >
                {(
                  [
                    ["NORMAL", "Normal"],
                    ["TIMEOUT", "Timeout"],
                    ["DEEP_FOCUS", "Deep Focus"],
                  ] as const
                ).map(([value, label], index) => {
                  const gated =
                    value !== "NORMAL" && Boolean(report?.upgradeRequired);
                  return (
                    <button
                      key={value}
                      type="button"
                      disabled={gated || timer.isActive}
                      onClick={() => setStrictness(value)}
                      className={`min-h-11 px-2 text-xs transition-colors ${
                        index > 0
                          ? "border-l border-[var(--border-subtle)]"
                          : ""
                      } ${
                        strictness === value
                          ? "bg-[var(--text-primary)] text-[var(--surface-canvas)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                      } disabled:cursor-not-allowed disabled:opacity-40`}
                      title={
                        gated ? "Available on Pro and Lifetime" : undefined
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {!timer.isActive ? (
                <Slider
                  value={[duration]}
                  min={5}
                  max={180}
                  step={5}
                  aria-label="Focus duration in minutes"
                  onValueChange={([value]) => setDuration(value)}
                  className="focus-duration-slider [&>span:first-child]:bg-[var(--surface-active)] [&>span:first-child>span]:bg-[var(--text-primary)]"
                  thumbStyle={
                    {
                      borderColor: "var(--text-primary)",
                      outlineColor: "var(--text-primary)",
                      boxShadow: "none",
                      "--tw-ring-color": "var(--text-primary)",
                    } as CSSProperties
                  }
                />
              ) : (
                <div
                  className="h-2 overflow-hidden bg-[color-mix(in_srgb,var(--text-primary)_9%,transparent)]"
                  aria-label={`${Math.round(progress)} percent complete`}
                >
                  <div
                    className="h-full bg-[var(--text-primary)] transition-[width] duration-1000"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
              <div className="mt-2 flex justify-between text-[10px] text-[var(--text-muted)]">
                {Array.from({ length: 12 }, (_, index) => (
                  <span key={index} className="h-2 w-px bg-current" />
                ))}
              </div>
              {!timer.isActive ? (
                <Input
                  value={intention}
                  onChange={(event) => setIntention(event.target.value)}
                  placeholder="What will be true when this block is done?"
                  className="mt-6 h-11 border-x-0 border-t-0 bg-transparent text-center"
                />
              ) : (
                <div className="mt-6 flex h-11 items-center justify-center border-b border-[var(--border-subtle)] text-center text-sm text-[var(--text-secondary)]">
                  {intention || "No intention set"}
                </div>
              )}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                size="lg"
                onClick={() => void handlePrimaryAction()}
                disabled={!timer.hydrated || isChangingState}
                className="h-12 min-w-[180px] border border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--surface-canvas)] shadow-none hover:bg-[var(--text-secondary)]"
              >
                {timer.isActive && timer.isRunning ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {!timer.hydrated
                  ? "Loading"
                  : !timer.isActive
                    ? "Start timer"
                    : timer.isPaused
                      ? "Continue"
                      : "Pause"}
              </Button>
              {timer.isActive && (
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12"
                  onClick={() => void addFiveMinutes()}
                >
                  +5 min
                </Button>
              )}
              {timer.isActive && (
                <Button
                  variant="ghost"
                  size="lg"
                  className="h-12"
                  onClick={() => void endSession()}
                  disabled={exitSeconds != null && exitSeconds > 0}
                >
                  <Square className="h-4 w-4" />
                  {exitSeconds == null
                    ? "End"
                    : exitSeconds > 0
                      ? `Wait ${exitSeconds}s`
                      : "End now"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </section>

      <aside>
        <WeeklyFocusTarget />
        <HabitPanel />
        <section className="border-b border-[var(--border-subtle)] py-8">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-muted)]">
                Daily insight
              </p>
              <h2 className="mt-1 font-semibold">Your focus activity</h2>
            </div>
            {hasAnalytics && (
              <span className="text-xl font-semibold tabular-nums">
                {report?.stats?.focusScore}%
              </span>
            )}
          </div>
          {hasAnalytics && (
            <div
              className="mt-6 flex h-32 items-end gap-2"
              aria-label="Focused minutes over the last seven days"
            >
              {bars.map((bar, index) => (
                <div
                  key={`${bar.label}-${index}`}
                  className="flex h-full flex-1 flex-col justify-end gap-2"
                >
                  <div
                    className="min-h-1 bg-gradient-to-t from-emerald-300 via-cyan-300 to-violet-300"
                    style={{
                      height: `${Math.max(4, (bar.minutes / maxBar) * 100)}%`,
                    }}
                    title={`${bar.minutes} focused minutes`}
                  />
                  <span className="text-center text-[10px] text-[var(--text-muted)]">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {hasAnalytics ? (
          <div className="grid grid-cols-2 border-b border-[var(--border-subtle)] sm:grid-cols-4">
            <Insight
              label="Focus score"
              value={`${report?.stats?.focusScore}%`}
            />
            <Insight
              label="This week"
              value={`${report?.weeklyReport?.focusMinutes ?? 0}m`}
            />
            <Insight
              label="Sessions"
              value={String(report?.weeklyReport?.sessionsCompleted ?? 0)}
            />
            <Insight
              label="Accuracy"
              value={
                report?.weeklyReport?.estimateAccuracyPercent
                  ? `${report.weeklyReport.estimateAccuracyPercent}%`
                  : "—"
              }
            />
          </div>
        ) : (
          <p className="border-b border-[var(--border-subtle)] py-5 text-sm text-[var(--text-muted)]">
            Complete a few focus blocks to unlock weekly analytics.
          </p>
        )}

        <section className="border-b border-[var(--border-subtle)] py-7">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Daily streak</h2>
            <span className="text-sm text-[var(--text-secondary)]">
              Best {report?.stats?.longestStreak ?? 0}
            </span>
          </div>
          <div className="mt-4 flex justify-between gap-2">
            {bars.map((bar, index) => (
              <div
                key={`${bar.label}-streak-${index}`}
                className="flex flex-col items-center gap-2"
              >
                <span className="text-[10px] text-[var(--text-muted)]">
                  {bar.label}
                </span>
                <span
                  className={`grid h-8 w-8 place-items-center border text-xs ${bar.minutes >= 25 ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--surface-canvas)]" : "border-[var(--border-subtle)] text-[var(--text-muted)]"}`}
                >
                  {bar.minutes >= 25 ? <Check className="h-4 w-4" /> : "·"}
                </span>
              </div>
            ))}
          </div>
        </section>
      </aside>

      <Dialog
        open={Boolean(pendingCompletion)}
        onOpenChange={(open) => !open && void finishCompletion("done")}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Beautiful work.</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-[var(--text-secondary)]">
            Your focused time is saved. Take a breath before choosing what comes
            next.
          </p>
          {[3, 7, 14, 30, 60, 100].includes(streak) && (
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-hover)] p-3 text-sm">
              🔥 {streak}-day milestone reached
            </div>
          )}
          <DialogFooter className="flex-wrap">
            <Button
              variant="outline"
              onClick={() => void finishCompletion("break")}
            >
              {(report?.weeklyReport?.sessionsCompleted ?? 0) > 0 &&
              (report?.weeklyReport?.sessionsCompleted ?? 0) % 4 === 0
                ? "15 min break"
                : "5 min break"}
            </Button>
            {pendingCompletion?.taskId && (
              <Button
                variant="outline"
                onClick={() => void finishCompletion("task")}
              >
                Mark task done
              </Button>
            )}
            <Button onClick={() => void finishCompletion("done")}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l border-[var(--border-subtle)] py-5 text-center first:border-l-0">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
