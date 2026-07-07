"use client";

import { useEffect, useMemo, useState } from "react";

import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Moon,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import { newDate } from "@/lib/date-utils";

import { useTaskStore } from "@/store/task";

import {
  SchedulingEnergyLevel,
  SchedulingTaskPriority,
  TaskStatus,
} from "@/types/task";

interface ParsedTask {
  title: string;
  estimatedMinutes?: number;
  priority?: SchedulingTaskPriority;
  energyRequired?: SchedulingEnergyLevel;
  contextTag?: string;
}

interface EnergyWindow {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  energyLevel: SchedulingEnergyLevel;
}

interface SmartSchedulingSettingsResponse {
  preferences: {
    bufferMultiplier: number;
  };
  energyProfile: EnergyWindow[];
}

function minutesLabel(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function SmartPlanningPanel() {
  const { tasks, createTask, updateTask, scheduleAllTasks } = useTaskStore();
  const [brainDump, setBrainDump] = useState("");
  const [parsedTasks, setParsedTasks] = useState<ParsedTask[]>([]);
  const [energyWindows, setEnergyWindows] = useState<EnergyWindow[]>([]);
  const [bufferMultiplier, setBufferMultiplier] = useState(1.3);
  const [isParsing, setIsParsing] = useState(false);
  const [isScheduling, setIsScheduling] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/smart-scheduling-settings");
        if (!response.ok) return;
        const data = (await response.json()) as SmartSchedulingSettingsResponse;
        setEnergyWindows(data.energyProfile);
        setBufferMultiplier(data.preferences.bufferMultiplier || 1.3);
      } catch {
        // The panel still works without settings; the scheduler has defaults.
      }
    }
    loadSettings();
  }, []);

  const today = newDate().getDay();
  const todayEnergy = energyWindows.filter(
    (window) => window.dayOfWeek === today
  );
  const openAutoTasks = tasks.filter(
    (task) =>
      task.status !== TaskStatus.COMPLETED &&
      (task.isAutoScheduled || task.autoScheduled)
  );
  const unscheduledAutoTasks = openAutoTasks.filter(
    (task) => !task.scheduledStart || !task.scheduledEnd
  );
  const overflowMinutes = unscheduledAutoTasks.reduce(
    (total, task) =>
      total +
      Math.round(
        (task.estimatedMinutes || task.duration || 30) *
          Math.max(1, bufferMultiplier)
      ),
    0
  );
  const nextTask = useMemo(
    () =>
      tasks
        .filter(
          (task) =>
            task.status !== TaskStatus.COMPLETED &&
            task.scheduledStart &&
            newDate(task.scheduledStart) >= newDate()
        )
        .sort(
          (a, b) =>
            newDate(a.scheduledStart!).getTime() -
            newDate(b.scheduledStart!).getTime()
        )[0],
    [tasks]
  );

  const parseBrainDump = async () => {
    try {
      setIsParsing(true);
      const response = await fetch("/api/ai/parse-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: brainDump }),
      });
      if (!response.ok) throw new Error("Could not parse tasks");
      const data = (await response.json()) as { tasks: ParsedTask[] };
      setParsedTasks(data.tasks);
    } catch (error) {
      toast.error("Brain dump parse failed", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsParsing(false);
    }
  };

  const addParsedTasks = async () => {
    for (const task of parsedTasks) {
      await createTask({
        title: task.title,
        status: TaskStatus.TODO,
        estimatedMinutes: task.estimatedMinutes,
        duration: task.estimatedMinutes,
        energyRequired: task.energyRequired || SchedulingEnergyLevel.MEDIUM,
        priorityLevel: task.priority || SchedulingTaskPriority.MEDIUM,
        contextTag: task.contextTag,
        isAutoScheduled: true,
        autoScheduled: true,
        scheduleLocked: false,
        isRecurring: false,
      });
    }
    setBrainDump("");
    setParsedTasks([]);
    toast.success("Tasks added from brain dump");
  };

  const runSchedule = async () => {
    try {
      setIsScheduling(true);
      await scheduleAllTasks();
      toast.success("Schedule refreshed");
    } catch (error) {
      toast.error("Could not reschedule", {
        description:
          error instanceof Error ? error.message : "Please try again later.",
      });
    } finally {
      setIsScheduling(false);
    }
  };

  const rollUnfinishedToTomorrow = async () => {
    const tomorrow = newDate();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    const unfinished = tasks.filter(
      (task) => task.status !== TaskStatus.COMPLETED && task.scheduledStart
    );

    for (const task of unfinished) {
      if (newDate(task.scheduledStart!) < newDate()) {
        await updateTask(task.id, {
          startDate: tomorrow,
          dueDate: task.dueDate ? newDate(task.dueDate) : tomorrow,
          scheduledStart: null,
          scheduledEnd: null,
        });
      }
    }
    await scheduleAllTasks();
    toast.success("Unfinished work rolled forward");
  };

  return (
    <div className="space-y-4 p-4 text-sm">
      {overflowMinutes > 0 && (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-100">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Overcommitted by {minutesLabel(overflowMinutes)}
          </div>
          <div className="mt-1 text-xs opacity-80">
            {unscheduledAutoTasks.length} auto task
            {unscheduledAutoTasks.length === 1 ? "" : "s"} need room.
          </div>
        </div>
      )}

      <section className="space-y-2">
        <div className="flex items-center gap-2 font-medium">
          <Brain className="h-4 w-4" />
          Brain Dump
        </div>
        <Textarea
          value={brainDump}
          onChange={(event) => setBrainDump(event.target.value)}
          placeholder="Messy task notes..."
          className="min-h-24 resize-none text-xs"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={parseBrainDump}
            disabled={!brainDump.trim() || isParsing}
          >
            {isParsing ? "Parsing..." : "Parse"}
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={addParsedTasks}
            disabled={parsedTasks.length === 0}
          >
            Add
          </Button>
        </div>
        {parsedTasks.length > 0 && (
          <div className="space-y-1 rounded-md border p-2">
            {parsedTasks.map((task, index) => (
              <div key={`${task.title}-${index}`}>
                <div className="font-medium">{task.title}</div>
                <div className="text-xs text-muted-foreground">
                  {[
                    task.estimatedMinutes && `${task.estimatedMinutes}m`,
                    task.priority,
                    task.energyRequired,
                    task.contextTag,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2 font-medium">
          <Zap className="h-4 w-4" />
          Energy Today
        </div>
        <div className="space-y-1">
          {todayEnergy.length > 0 ? (
            todayEnergy.map((window) => (
              <div
                key={`${window.startTime}-${window.endTime}-${window.energyLevel}`}
                className="flex items-center justify-between rounded-md bg-muted px-2 py-1"
              >
                <span>
                  {window.startTime}-{window.endTime}
                </span>
                <span className="font-medium">{window.energyLevel}</span>
              </div>
            ))
          ) : (
            <div className="text-xs text-muted-foreground">
              No energy windows set for today.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-2">
        <div className="flex items-center gap-2 font-medium">
          <Clock className="h-4 w-4" />
          Time-Blindness Buffer
        </div>
        <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
          Mina places tasks at {bufferMultiplier.toFixed(1)}x estimates when no
          personal category data exists.
        </div>
        {nextTask && (
          <div className="rounded-md border p-2">
            <div className="font-medium">Next: {nextTask.title}</div>
            <div className="text-xs text-muted-foreground">
              Raw{" "}
              {minutesLabel(
                nextTask.estimatedMinutes || nextTask.duration || 30
              )}{" "}
              · Scheduled{" "}
              {minutesLabel(
                Math.round(
                  (nextTask.estimatedMinutes || nextTask.duration || 30) *
                    Math.max(1, bufferMultiplier)
                )
              )}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-2">
        <Button
          type="button"
          className="w-full"
          onClick={runSchedule}
          disabled={isScheduling}
        >
          {isScheduling ? "Rescheduling..." : "Quick Reschedule"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={rollUnfinishedToTomorrow}
        >
          <Moon className="mr-2 h-4 w-4" />
          Shutdown Ritual
        </Button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3 w-3" />
          Review done, roll unfinished work, then reschedule.
        </div>
      </section>
    </div>
  );
}
