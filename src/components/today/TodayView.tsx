"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { ChevronLeft, ChevronRight, PartyPopper, Plus } from "lucide-react";
import { toast } from "sonner";

import { TaskModal } from "@/components/tasks/TaskModal";
import { AgendaTaskRow } from "@/components/today/AgendaTaskRow";
import { DailyAgendaEditor } from "@/components/today/DailyAgendaEditor";
import { DayTimeline, type TimelineItem } from "@/components/today/DayTimeline";
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
  endOfWeek,
  isSameDay,
  newDate,
  startOfDay,
} from "@/lib/date-utils";
import { readTaskDefaults } from "@/lib/task-defaults";
import { cn } from "@/lib/utils";

import { useCalendarStore } from "@/store/calendar";
import { useTaskStore } from "@/store/task";

import { NewTask, Task, TaskStatus } from "@/types/task";

interface AgendaGroup {
  id: string;
  title: string;
  tasks: Task[];
  tone?: "danger" | "muted";
}

function localDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function longDateLabel(date: Date): string {
  const day = date.getDate();
  const mod100 = day % 100;
  const suffix =
    mod100 >= 11 && mod100 <= 13
      ? "th"
      : day % 10 === 1
        ? "st"
        : day % 10 === 2
          ? "nd"
          : day % 10 === 3
            ? "rd"
            : "th";
  return `${date.toLocaleDateString([], { month: "long" })} ${day}${suffix}, ${date.getFullYear()}`;
}

function taskDates(task: Task) {
  return [
    task.scheduledStart,
    task.startDate,
    task.dueDate,
    ...(task.scheduledBlocks?.map((block) => block.start) ?? []),
  ]
    .filter(Boolean)
    .map((date) => newDate(date!));
}

function taskBelongsToDay(task: Task, date: Date) {
  return taskDates(task).some((taskDate) => isSameDay(taskDate, date));
}

function taskDisplayDate(task: Task) {
  const value = task.dueDate ?? task.scheduledStart ?? task.startDate;
  return value ? newDate(value) : null;
}

