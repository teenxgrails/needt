"use client";

import { HiOutlineExclamation, HiOutlineFlag } from "react-icons/hi";

import { format, isToday } from "@/lib/date-utils";
import { buildProjectGanttRange, ganttBarMetrics } from "@/lib/projects/gantt";
import { cn } from "@/lib/utils";

import { TaskStatus } from "@/types/task";

import type {
  ProjectWorkspaceBlocker,
  ProjectWorkspaceDetail,
  ProjectWorkspaceTask,
} from "./project-workspace-types";

const DAY_WIDTH = 40;
const LABEL_WIDTH = 224;

function TimelineGrid({ days }: { days: Date[] }) {
  return (
    <div className="absolute inset-0 flex" aria-hidden="true">
      {days.map((day) => (
        <span
          key={day.toISOString()}
          className={cn(
            "h-full flex-none border-r border-[var(--border-subtle)]",
            isToday(day) && "bg-[var(--surface-hover)]"
          )}
          style={{ width: DAY_WIDTH }}
        />
      ))}
    </div>
  );
}

function GanttRow({
  label,
  item,
  rangeStart,
  days,
  color,
  stage,
  blocked,
  onOpen,
}: {
  label: string;
  item: ProjectWorkspaceTask | ProjectWorkspaceDetail["stages"][number];
  rangeStart: Date;
  days: Date[];
  color?: string | null;
  stage?: boolean;
  blocked?: boolean;
  onOpen?: () => void;
}) {
  const metrics = ganttBarMetrics(item, rangeStart, DAY_WIDTH);
  return (
    <div className="flex min-h-11 border-b border-[var(--border-subtle)]">
      <div
        className={cn(
          "sticky left-0 z-[2] flex flex-none items-center gap-2 border-r border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3",
          stage ? "font-semibold" : "pl-7"
        )}
        style={{ width: LABEL_WIDTH }}
      >
        <button
          type="button"
          onClick={onOpen}
          disabled={!onOpen}
          className="min-w-0 flex-1 truncate text-left text-[12px] text-[var(--text-primary)] enabled:hover:underline enabled:focus-visible:outline-none enabled:focus-visible:underline"
        >
          {label}
        </button>
        {blocked && (
          <HiOutlineExclamation
            className="h-3.5 w-3.5 flex-none text-[var(--color-warning)]"
            aria-label="Blocked"
          />
        )}
      </div>
      <div
        className="relative flex-none"
        style={{ width: days.length * DAY_WIDTH }}
      >
        <TimelineGrid days={days} />
        {metrics ? (
          <div
            className={cn(
              "absolute top-1/2 z-[1] -translate-y-1/2 rounded-[3px] border border-[var(--border-control)]",
              stage ? "h-5" : "h-4",
              "bg-[var(--surface-control)]"
            )}
            style={{
              left: metrics.left + 3,
              width: Math.max(8, metrics.width - 6),
              borderLeftColor: color ?? "var(--text-secondary)",
              borderLeftWidth: 4,
            }}
            title={label}
          />
        ) : (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[11px] text-[var(--text-muted)]">
            Unscheduled
          </span>
        )}
      </div>
    </div>
  );
}

export function ProjectGanttView({
  project,
  onOpenTask,
}: {
  project: ProjectWorkspaceDetail;
  onOpenTask: (task: ProjectWorkspaceTask) => void;
}) {
  const range = buildProjectGanttRange({
    project,
    stages: project.stages,
    tasks: project.tasks,
  });
  const unresolved = project.blockers.filter(
    (blocker) =>
      !blocker.resolvedAt &&
      blocker.blockerTask?.status !== TaskStatus.COMPLETED
  );
  const stageBlocked = (stageId: string) =>
    unresolved.some((blocker) => blocker.stageId === stageId);
  const taskBlocked = (
    task: ProjectWorkspaceTask,
    blockers: ProjectWorkspaceBlocker[]
  ) =>
    blockers.some(
      (blocker) =>
        blocker.taskId === task.id || blocker.stageId === task.stageId
    ) ||
    task.blockedByDependencies?.some(
      (dependency) => dependency.blocker.status !== TaskStatus.COMPLETED
    );

  return (
    <div className="h-full overflow-auto">
      <div style={{ minWidth: LABEL_WIDTH + range.days.length * DAY_WIDTH }}>
        <div className="sticky top-0 z-[4] flex h-12 border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)]">
          <div
            className="sticky left-0 z-[5] flex flex-none items-center gap-2 border-r border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]"
            style={{ width: LABEL_WIDTH }}
          >
            <HiOutlineFlag className="h-3.5 w-3.5" />
            Project timeline
          </div>
          <div className="flex flex-none">
            {range.days.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "flex flex-none flex-col items-center justify-center border-r border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)]",
                  isToday(day) &&
                    "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                )}
                style={{ width: DAY_WIDTH }}
              >
                <span>{format(day, "EEE")}</span>
                <span className="font-medium">{format(day, "d")}</span>
              </div>
            ))}
          </div>
        </div>
        {project.stages.map((stage) => (
          <div key={stage.id}>
            <GanttRow
              label={stage.name}
              item={stage}
              rangeStart={range.start}
              days={range.days}
              color={stage.color}
              stage
              blocked={stageBlocked(stage.id)}
            />
            {project.tasks
              .filter((task) => task.stageId === stage.id)
              .map((task) => (
                <GanttRow
                  key={task.id}
                  label={task.title}
                  item={task}
                  rangeStart={range.start}
                  days={range.days}
                  color={stage.color}
                  blocked={taskBlocked(task, unresolved)}
                  onOpen={() => onOpenTask(task)}
                />
              ))}
          </div>
        ))}
        {project.tasks
          .filter((task) => !task.stageId)
          .map((task) => (
            <GanttRow
              key={task.id}
              label={task.title}
              item={task}
              rangeStart={range.start}
              days={range.days}
              blocked={taskBlocked(task, unresolved)}
              onOpen={() => onOpenTask(task)}
            />
          ))}
      </div>
    </div>
  );
}
