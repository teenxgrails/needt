"use client";

import { useMemo, useState } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
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
  const [taskListRef] = useAutoAnimate<HTMLUListElement>({ duration: 180 });
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

  if (todaysTasks.length === 0) return null;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <ul ref={taskListRef} className="space-y-0.5">
          {todaysTasks.map((task) => {
            const urgency = getTaskUrgency(task, {
              redThresholdHours,
              yellowThresholdHours,
            });
            return (
              <li key={task.id}>
                <div className="group relative flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-[var(--surface-hover)] active:cursor-grabbing">
                  <span
                    className="h-3 w-3 flex-none rounded-full border-2"
                    style={{ borderColor: URGENCY_COLORS[urgency] }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--text-primary)]">
                    {task.title}
                  </span>
                  <span className="flex-none text-[11px] tabular-nums text-[var(--text-secondary)] transition-opacity duration-150 ease-out group-hover:opacity-0">
                    {task.deadline || task.dueDate || task.scheduledStart
                      ? formatDueTime(
                          newDate(
                            task.deadline ??
                              task.dueDate ??
                              task.scheduledStart!
                          )
                        )
                      : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStart(task)}
                    aria-label={`Start ${task.title}`}
                    className="pointer-events-none absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 translate-x-1 place-items-center rounded-md border border-[var(--control-border)] bg-[var(--control-bg)] text-[var(--text-primary)] opacity-0 transition-[opacity,transform,background-color] duration-150 ease-out hover:bg-[var(--control-bg-hover)] group-hover:pointer-events-auto group-hover:translate-x-0 group-hover:opacity-100"
                  >
                    <Play className="h-3 w-3" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <StartTaskModal
        task={activeTask}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
