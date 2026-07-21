"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  PartyPopper,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

import { TaskModal } from "@/components/tasks/TaskModal";
import { DailyAgendaEditor } from "@/components/today/DailyAgendaEditor";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  addDays,
  differenceInMinutes,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  newDate,
  startOfDay,
} from "@/lib/date-utils";
import { readTaskDefaults } from "@/lib/task-defaults";
import { cn } from "@/lib/utils";

import { useCalendarStore } from "@/store/calendar";
import { useTaskStore } from "@/store/task";

import { NewTask, Task, TaskStatus } from "@/types/task";

interface TimelineItem {
  id: string;
  title: string;
  color: string;
  taskId?: string;
  start: Date;
  end: Date;
  completed: boolean;
}

interface AgendaGroup {
  id: string;
  title: string;
  tasks: Task[];
  tone?: "danger" | "muted";
}

const HOUR_HEIGHT = 72;
const DURATION_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: "Reminder", value: null },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "1 hour", value: 60 },
  { label: "2 hours", value: 120 },
  { label: "4 hours", value: 240 },
  { label: "8 hours", value: 480 },
];

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

function durationValue(task: Task) {
  return task.duration ?? task.estimatedMinutes ?? null;
}

function durationLabel(minutes: number | null) {
  if (!minutes) return "Reminder";
  if (minutes < 60) return `${minutes}m`;
  if (minutes % 60 === 0) return `${minutes / 60}h`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function parseDuration(value: string): number | null | undefined {
  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "reminder") return null;
  const hours = normalized.match(/^(\d+(?:\.\d+)?)\s*h(?:ours?)?$/);
  if (hours) return Math.max(1, Math.round(Number(hours[1]) * 60));
  const minutes = normalized.match(/^(\d+)\s*m?(?:in(?:utes?)?)?$/);
  if (minutes) return Math.max(1, Number(minutes[1]));
  return undefined;
}