export function TodayView() {
  const tasks = useTaskStore((state) => state.tasks);
  const tags = useTaskStore((state) => state.tags);
  const fetchTasks = useTaskStore((state) => state.fetchTasks);
  const fetchTags = useTaskStore((state) => state.fetchTags);
  const updateTask = useTaskStore((state) => state.updateTask);
  const createTask = useTaskStore((state) => state.createTask);
  const createTag = useTaskStore((state) => state.createTag);
  const loadFromDatabase = useCalendarStore((state) => state.loadFromDatabase);
  const getAllCalendarItems = useCalendarStore(
    (state) => state.getAllCalendarItems
  );
  const events = useCalendarStore((state) => state.events);

  const [listRef] = useAutoAnimate<HTMLDivElement>({ duration: 180 });
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [now] = useState(() => newDate());
  const [selectedDate, setSelectedDate] = useState(() => newDate());
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [referencedTasks, setReferencedTasks] = useState<{
    dateKey: string;
    ids: Set<string>;
  }>({ dateKey: "", ids: new Set() });
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    void fetchTasks();
    void fetchTags();
    void loadFromDatabase();
  }, [fetchTags, fetchTasks, loadFromDatabase]);

  const dayStart = startOfDay(selectedDate);
  const dayEnd = endOfDay(selectedDate);
  const viewingToday = isSameDay(selectedDate, now);
  const dateKey = localDateKey(selectedDate);

  const timelineItems = useMemo<TimelineItem[]>(() => {
    void events.length;
    return getAllCalendarItems(dayStart, dayEnd)
      .filter((item) => !item.allDay)
      .map((item) => ({
        id: item.id,
        title: item.title,
        color: item.color ?? "var(--color-accent)",
        taskId: item.extendedProps?.isTask
          ? item.extendedProps.taskId
          : undefined,
        start: newDate(item.start),
        end: newDate(item.end),
        completed: item.extendedProps?.status === TaskStatus.COMPLETED,
      }))
      .sort((left, right) => left.start.getTime() - right.start.getTime());
  }, [dayEnd, dayStart, events, getAllCalendarItems]);

  const agendaGroups = useMemo<AgendaGroup[]>(() => {
    const incomplete = tasks.filter(
      (task) => task.status !== TaskStatus.COMPLETED
    );
    const todayTasks = incomplete
      .filter((task) => taskBelongsToDay(task, dayStart))
      .sort((left, right) => {
        const leftDate = taskDisplayDate(left)?.getTime() ?? Infinity;
        const rightDate = taskDisplayDate(right)?.getTime() ?? Infinity;
        return leftDate - rightDate;
      });
    const todayIds = new Set(todayTasks.map((task) => task.id));
    const overdue = viewingToday
      ? incomplete.filter(
          (task) =>
            !todayIds.has(task.id) &&
            task.dueDate &&
            newDate(task.dueDate) < dayStart
        )
      : [];
    const overdueIds = new Set(overdue.map((task) => task.id));
    const weekEnd = endOfWeek(dayStart, { weekStartsOn: 1 });
    const weekTasks = viewingToday
      ? incomplete.filter((task) => {
          if (todayIds.has(task.id) || overdueIds.has(task.id)) return false;
          const date = taskDisplayDate(task);
          return Boolean(date && date > dayEnd && date <= weekEnd);
        })
      : [];
    const completed = tasks.filter((task) => {
      if (task.status !== TaskStatus.COMPLETED) return false;
      return Boolean(
        (task.completedAt && isSameDay(newDate(task.completedAt), dayStart)) ||
        taskBelongsToDay(task, dayStart)
      );
    });

    const referencedIds =
      referencedTasks.dateKey === dateKey
        ? referencedTasks.ids
        : new Set<string>();

    return [
      { id: "today", title: "Today's tasks", tasks: todayTasks },
      {
        id: "overdue",
        title: "Tasks past deadline",
        tasks: overdue,
        tone: "danger",
      },
      { id: "week", title: "This week's tasks", tasks: weekTasks },
      {
        id: "completed",
        title: "Completed",
        tasks: completed,
        tone: "muted",
      },
    ]
      .map((group) => ({
        ...group,
        tasks: group.tasks.filter((task) => !referencedIds.has(task.id)),
      }))
      .filter((group) => group.tasks.length > 0) as AgendaGroup[];
  }, [dateKey, dayEnd, dayStart, referencedTasks, tasks, viewingToday]);

  const referencedDayTasks =
    referencedTasks.dateKey === dateKey
      ? tasks.filter((task) => referencedTasks.ids.has(task.id))
      : [];
  const completedCount =
    (agendaGroups.find((group) => group.id === "completed")?.tasks.length ??
      0) +
    referencedDayTasks.filter((task) => task.status === TaskStatus.COMPLETED)
      .length;
  const activeCount =
    agendaGroups
      .filter((group) => group.id !== "completed")
      .reduce((total, group) => total + group.tasks.length, 0) +
    referencedDayTasks.filter((task) => task.status !== TaskStatus.COMPLETED)
      .length;
  const progressTotal = activeCount + completedCount;

  const createDefaultTask = async (taskTitle: string) => {
    const trimmed = taskTitle.trim();
    if (!trimmed) throw new Error("Task title is required");
    const defaults = readTaskDefaults();
    return createTask({
      title: trimmed,
      status: defaults.status,
      startDate: dayStart,
      dueDate: dayStart,
      deadline: defaults.hardDeadline ? dayEnd : null,
      duration: defaults.durationMinutes,
      estimatedMinutes: defaults.durationMinutes,
      minChunkMinutes: defaults.minChunkMinutes || null,
      priority: defaults.priority === "none" ? null : defaults.priority,
      projectId: defaults.projectId === "none" ? null : defaults.projectId,
      tagIds: [],
      isRecurring: false,
      isAutoScheduled: defaults.autoScheduled,
      autoScheduled: defaults.autoScheduled,
      scheduleLocked: false,
    });
  };

  const handleAgendaCreateTask = async (taskTitle: string) => {
    return createDefaultTask(taskTitle);
  };

  const handleTaskComplete = async (task: Task) => {
    try {
      await updateTask(task.id, {
        status:
          task.status === TaskStatus.COMPLETED
            ? TaskStatus.TODO
            : TaskStatus.COMPLETED,
      });
    } catch {
      toast.error("Could not update task");
    }
  };

  const handleTaskDateChange = async (task: Task, date: Date | null) => {
    try {
      await updateTask(task.id, { dueDate: date, startDate: date });
    } catch {
      toast.error("Could not change date");
    }
  };

  const handleTaskDurationChange = async (
    task: Task,
    duration: number | null
  ) => {
    try {
      await updateTask(task.id, { duration, estimatedMinutes: duration });
    } catch {
      toast.error("Could not change duration");
    }
  };

  const handleQuickAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await createDefaultTask(title);
      setTitle("");
      setAddOpen(false);
      toast.success("Task added");
    } catch {
      toast.error("Could not add task");
    } finally {
      setSaving(false);
    }
  };

  const editTask = (taskId?: string) => {
    if (!taskId) return;
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (task) setEditingTask(task);
  };

  return (
    <div
      className="needt-page-depth needt-native-scroll relative h-full overflow-y-auto pb-24 xl:overflow-hidden xl:pb-0"
      onTouchStart={(event) => {
        const touch = event.touches[0];
        swipeStart.current = { x: touch.clientX, y: touch.clientY };
      }}
      onTouchEnd={(event) => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (!start) return;
        const touch = event.changedTouches[0];
        const deltaX = touch.clientX - start.x;
        const deltaY = touch.clientY - start.y;
        if (Math.abs(deltaX) < 64 || Math.abs(deltaX) < Math.abs(deltaY))
          return;
        setSelectedDate((date) => addDays(date, deltaX > 0 ? -1 : 1));
      }}
    >
      <div className="grid min-h-full w-full grid-cols-1 xl:h-full xl:grid-cols-[minmax(0,0.96fr)_minmax(0,1.04fr)]">
        <main className="min-w-0 overflow-y-auto px-5 pb-14 pt-[max(1rem,env(safe-area-inset-top))] sm:px-10 sm:py-10 xl:px-10 xl:py-9 2xl:px-14">
          <div className="mx-auto w-full max-w-[840px]">
            <div className="mb-12 flex items-center justify-between sm:hidden">
              <div className="needt-raised-depth flex h-11 items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 text-[15px] font-semibold tabular-nums text-[var(--text-primary)]">
                <PartyPopper className="h-4 w-4" strokeWidth={1.8} />
                {completedCount ?? 0} / {progressTotal}
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                aria-label="Quick add task"
                className="needt-raised-depth grid h-11 w-11 touch-manipulation place-items-center rounded-full border border-[var(--border-subtle)] text-[var(--text-primary)] transition-transform duration-150 active:scale-95 motion-reduce:transition-none"
              >
                <Plus className="h-6 w-6" strokeWidth={1.8} />
              </button>
            </div>

            <DayHeader
              date={selectedDate}
              viewingToday={viewingToday}
              onPrevious={() => setSelectedDate(addDays(selectedDate, -1))}
              onNext={() => setSelectedDate(addDays(selectedDate, 1))}
              onToday={() => setSelectedDate(now)}
            />

            <div className="pb-10">
              <DailyAgendaEditor
                dateKey={dateKey}
                onCreateTask={handleAgendaCreateTask}
                onOpenTask={setEditingTask}
                onCompleteTask={handleTaskComplete}
                onDateChange={handleTaskDateChange}
                onDurationChange={handleTaskDurationChange}
                onReferencedTaskIdsChange={(referencedDateKey, ids) =>
                  setReferencedTasks({ dateKey: referencedDateKey, ids })
                }
              />

              <div
                ref={listRef}
                className="mt-8 space-y-11 xl:mt-9 xl:space-y-12"
              >
                {agendaGroups.map((group) => (
                  <AgendaTaskSection
                    key={group.id}
                    group={group}
                    onOpenTask={setEditingTask}
                    onComplete={handleTaskComplete}
                    onDateChange={handleTaskDateChange}
                    onDurationChange={handleTaskDurationChange}
                  />
                ))}

                {progressTotal === 0 && (
                  <div className="border-t border-[var(--border-subtle)] pt-8 text-[13px] text-[var(--text-muted)]">
                    No tasks on this day yet. Type <kbd>/task</kbd>, add a
                    title, and press Enter.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <DayTimeline
          date={selectedDate}
          items={timelineItems}
          onPrevious={() => setSelectedDate(addDays(selectedDate, -1))}
          onNext={() => setSelectedDate(addDays(selectedDate, 1))}
          onToday={() => setSelectedDate(now)}
          onOpenTask={editTask}
        />
      </div>

      <button
        type="button"
        onClick={() => setAddOpen(true)}
        aria-label="Quick add task"
        className="fixed bottom-[calc(84px+env(safe-area-inset-bottom))] right-5 z-10 hidden h-12 w-12 touch-manipulation place-items-center rounded-full border border-[var(--button-primary-border)] bg-[var(--button-primary-bg)] text-[var(--button-primary-fg)] shadow-[var(--button-primary-shadow)] transition-[transform,background-color] duration-150 active:scale-95 motion-reduce:transition-none sm:grid lg:bottom-6 xl:hidden"
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

      <TaskModal
        isOpen={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        task={editingTask ?? undefined}
        tags={tags}
        onCreateTag={(name, color) => createTag({ name, color: color ?? "" })}
        onSave={async (payload: NewTask) => {
          if (!editingTask) return;
          await updateTask(editingTask.id, payload);
          setEditingTask(null);
        }}
      />
    </div>
  );
}

function DayHeader({
  date,
  viewingToday,
  onPrevious,
  onNext,
  onToday,
}: {
  date: Date;
  viewingToday: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <header className="relative mb-11 text-center sm:mb-12 xl:mb-12">
      <button
        type="button"
        onClick={onPrevious}
        aria-label="Previous day"
        className="absolute left-0 top-3 grid h-11 w-11 place-items-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      >
        <ChevronLeft className="h-6 w-6" strokeWidth={1.7} />
      </button>
      <div aria-live="polite">
        <h1 className="needt-day-display text-[44px] leading-[0.98] tracking-[-0.045em] text-[var(--text-primary)] sm:text-[50px] xl:text-[54px]">
          {date.toLocaleDateString([], { weekday: "long" })}
        </h1>
        <p className="mt-3 text-[17px] tracking-[-0.015em] text-[var(--text-secondary)] sm:text-[17px] xl:text-[18px]">
          {longDateLabel(date)}
        </p>
      </div>
      <button
        type="button"
        onClick={onNext}
        aria-label="Next day"
        className="absolute right-0 top-3 grid h-11 w-11 place-items-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      >
        <ChevronRight className="h-6 w-6" strokeWidth={1.7} />
      </button>
      {!viewingToday && (
        <button
          type="button"
          onClick={onToday}
          className="mt-4 rounded-full bg-[var(--surface-control)] px-4 py-2 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-control-hover)] hover:text-[var(--text-primary)]"
        >
          Back to today
        </button>
      )}
    </header>
  );
}

function AgendaTaskSection({
  group,
  onOpenTask,
  onComplete,
  onDateChange,
  onDurationChange,
}: {
  group: AgendaGroup;
  onOpenTask: (task: Task) => void;
  onComplete: (task: Task) => Promise<void>;
  onDateChange: (task: Task, date: Date | null) => Promise<void>;
  onDurationChange: (task: Task, duration: number | null) => Promise<void>;
}) {
  return (
    <section>
      <h2
        className={cn(
          "mb-4 text-[24px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] sm:text-[26px] xl:text-[28px]",
          group.tone === "muted" && "text-[var(--text-secondary)]"
        )}
      >
        {group.title}
      </h2>
      <ul className="space-y-1">
        {group.tasks.map((task) => (
          <li key={task.id}>
            <AgendaTaskRow
              task={task}
              overdue={group.tone === "danger"}
              onOpen={() => onOpenTask(task)}
              onComplete={() => void onComplete(task)}
              onDateChange={(date) => void onDateChange(task, date)}
              onDurationChange={(duration) =>
                void onDurationChange(task, duration)
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}
