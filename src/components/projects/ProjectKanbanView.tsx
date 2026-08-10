"use client";

import { useDroppable } from "@dnd-kit/core";
import { HiOutlineExclamation } from "react-icons/hi";

import { BoardTask } from "@/components/tasks/BoardView/BoardTask";

import { cn } from "@/lib/utils";

import type { ProjectStage } from "@/types/project";

import type {
  ProjectWorkspaceBlocker,
  ProjectWorkspaceTask,
} from "./project-workspace-types";

export const UNASSIGNED_STAGE_ID = "__project_no_stage__";

function KanbanColumn({
  id,
  name,
  color,
  tasks,
  blocked,
  onOpenTask,
  onDeleteTask,
}: {
  id: string;
  name: string;
  color?: string | null;
  tasks: ProjectWorkspaceTask[];
  blocked: boolean;
  onOpenTask: (task: ProjectWorkspaceTask) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <section
      ref={setNodeRef}
      aria-labelledby={`kanban-stage-${id}`}
      className={cn(
        "flex w-[min(82vw,300px)] flex-none flex-col rounded-[var(--control-radius)] border border-[var(--border-subtle)] bg-[var(--surface-panel)] sm:w-72",
        isOver && "border-[var(--text-secondary)] bg-[var(--surface-raised)]"
      )}
    >
      <div className="flex min-h-11 items-center gap-2 border-b border-[var(--border-subtle)] px-3">
        <span
          className="h-2.5 w-2.5 rounded-full border border-[var(--border-subtle)]"
          style={{ backgroundColor: color ?? "var(--surface-control)" }}
          aria-hidden="true"
        />
        <h2
          id={`kanban-stage-${id}`}
          className="min-w-0 flex-1 truncate text-[12px] font-semibold text-[var(--text-primary)]"
        >
          {name}
        </h2>
        <span className="text-[11px] text-[var(--text-muted)]">
          {tasks.length}
        </span>
        {blocked && (
          <HiOutlineExclamation
            className="h-3.5 w-3.5 text-[var(--color-warning)]"
            aria-label="Stage is blocked"
          />
        )}
      </div>
      <div className="min-h-36 flex-1 space-y-2 overflow-y-auto p-2">
        {tasks.map((task) => (
          <BoardTask
            key={task.id}
            task={task}
            onEdit={onOpenTask}
            onDelete={onDeleteTask}
          />
        ))}
        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-[11px] text-[var(--text-muted)]">
            Drop tasks here
          </p>
        )}
      </div>
    </section>
  );
}

export function ProjectKanbanView({
  tasks,
  stages,
  blockers,
  onOpenTask,
  onDeleteTask,
}: {
  tasks: ProjectWorkspaceTask[];
  stages: ProjectStage[];
  blockers: ProjectWorkspaceBlocker[];
  onOpenTask: (task: ProjectWorkspaceTask) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const columns = [
    ...stages.map((stage) => ({
      id: stage.id,
      name: stage.name,
      color: stage.color,
      tasks: tasks.filter((task) => task.stageId === stage.id),
      blocked: blockers.some(
        (blocker) =>
          blocker.stageId === stage.id &&
          !blocker.resolvedAt &&
          blocker.blockerTask?.status !== "completed"
      ),
    })),
    {
      id: UNASSIGNED_STAGE_ID,
      name: "No stage",
      color: null,
      tasks: tasks.filter((task) => !task.stageId),
      blocked: false,
    },
  ];

  return (
    <div className="flex h-full gap-3 overflow-x-auto p-3 sm:p-4">
      {columns.map((column) => (
        <KanbanColumn
          key={column.id}
          {...column}
          onOpenTask={onOpenTask}
          onDeleteTask={onDeleteTask}
        />
      ))}
    </div>
  );
}
