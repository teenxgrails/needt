"use client";

import {
  CSSProperties,
  PointerEvent,
  WheelEvent,
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
  format,
  isSameDay,
  newDate,
  startOfDay,
} from "@/lib/date-utils";
import { cn } from "@/lib/utils";

import { useIsMobile } from "@/hooks/use-is-mobile";

import { Project } from "@/types/project";
import { Priority, Task, TaskStatus } from "@/types/task";

type SpaceHorizon = 1 | 7 | 14;

interface SpaceViewProps {
  projects: Project[];
  tasks: Task[];
  onOpenTask: (task: Task) => void;
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
  unattached: boolean;
  totalCount: number;
  tasks: SpaceTaskNode[];
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

const MIN_SCALE = 0.7;
const MAX_SCALE = 1.5;
const SCALE_STEP = 0.1;
const SPACE_CONTROL_CLASS =
  "flex h-7 items-center gap-1.5 rounded-[var(--control-radius)] border border-[var(--space-border)] bg-[var(--space-panel-raised)] px-2 text-[11px] font-medium text-[var(--space-text-secondary)] transition-colors hover:bg-[var(--space-panel-hover)] hover:text-[var(--space-text-primary)]";

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

function looseTaskPosition(count: number, index: number, seed: number) {
  const columns = Math.max(2, Math.ceil(Math.sqrt(count * 1.5)));
  const rows = Math.max(1, Math.ceil(count / columns));
  const column = index % columns;
  const row = Math.floor(index / columns);
  const jitterX = (seed % 9) - 4;
  const jitterY = (Math.floor(seed / 9) % 9) - 4;

  return {
    x: Math.min(
      91,
      Math.max(9, 13 + (column * 74) / Math.max(1, columns - 1) + jitterX)
    ),
    y: Math.min(
      87,
      Math.max(13, 18 + (row * 64) / Math.max(1, rows - 1) + jitterY)
    ),
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
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLDivElement>(null);
  const panStart = useRef<{
    pointerX: number;
    pointerY: number;
    panX: number;
    panY: number;
  } | null>(null);
  const isMobile = useIsMobile();

  const today = startOfDay(newDate());
  const normalizedQuery = query.trim().toLowerCase();

  const visibleTasks = useMemo(() => {
    const horizonEnd = addDays(today, horizon);
    return tasks
      .filter((task) => showCompleted || task.status !== TaskStatus.COMPLETED)
      .filter(
        (task) => !selectedProjectId || task.projectId === selectedProjectId
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
      new Set(
        visibleTasks
          .map((task) => task.projectId)
          .filter((id): id is string => Boolean(id))
      )
    );
    const projectLookup = new Map(
      projects.map((project) => [project.id, project])
    );

    const projectClusters = groupIds.map((id, clusterIndex) => {
      const project = projectLookup.get(id);
      const center = clusterPosition(groupIds.length, clusterIndex);
      const color =
        project?.color ?? PROJECT_COLORS[clusterIndex % PROJECT_COLORS.length];
      const clusterTasks = visibleTasks
        .filter((task) => task.projectId === id)
        .sort((left, right) => {
          const leftDate =
            getTaskStart(left)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          const rightDate =
            getTaskStart(right)?.getTime() ?? Number.MAX_SAFE_INTEGER;
          return leftDate - rightDate;
        });
      return {
        id,
        name: project?.name ?? clusterTasks[0]?.project?.name ?? "Project",
        color,
        unattached: false,
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

    const looseTasks = visibleTasks.filter((task) => !task.projectId);
    const looseClusters = looseTasks.map((task, index) => {
      const seed = hashString(task.id);
      const center = looseTaskPosition(looseTasks.length, index, seed);
      return {
        id: `loose-${task.id}`,
        name: "No project",
        color: PROJECT_COLORS[seed % PROJECT_COLORS.length],
        unattached: true,
        totalCount: 1,
        ...center,
        tasks: [{ task, ...center }],
      };
    });

    return [...projectClusters, ...looseClusters];
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
  const selectedProjectName = projects.find(
    (project) => project.id === selectedProjectId
  )?.name;
  const resetView = () => {
    setScale(1);
    setPan({ x: 0, y: 0 });
  };

  const zoomTo = (nextScale: number, anchor?: SpacePoint) => {
    const clampedScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, nextScale));
    if (clampedScale === scale) return;

    if (anchor) {
      const worldX = (anchor.x - pan.x) / scale;
      const worldY = (anchor.y - pan.y) / scale;
      setPan({
        x: anchor.x - worldX * clampedScale,
        y: anchor.y - worldY * clampedScale,
      });
    }
    setScale(clampedScale);
  };

  const handleCanvasWheel = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const direction = event.deltaY < 0 ? 1 : -1;
    zoomTo(scale + direction * SCALE_STEP, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };

  const zoomFromCenter = (nextScale: number) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    zoomTo(
      nextScale,
      bounds ? { x: bounds.width / 2, y: bounds.height / 2 } : undefined
    );
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

  const finishDecorativeDrag = () => {
    if (draggingTaskId) setSelectedTaskId(draggingTaskId);
    setDraggingTaskId(null);
  };

  // The Space canvas relies on pan/zoom and drag interactions that don't work
  // well on a small touch screen; show a placeholder and point to desktop.
  if (isMobile) {
    return (
      <section className="flex h-full min-h-[540px] flex-col items-center justify-center gap-3 bg-[var(--surface-canvas)] px-6 text-center">
        <Orbit className="h-10 w-10 text-[var(--text-muted)]" />
        <h2 className="text-base font-semibold text-[var(--text-primary)]">
          Space is best on desktop
        </h2>
        <p className="max-w-xs text-sm text-[var(--text-secondary)]">
          The constellation view uses pan, zoom, and drag that need a larger
          screen. Open Needt on desktop to explore Space, or use the Task List
          and Board views here.
        </p>
      </section>
    );
  }

  return (
    <section className="flex h-full min-h-[540px] flex-col overflow-hidden bg-[var(--space-canvas)]">
      <div className="flex h-11 flex-none items-center gap-1.5 border-b border-[var(--space-border)] bg-[var(--space-panel)] px-2.5">
        <div className="mr-1 flex min-w-0 items-center gap-2">
          <Orbit className="h-4 w-4 text-[var(--text-primary)]" />
          <h2 className="text-[13px] font-semibold text-[var(--text-primary)]">
            Task Space
          </h2>
        </div>

        <div className="flex items-center gap-0.5 rounded-[var(--control-radius)] border border-[var(--space-border)] bg-[var(--space-panel-raised)] p-0.5">
          {HORIZONS.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setHorizon(item.value)}
              className={cn(
                "h-6 rounded px-2 text-[10px] font-medium transition-colors",
                horizon === item.value
                  ? "bg-[var(--space-panel-hover)] text-[var(--space-text-primary)]"
                  : "text-[var(--space-text-muted)] hover:text-[var(--space-text-primary)]"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger className={cn(SPACE_CONTROL_CLASS, "min-w-28")}>
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
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative min-w-[180px] max-w-[300px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a task or project"
            aria-label="Search Task Space"
            className="h-7 border-[var(--space-border)] bg-[var(--space-panel-raised)] pl-8 text-[11px] text-[var(--space-text-primary)] placeholder:text-[var(--space-text-muted)]"
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

        <label className={cn(SPACE_CONTROL_CLASS, "ml-auto cursor-pointer")}>
          Completed
          <Switch
            checked={showCompleted}
            onCheckedChange={setShowCompleted}
            className="h-4 w-[26px] [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-[12px]"
          />
        </label>
      </div>

      <div className="flex h-10 flex-none items-center divide-x divide-[var(--space-border)] border-b border-[var(--space-border)] bg-[var(--space-panel)]">
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
        ref={canvasRef}
        data-space-canvas
        className="workspace-space-canvas relative min-h-0 flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
        onWheel={handleCanvasWheel}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerCancel={handleCanvasPointerUp}
        onDragOver={(event) => {
          if (!draggingTaskId) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
        }}
        onDrop={(event) => {
          event.preventDefault();
          finishDecorativeDrag();
        }}
        onDoubleClick={(event) => {
          if (!(event.target as HTMLElement).closest("button")) onCreateTask();
        }}
      >
        {draggingTaskId && (
          <div className="pointer-events-none absolute inset-0 z-20 border border-dashed border-[var(--space-border)] bg-[color-mix(in_srgb,var(--space-canvas)_82%,transparent)]">
            <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-[var(--space-border)] bg-[var(--space-label-bg)] px-3 py-1.5 text-[10px] text-[var(--space-text-secondary)]">
              Explore freely — dropping here never changes the schedule
            </span>
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
            className="absolute inset-0 origin-top-left transition-transform duration-200 motion-reduce:transition-none"
            style={{
              transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${scale})`,
            }}
          >
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 h-full w-full"
            >
              {clusters
                .filter((cluster) => !cluster.unattached)
                .flatMap((cluster) =>
                  cluster.tasks.map(({ task, x, y }) => (
                    <line
                      key={`${cluster.id}-${task.id}`}
                      x1={`${cluster.x}%`}
                      y1={`${cluster.y}%`}
                      x2={`${x}%`}
                      y2={`${y}%`}
                      stroke={cluster.color}
                      strokeOpacity={
                        selectedTaskId === task.id ? "0.45" : "0.13"
                      }
                      strokeWidth={selectedTaskId === task.id ? "1.5" : "1"}
                    />
                  ))
                )}
            </svg>

            {clusters.map((cluster) => {
              return (
                <div key={cluster.id} className="contents">
                  {!cluster.unattached && (
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
                          className="absolute z-10 flex h-7 -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-md border border-[var(--space-project-border)] bg-[var(--space-panel)] px-2 text-[11px] font-medium text-[var(--space-text-primary)] transition-colors duration-150 hover:bg-[var(--space-panel-hover)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--border-control)]"
                          style={{
                            left: `${cluster.x}%`,
                            top: `${cluster.y}%`,
                          }}
                        >
                          <Box
                            className="h-3.5 w-3.5"
                            style={{ color: cluster.color }}
                          />
                          {cluster.name}
                          <span className="text-[9px] font-normal text-[var(--space-text-muted)]">
                            {cluster.totalCount}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="border-[var(--menu-border)] bg-[var(--menu-bg)] text-[var(--text-primary)]">
                        Click to focus this project
                      </TooltipContent>
                    </Tooltip>
                  )}

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
                            {cluster.name} · {formatTaskDate(task)} · Dragging
                            in Space does not change the schedule
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
                    {selectedTask.project?.name ?? "No project"}
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

        <div
          className="absolute bottom-3 right-3 z-30 flex w-10 flex-col items-center overflow-hidden rounded-md border border-[var(--calendar-toolbar-border)] bg-[var(--calendar-toolbar-bg)] text-[var(--text-secondary)]"
          aria-label="Space zoom controls"
        >
          <button
            type="button"
            aria-label="Zoom in"
            title="Zoom in"
            onClick={() => zoomFromCenter(scale + SCALE_STEP)}
            disabled={scale >= MAX_SCALE}
            className="grid h-8 w-full place-items-center transition-colors duration-150 hover:bg-[var(--calendar-toolbar-bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-35"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label="Reset zoom to 100 percent"
            title="Reset zoom"
            onClick={resetView}
            className="grid h-7 w-full place-items-center border-y border-[var(--border-subtle)] text-[9px] tabular-nums transition-colors duration-150 hover:bg-[var(--calendar-toolbar-bg-hover)] hover:text-[var(--text-primary)]"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            title="Zoom out"
            onClick={() => zoomFromCenter(scale - SCALE_STEP)}
            disabled={scale <= MIN_SCALE}
            className="grid h-8 w-full place-items-center transition-colors duration-150 hover:bg-[var(--calendar-toolbar-bg-hover)] hover:text-[var(--text-primary)] disabled:opacity-35"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-2 rounded-[var(--control-radius)] border border-[var(--space-border)] bg-[var(--space-label-bg)] px-3 py-1.5 text-[9px] text-[var(--space-text-muted)]">
          <Crosshair className="h-3 w-3" />
          Click to inspect · Scroll to zoom · Drag to explore · Schedule stays
          unchanged
        </div>
      </div>
    </section>
  );
}
