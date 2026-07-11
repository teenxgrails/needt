"use client";

import { useMemo, useState } from "react";

import { Play } from "lucide-react";

import { newDate } from "@/lib/date-utils";
import {
  URGENCY_COLORS,
  getTaskUrgency,
  isTodayTask,
  sortByUrgency,
} from "@/lib/task-urgency";
import { cn } from "@/lib/utils";

import { useTaskStore } from "@/store/task";
import { useTaskUrgencyStore } from "@/store/taskUrgency";

import { Task } from "@/types/task";

import { StartTaskModal } from "./StartTaskModal";

function formatDueTime(dueDate: Date): string {
  return newDate(dueDate).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function TodaysTasksPanel({ className }: { className?: string }) {
  const tasks = useTaskStore((state) => state.tasks);
  const redThresholdHours = useTaskUrgencyStore(
    (state) => state.redThresholdHours
  );
  const yellowThresholdHours = useTaskUrgencyStore(
    (state) => state.yellowThresholdHours
  );

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const todaysTasks = useMemo(() => {
    const now = newDate();
    const thresholds = { redThresholdHours, yellowThresholdHours };
    const filtered = tasks.filter((task) => isTodayTask(task, now));
    return sortByUrgency(filtered, thresholds, now);
  }, [tasks, redThresholdHours, yellowThresholdHours]);

  const handleStart = (task: Task) => {
    setActiveTask(task);
    setModalOpen(true);
  };

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="mb-1 flex items-center justify-between px-2">
        <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-lo)]">
          Today&apos;s tasks
        </h2>
        {todaysTasks.length > 0 && (
          <span className="text-[11px] text-[var(--text-lo)]">
            {todaysTasks.length}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {todaysTasks.length === 0 ? (
          <p className="px-2 py-3 text-[12px] text-[var(--text-lo)]">
            Nothing due today.
          </p>
        ) : (
          <ul className="space-y-0.5">
            {todaysTasks.map((task) => {
              const urgency = getTaskUrgency(task, {
                redThresholdHours,
                yellowThresholdHours,
              });
              return (
                <li key={task.id}>
                  <div className="group relative flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--active)]">
                    <span
                      className="h-3 w-3 flex-none rounded-full border-2"
                      style={{ borderColor: URGENCY_COLORS[urgency] }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-hi)]">
                      {task.title}
                    </span>
                    <span className="flex-none text-[11px] tabular-nums text-[var(--text-lo)] transition-opacity duration-[140ms] ease-out group-hover:opacity-0">
                      {task.dueDate ? formatDueTime(newDate(task.dueDate)) : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStart(task)}
                      aria-label={`Start ${task.title}`}
                      className="pointer-events-none absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 translate-x-1 place-items-center rounded-full bg-[var(--accent)] text-white opacity-0 transition-all duration-[140ms] ease-out group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100"
                    >
                      <Play className="h-3 w-3 fill-current" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <StartTaskModal
        task={activeTask}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