function timezoneLabel() {
  const part = new Intl.DateTimeFormat([], { timeZoneName: "short" })
    .formatToParts(newDate())
    .find((item) => item.type === "timeZoneName");
  return part?.value ?? "Local";
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
    ].filter((group) => group.tasks.length > 0) as AgendaGroup[];
  }, [dayEnd, dayStart, tasks, viewingToday]);

  const completedCount = agendaGroups.find((group) => group.id === "completed")
    ?.tasks.length;
  const activeCount = agendaGroups
    .filter((group) => group.id !== "completed")
    .reduce((total, group) => total + group.tasks.length, 0);
  const progressTotal = activeCount + (completedCount ?? 0);

  const createDefaultTask = async (taskTitle: string) => {
    const trimmed = taskTitle.trim();
    if (!trimmed) return;
    const defaults = readTaskDefaults();
    await createTask({
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
    try {
      await createDefaultTask(taskTitle);
      toast.success("Task created");
    } catch {
      toast.error("Could not create task");
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
      <div className="grid min-h-full w-full grid-cols-1 xl:h-full xl:grid-cols-[minmax(560px,1fr)_clamp(360px,32vw,600px)]">
        <main className="min-w-0 overflow-y-auto px-5 pb-14 pt-[max(1rem,env(safe-area-inset-top))] sm:px-10 sm:py-10 xl:px-12 xl:py-12">
          <div className="mx-auto w-full max-w-[760px]">
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
              />

              <div ref={listRef} className="mt-10 space-y-10">
                {agendaGroups.map((group) => (
                  <AgendaTaskSection
                    key={group.id}
                    group={group}
                    onOpenTask={setEditingTask}
                    onComplete={async (task) => {
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
                    }}
                    onDateChange={async (task, date) => {
                      try {
                        await updateTask(task.id, {
                          dueDate: date,
                          startDate: date,
                        });
                      } catch {
                        toast.error("Could not change date");
                      }
                    }}
                    onDurationChange={async (task, duration) => {
                      try {
                        await updateTask(task.id, {
                          duration,
                          estimatedMinutes: duration,
                        });
                      } catch {
                        toast.error("Could not change duration");
                      }
                    }}
                  />
                ))}

                {agendaGroups.length === 0 && (
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
    <header className="relative mb-14 text-center sm:mb-16">
      <button
        type="button"
        onClick={onPrevious}
        aria-label="Previous day"
        className="absolute left-0 top-3 grid h-11 w-11 place-items-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
      >
        <ChevronLeft className="h-6 w-6" strokeWidth={1.7} />
      </button>
      <div aria-live="polite">
        <h1 className="needt-day-display text-[44px] leading-[0.98] tracking-[-0.045em] text-[var(--text-primary)] sm:text-[58px] lg:text-[66px]">
          {date.toLocaleDateString([], { weekday: "long" })}
        </h1>
        <p className="mt-3 text-[17px] tracking-[-0.015em] text-[var(--text-secondary)] sm:text-[18px]">
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
          "mb-4 text-[22px] font-semibold tracking-[-0.025em] text-[var(--text-primary)] sm:text-[25px]",
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

function AgendaTaskRow({
  task,
  overdue,
  onOpen,
  onComplete,
  onDateChange,
  onDurationChange,
}: {
  task: Task;
  overdue: boolean;
  onOpen: () => void;
  onComplete: () => void;
  onDateChange: (date: Date | null) => void;
  onDurationChange: (duration: number | null) => void;
}) {
  const completed = task.status === TaskStatus.COMPLETED;
  const date = taskDisplayDate(task);
  return (
    <div className="group flex min-h-10 flex-wrap items-center gap-x-2 gap-y-0.5 rounded-lg px-1 py-1 transition-colors hover:bg-[var(--surface-hover)] sm:flex-nowrap">
      <button
        type="button"
        onClick={onComplete}
        aria-label={
          completed ? `Reopen ${task.title}` : `Complete ${task.title}`
        }
        className="grid h-9 w-9 flex-none place-items-center rounded-full text-[var(--text-muted)]"
      >
        <span
          aria-hidden
          className={cn(
            "grid h-5 w-5 place-items-center rounded-full border border-[var(--text-muted)]",
            completed &&
              "border-[var(--color-success)] bg-[var(--color-success)] text-[var(--surface-canvas)]"
          )}
        >
          {completed && <Check className="h-3 w-3" strokeWidth={2.5} />}
        </span>
      </button>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          "min-w-0 text-left text-[16px] leading-7 text-[var(--text-primary)] underline decoration-[var(--border-control)] underline-offset-4 hover:decoration-[var(--text-secondary)] sm:text-[17px]",
          completed && "text-[var(--text-muted)] line-through"
        )}
      >
        {task.title}
      </button>
      <DatePicker
        value={date}
        onChange={onDateChange}
        includeTime
        showIcon={false}
        labelFormat="EEE M/d"
        ariaLabel={`Change date for ${task.title}`}
        placeholder="Set date"
        accent={!completed}
        className={cn(
          "min-h-8 px-1 text-[15px]",
          overdue && "text-[var(--color-danger)]",
          completed && "text-[var(--text-muted)]"
        )}
      />
      <DurationPicker
        value={durationValue(task)}
        disabled={completed}
        onChange={onDurationChange}
      />
    </div>
  );
}

function DurationPicker({
  value,
  disabled,
  onChange,
}: {
  value: number | null;
  disabled: boolean;
  onChange: (duration: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");

  const applyCustom = () => {
    const parsed = parseDuration(custom);
    if (parsed === undefined) return;
    onChange(parsed);
    setOpen(false);
    setCustom("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="min-h-8 rounded-md px-1 text-[15px] tabular-nums text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)] disabled:pointer-events-none"
        >
          {durationLabel(value)}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 overflow-hidden p-0">
        <div className="border-b border-[var(--border-subtle)] p-2">
          <input
            autoFocus
            value={custom}
            onChange={(event) => setCustom(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyCustom();
            }}
            placeholder="Choose or type a duration"
            aria-label="Custom task duration"
            className="h-9 w-full bg-transparent px-2 text-[13px] text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {DURATION_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className="flex h-9 w-full items-center justify-between rounded-md px-3 text-left text-[13px] text-[var(--text-primary)] hover:bg-[var(--menu-item-hover)]"
            >
              {option.label}
              {value === option.value && (
                <Check className="h-4 w-4 text-[var(--color-accent)]" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function DayTimeline({
  date,
  items,
  onPrevious,
  onNext,
  onToday,
  onOpenTask,
}: {
  date: Date;
  items: TimelineItem[];
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
  onOpenTask: (taskId?: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isToday = isSameDay(date, newDate());

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = HOUR_HEIGHT * 5.5;
  }, [date]);

  const current = newDate();
  const currentMinutes = current.getHours() * 60 + current.getMinutes();

  return (
    <aside className="hidden min-h-0 border-l border-[var(--border-subtle)] xl:flex xl:flex-col">
      <header className="flex h-[92px] flex-none items-center border-b border-[var(--border-subtle)] px-4">
        <button
          type="button"
          className="mr-3 rounded-md px-1.5 py-1 text-[12px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]"
          title="Local timezone"
        >
          {timezoneLabel()}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-[var(--color-accent)]">
            {isToday ? "Today" : "Agenda"}
          </p>
          <h2 className="mt-1 truncate text-[18px] font-medium text-[var(--text-primary)]">
            {format(date, "EEE MMM d")}
          </h2>
        </div>
        <div className="flex items-center gap-1 text-[var(--text-muted)]">
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Previous day in timeline"
            className="grid h-9 w-9 place-items-center rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next day in timeline"
            className="grid h-9 w-9 place-items-center rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onToday}
            aria-label="Jump timeline to today"
            className="grid h-9 w-9 place-items-center rounded-md hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <Clock3 className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="needt-native-scroll min-h-0 flex-1 overflow-y-auto"
      >
        <div
          className="relative"
          style={{ height: HOUR_HEIGHT * 24 }}
          aria-label="One day timeline"
        >
          {Array.from({ length: 24 }, (_, hour) => (
            <div
              key={hour}
              className="grid grid-cols-[58px_1fr]"
              style={{ height: HOUR_HEIGHT }}
            >
              <span className="-translate-y-2 bg-[var(--surface-canvas)] pr-3 text-right text-[11px] tabular-nums text-[var(--text-muted)]">
                {new Intl.DateTimeFormat([], {
                  hour: "numeric",
                  hour12: true,
                }).format(new Date(2000, 0, 1, hour))}
              </span>
              <span className="border-t border-[var(--border-subtle)]" />
            </div>
          ))}

          <div className="absolute bottom-0 left-[58px] right-0 border-t border-[var(--border-subtle)]" />

          {isToday && (
            <div
              className="pointer-events-none absolute left-[54px] right-0 z-20 border-t border-[var(--text-secondary)]"
              style={{ top: (currentMinutes / 60) * HOUR_HEIGHT }}
            >
              <span className="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-[var(--text-primary)]" />
            </div>
          )}

          {items.map((item) => {
            const startMinutes =
              item.start.getHours() * 60 + item.start.getMinutes();
            const minutes = Math.max(
              15,
              differenceInMinutes(item.end, item.start)
            );
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenTask(item.taskId)}
                disabled={!item.taskId}
                className={cn(
                  "absolute left-[62px] right-3 z-10 overflow-hidden rounded-md border border-[var(--border-control)] bg-[var(--surface-raised)] px-2.5 py-1 text-left transition-colors hover:bg-[var(--surface-hover)]",
                  item.completed &&
                    "border-dashed bg-transparent text-[var(--text-muted)]"
                )}
                style={{
                  top: (startMinutes / 60) * HOUR_HEIGHT + 1,
                  minHeight: 32,
                  height: Math.max(32, (minutes / 60) * HOUR_HEIGHT - 2),
                  borderLeftColor: item.color,
                  borderLeftWidth: 4,
                }}
                title={`${item.title} · ${format(item.start, "p")}–${format(item.end, "p")}`}
              >
                <span className="block truncate text-[12px] font-medium text-[var(--text-primary)]">
                  {item.title}
                </span>
                <span className="block truncate text-[10px] tabular-nums text-[var(--text-muted)]">
                  {format(item.start, "p")}–{format(item.end, "p")}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
