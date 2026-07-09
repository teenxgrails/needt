import { useMemo } from "react";

import { motion, useReducedMotion } from "framer-motion";

import { Task, TaskStatus } from "@/types/task";

interface TimelineViewProps {
  tasks: Task[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function taskStart(task: Task) {
  return (
    task.scheduledStart ||
    task.startDate ||
    task.createdAt ||
    task.deadline ||
    task.dueDate ||
    null
  );
}

function taskEnd(task: Task) {
  return task.scheduledEnd || task.deadline || task.dueDate || taskStart(task);
}

export function TimelineView({ tasks }: TimelineViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const rows = useMemo(() => {
    const datedTasks = tasks
      .map((task) => {
        const start = taskStart(task);
        const end = taskEnd(task);
        if (!start || !end) return null;
        return {
          task,
          start: startOfDay(new Date(start)),
          end: startOfDay(new Date(end)),
        };
      })
      .filter(Boolean) as Array<{
      task: Task;
      start: Date;
      end: Date;
    }>;

    const minTime =
      datedTasks.reduce(
        (min, item) => Math.min(min, item.start.getTime()),
        Number.POSITIVE_INFINITY
      ) || Date.now();
    const maxTime =
      datedTasks.reduce(
        (max, item) => Math.max(max, item.end.getTime()),
        Number.NEGATIVE_INFINITY
      ) || Date.now();
    const rangeStart = startOfDay(new Date(minTime));
    const dayCount = Math.max(7, Math.ceil((maxTime - minTime) / DAY_MS) + 1);

    const grouped = new Map<string, { label: string; tasks: typeof datedTasks }>();
    datedTasks.forEach((item) => {
      const id = item.task.projectId || "none";
      const label = item.task.project?.name || "No Project";
      if (!grouped.has(id)) grouped.set(id, { label, tasks: [] });
      grouped.get(id)?.tasks.push(item);
    });

    return { rangeStart, dayCount, groups: Array.from(grouped.values()) };
  }, [tasks]);

  if (rows.groups.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-[#323234] bg-[#262627] p-8 text-center text-sm text-[#9AA0A6]">
        No dated tasks yet. Add start, deadline, due, or scheduled dates to show
        a timeline.
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto rounded-md border border-[#323234] bg-[#1A1D1E]">
      <div
        className="grid min-w-[760px]"
        style={{
          gridTemplateColumns: `180px repeat(${rows.dayCount}, minmax(42px, 1fr))`,
        }}
      >
        <div className="sticky left-0 z-10 border-b border-r border-[#323234] bg-[#1A1D1E] p-2 text-xs text-[#9AA0A6]">
          Project
        </div>
        {Array.from({ length: rows.dayCount }).map((_, index) => {
          const date = new Date(rows.rangeStart.getTime() + index * DAY_MS);
          return (
            <div
              key={date.toISOString()}
              className="border-b border-r border-[#323234] p-2 text-center text-[11px] text-[#9AA0A6]"
            >
              {date.toLocaleDateString([], { month: "short", day: "numeric" })}
            </div>
          );
        })}

        {rows.groups.map((group) => (
          <div key={group.label} className="contents">
            <div className="sticky left-0 z-10 border-b border-r border-[#323234] bg-[#1A1D1E] p-2 text-sm text-white">
              {group.label}
            </div>
            <div
              className="relative col-span-full grid min-h-16 border-b border-[#323234]"
              style={{
                gridColumn: `2 / span ${rows.dayCount}`,
                gridTemplateColumns: `repeat(${rows.dayCount}, minmax(42px, 1fr))`,
              }}
            >
              {Array.from({ length: rows.dayCount }).map((_, index) => (
                <div
                  key={index}
                  className="border-r border-[#323234]/70"
                />
              ))}
              {group.tasks.map(({ task, start, end }, index) => {
                const offset =
                  Math.floor((start.getTime() - rows.rangeStart.getTime()) / DAY_MS) + 1;
                const span =
                  Math.max(1, Math.floor((end.getTime() - start.getTime()) / DAY_MS) + 1);
                const color = task.project?.color || "#3E63DD";
                return (
                  <motion.div
                    key={task.id}
                    layout={!prefersReducedMotion}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
                    className="absolute h-7 truncate rounded-md px-2 py-1 text-xs text-white"
                    style={{
                      left: `calc(${((offset - 1) / rows.dayCount) * 100}% + 4px)`,
                      top: 8 + index * 30,
                      width: `calc(${(span / rows.dayCount) * 100}% - 8px)`,
                      background: task.status === TaskStatus.COMPLETED ? "#3A3D3F" : color,
                    }}
                    title={task.title}
                  >
                    {task.title}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
