"use client";

import { useEffect, useMemo, useState } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  CalendarDays,
  Check,
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
import { cn } from "@/lib/utils";

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
  const completedTasks = useMemo<DayListItem[]>(
    () =>
      tasks
        .filter((task) => {
          if (task.status !== TaskStatus.COMPLETED) return false;
          const date =
            task.scheduledStart ?? task.startDate ?? task.dueDate ?? null;
          return Boolean(date && isSameDay(newDate(date), dayStart));
        })
        .map((task) => ({
          id: `completed-${task.id}`,
          title: task.title,
          meta: "Completed",
          color: "var(--color-success)",
          taskId: task.id,
          start: task.scheduledStart ? newDate(task.scheduledStart) : null,
          allDay: !task.scheduledStart,
        })),
    [dayStart, tasks]
  );
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
      <div className="mx-auto grid min-h-full w-full max-w-[1120px] grid-cols-1 xl:grid-cols-[minmax(0,780px)_280px]">
        <main className="min-w-0 px-5 py-8 sm:px-10 sm:py-12 xl:px-12">
          <nav
            aria-label="Day navigation"
            className="mb-8 flex items-center gap-1 text-[12px] text-[var(--text-secondary)]"
          >
            <button
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, -1))}
              aria-label="Previous day"
              className="grid h-8 w-8 place-items-center rounded-md transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(now)}
              className="h-8 rounded-md px-2 font-medium transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              {viewingToday ? "Today" : "Back to today"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              aria-label="Next day"
              className="grid h-8 w-8 place-items-center rounded-md transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>

          <header className="mb-10">
            <div className="mb-4 grid h-8 w-8 place-items-center rounded-md bg-[var(--surface-raised)] text-[var(--text-secondary)]">
              <CalendarDays className="h-4 w-4" />
            </div>
            <h1 className="text-[34px] font-semibold leading-[1.12] tracking-[-0.035em] text-[var(--text-primary)] sm:text-[40px]">
              {selectedDate.toLocaleDateString([], {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </h1>
            <div className="mt-7">
              <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">
                Your day at a glance
              </h2>
              <p className="mt-2 max-w-2xl text-[14px] leading-6 text-[var(--text-secondary)]">
                {dayItems.length === 0
                  ? "You have room to plan deliberately. Add a task when you are ready."
                  : `${dayItems.length} ${
                      dayItems.length === 1 ? "item is" : "items are"
                    } planned${
                      overdueTasks.length > 0
                        ? `, with ${overdueTasks.length} overdue`
                        : ""
                    }. Start with the clearest next action.`}
              </p>
            </div>
          </header>

          {dayItems.length > 8 && (
            <div className="mb-8 border-l-2 border-[var(--color-warning)] pl-3 text-[13px] leading-5 text-[var(--text-secondary)]">
              This is a busy day. Keep the first task small and move anything
              non-essential before the schedule gets tight.
            </div>
          )}

          <div ref={listRef} className="space-y-8">
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

            {completedTasks.length > 0 && (
              <DaySection
                label="Completed"
                icon={Check}
                tone="var(--color-success)"
                items={completedTasks}
                onComplete={completeTask}
                completed
              />
            )}

            {dayItems.length === 0 &&
              overdueTasks.length === 0 &&
              completedTasks.length === 0 && (
                <div className="border-y border-dashed border-[var(--border-control)] px-5 py-12 text-center">
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
        </main>

        <DayRail date={selectedDate} items={dayItems} />
      </div>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Quick add task"
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-5 z-10 grid h-12 w-12 touch-manipulation place-items-center rounded-full border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)] shadow-[var(--button-primary-shadow)] transition-[transform,background-color] duration-150 active:scale-95 motion-reduce:transition-none lg:bottom-6"
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
  completed = false,
}: {
  label: string;
  icon: typeof Clock3;
  tone: string;
  items: DayListItem[];
  onComplete: (taskId: string) => Promise<void>;
  completed?: boolean;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 sm:mb-2 sm:rounded-none sm:border-x-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:pb-2 sm:pt-0">
        <span className="flex items-center gap-2 text-[13px] font-semibold text-[var(--text-primary)]">
          <Icon className="h-3.5 w-3.5" style={{ color: tone }} />
          {label}
        </span>
        <span className="text-[12px] tabular-nums text-[var(--text-muted)]">
          {items.length}
        </span>
      </div>
      <ul className="space-y-2 sm:space-y-0">
        {items.map((item) => (
          <li key={item.id}>
            <TaskRow
              title={item.title}
              meta={item.meta}
              color={item.color}
              completable={Boolean(item.taskId)}
              completed={completed}
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
  completed = false,
  onComplete,
}: {
  title: string;
  meta: string;
  color: string;
  completable: boolean;
  completed?: boolean;
  onComplete?: () => void;
}) {
  return (
    <div className="group flex min-h-11 items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-panel)] px-3 py-3 transition-colors duration-150 hover:bg-[var(--surface-hover)] sm:rounded-none sm:border-x-0 sm:border-t-0 sm:bg-transparent sm:px-1 sm:py-2">
      <span
        className="h-2 w-2 flex-none rounded-full"
        style={{ backgroundColor: completed ? "var(--text-muted)" : color }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block truncate text-[14px] font-medium text-[var(--text-primary)]",
            completed && "text-[var(--text-muted)] line-through"
          )}
        >
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] tabular-nums text-[var(--text-muted)]">
          {meta}
        </span>
      </span>
      {completable && !completed ? (
        <button
          type="button"
          onClick={onComplete}
          aria-label={`Complete ${title}`}
          className="grid h-11 w-11 flex-none touch-manipulation place-items-center rounded-md text-[var(--text-muted)] opacity-70 transition-[color,background-color,opacity] duration-150 hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)] group-hover:opacity-100 sm:h-9 sm:w-9"
        >
          <span
            aria-hidden
            className="h-4 w-4 rounded-full border"
            style={{ borderColor: color }}
          />
        </button>
      ) : (
        <Check
          className={cn(
            "h-4 w-4 flex-none text-[var(--text-muted)]",
            !completed && "opacity-0"
          )}
          aria-hidden
        />
      )}
    </div>
  );
}

function DayRail({ date, items }: { date: Date; items: DayListItem[] }) {
  const timedItems = items.filter((item) => item.start && !item.allDay);

  return (
    <aside className="hidden min-h-full border-l border-[var(--border-subtle)] px-5 py-8 xl:block">
      <div className="sticky top-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
          {isSameDay(date, newDate()) ? "Today" : "Agenda"}
        </p>
        <h2 className="mt-1 text-[15px] font-semibold text-[var(--text-primary)]">
          {date.toLocaleDateString([], {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </h2>
        <div className="mt-6">
          {Array.from({ length: 15 }, (_, index) => index + 6).map((hour) => {
            const hourItems = timedItems.filter(
              (item) => item.start?.getHours() === hour
            );
            return (
              <div
                key={hour}
                className="grid min-h-12 grid-cols-[42px_1fr] border-t border-[var(--border-subtle)]"
              >
                <span className="-translate-y-2 bg-[var(--surface-canvas)] pr-2 text-right text-[10px] tabular-nums text-[var(--text-muted)]">
                  {new Intl.DateTimeFormat([], {
                    hour: "numeric",
                    hour12: true,
                  }).format(new Date(2000, 0, 1, hour))}
                </span>
                <div className="min-w-0 py-1">
                  {hourItems.map((item) => (
                    <div
                      key={item.id}
                      className="truncate rounded-sm border-l-2 px-2 py-1 text-[11px] text-[var(--text-secondary)]"
                      style={{ borderColor: item.color }}
                      title={item.title}
                    >
                      {item.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
