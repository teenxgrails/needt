"use client";

import { useEffect, useRef, useState } from "react";

import NumberFlow from "@number-flow/react";
import { Headphones, Pause, Play, Square } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { newDate } from "@/lib/date-utils";
import { springSoft } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { Task } from "@/types/task";

type FocusModeName = "POMODORO" | "FLOW" | "DEEP_FOCUS";

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
    streakStatus: { current: number; longest: number; atRisk: boolean };
  };
}

const modeLabels: Record<FocusModeName, string> = {
  POMODORO: "Pomodoro",
  FLOW: "Flow",
  DEEP_FOCUS: "Deep Focus",
};

function mmss(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder
    .toString()
    .padStart(2, "0")}`;
}

const RING_RADIUS = 92;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function FocusTimerPanel({
  task,
  immersive = false,
  onRunningChange,
}: FocusTimerPanelProps) {
  const [mode, setMode] = useState<FocusModeName>("POMODORO");
  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);
  const [deepMinutes, setDeepMinutes] = useState(50);
  const [running, setRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [startedAt, setStartedAt] = useState<Date | null>(null);
  const [report, setReport] = useState<FocusPayload | null>(null);
  const [sessionBloom, setSessionBloom] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const plannedMinutes =
    mode === "POMODORO"
      ? workMinutes
      : mode === "DEEP_FOCUS"
        ? deepMinutes
        : null;
  const totalSeconds = plannedMinutes
    ? plannedMinutes * 60
    : Math.max(1, elapsedSeconds);
  const remainingSeconds = plannedMinutes
    ? totalSeconds - elapsedSeconds
    : elapsedSeconds;
  const progress = plannedMinutes
    ? Math.min(1, elapsedSeconds / totalSeconds)
    : 1;
  const ringOffset = RING_CIRCUMFERENCE * (1 - progress);

  async function loadReport() {
    const response = await fetch("/api/focus");
    if (response.ok) setReport(await response.json());
  }

  useEffect(() => {
    loadReport().catch(() => undefined);
  }, []);

  useEffect(() => {
    onRunningChange?.(running);
  }, [onRunningChange, running]);

  useEffect(() => {
    if (!running) return;
    timerRef.current = setInterval(() => {
      setElapsedSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (!running || !plannedMinutes) return;
    if (elapsedSeconds >= plannedMinutes * 60) {
      completeSession(true).catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSeconds, plannedMinutes, running]);

  function start() {
    setStartedAt(newDate());
    setElapsedSeconds(0);
    setRunning(true);
  }

  async function completeSession(completed: boolean) {
    if (!startedAt) return;
    setRunning(false);
    const elapsedMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const response = await fetch("/api/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: task?.id,
        mode,
        plannedMinutes,
        elapsedMinutes,
        completed,
        abandoned: !completed,
        startedAt,
        endedAt: newDate(),
      }),
    });
    if (response.ok) setReport(await response.json());
    if (completed) {
      setSessionBloom(true);
      window.setTimeout(() => setSessionBloom(false), 900);
    }
    setStartedAt(null);
    setElapsedSeconds(0);
  }

  const isDeepLocked = mode === "DEEP_FOCUS" && running;
  return (
    <motion.section
      layout={!prefersReducedMotion}
      animate={{
        scale: immersive && !prefersReducedMotion ? 1.025 : 1,
        y: immersive && !prefersReducedMotion ? 24 : 0,
      }}
      transition={prefersReducedMotion ? { duration: 0 } : springSoft}
      className={cn(
        "relative overflow-hidden border-b border-[#2B2F31] pb-10",
        immersive &&
          "glass my-auto rounded-2xl border border-white/10 px-7 py-8 shadow-[0_24px_80px_-40px_rgba(111,116,255,0.7)]"
      )}
    >
      {sessionBloom && <div className="session-complete-bloom" />}
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase text-[#9BA1A6]">
            Focus session
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {task ? task.title : "Choose one thing"}
          </h2>
          <p className="mt-1 text-xs text-[#9BA1A6]">
            {task ? task.title : "Start with the selected task"}
          </p>
        </div>
        <Select
          value={mode}
          onValueChange={(value) => setMode(value as FocusModeName)}
          disabled={running}
        >
          <SelectTrigger className="w-36">
            <SelectValue>{modeLabels[mode]}</SelectValue>
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
                stroke="#323234"
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
                transition={
                  prefersReducedMotion ? { duration: 0 } : springSoft
                }
              />
            </svg>
            <div className="grid h-[184px] w-[184px] place-items-center rounded-full border border-[#3A3F42] bg-[#1B1D1E] text-center">
              <div>
                <div className="text-5xl font-semibold tabular-nums text-white">
                  {mode === "FLOW"
                    ? mmss(elapsedSeconds)
                    : mmss(remainingSeconds)}
                </div>
                <div className="mt-1 text-[10px] uppercase tracking-normal text-muted-foreground">
                  {modeLabels[mode]}
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
                    setWorkMinutes(Number(event.target.value))
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
                    setBreakMinutes(Number(event.target.value))
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
                    setDeepMinutes(Number(event.target.value))
                  }
                />
              </label>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!running ? (
              <Button type="button" size="sm" onClick={start}>
                <Play className="h-4 w-4" />
                Start
              </Button>
            ) : (
              <>
                {mode !== "DEEP_FOCUS" && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setRunning(false)}
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={isDeepLocked}
                  onClick={() => completeSession(mode === "FLOW")}
                >
                  <Square className="h-4 w-4" />
                  {mode === "FLOW" ? "Finish" : "Stop"}
                </Button>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 border-t border-[#2B2F31] pt-3 text-xs text-[#9BA1A6]">
            <Headphones className="h-3.5 w-3.5" />
            Soundscape: rain, brown noise, or silence can plug in here.
          </div>
        </div>
      </div>

      {isDeepLocked && (
        <div className="mt-5 border-l-2 border-[var(--accent)] bg-[#202425] px-3 py-2 text-xs text-[#D5D8DB]">
          Deep Focus is a commitment block. It completes when the timer ends.
        </div>
      )}

      {report && (
        <div className="mt-8 grid grid-cols-2 border-y border-[#2B2F31] sm:grid-cols-4">
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
              className="border-r border-[#2B2F31] px-3 py-4 last:border-r-0"
            >
              <div className="text-[11px] text-[#9BA1A6]">{label}</div>
              <div className="mt-1 text-lg font-semibold text-white">
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
    </motion.section>
  );
}
