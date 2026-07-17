"use client";

import { useEffect, useMemo, useState } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { Input } from "@/components/ui/input";

import { endOfDay, newDate, startOfDay } from "@/lib/date-utils";
import { URGENCY_COLORS, getTaskUrgency } from "@/lib/task-urgency";
import { cn } from "@/lib/utils";

import { useCalendarStore } from "@/store/calendar";
import { useTaskStore } from "@/store/task";
import { useTaskUrgencyStore } from "@/store/taskUrgency";

import { TaskStatus } from "@/types/task";

function timeLabel(date: Date): string {
  return newDate(date).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Mobile-first Today screen: overdue tasks on top, then a chronological list of
 * today's events and scheduled tasks with checkboxes to complete. Also usable
 * on desktop. A floating "+" opens quick task creation as a bottom sheet.
 */
export function TodayView() {
  const tasks = useTaskStore((state) => state.tasks);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const updateTask = useTaskStore((state) => state.updateTask);
  const createTask = useTaskStore((state) => state.createTask);
  const loadFromDatabase = useCalendarStore((state) => state.loadFromDatabase);
  const getAllCalendarItems = useCalendarStore(
    (state) => state.getAllCalendarItems
  );
  const events = useCalendarStore((state) => state.events);
  const redThresholdHours = useTaskUrgencyStore(
    (state) => state.redThresholdHours
  );
  const yellowThresholdHours = useTaskUrgencyStore(
    (state) => state.yellowThresholdHours
  );

  const [listRef] = useAutoAnimate<HTMLUListElement>({ duration: 180 });
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchTasks();
    void loadFromDatabase();
  }, [fetchTasks, loadFromDatabase]);

  //todo(mobile): pull-to-refresh to trigger sync, and long-press on a task row
  // for an action sheet (Complete / Postpone 1h/1d / Edit). Deferred from the
  // MOBILE pass — the bottom-sheet primitive it needs already exists.

  const now = newDate();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  // Merged events + scheduled tasks for today, chronological. `events` is a
  // dependency so the list re-derives once the calendar finishes loading.
  const todayItems = useMemo(() => {
    return getAllCalendarItems(dayStart, dayEnd)
      .filter((item) => {
        if (item.extendedProps?.isTask) {
          return item.extendedProps.status !== TaskStatus.COMPLETED;
        }
        return true;
      })
      .sort((a, b) => newDate(a.start).getTime() - newDate(b.start).getTime());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, getAllCalendarItems, dayStart.getTime(), dayEnd.getTime()]);

  const overdueTasks = useMemo(() => {
    return tasks
      .filter(
        (task) =>
          task.status !== TaskStatus.COMPLETED &&
          task.dueDate &&
          newDate(task.dueDate) < dayStart
      )
      .sort(
        (a, b) => newDate(a.dueDate!).getTime() - newDate(b.dueDate!).getTime()
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tasks, dayStart.getTime()]);

  const completeTask = async (taskId: string) => {
    try {
      await updateTask(taskId, { status: TaskStatus.COMPLETED });
    } catch {
      toast.error("Could not complete task");
    }
  };

  const handleQuickAdd = async () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await createTask({
        title: trimmed,
        status: TaskStatus.TODO,
        tagIds: [],
        isRecurring: false,
        isAutoScheduled: true,
        scheduleLocked: false,
      });
      setTitle("");
      setAddOpen(false);
      toast.success("Task added");
    } catch {
      toast.error("Could not add task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative mx-auto flex h-full max-w-2xl flex-col overflow-y-auto px-4 py-5 pb-24">
      <header className="mb-4">
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Today
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {now.toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      {overdueTasks.length > 0 && (
        <section className="mb-5">
          <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-danger)]">
            Overdue · {overdueTasks.length}
          </h2>
          <ul className="space-y-1">
            {overdueTasks.map((task) => {
              const urgency = getTaskUrgency(task, {
                redThresholdHours,
                yellowThresholdHours,
              });
              return (
                <li key={task.id}>
                  <TaskRow
                    title={task.title}
                    meta={task.dueDate ? timeLabel(newDate(task.dueDate)) : ""}
                    color={URGENCY_COLORS[urgency]}
                    onComplete={() => completeTask(task.id)}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="min-h-0 flex-1">
        <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">
          Schedule
        </h2>
        {todayItems.length === 0 ? (
          <p className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-6 text-center text-sm text-[var(--text-secondary)]">
            Nothing scheduled today. Add a task to get going.
          </p>
        ) : (
          <ul ref={listRef} className="space-y-1">
            {todayItems.map((item) => {
              const isTask = Boolean(item.extendedProps?.isTask);
              return (
                <li key={item.id}>
                  <TaskRow
                    title={item.title}
                    meta={item.allDay ? "All day" : timeLabel(item.start)}
                    color={item.color ?? "var(--accent)"}
                    completable={isTask}
                    onComplete={
                      isTask && item.extendedProps?.taskId
                        ? () => completeTask(item.extendedProps!.taskId!)
                        : undefined
                    }
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Quick add task"
        className="fixed bottom-20 right-5 z-10 grid h-14 w-14 place-items-center rounded-full bg-[var(--accent)] text-white shadow-lg transition-transform active:scale-95 md:bottom-6"
      >
        <Plus className="h-6 w-6" />
      </button>

      <BottomSheet open={addOpen} onOpenChange={setAddOpen}>
        <BottomSheetContent className="md:mx-auto md:max-w-md">
          <BottomSheetTitle className="mb-3">Quick add</BottomSheetTitle>
          <div className="flex flex-col gap-3">
            <Input
              autoFocus
              value={title}
              placeholder="What needs doing?"
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleQuickAdd();
              }}
            />
            <Button
              type="button"
              onClick={handleQuickAdd}
              disabled={saving || !title.trim()}
              className="h-11 w-full"
            >
              Add task
            </Button>
          </div>
        </BottomSheetContent>
      </BottomSheet>
    </div>
  );
}

function TaskRow({
  title,
  meta,
  color,
  completable = true,
  onComplete,
}: {
  title: string;
  meta: string;
  color: string;
  completable?: boolean;
  onComplete?: () => void;
}) {
  return (
    <div className="flex min-h-[44px] items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[var(--surface-hover)]">
      {completable ? (
        <button
          type="button"
          onClick={onComplete}
          aria-label={`Complete ${title}`}
          className="grid h-6 w-6 flex-none place-items-center rounded-full border-2"
          style={{ borderColor: color }}
        />
      ) : (
        <span
          className="h-3 w-3 flex-none rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm text-[var(--text-primary)]"
        )}
      >
        {title}
      </span>
      <span className="flex-none text-xs tabular-nums text-[var(--text-secondary)]">
        {meta}
      </span>
    </div>
  );
}
