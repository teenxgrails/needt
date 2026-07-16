"use client";

import {
  CSSProperties,
  DragEvent,
  PointerEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  Box,
  CalendarClock,
  Check,
  ChevronDown,
  CircleDot,
  Clock3,
  Crosshair,
  Flag,
  Focus,
  Minus,
  Orbit,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  TimerReset,
  X,
} from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  addDays,
  addMinutes,
  format,
  isSameDay,
  newDate,
  startOfDay,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";

import { Project } from "@/types/project";
import { Priority, Task, TaskStatus } from "@/types/task";

type SpaceHorizon = 1 | 7 | 14;

interface SpaceViewProps {
  projects: Project[];
  tasks: Task[];
  onOpenTask: (task: Task) => void;
  onRescheduleTask: (task: Task, start: Date, end: Date) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onCreateTask: () => void;
}

interface SpacePoint {
  x: number;
  y: number;
}

interface SpaceTaskNode extends SpacePoint {
  task: Task;
}

interface SpaceCluster extends SpacePoint {
  id: string;
  name: string;
  color: string;
  completedCount: number;
  totalCount: number;
  tasks: SpaceTaskNode[];
}

interface DropPreview {
  x: number;
  y: number;
  start: Date;
  end: Date;
}

const PROJECT_COLORS = [
  "var(--space-cluster-blue)",
  "var(--space-cluster-violet)",
  "var(--space-cluster-teal)",
  "var(--space-cluster-magenta)",
  "var(--space-cluster-gold)",
  "var(--space-cluster-green)",
];

const HORIZONS: Array<{ value: SpaceHorizon; label: string }> = [
  { value: 1, label: "Today" },
  { value: 7, label: "7 days" },
  { value: 14, label: "14 days" },
];

function hashString(value: string) {
  return Array.from(value).reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    2166136261
  );
}

function getTaskStart(task: Task) {
  const value =
    task.scheduledStart ??
    task.scheduledBlocks?.[0]?.start ??
    task.startDate ??
    null;
  return value ? newDate(value) : null;
}

function getTaskDeadline(task: Task) {
  const value = task.deadline ?? task.dueDate ?? null;
  return value ? newDate(value) : null;
}

function taskDuration(task: Task) {
  return task.duration ?? task.estimatedMinutes ?? 30;
}

function isTaskOverdue(task: Task) {
  const deadline = getTaskDeadline(task);
  return Boolean(
    deadline &&
    task.status !== TaskStatus.COMPLETED &&
    deadline.getTime() < newDate().getTime()
  );
}

function formatTaskTime(task: Task) {
  const start = getTaskStart(task);
  if (!start) return "Unscheduled";
  if (isSameDay(start, newDate())) return format(start, "h:mm a");
  return format(start, "EEE h:mm a");
}

function formatTaskDate(task: Task) {
  const date = getTaskDeadline(task) ?? getTaskStart(task);
  if (!date) return "No deadline";
  return format(date, "EEE, MMM d");
}

function clusterPosition(count: number, index: number): SpacePoint {
  if (count === 1) return { x: 48, y: 51 };
  if (count === 2)
    return [
      { x: 30, y: 52 },
      { x: 70, y: 50 },
    ][index];
  if (count === 3) {
    return [
      { x: 22, y: 50 },
      { x: 50, y: 48 },
      { x: 78, y: 52 },
    ][index];
  }

  const columns = Math.min(3, Math.ceil(count / 2));
  const rows = Math.ceil(count / columns);
  const column = index % columns;
  const row = Math.floor(index / columns);
  return {
    x: 18 + (column * 64) / Math.max(1, columns - 1),
    y: rows === 1 ? 51 : 29 + (row * 43) / Math.max(1, rows - 1),
  };
}

function SpaceMetric({
  label,
  value,
  icon: Icon,
  danger = false,
}: {
  label: string;
  value: string | number;
  icon: typeof Clock3;
  danger?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 px-3">
      <Icon
        className={cn(
          "h-3.5 w-3.5 flex-none",
          danger ? "text-[var(--color-danger)]" : "text-[var(--text-muted)]"
        )}
      />
      <span
        className={cn(
          "text-[12px] font-medium tabular-nums",
          danger ? "text-[var(--color-danger)]" : "text-[var(--text-primary)]"
        )}
      >
        {value}
      </span>
      <span className="truncate text-[11px] text-[var(--text-muted)]">
        {label}
      </span>
    </div>
  );
}

