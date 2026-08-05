"use client";

import {
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineExclamation,
  HiOutlineMinusCircle,
  HiOutlineStatusOnline,
} from "react-icons/hi";

import { formatDate, newDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

import { ProjectStage } from "@/types/project";
import { TaskStatus } from "@/types/task";

import type {
  ProjectWorkspaceBlocker,
  ProjectWorkspaceTask,
} from "./project-workspace-types";

interface ProjectListViewProps {
  tasks: ProjectWorkspaceTask[];
  stages: ProjectStage[];
  blockers: ProjectWorkspaceBlocker[];
  onOpenTask: (task: ProjectWorkspaceTask) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}

const STATUS_ICON = {
  [TaskStatus.TODO]: HiOutlineMinusCircle,
  [TaskStatus.IN_PROGRESS]: HiOutlineStatusOnline,
  [TaskStatus.COMPLETED]: HiOutlineCheckCircle,
};

function nextStatus(status: TaskStatus) {
  if (status === TaskStatus.TODO) return TaskStatus.IN_PROGRESS;
  if (status === TaskStatus.IN_PROGRESS) return TaskStatus.COMPLETED;
  return TaskStatus.TODO;
}

function isBlocked(
  task: ProjectWorkspaceTask,
  blockers: ProjectWorkspaceBlocker[]
) {
  return (
    task.blockedByDependencies?.some(
      (dependency) => dependency.blocker.status !== TaskStatus.COMPLETED
    ) ||
    blockers.some(
      (blocker) =>
        !blocker.resolvedAt &&
        (blocker.taskId === task.id ||
          (task.stageId && blocker.stageId === task.stageId)) &&
        blocker.blockerTask?.status !== TaskStatus.COMPLETED
    )
  );
}

function TaskRow({
  task,
  blockers,
  onOpenTask,
  onStatusChange,
}: {
  task: ProjectWorkspaceTask;
  blockers: ProjectWorkspaceBlocker[];
  onOpenTask: (task: ProjectWorkspaceTask) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
}) {
  const StatusIcon = STATUS_ICON[task.status];
  const blocked = isBlocked(task, blockers);
  const date = task.deadline ?? task.dueDate;

  return (
    <div className="grid min-h-12 grid-cols-[44px_minmax(0,1fr)] items-center border-b border-[var(--border-subtle)] last:border-b-0 sm:grid-cols-[40px_minmax(220px,1fr)_minmax(120px,0.35fr)_120px_72px]">
      <button
        type="button"
        onClick={() => onStatusChange(task.id, nextStatus(task.status))}
        className="flex h-11 w-11 items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:text-[var(--text-primary)] sm:h-10 sm:w-10"
        aria-label={`Change ${task.title} status from ${task.status.replace("_", " ")}`}
      >
        <StatusIcon
          className={cn(
            "h-[18px] w-[18px]",
            task.status === TaskStatus.COMPLETED &&
              "text-[var(--color-success)]",
            task.status === TaskStatus.IN_PROGRESS &&
              "text-[var(--primitive-blue-500)]"
          )}
        />
      </button>
      <button
        type="button"
        onClick={() => onOpenTask(task)}
        className="min-w-0 py-2 pr-3 text-left focus-visible:outline-none focus-visible:underline"
      >
        <span
          className={cn(
            "block truncate text-[13px] font-medium text-[var(--text-primary)]",
            task.status === TaskStatus.COMPLETED &&
              "text-[var(--text-muted)] line-through"
          )}
        >
          {task.title}
        </span>
        <span className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-muted)] sm:hidden">
          {task.assignee?.name ?? task.assignee?.email ?? "Unassigned"}
          {date && <span>· {formatDate(newDate(date))}</span>}
        </span>
      </button>
      <span className="hidden truncate pr-3 text-[12px] text-[var(--text-secondary)] sm:block">
        {task.assignee?.name ?? task.assignee?.email ?? "Unassigned"}
      </span>
      <span className="hidden items-center gap-1.5 text-[11px] text-[var(--text-muted)] sm:flex">
        {date ? (
          <>
            <HiOutlineClock className="h-3.5 w-3.5" />
            {formatDate(newDate(date))}
          </>
        ) : (
          "No deadline"
        )}
      </span>
      <span className="hidden justify-end pr-3 sm:flex">
        {blocked && (
          <span
            className="inline-flex items-center gap-1 text-[11px] text-[var(--color-warning)]"
            title="Task is blocked"
          >
            <HiOutlineExclamation className="h-3.5 w-3.5" />
            Blocked
          </span>
        )}
      </span>
    </div>
  );
}

export function ProjectListView({
  tasks,
  stages,
  blockers,
  onOpenTask,
  onStatusChange,
}: ProjectListViewProps) {
  const groups = [
    ...stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      tasks: tasks.filter((task) => task.stageId === stage.id),
    })),
    {
      id: "unassigned",
      name: "No stage",
      color: null,
      tasks: tasks.filter((task) => !task.stageId),
    },
  ].filter((group) => group.id !== "unassigned" || group.tasks.length > 0);

  if (tasks.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-[var(--text-secondary)]">
        This project has no tasks yet.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-4">
      <div className="mx-auto max-w-6xl space-y-3">
        {groups.map((group) => {
          const completed = group.tasks.filter(
            (task) => task.status === TaskStatus.COMPLETED
          ).length;
          return (
            <section
              key={group.id}
              aria-labelledby={`project-stage-${group.id}`}
              className="overflow-hidden rounded-[var(--control-radius)] border border-[var(--border-subtle)] bg-[var(--surface-panel)]"
            >
              <div className="flex min-h-10 items-center gap-2 border-b border-[var(--border-subtle)] px-3">
                <span
                  className="h-2.5 w-2.5 rounded-full border border-[var(--border-subtle)]"
                  style={{
                    backgroundColor: group.color ?? "var(--surface-control)",
                  }}
                  aria-hidden="true"
                />
                <h2
                  id={`project-stage-${group.id}`}
                  className="text-[12px] font-semibold text-[var(--text-primary)]"
                >
                  {group.name}
                </h2>
                <span className="text-[11px] text-[var(--text-muted)]">
                  {completed}/{group.tasks.length}
                </span>
              </div>
              {group.tasks.length > 0 ? (
                group.tasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    blockers={blockers}
                    onOpenTask={onOpenTask}
                    onStatusChange={onStatusChange}
                  />
                ))
              ) : (
                <p className="px-3 py-5 text-[12px] text-[var(--text-muted)]">
                  No tasks in this stage.
                </p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
