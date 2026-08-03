"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { motion } from "motion/react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Filter,
  Layers3,
} from "lucide-react";

import { useNeedtReducedMotion } from "@/components/providers/MotionRuntime";

import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import {
  addDays,
  format,
  getDay,
  isSameDay,
  newDate,
  startOfDay,
  startOfMonth,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";
import {
  fastFadeTransition,
  instantTransition,
  layoutSpring,
  panelTransition,
} from "@/lib/motion";

import { Priority, Task, TaskStatus } from "@/types/task";

interface TimelineViewProps {
  tasks: Task[];
  onOpenTask?: (task: Task) => void;
  query: string;
  optionsHidden: boolean;
}

type GanttScale = "month" | "quarter" | "year";
type GroupMode = "project" | "status" | "priority";

interface DatedTask {
  task: Task;
  start: Date;
  end: Date;
}

interface GanttGroup {
  id: string;
  label: string;
  color: string;
  tasks: DatedTask[];
}

const LEFT_PANE_WIDTH = 244;
const WORKSPACE_ROW_HEIGHT = 36;
const GROUP_ROW_HEIGHT = 44;
const TASK_ROW_HEIGHT = 40;

const TOOLBAR_BUTTON =
  "inline-flex h-[25px] items-center justify-center gap-1.5 rounded-[6px] border border-[var(--border-control)] bg-[var(--surface-canvas)] px-2 text-[13px] font-medium leading-[17px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-control)]";

const SCALE_CONFIG: Record<
  GanttScale,
  {
    dayCount: number;
    minDayWidth: number;
    stepDays: number;
    beforeDays: number;
  }
> = {
  month: { dayCount: 42, minDayWidth: 28, stepDays: 30, beforeDays: 7 },
  quarter: { dayCount: 92, minDayWidth: 14, stepDays: 90, beforeDays: 9 },
  year: { dayCount: 366, minDayWidth: 3.5, stepDays: 365, beforeDays: 0 },
};

function taskStart(task: Task): Date | null {
  const value =
    task.scheduledStart ||
    task.startDate ||
    task.createdAt ||
    task.deadline ||
    task.dueDate;
  return value ? startOfDay(newDate(value)) : null;
}

function taskEnd(task: Task, start: Date): Date {
  const value = task.scheduledEnd || task.deadline || task.dueDate;
  const end = value ? startOfDay(newDate(value)) : start;
  return end < start ? start : end;
}

function titleCase(value: string): string {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function groupIdentity(item: DatedTask, mode: GroupMode) {
  if (mode === "status") {
    return {
      id: item.task.status,
      label: titleCase(item.task.status),
      color:
        item.task.status === TaskStatus.COMPLETED
          ? "var(--color-success)"
          : item.task.status === TaskStatus.IN_PROGRESS
            ? "var(--color-accent)"
            : "var(--text-muted)",
    };
  }

  if (mode === "priority") {
    const priority = item.task.priority || Priority.NONE;
    return {
      id: priority,
      label: priority === Priority.NONE ? "No priority" : titleCase(priority),
      color:
        priority === Priority.HIGH
          ? "var(--color-danger)"
          : priority === Priority.MEDIUM
            ? "var(--color-warning)"
            : priority === Priority.LOW
              ? "var(--primitive-blue-500)"
              : "var(--text-muted)",
    };
  }

  return {
    id: item.task.projectId || "none",
    label: item.task.project?.name || "No project",
    color: item.task.project?.color || "var(--color-accent)",
  };
}

function monthSegments(days: Date[], dayWidth: number) {
  const segments: Array<{
    key: string;
    label: string;
    left: number;
    width: number;
  }> = [];
  let index = 0;
  while (index < days.length) {
    const monthKey = format(days[index], "yyyy-MM");
    let end = index + 1;
    while (end < days.length && format(days[end], "yyyy-MM") === monthKey) {
      end += 1;
    }
    segments.push({
      key: monthKey,
      label: format(days[index], "MMM yyyy"),
      left: index * dayWidth,
      width: (end - index) * dayWidth,
    });
    index = end;
  }
  return segments;
}

function placement(
  itemStart: Date,
  itemEnd: Date,
  days: Date[],
  dayWidth: number
) {
  const rangeStart = days[0].getTime();
  const rangeEnd = days[days.length - 1].getTime();
  if (itemEnd.getTime() < rangeStart || itemStart.getTime() > rangeEnd) {
    return null;
  }

  const startIndex =
    itemStart.getTime() <= rangeStart
      ? 0
      : days.findIndex((day) => isSameDay(day, itemStart));
  const endIndex =
    itemEnd.getTime() >= rangeEnd
      ? days.length - 1
      : days.findIndex((day) => isSameDay(day, itemEnd));
  if (startIndex < 0 || endIndex < 0) return null;

  return {
    left: startIndex * dayWidth,
    width: Math.max(18, (endIndex - startIndex + 1) * dayWidth),
  };
}

export function TimelineView({
  tasks,
  onOpenTask,
  query,
  optionsHidden,
}: TimelineViewProps) {
  const prefersReducedMotion = useNeedtReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [viewportHeight, setViewportHeight] = useState(720);
  const [scale, setScale] = useState<GanttScale>("quarter");
  const [anchorDate, setAnchorDate] = useState(() => startOfDay(newDate()));
  const [jumpDate, setJumpDate] = useState<Date | null>(null);
  const [groupMode, setGroupMode] = useState<GroupMode>("project");
  const [sortAscending, setSortAscending] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [projectFilter, setProjectFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set()
  );

  const config = SCALE_CONFIG[scale];
  const days = useMemo(() => {
    const rangeStart = addDays(startOfMonth(anchorDate), -config.beforeDays);
    return Array.from({ length: config.dayCount }, (_, index) =>
      addDays(rangeStart, index)
    );
  }, [anchorDate, config.beforeDays, config.dayCount]);
  const dayWidth = Math.max(
    config.minDayWidth,
    viewportWidth / config.dayCount
  );
  const chartWidth = Math.max(viewportWidth, days.length * dayWidth);
  const months = useMemo(() => monthSegments(days, dayWidth), [dayWidth, days]);

  const datedTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tasks
      .filter((task) => showCompleted || task.status !== TaskStatus.COMPLETED)
      .filter(
        (task) => projectFilter === "all" || task.projectId === projectFilter
      )
      .filter(
        (task) => priorityFilter === "all" || task.priority === priorityFilter
      )
      .filter(
        (task) =>
          !normalizedQuery || task.title.toLowerCase().includes(normalizedQuery)
      )
      .map((task) => {
        const start = taskStart(task);
        if (!start) return null;
        return { task, start, end: taskEnd(task, start) };
      })
      .filter(Boolean) as DatedTask[];
  }, [priorityFilter, projectFilter, query, showCompleted, tasks]);

  const groups = useMemo(() => {
    const grouped = new Map<string, GanttGroup>();
    datedTasks.forEach((item) => {
      const identity = groupIdentity(item, groupMode);
      const group = grouped.get(identity.id) || { ...identity, tasks: [] };
      group.tasks.push(item);
      grouped.set(identity.id, group);
    });

    return [...grouped.values()]
      .map((group) => ({
        ...group,
        tasks: [...group.tasks].sort(
          (left, right) => left.start.getTime() - right.start.getTime()
        ),
      }))
      .sort((left, right) =>
        sortAscending
          ? left.label.localeCompare(right.label)
          : right.label.localeCompare(left.label)
      );
  }, [datedTasks, groupMode, sortAscending]);

  const projectOptions = useMemo(() => {
    const map = new Map<string, string>();
    tasks.forEach((task) => {
      if (task.projectId)
        map.set(task.projectId, task.project?.name || "Project");
    });
    return [...map.entries()].sort((left, right) =>
      left[1].localeCompare(right[1])
    );
  }, [tasks]);

  const bodyHeight =
    WORKSPACE_ROW_HEIGHT +
    groups.reduce(
      (height, group) =>
        height +
        GROUP_ROW_HEIGHT +
        (expandedGroups.has(group.id)
          ? group.tasks.length * TASK_ROW_HEIGHT
          : 0),
      0
    );
  const activeFilterCount = priorityFilter === "all" ? 0 : 1;
  const today = startOfDay(newDate());
  const todayIndex = days.findIndex((day) => isSameDay(day, today));

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    const updateSize = () => {
      setViewportWidth(viewport.clientWidth);
      setViewportHeight(viewport.clientHeight);
    };
    updateSize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport || todayIndex < 0) return;
    viewport.scrollLeft = Math.max(
      0,
      todayIndex * dayWidth - viewport.clientWidth / 2
    );
  }, [dayWidth, scale, todayIndex]);

  const moveRange = (direction: -1 | 1) => {
    setAnchorDate((current) =>
      addDays(current, direction * SCALE_CONFIG[scale].stepDays)
    );
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      {!optionsHidden && (
        <div className="flex-none border-b border-[var(--border-subtle)] px-3 py-2">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  TOOLBAR_BUTTON,
                  "border-[color-mix(in_srgb,var(--color-accent)_35%,var(--border-control))] bg-[color-mix(in_srgb,var(--color-accent)_9%,var(--surface-canvas))] text-[var(--color-accent)]"
                )}
              >
                <Layers3 className="h-3.5 w-3.5" />
                Group by: {titleCase(groupMode)}
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
                  Group projects and tasks
                </DropdownMenuLabel>
                {(["project", "status", "priority"] as GroupMode[]).map(
                  (mode) => (
                    <DropdownMenuItem
                      key={mode}
                      onSelect={() => setGroupMode(mode)}
                    >
                      {titleCase(mode)}
                    </DropdownMenuItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={() => setSortAscending((ascending) => !ascending)}
              className={TOOLBAR_BUTTON}
            >
              Sort Groups {sortAscending ? "A–Z" : "Z–A"}
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger className={TOOLBAR_BUTTON}>
                Workspace: {projectFilter === "all" ? "All" : "Filtered"}
                <ChevronDown className="h-3 w-3" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52">
                <DropdownMenuItem onSelect={() => setProjectFilter("all")}>
                  All projects
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {projectOptions.map(([id, label]) => (
                  <DropdownMenuItem
                    key={id}
                    onSelect={() => setProjectFilter(id)}
                  >
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger className={TOOLBAR_BUTTON}>
                <Filter className="h-3.5 w-3.5" /> Filters ({activeFilterCount})
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
                  Priority
                </DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={priorityFilter}
                  onValueChange={(value) =>
                    setPriorityFilter(value as Priority | "all")
                  }
                >
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  {Object.values(Priority).map((priority) => (
                    <DropdownMenuRadioItem key={priority} value={priority}>
                      {priority === Priority.NONE
                        ? "No priority"
                        : titleCase(priority)}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="ml-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]">
              Projects: {groups.length}
            </span>

            <div className="ml-auto flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => moveRange(-1)}
                aria-label="Previous Gantt range"
                className={cn(TOOLBAR_BUTTON, "w-[25px] px-0")}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => moveRange(1)}
                aria-label="Next Gantt range"
                className={cn(TOOLBAR_BUTTON, "w-[25px] px-0")}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger className={TOOLBAR_BUTTON}>
                  {scale}
                  <ChevronDown className="h-3 w-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-32">
                  <DropdownMenuRadioGroup
                    value={scale}
                    onValueChange={(value) => setScale(value as GanttScale)}
                  >
                    {(["month", "quarter", "year"] as GanttScale[]).map(
                      (value) => (
                        <DropdownMenuRadioItem key={value} value={value}>
                          {value}
                        </DropdownMenuRadioItem>
                      )
                    )}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DatePicker
                value={jumpDate}
                onChange={(date) => {
                  setJumpDate(date);
                  if (date) setAnchorDate(startOfDay(date));
                }}
                labelFormat="'Jump to date'"
                placeholder="Jump to date"
                ariaLabel="Jump to Gantt date"
                showIcon={false}
                className="!h-[25px] !min-h-[25px] border border-[var(--border-control)] bg-[var(--surface-canvas)] px-2 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              />
              <button
                type="button"
                onClick={() => setAnchorDate(startOfDay(newDate()))}
                className={TOOLBAR_BUTTON}
              >
                Today
              </button>
            </div>
          </div>

          <label className="mt-2 inline-flex h-[26px] cursor-pointer items-center gap-1.5 text-[13px] text-[var(--text-secondary)]">
            <Checkbox
              checked={showCompleted}
              onCheckedChange={(checked) => setShowCompleted(checked === true)}
              aria-label="Show completed tasks"
            />
            Show completed tasks
          </label>
        </div>
      )}

      <div
        ref={scrollRef}
        data-testid="gantt-scroll-viewport"
        className="min-h-0 flex-1 overflow-auto overscroll-none"
      >
        <div className="relative min-h-full" style={{ width: chartWidth }}>
          <div className="sticky top-0 z-40 h-10 border-y border-[var(--border-subtle)] bg-[var(--surface-input)] text-[var(--text-muted)]">
            <div className="relative h-10" style={{ width: chartWidth }}>
              {months.map((month) => (
                <div
                  key={month.key}
                  className="absolute top-0 flex h-5 items-center justify-center border-r border-[var(--border-subtle)] text-[13px]"
                  style={{ left: month.left, width: month.width }}
                >
                  {month.width >= 180 && (
                    <span className="whitespace-nowrap">{month.label}</span>
                  )}
                </div>
              ))}
              {days.map((day, index) =>
                index % 7 === 0 ? (
                  <div
                    key={day.toISOString()}
                    className="absolute bottom-0 flex h-5 items-center justify-center border-r border-dashed border-[var(--border-subtle)] text-[12px] tabular-nums"
                    style={{
                      left: index * dayWidth,
                      width: dayWidth * 7,
                    }}
                  >
                    {format(day, "d")}
                  </div>
                ) : null
              )}
              {todayIndex >= 0 && (
                <div
                  className="absolute bottom-0 z-20 h-5 w-px bg-[var(--color-accent)]"
                  style={{ left: todayIndex * dayWidth }}
                >
                  <span className="absolute bottom-px left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-[var(--color-accent)] px-1.5 py-0.5 text-[11px] font-medium leading-[15px] text-[var(--color-accent-contrast)]">
                    {format(today, "EEE MMM d")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div
            className="relative"
            style={{ minHeight: Math.max(bodyHeight, viewportHeight - 40) }}
          >
            <div
              aria-hidden="true"
              data-testid="gantt-grid-background"
              className="pointer-events-none absolute bottom-0 top-0"
              style={{ width: chartWidth }}
            >
              {days.map((day, index) => {
                const weekday = getDay(day);
                if (weekday !== 0 && weekday !== 6) return null;
                return (
                  <div
                    key={day.toISOString()}
                    className="absolute bottom-0 top-0 border-r border-dashed border-[var(--border-subtle)] opacity-70"
                    style={{
                      left: index * dayWidth,
                      width: dayWidth,
                      backgroundImage:
                        "repeating-linear-gradient(45deg, transparent, transparent 2px, var(--surface-input) 4px, var(--surface-input) 8px)",
                    }}
                  />
                );
              })}
              {days.map((day, index) =>
                index % 7 === 0 ? (
                  <div
                    key={`week:${day.toISOString()}`}
                    className="absolute bottom-0 top-0 border-l border-dashed border-[var(--border-subtle)]"
                    style={{ left: index * dayWidth }}
                  />
                ) : null
              )}
              {todayIndex >= 0 && (
                <div
                  className="absolute bottom-0 top-0 z-10 w-px bg-[var(--color-accent)]"
                  style={{ left: todayIndex * dayWidth }}
                />
              )}
            </div>

            <div
              aria-hidden="true"
              className="pointer-events-none absolute bottom-0 left-0 top-0 z-[15] border-r border-[var(--border-subtle)] bg-[var(--surface-canvas)]"
              style={{ width: LEFT_PANE_WIDTH }}
            />

            <div
              className="relative z-20 border-b border-[var(--border-subtle)] bg-[var(--surface-input)]"
              style={{ width: chartWidth, height: WORKSPACE_ROW_HEIGHT }}
            >
              <div
                className="sticky left-0 z-30 flex h-full items-center gap-2 border-r border-[var(--border-subtle)] bg-[var(--surface-input)] px-3 text-[14px]"
                style={{ width: LEFT_PANE_WIDTH }}
              >
                <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                <Layers3 className="h-4 w-4 text-[var(--text-secondary)]" />
                <span className="min-w-0 flex-1 truncate">My Workspace</span>
                <span className="text-[12px] text-[var(--text-muted)]">
                  {datedTasks.length}
                </span>
              </div>
            </div>

            {groups.length === 0 ? (
              <div className="relative z-20 flex min-h-32 items-center">
                <div
                  className="sticky left-0 z-30 border-r border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-4 text-[13px] text-[var(--text-muted)]"
                  style={{ width: LEFT_PANE_WIDTH }}
                >
                  No matching tasks
                </div>
                <div className="px-6 text-[13px] text-[var(--text-muted)]">
                  Add dates to a task or clear the current filters.
                </div>
              </div>
            ) : (
              groups.map((group) => {
                const groupStart = group.tasks.reduce(
                  (earliest, item) =>
                    item.start < earliest ? item.start : earliest,
                  group.tasks[0].start
                );
                const groupEnd = group.tasks.reduce(
                  (latest, item) => (item.end > latest ? item.end : latest),
                  group.tasks[0].end
                );
                const groupPlacement = placement(
                  groupStart,
                  groupEnd,
                  days,
                  dayWidth
                );
                const completedCount = group.tasks.filter(
                  (item) => item.task.status === TaskStatus.COMPLETED
                ).length;
                const progress = Math.round(
                  (completedCount / Math.max(1, group.tasks.length)) * 100
                );

                return (
                  <div key={group.id}>
                    <div
                      className="relative z-20 border-b border-[var(--border-subtle)]"
                      style={{ width: chartWidth, height: GROUP_ROW_HEIGHT }}
                    >
                      <div className="absolute inset-0 z-10">
                        {groupPlacement && (
                          <motion.div
                            initial={
                              prefersReducedMotion
                                ? false
                                : { opacity: 0, y: 3 }
                            }
                            animate={{ opacity: 1, y: 0 }}
                            className="absolute top-1 h-9 overflow-hidden rounded-[4px] text-[var(--text-primary)]"
                            style={{
                              left: groupPlacement.left,
                              width: Math.max(80, groupPlacement.width),
                              backgroundColor: `color-mix(in srgb, ${group.color} 16%, var(--surface-control))`,
                            }}
                          >
                            <div className="flex h-7 items-center truncate px-2.5 text-[13px] font-medium">
                              {group.label}
                            </div>
                            <div className="relative h-2 bg-[color-mix(in_srgb,var(--text-primary)_5%,transparent)]">
                              <div
                                className="h-full opacity-30"
                                style={{
                                  width: `${progress}%`,
                                  backgroundColor: group.color,
                                }}
                              />
                              <span
                                className="absolute bottom-1/2 right-2 h-1.5 w-1.5 translate-y-1/2 rounded-full opacity-45"
                                style={{ backgroundColor: group.color }}
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        aria-expanded={expandedGroups.has(group.id)}
                        className="sticky left-0 z-30 flex h-full items-center gap-2 border-r border-[var(--border-subtle)] bg-[var(--surface-canvas)] px-3 text-left hover:bg-[var(--surface-hover)]"
                        style={{ width: LEFT_PANE_WIDTH }}
                      >
                        <ChevronRight
                          className={cn(
                            "h-3.5 w-3.5 flex-none text-[var(--text-muted)] transition-transform duration-150",
                            expandedGroups.has(group.id) && "rotate-90"
                          )}
                        />
                        <span
                          className="inline-flex min-w-0 max-w-[156px] items-center gap-2 rounded-full px-2 py-0.5 text-[13px] font-medium"
                          style={{
                            color: group.color,
                            backgroundColor: `color-mix(in srgb, ${group.color} 13%, transparent)`,
                          }}
                        >
                          <span
                            className="h-2 w-2 flex-none rounded-full"
                            style={{ backgroundColor: group.color }}
                          />
                          <span className="truncate">{group.label}</span>
                        </span>
                        <span className="ml-auto text-[12px] text-[var(--text-muted)]">
                          {group.tasks.length}
                        </span>
                      </button>
                    </div>

                    {expandedGroups.has(group.id) &&
                      group.tasks.map((item) => {
                        const itemPlacement = placement(
                          item.start,
                          item.end,
                          days,
                          dayWidth
                        );
                        const completed =
                          item.task.status === TaskStatus.COMPLETED;
                        const overdue = !completed && item.end < today;
                        return (
                          <div
                            key={item.task.id}
                            className="relative z-20 border-b border-[var(--border-subtle)]"
                            style={{
                              width: chartWidth,
                              height: TASK_ROW_HEIGHT,
                            }}
                          >
                            <div className="absolute inset-0 z-10">
                              {itemPlacement && (
                                <motion.button
                                  type="button"
                                  onClick={() => onOpenTask?.(item.task)}
                                  layout={!prefersReducedMotion}
                                  initial={
                                    prefersReducedMotion
                                      ? false
                                      : { opacity: 0, y: 2 }
                                  }
                                  animate={{
                                    opacity: completed ? 0.58 : 1,
                                    y: 0,
                                  }}
                                  transition={
                                    prefersReducedMotion
                                      ? instantTransition
                                      : {
                                          layout: layoutSpring,
                                          opacity: fastFadeTransition,
                                          y: panelTransition,
                                        }
                                  }
                                  className="group absolute top-1 h-8 min-w-[18px] overflow-hidden rounded-[4px] text-left text-[13px] text-[var(--text-primary)] outline-none ring-offset-1 ring-offset-[var(--surface-canvas)] hover:ring-1 hover:ring-[var(--text-secondary)] focus-visible:ring-1 focus-visible:ring-[var(--text-primary)]"
                                  style={{
                                    left: itemPlacement.left,
                                    width: Math.max(56, itemPlacement.width),
                                    backgroundColor: `color-mix(in srgb, ${group.color} 18%, var(--surface-control))`,
                                  }}
                                  title={`${item.task.title} · ${format(item.start, "MMM d")} – ${format(item.end, "MMM d")}`}
                                >
                                  <span className="flex h-6 items-center gap-1.5 truncate px-2.5">
                                    <span className="truncate">
                                      {item.task.title}
                                    </span>
                                    {overdue && (
                                      <CircleAlert className="ml-auto h-3.5 w-3.5 flex-none text-[var(--color-danger)]" />
                                    )}
                                  </span>
                                  <span className="relative block h-2 bg-[color-mix(in_srgb,var(--text-primary)_5%,transparent)]">
                                    <span
                                      className="block h-full opacity-35"
                                      style={{
                                        width: completed ? "100%" : "0%",
                                        backgroundColor: group.color,
                                      }}
                                    />
                                    <span
                                      className="absolute right-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full opacity-45"
                                      style={{ backgroundColor: group.color }}
                                    />
                                  </span>
                                </motion.button>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => onOpenTask?.(item.task)}
                              className="sticky left-0 z-30 flex h-full items-center gap-2 border-r border-[var(--border-subtle)] bg-[var(--surface-canvas)] pl-7 pr-3 text-left hover:bg-[var(--surface-hover)]"
                              style={{ width: LEFT_PANE_WIDTH }}
                            >
                              <span
                                className={cn(
                                  "h-3.5 w-3.5 flex-none rounded-full border",
                                  completed
                                    ? "border-[var(--color-success)] bg-[var(--color-success)]"
                                    : "border-[var(--text-muted)]"
                                )}
                              />
                              <span
                                className={cn(
                                  "min-w-0 flex-1 truncate text-[13px]",
                                  completed &&
                                    "text-[var(--text-muted)] line-through"
                                )}
                              >
                                {item.task.title}
                              </span>
                            </button>
                          </div>
                        );
                      })}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
