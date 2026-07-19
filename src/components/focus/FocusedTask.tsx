"use client";

import { TaskDescription } from "@/components/tasks/TaskDescription";
import { TaskTimer } from "@/components/tasks/TaskTimer";
import { Badge } from "@/components/ui/badge";

import { format } from "@/lib/date-utils";

import { Task, TaskStatus } from "@/types/task";

interface FocusedTaskProps {
  task: Task | null;
}

export function FocusedTask({ task }: FocusedTaskProps) {
  if (!task) {
    return (
      <section className="pt-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
          Free session
        </p>
        <h2 className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
          Focus without attaching a task
        </h2>
        <p className="mt-1 max-w-lg text-sm leading-6 text-[var(--text-secondary)]">
          Your time will still be logged. Choose something from Next up if you
          want the session connected to a task.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-1 flex-col pt-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--text-muted)]">
            Now
          </p>
          <h2 className="task-title text-2xl font-semibold text-[var(--text-primary)]">
            {task.title}
          </h2>

          {/* Display tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {task.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="px-2 py-0.5"
                  style={{
                    backgroundColor: tag.color ? `${tag.color}20` : undefined,
                    color: tag.color,
                    borderColor: tag.color ? `${tag.color}40` : undefined,
                  }}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--border-subtle)] sm:grid-cols-2">
        {task.dueDate && (
          <div className="bg-[var(--surface-panel)] p-3">
            <h3 className="mb-1 text-sm font-medium">Due Date</h3>
            <p className="text-muted-foreground">
              {format(task.dueDate, "PPP")}
            </p>
          </div>
        )}
        {task.completedAt && task.status === TaskStatus.COMPLETED && (
          <div className="bg-[var(--surface-panel)] p-3">
            <h3 className="mb-1 text-sm font-medium">Completed On</h3>
            <p className="text-muted-foreground">
              {format(task.completedAt, "PPP p")}
            </p>
          </div>
        )}
        {task.duration && (
          <div className="bg-[var(--surface-panel)] p-3">
            <h3 className="mb-1 text-sm font-medium">Estimated Duration</h3>
            <p className="text-muted-foreground">{task.duration} minutes</p>
          </div>
        )}
        {task.scheduleScore && (
          <div className="bg-[var(--surface-panel)] p-3">
            <h3 className="mb-1 text-sm font-medium">Focus Score</h3>
            <p className="text-muted-foreground">
              {task.scheduleScore.toFixed(2)}
            </p>
          </div>
        )}
        {task.isRecurring && (
          <div className="bg-[var(--surface-panel)] p-3">
            <h3 className="mb-1 text-sm font-medium">Recurring Task</h3>
            <p className="text-muted-foreground">This task repeats</p>
          </div>
        )}
      </div>

      <div className="mb-6">
        <TaskTimer
          taskId={task.id}
          actualMinutes={task.actualMinutes}
          likelyDelta={task.likelyDelta}
          source="focus"
        />
      </div>

      {/* Task description with hyperlinks */}
      {task.description && (
        <div className="border-t border-[var(--border-subtle)] pt-4">
          <h3 className="mb-2 text-sm font-medium">Description</h3>
          <TaskDescription
            value={task.description}
            className="task-description overflow-auto text-muted-foreground"
          />
        </div>
      )}
    </section>
  );
}
