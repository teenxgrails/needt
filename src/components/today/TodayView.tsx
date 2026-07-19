"use client";

import { useEffect, useMemo, useState } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Moon,
  Plus,
  Sun,
  Sunrise,
} from "lucide-react";
import { toast } from "sonner";

import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  addDays,
  endOfDay,
  isSameDay,
  newDate,
  startOfDay,
} from "@/lib/date-utils";
import { URGENCY_COLORS, getTaskUrgency } from "@/lib/task-urgency";

import { useCalendarStore } from "@/store/calendar";
import { useTaskStore } from "@/store/task";
import { useTaskUrgencyStore } from "@/store/taskUrgency";

import { TaskStatus } from "@/types/task";

interface DayListItem {
  id: string;
  title: string;
  meta: string;
  color: string;
  taskId?: string;
  start: Date | null;
  allDay: boolean;
}

interface DayGroup {
  id: "anytime" | "morning" | "afternoon" | "evening";
  label: string;
  icon: typeof Clock3;
  tone: string;
  items: DayListItem[];
}

function timeLabel(date: Date): string {
  return newDate(date).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function groupDayItems(items: DayListItem[]): DayGroup[] {
  const definitions: Array<Omit<DayGroup, "items">> = [
    {
      id: "anytime",
      label: "Anytime",
      icon: Clock3,
      tone: "var(--text-secondary)",
    },
    {
      id: "morning",
      label: "Morning",
      icon: Sunrise,
      tone: "var(--color-warning)",
    },
    {
      id: "afternoon",
      label: "Afternoon",
      icon: Sun,
      tone: "var(--color-accent)",
    },
    {
      id: "evening",
      label: "Evening",
      icon: Moon,
      tone: "var(--space-cluster-violet)",
    },
  ];

  return definitions.map((definition) => ({
    ...definition,
    items: items.filter((item) => {
      if (definition.id === "anytime") return item.allDay || !item.start;
      if (!item.start || item.allDay) return false;
      const hour = item.start.getHours();
      if (definition.id === "morning") return hour < 12;
      if (definition.id === "afternoon") return hour >= 12 && hour < 17;
      return hour >= 17;
    }),
  }));
}

/**
 * A focused daily plan: centered date navigation, then tasks and events grouped
 * by the part of day in which they happen. The route stays mobile-first, while
 * the same hierarchy scales to the desktop shell.
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

  const [listRef] = useAutoAnimate<HTMLDivElement>({ duration: 180 });
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    void fetchTasks();
    void loadFromDatabase();
    const current = newDate();
    setNow(current);
    setSelectedDate(current);
  }, [fetchTasks, loadFromDatabase]);

  const effectiveDate = selectedDate ?? newDate(0);
  const dayStart = startOfDay(effectiveDate);
  const dayEnd = endOfDay(effectiveDate);
  const viewingToday = Boolean(now && isSameDay(effectiveDate, now));

  const dayItems = useMemo<DayListItem[]>(() => {
    // Reading the event count keeps this derivation in sync when calendar
    // hydration replaces the store contents while the selector stays stable.
    void events.length;
    const calendarItems = getAllCalendarItems(dayStart, dayEnd)
      .filter((item) => {
        if (item.extendedProps?.isTask) {
          return item.extendedProps.status !== TaskStatus.COMPLETED;
        }
        return true;
      })
      .map((item) => ({
        id: item.id,
        title: item.title,
        meta: item.allDay ? "All day" : timeLabel(item.start),
        color: item.color ?? "var(--color-accent)",
        taskId: item.extendedProps?.isTask
          ? item.extendedProps.taskId
          : undefined,
        start: item.allDay ? null : newDate(item.start),
        allDay: item.allDay,
      }));
    const scheduledTaskIds = new Set(
      calendarItems.map((item) => item.taskId).filter(Boolean)
    );
    const unscheduledDueTasks = tasks
      .filter(
        (task) =>
          task.status !== TaskStatus.COMPLETED &&
          !scheduledTaskIds.has(task.id) &&
          !task.scheduledStart &&
          Boolean(
            (task.dueDate && isSameDay(newDate(task.dueDate), dayStart)) ||
              (task.startDate && isSameDay(newDate(task.startDate), dayStart))
          )
      )
      .map((task) => ({
        id: `due-${task.id}`,
        title: task.title,
        meta: "Flexible",
        color:
          URGENCY_COLORS[
            getTaskUrgency(task, { redThresholdHours, yellowThresholdHours })
          ],
        taskId: task.id,
        start: null,
        allDay: true,
      }));

    return [...calendarItems, ...unscheduledDueTasks].sort((left, right) => {
      if (!left.start) return -1;
      if (!right.start) return 1;
      return left.start.getTime() - right.start.getTime();
    });
  }, [
    dayEnd,
    dayStart,
    events,
    getAllCalendarItems,
    redThresholdHours,
    tasks,
    yellowThresholdHours,
  ]);

  const groups = useMemo(() => groupDayItems(dayItems), [dayItems]);
  const overdueTasks = useMemo(() => {
    if (!viewingToday) return [];
    return tasks
      .filter(
        (task) =>
          task.status !== TaskStatus.COMPLETED &&
          task.dueDate &&
          newDate(task.dueDate) < dayStart
      )
      .sort(
        (left, right) =>
          newDate(left.dueDate!).getTime() - newDate(right.dueDate!).getTime()
      );
  }, [dayStart, tasks, viewingToday]);

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
        startDate: dayStart,
        dueDate: dayStart,
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

  if (!now || !selectedDate) {
    return (
      <div
        className="mx-auto h-full w-full max-w-2xl animate-pulse px-4 py-8"
        aria-label="Loading today"
      >
        <div className="mx-auto h-10 w-48 rounded bg-[var(--surface-raised)]" />
        <div className="mx-auto mt-3 h-4 w-36 rounded bg-[var(--surface-raised)]" />
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto bg-[var(--surface-canvas)] pb-24">
      <div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-7 sm:px-7 sm:py-9">
        <header className="relative mb-8 flex items-center justify-center px-12 text-center">
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, -1))}
            aria-label="Previous day"
            className="absolute left-0 grid h-9 w-9 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-serif text-[38px] font-semibold leading-none tracking-[-0.025em] text-[var(--text-primary)] sm:text-[44px]">
              {selectedDate.toLocaleDateString([], { weekday: "long" })}
            </h1>
            <p className="mt-2 text-[15px] text-[var(--text-secondary)]">
              {selectedDate.toLocaleDateString([], {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            {!viewingToday && (
              <button
                type="button"
                onClick={() => setSelectedDate(now)}
                className="mt-2 rounded-full bg-[var(--surface-raised)] px-3 py-1 text-[11px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
              >
                Back to today
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(addDays(selectedDate, 1))}
            aria-label="Next day"
            className="absolute right-0 grid h-9 w-9 place-items-center rounded-full text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </header>

        <div ref={listRef} className="space-y-6">
          {overdueTasks.length > 0 && (
            <DaySection
              label="Overdue"
              icon={CalendarDays}
              tone="var(--color-danger)"
              items={overdueTasks.map((task) => ({
                id: task.id,
                title: task.title,
                meta: task.dueDate ? timeLabel(newDate(task.dueDate)) : "Due",
                color:
                  URGENCY_COLORS[
                    getTaskUrgency(task, {
                      redThresholdHours,
                      yellowThresholdHours,
                    })
                  ],
                taskId: task.id,
                start: null,
                allDay: true,
              }))}
              onComplete={completeTask}
            />
          )}

          {groups
            .filter((group) => group.items.length > 0)
            .map((group) => (
              <DaySection
                key={group.id}
                label={group.label}
                icon={group.icon}
                tone={group.tone}
                items={group.items}
                onComplete={completeTask}
              />
            ))}

          {dayItems.length === 0 && overdueTasks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-[var(--border-control)] px-5 py-10 text-center">
              <CalendarDays className="mx-auto h-5 w-5 text-[var(--text-muted)]" />
              <p className="mt-3 text-sm font-medium text-[var(--text-primary)]">
                The day is open
              </p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Add a task and Needt will find it a place.
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Quick add task"
        className="fixed bottom-20 right-5 z-10 grid h-12 w-12 place-items-center rounded-full border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)] shadow-lg transition-transform active:scale-95 md:bottom-6"
      >
        <Plus className="h-5 w-5" />
      </button>

      <BottomSheet open={addOpen} onOpenChange={setAddOpen}>
        <BottomSheetContent className="md:mx-auto md:max-w-md">
          <BottomSheetTitle className="mb-1">Add to this day</BottomSheetTitle>
          <BottomSheetDescription className="mb-3 text-xs">
            {selectedDate.toLocaleDateString([], {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </BottomSheetDescription>
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

function DaySection({
  label,
  icon: Icon,
  tone,
  items,
  onComplete,
}: {
  label: string;
  icon: typeof Clock3;
  tone: string;
  items: DayListItem[];
  onComplete: (taskId: string) => Promise<void>;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span
          className="flex h-8 items-center gap-2 rounded-full px-3 text-[11px] font-semibold uppercase tracking-[0.14em]"
          style={{
            color: tone,
            background: `color-mix(in srgb, ${tone} 10%, transparent)`,
          }}
        >
          <Icon className="h-3.5 w-3.5" />
          {label} ({items.length})
        </span>
        <div className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id}>
            <TaskRow
              title={item.title}
              meta={item.meta}
              color={item.color}
              completable={Boolean(item.taskId)}
              onComplete={
                item.taskId ? () => void onComplete(item.taskId!) : undefined
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TaskRow({
  title,
  meta,
  color,
  completable,
  onComplete,
}: {
  title: string;
  meta: string;
  color: string;
  completable: boolean;
  onComplete?: () => void;
}) {
  return (
    <div className="group flex min-h-[58px] items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3.5 py-2.5 transition-colors hover:bg-[var(--surface-raised)]">
      <span
        className="h-8 w-1 flex-none rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-[var(--text-primary)]">
          {title}
        </span>
        <span className="mt-0.5 block text-[12px] tabular-nums text-[var(--text-secondary)]">
          {meta}
        </span>
      </span>
      {completable ? (
        <button
          type="button"
          onClick={onComplete}
          aria-label={`Complete ${title}`}
          className="grid h-7 w-7 flex-none place-items-center rounded-full border-2 transition-transform hover:scale-105"
          style={{ borderColor: color }}
        />
      ) : (
        <CalendarDays
          className="h-4 w-4 flex-none text-[var(--text-muted)]"
          aria-hidden
        />
      )}
    </div>
  );
}
