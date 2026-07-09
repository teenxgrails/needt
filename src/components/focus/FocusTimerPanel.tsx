"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Headphones, Pause, Play, Square } from "lucide-react";

import { StatBlock } from "@/components/liquid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Task } from "@/types/task";

type FocusModeName = "POMODORO" | "FLOW" | "DEEP_FOCUS";

interface FocusTimerPanelProps {
  task: Task | null;
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

function minutesLabel(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder}m`;
  return `${hours}h ${remainder}m`;
}

function mmss(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainder
    .toString()
    .padStart(2, "0")}`;
}

export function FocusTimerPanel({ task }: FocusTimerPanelProps) {
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
  const ringStyle = useMemo(
    () => ({
      background: `conic-gradient(#3E63DD ${progress * 360}deg, #323234 0deg)`,
    }),
    [progress]
  );

  async function loadReport() {
    const response = await fetch("/api/focus");
    if (response.ok) setReport(await response.json());
  }

  useEffect(() => {
    loadReport().catch(() => undefined);
  }, []);

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
    setStartedAt(new Date());
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
        endedAt: new Date(),
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
  const milestone = report
    ? [10, 100, 1000, 10000].find(
        (hours) => report.stats.lifetimeMinutes / 60 < hours
      )
    : 10;

  return (
    <section className="glass--strong overflow-visible p-5">
      {sessionBloom && <div className="session-complete-bloom" />}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white">Focus Timer</h2>
          <p className="text-xs text-muted-foreground">
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

      <div className="mt-5 flex flex-col items-center gap-5 lg:flex-row">
        <div className="shrink-0">
          <div className="grid h-40 w-40 place-items-center rounded-full p-2" style={ringStyle}>
            <div className="grid h-full w-full place-items-center rounded-full border border-[#323234] bg-[#1A1D1E] text-center">
              <div>
                <div className="stat-numeral text-4xl text-white">
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
          <div className="glass--subtle flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
            <Headphones className="h-3.5 w-3.5" />
            Soundscape: rain, brown noise, or silence can plug in here.
          </div>
        </div>
      </div>

      {isDeepLocked && (
        <div className="glass--subtle mt-3 border-blue-300/30 bg-blue-500/10 p-2 text-xs text-blue-100">
          Deep Focus is a commitment block. It completes when the timer ends.
        </div>
      )}

      {report && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <StatBlock label="Focus Score" value={report.stats.focusScore} />
          <StatBlock label="Streak" value={`${report.stats.currentStreak}d`} />
          <StatBlock
            label="Focus Hours"
            value={minutesLabel(report.stats.lifetimeMinutes)}
            detail={`Next: ${milestone}h`}
          />
          <StatBlock
            label="Weekly"
            value={`${minutesLabel(report.weeklyReport.focusMinutes)}`}
            detail={`${report.weeklyReport.sessionsCompleted} sessions · ${report.weeklyReport.bestDay ?? "n/a"}`}
          />
        </div>
      )}

      {report?.weeklyReport.streakStatus.atRisk && (
        <div className="glass--subtle mt-3 border-amber-300/30 bg-amber-500/10 p-2 text-xs text-amber-100">
          One completed session today keeps your {report.stats.currentStreak}
          -day streak warm.
        </div>
      )}
    </section>
  );
}