export function SpaceView({
  projects,
  tasks,
  onOpenTask,
  onRescheduleTask,
  onStatusChange,
  onCreateTask,
}: SpaceViewProps) {
  const [showCompleted, setShowCompleted] = useState(false);
  const [horizon, setHorizon] = useState<SpaceHorizon>(7);
  const [query, setQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dropPreview, setDropPreview] = useState<DropPreview | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panStart = useRef<{
    pointerX: number;
    pointerY: number;
    panX: number;
    panY: number;
  } | null>(null);

  const today = startOfDay(newDate());
  const normalizedQuery = query.trim().toLowerCase();

  const visibleTasks = useMemo(() => {
    const horizonEnd = addDays(today, horizon);
    return tasks
      .filter((task) => showCompleted || task.status !== TaskStatus.COMPLETED)
      .filter(
        (task) =>
          !selectedProjectId || (task.projectId ?? "none") === selectedProjectId
      )
      .filter((task) => {
        if (!normalizedQuery) return true;
        return (
          task.title.toLowerCase().includes(normalizedQuery) ||
          task.project?.name.toLowerCase().includes(normalizedQuery) ||
          task.tags.some((tag) =>
            tag.name.toLowerCase().includes(normalizedQuery)
          )
        );
      })
      .filter((task) => {
        const start = getTaskStart(task);
        if (!start || isTaskOverdue(task)) return true;
        return start >= today && start < horizonEnd;
      })
      .slice(0, 120);
  }, [
    horizon,
    normalizedQuery,
    selectedProjectId,
    showCompleted,
    tasks,
    today,
  ]);

  const clusters = useMemo<SpaceCluster[]>(() => {
    const groupIds = Array.from(
      new Set(visibleTasks.map((task) => task.projectId ?? "none"))
    );
    const projectLookup = new Map(
      projects.map((project) => [project.id, project])
    );

    return groupIds.map((id, clusterIndex) => {
      const project = id === "none" ? undefined : projectLookup.get(id);
      const center = clusterPosition(groupIds.length, clusterIndex);
      const color =
        project?.color ?? PROJECT_COLORS[clusterIndex % PROJECT_COLORS.length];
      const clusterTasks = visibleTasks
        .filter((task) => (task.projectId ?? "none") === id)
        .sort((left, right) => {
          const leftDate =
            getTaskStart(left)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const rightDate =
            getTaskStart(right)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          return leftDate - rightDate;
        });
      const completedCount = clusterTasks.filter(
        (task) => task.status === TaskStatus.COMPLETED
      ).length;

      return {
        id,
        name: project?.name ?? "Inbox",
        color,
        completedCount,
        totalCount: clusterTasks.length,
        ...center,
        tasks: clusterTasks.map((task, taskIndex) => {
          const hash = hashString(task.id);
          const ring = Math.floor(taskIndex / 7);
          const itemsInRing = Math.min(7, clusterTasks.length - ring * 7);
          const indexInRing = taskIndex % 7;
          const angle =
            (indexInRing / Math.max(1, itemsInRing)) * Math.PI * 2 -
            Math.PI / 2 +
            (ring % 2) * 0.32 +
            (hash % 11) * 0.01;
          const radius = 10.5 + ring * 4.25;
          return {
            task,
            x: Math.min(
              92,
              Math.max(8, center.x + Math.cos(angle) * radius * 1.18)
            ),
            y: Math.min(
              88,
              Math.max(12, center.y + Math.sin(angle) * radius * 0.82)
            ),
          };
        }),
      };
    });
  }, [projects, visibleTasks]);

  const selectedTask = visibleTasks.find((task) => task.id === selectedTaskId);
  const openVisibleTasks = visibleTasks.filter(
    (task) => task.status !== TaskStatus.COMPLETED
  );
  const scheduledCount = openVisibleTasks.filter((task) =>
    getTaskStart(task)
  ).length;
  const overdueCount = openVisibleTasks.filter(isTaskOverdue).length;
  const unscheduledCount = openVisibleTasks.length - scheduledCount;
  const focusMinutes = openVisibleTasks.reduce(
    (total, task) => total + taskDuration(task),
    0
  );
  const selectedProjectName =
    selectedProjectId === "none"
      ? "Inbox"
      : projects.find((project) => project.id === selectedProjectId)?.name;
  const horizonDays = Array.from({ length: horizon }, (_, index) =>
    addDays(today, index)
  );

  const resetSpace = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
    setSelectedProjectId(null);
  };

  const handleCanvasPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (
      draggingTaskId ||
      (event.target as HTMLElement).closest("button, input, [role='menu']")
    ) {
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    panStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleCanvasPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return;
    setPan({
      x: panStart.current.panX + event.clientX - panStart.current.pointerX,
      y: panStart.current.panY + event.clientY - panStart.current.pointerY,
    });
  };

  const handleCanvasPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!panStart.current) return;
    panStart.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const calculateDropPreview = (
    event: DragEvent<HTMLDivElement>,
    task: Task
  ): DropPreview => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const localX = Math.max(
      0,
      Math.min(bounds.width, event.clientX - bounds.left)
    );
    const localY = Math.max(
      0,
      Math.min(bounds.height, event.clientY - bounds.top)
    );
    const normalizedX = localX / Math.max(1, bounds.width);
    const normalizedY = Math.max(
      0,
      Math.min(1, (localY / Math.max(1, bounds.height) - 0.08) / 0.82)
    );
    const dayOffset = Math.min(horizon - 1, Math.floor(normalizedX * horizon));
    const workdayStart = 8 * 60;
    const workdayMinutes = 12 * 60;
    const minutes =
      workdayStart + Math.round((normalizedY * workdayMinutes) / 15) * 15;
    const start = addDays(today, dayOffset);
    start.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    const end = addMinutes(start, taskDuration(task));
    return { x: localX, y: localY, start, end };
  };

  const handleCanvasDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!draggingTaskId) return;
    const task = tasks.find((item) => item.id === draggingTaskId);
    if (!task) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDropPreview(calculateDropPreview(event, task));
  };

  const handleCanvasDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!draggingTaskId) return;
    const task = tasks.find((item) => item.id === draggingTaskId);
    if (!task) return;
    const preview = dropPreview ?? calculateDropPreview(event, task);
    onRescheduleTask(task, preview.start, preview.end);
    setSelectedTaskId(task.id);
    setDraggingTaskId(null);
    setDropPreview(null);
  };

  return (
    <section className="flex h-full min-h-[540px] flex-col overflow-hidden bg-[var(--surface-canvas)]">
      <div className="flex flex-none flex-wrap items-center gap-2 border-b border-[var(--border-subtle)] px-3 py-2">
        <div className="mr-1 flex min-w-0 items-center gap-2">
          <Orbit className="h-4 w-4 text-[var(--text-primary)]" />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
                Task Space
              </h2>
              <span className="rounded bg-[var(--surface-raised)] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Live
              </span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)]">
              Your schedule, projects, and focus in one map
            </p>
          </div>
        </div>

        <div className="flex h-8 items-center rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] p-0.5">
          {HORIZONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setHorizon(item.value)}
              className={cn(
                "h-7 rounded px-2.5 text-[11px] font-medium transition-colors duration-150",
                horizon === item.value
                  ? "bg-[var(--surface-panel)] text-[var(--text-primary)]"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 min-w-32 items-center gap-1.5 rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] px-2.5 text-[11px] font-medium text-[var(--control-fg-muted)] hover:bg-[var(--control-bg-hover)] hover:text-[var(--control-fg)]">
            <Box className="h-3.5 w-3.5" />
            <span className="max-w-28 truncate">
              {selectedProjectId
                ? (selectedProjectName ?? "Project")
                : "All projects"}
            </span>
            <ChevronDown className="ml-auto h-3 w-3" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
              Project constellations
            </DropdownMenuLabel>
            <DropdownMenuItem
              className="h-8 text-[12px]"
              onSelect={() => setSelectedProjectId(null)}
            >
              <Orbit />
              All projects
              {!selectedProjectId && <Check className="ml-auto" />}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {projects.map((project) => (
              <DropdownMenuItem
                key={project.id}
                className="h-8 text-[12px]"
                onSelect={() => setSelectedProjectId(project.id)}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    background: project.color ?? "var(--space-cluster-blue)",
                  }}
                />
                <span className="min-w-0 flex-1 truncate">{project.name}</span>
                {selectedProjectId === project.id && <Check />}
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem
              className="h-8 text-[12px]"
              onSelect={() => setSelectedProjectId("none")}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-[var(--text-muted)]" />
              Inbox
              {selectedProjectId === "none" && <Check className="ml-auto" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative min-w-[180px] max-w-[300px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a task or project"
            aria-label="Search Task Space"
            className="h-8 border-[var(--input-border)] bg-[var(--input-bg)] pl-8 text-[11px]"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQuery("")}
              className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-[var(--text-muted)] hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <label className="flex h-8 items-center gap-1.5 rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] px-2 text-[11px] text-[var(--control-fg-muted)]">
          Completed
          <Switch
            checked={showCompleted}
            onCheckedChange={setShowCompleted}
            className="scale-75"
          />
        </label>

        <div className="flex h-8 items-center rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] p-0.5">
          <button
            type="button"
            aria-label="Zoom out"
            onClick={() => setScale((value) => Math.max(0.75, value - 0.1))}
            className="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Reset zoom"
            onClick={resetSpace}
            className="grid h-7 min-w-10 place-items-center rounded px-1 text-[10px] tabular-nums text-[var(--text-secondary)] hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            aria-label="Zoom in"
            onClick={() => setScale((value) => Math.min(1.4, value + 0.1))}
            className="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Reset Task Space"
            onClick={resetSpace}
            className="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex h-10 flex-none items-center divide-x divide-[var(--border-subtle)] border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <SpaceMetric
          icon={CircleDot}
          value={openVisibleTasks.length}
          label="open tasks"
        />
        <SpaceMetric
          icon={CalendarClock}
          value={scheduledCount}
          label="scheduled"
        />
        <SpaceMetric
          icon={TimerReset}
          value={unscheduledCount}
          label="unscheduled"
        />
        <SpaceMetric
          icon={Focus}
          value={`${Math.floor(focusMinutes / 60)}h ${focusMinutes % 60}m`}
          label="focus load"
        />
        <SpaceMetric
          icon={Flag}
          value={overdueCount}
          label="overdue"
          danger={overdueCount > 0}
        />
        <div className="ml-auto hidden items-center gap-2 px-3 text-[10px] text-[var(--text-muted)] xl:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-danger)]" />
          overdue
          <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[var(--space-cluster-gold)]" />
          high priority
          <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[var(--space-text-secondary)]" />
          scheduled
        </div>
      </div>

      <div
        data-space-canvas
        className="workspace-space-canvas relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onDragOver={handleCanvasDragOver}
        onDrop={handleCanvasDrop}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) {
            setDropPreview(null);
          }
        }}
        onDoubleClick={(event) => {
          if (!(event.target as HTMLElement).closest("button")) onCreateTask();
        }}
      >
        {draggingTaskId && (
          <div className="pointer-events-none absolute inset-0 z-20">
            <div className="absolute inset-0 bg-[var(--space-drag-overlay)]" />
            <div className="absolute inset-0 flex">
              {horizonDays.map((day) => (
                <div
                  key={day.toISOString()}
                  className="relative flex-1 border-r border-[var(--space-grid-strong)] last:border-r-0"
                >
                  <span className="absolute left-1/2 top-3 -translate-x-1/2 rounded bg-[var(--space-panel)] px-2 py-1 text-[10px] font-medium text-[var(--space-text-secondary)]">
                    {format(day, horizon === 14 ? "EEE d" : "EEE, MMM d")}
                  </span>
                </div>
              ))}
            </div>
            {[8, 12, 16, 20].map((hour, index) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-[var(--space-grid-strong)]"
                style={{ top: `${8 + index * 27.33}%` }}
              >
                <span className="absolute left-2 top-1 text-[9px] text-[var(--space-text-muted)]">
                  {format(newDate().setHours(hour, 0, 0, 0), "h a")}
                </span>
              </div>
            ))}
            {dropPreview && (
              <div
                className="absolute z-30 -translate-x-1/2 -translate-y-full rounded-[var(--control-radius)] border border-[var(--space-border)] bg-[var(--space-panel)] px-2.5 py-1.5 text-[11px] text-[var(--space-text-primary)]"
                style={{ left: dropPreview.x, top: dropPreview.y - 8 }}
              >
                <span className="font-medium">
                  {format(dropPreview.start, "EEE, MMM d")}
                </span>
                <span className="ml-1 text-[var(--space-text-secondary)]">
                  {format(dropPreview.start, "h:mm a")} –{" "}
                  {format(dropPreview.end, "h:mm a")}
                </span>
              </div>
            )}
          </div>
        )}

        {clusters.length === 0 ? (
          <div className="absolute inset-0 z-10 grid place-items-center">
            <div className="max-w-sm text-center">
              <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full border border-[var(--space-border)] bg-[var(--space-panel)]">
                <Sparkles className="h-5 w-5 text-[var(--space-text-secondary)]" />
              </div>
              <p className="text-[14px] font-medium text-[var(--space-text-primary)]">
                Nothing in this orbit yet
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[var(--space-text-muted)]">
                Adjust the horizon or create a task. It will appear here and in
                Calendar automatically.
              </p>
              <button
                type="button"
                onClick={onCreateTask}
                className="mt-4 h-8 rounded-[var(--control-radius)] border border-[var(--space-border)] bg-[var(--space-panel-raised)] px-3 text-[11px] font-medium text-[var(--space-text-primary)] hover:bg-[var(--space-panel-hover)]"
              >
                Create task
              </button>
            </div>
          </div>
        ) : (
          <div
            className="absolute inset-0 origin-center transition-transform duration-200 motion-reduce:transition-none"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            }}
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              {clusters.map((cluster) => (
                <g key={`orbit-${cluster.id}`}>
                  <ellipse
                    cx={`${cluster.x}%`}
                    cy={`${cluster.y}%`}
                    rx="11.5%"
                    ry="9%"
                    fill="none"
                    stroke={cluster.color}
                    strokeOpacity="0.13"
                    strokeWidth="1"
                    strokeDasharray="3 7"
                  />
                  <ellipse
                    cx={`${cluster.x}%`}
                    cy={`${cluster.y}%`}
                    rx="16%"
                    ry="13%"
                    fill="none"
                    stroke={cluster.color}
                    strokeOpacity="0.07"
                    strokeWidth="1"
                  />
                </g>
              ))}
              {clusters.flatMap((cluster) =>
                cluster.tasks.map(({ task, x, y }) => (
                  <line
                    key={`${cluster.id}-${task.id}`}
                    x1={`${cluster.x}%`}
                    y1={`${cluster.y}%`}
                    x2={`${x}%`}
                    y2={`${y}%`}
                    stroke={cluster.color}
                    strokeOpacity={selectedTaskId === task.id ? "0.45" : "0.13"}
                    strokeWidth={selectedTaskId === task.id ? "1.5" : "1"}
                  />
                ))
              )}
            </svg>

            {clusters.map((cluster) => {
              const progress = cluster.totalCount
                ? Math.round(
                    (cluster.completedCount / cluster.totalCount) * 100
                  )
                : 0;
              return (
                <div key={cluster.id} className="contents">
                  <Tooltip delayDuration={250}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedProjectId((current) =>
                            current === cluster.id ? null : cluster.id
                          )
                        }
                        aria-label={`Focus ${cluster.name} project`}
                        className="workspace-space-project absolute z-10 grid h-[68px] w-[68px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--space-text-primary)]"
                        style={
                          {
                            left: `${cluster.x}%`,
                            top: `${cluster.y}%`,
                            "--cluster-color": cluster.color,
                            "--cluster-progress": `${progress * 3.6}deg`,
                          } as CSSProperties
                        }
                      >
                        <span className="grid h-[54px] w-[54px] place-items-center rounded-full border border-[var(--space-project-border)] bg-[var(--space-panel)]">
                          <Box
                            className="h-4 w-4"
                            style={{ color: cluster.color }}
                          />
                        </span>
                        <span className="pointer-events-none absolute left-1/2 top-[76px] flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded bg-[var(--space-label-bg)] px-2 py-1 text-[11px] font-medium text-[var(--space-text-primary)]">
                          {cluster.name}
                          <span className="text-[9px] font-normal text-[var(--space-text-muted)]">
                            {cluster.totalCount}
                          </span>
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent className="border-[var(--menu-border)] bg-[var(--menu-bg)] text-[var(--text-primary)]">
                      Click to focus this project
                    </TooltipContent>
                  </Tooltip>

                  {cluster.tasks.map(({ task, x, y }, taskIndex) => {
                    const selected = selectedTaskId === task.id;
                    const overdue = isTaskOverdue(task);
                    const color = overdue
                      ? "var(--color-danger)"
                      : task.priority === Priority.HIGH
                        ? "var(--space-cluster-gold)"
                        : cluster.color;
                    const style = {
                      left: `${x}%`,
                      top: `${y}%`,
                      borderColor: `color-mix(in srgb, ${color} ${selected ? "72%" : "38%"}, var(--space-border))`,
                      boxShadow: selected
                        ? `0 10px 32px color-mix(in srgb, ${color} 26%, transparent)`
                        : `0 8px 20px color-mix(in srgb, ${color} 10%, transparent)`,
                      "--space-delay": `${-(hashString(task.id) % 5000)}ms`,
                      "--space-distance": `${1 + (hashString(task.id) % 3)}px`,
                    } as CSSProperties;

                    return (
                      <Tooltip key={task.id} delayDuration={300}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            draggable={task.status !== TaskStatus.COMPLETED}
                            onDragStart={(event) => {
                              event.stopPropagation();
                              event.dataTransfer.effectAllowed = "move";
                              event.dataTransfer.setData("text/plain", task.id);
                              setDraggingTaskId(task.id);
                              setSelectedTaskId(task.id);
                            }}
                            onDragEnd={() => {
                              setDraggingTaskId(null);
                              setDropPreview(null);
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedTaskId(task.id);
                            }}
                            onDoubleClick={(event) => {
                              event.stopPropagation();
                              onOpenTask(task);
                            }}
                            aria-label={`Select task ${task.title}`}
                            className={cn(
                              "workspace-space-task group absolute z-10 flex h-9 w-[146px] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-md border bg-[var(--space-task-bg)] px-2 text-left transition-[border-color,background-color,scale,opacity] duration-150 hover:z-20 hover:bg-[var(--space-task-bg-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--space-text-primary)]",
                              selected &&
                                "z-20 scale-[1.04] bg-[var(--space-task-bg-hover)]",
                              task.status === TaskStatus.COMPLETED &&
                                "opacity-55",
                              draggingTaskId === task.id && "opacity-30"
                            )}
                            style={{
                              ...style,
                              animationDelay: `calc(var(--space-delay) + ${taskIndex * 35}ms)`,
                            }}
                          >
                            <span
                              className="grid h-5 w-5 flex-none place-items-center rounded-full border"
                              style={{
                                color,
                                borderColor: `color-mix(in srgb, ${color} 48%, transparent)`,
                                background: `color-mix(in srgb, ${color} 12%, var(--space-task-bg))`,
                              }}
                            >
                              {task.status === TaskStatus.COMPLETED ? (
                                <Check className="h-3 w-3" />
                              ) : getTaskStart(task) ? (
                                <Clock3 className="h-3 w-3" />
                              ) : (
                                <CircleDot className="h-3 w-3" />
                              )}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-[11px] font-medium text-[var(--space-text-primary)]">
                                {task.title}
                              </span>
                              <span className="block truncate text-[9px] text-[var(--space-text-muted)]">
                                {formatTaskTime(task)} · {taskDuration(task)}m
                              </span>
                            </span>
                          </button>
                        </TooltipTrigger>
                        <TooltipContent
                          side="top"
                          className="max-w-72 border-[var(--menu-border)] bg-[var(--menu-bg)] p-2 text-[var(--text-primary)]"
                        >
                          <p className="truncate text-[12px] font-medium">
                            {task.title}
                          </p>
                          <p className="mt-0.5 text-[10px] text-[var(--text-secondary)]">
                            {cluster.name} · {formatTaskDate(task)} · Drag to
                            reschedule
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {selectedTask && !draggingTaskId && (
          <aside className="absolute right-3 top-3 z-30 w-[292px] overflow-hidden rounded-[var(--popover-radius)] border border-[var(--space-border)] bg-[var(--space-panel)] text-[var(--space-text-primary)]">
            <div className="border-b border-[var(--space-border)] p-3">
              <div className="flex items-start gap-2">
                <span
                  className="mt-1 h-2.5 w-2.5 flex-none rounded-full"
                  style={{
                    background:
                      selectedTask.project?.color ??
                      "var(--space-cluster-blue)",
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.08em] text-[var(--space-text-muted)]">
                    {selectedTask.project?.name ?? "Inbox"}
                  </p>
                  <h3 className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-5">
                    {selectedTask.title}
                  </h3>
                </div>
                <button
                  type="button"
                  aria-label="Close task preview"
                  onClick={() => setSelectedTaskId(null)}
                  className="grid h-6 w-6 flex-none place-items-center rounded text-[var(--space-text-muted)] hover:bg-[var(--space-panel-hover)] hover:text-[var(--space-text-primary)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="space-y-2.5 p-3 text-[11px]">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[var(--space-text-muted)]">
                  <CalendarClock className="h-3.5 w-3.5" /> Schedule
                </span>
                <span className="text-right text-[var(--space-text-secondary)]">
                  {getTaskStart(selectedTask)
                    ? format(
                        getTaskStart(selectedTask) as Date,
                        "EEE, MMM d · h:mm a"
                      )
                    : "Unscheduled"}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[var(--space-text-muted)]">
                  <Clock3 className="h-3.5 w-3.5" /> Duration
                </span>
                <span className="text-[var(--space-text-secondary)]">
                  {taskDuration(selectedTask)} minutes
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-1.5 text-[var(--space-text-muted)]">
                  <Flag className="h-3.5 w-3.5" /> Deadline
                </span>
                <span
                  className={cn(
                    "text-[var(--space-text-secondary)]",
                    isTaskOverdue(selectedTask) && "text-[var(--color-danger)]"
                  )}
                >
                  {getTaskDeadline(selectedTask)
                    ? format(
                        getTaskDeadline(selectedTask) as Date,
                        "EEE, MMM d"
                      )
                    : "No deadline"}
                </span>
              </div>
            </div>

            <div className="flex gap-1.5 border-t border-[var(--space-border)] p-2">
              <button
                type="button"
                onClick={() =>
                  onStatusChange(
                    selectedTask.id,
                    selectedTask.status === TaskStatus.COMPLETED
                      ? TaskStatus.TODO
                      : TaskStatus.COMPLETED
                  )
                }
                className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[var(--control-radius)] border border-[var(--space-border)] bg-[var(--space-panel-raised)] text-[11px] font-medium hover:bg-[var(--space-panel-hover)]"
              >
                <Check className="h-3.5 w-3.5" />
                {selectedTask.status === TaskStatus.COMPLETED
                  ? "Reopen"
                  : "Complete"}
              </button>
              <button
                type="button"
                onClick={() => onOpenTask(selectedTask)}
                className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[var(--control-radius)] border border-[var(--space-border)] bg-[var(--space-panel-raised)] text-[11px] font-medium hover:bg-[var(--space-panel-hover)]"
              >
                Open details
              </button>
            </div>
          </aside>
        )}

        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-[var(--control-radius)] border border-[var(--space-border)] bg-[var(--space-label-bg)] px-3 py-1.5 text-[9px] text-[var(--space-text-muted)]">
          <Crosshair className="h-3 w-3" />
          Click to inspect · Double-click a task to edit · Drag to reschedule ·
          Double-click empty space to create
        </div>
      </div>
    </section>
  );
}
