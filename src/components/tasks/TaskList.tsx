"use client";

import { useMemo, useState } from "react";

import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  CalendarClock,
  Check,
  ChevronDown,
  ChevronRight,
  Columns3,
  Filter,
  Flag,
  Folder,
  Group,
  Kanban,
  List,
  Search,
  SortAsc,
  TimerReset,
} from "lucide-react";

import { CalendarTaskActionsMenu } from "@/components/calendar/CalendarTaskActionsMenu";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

import { isToday, newDate } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

import { useProjectStore } from "@/store/project";
import {
  TaskListColumn,
  useTaskListViewSettings,
} from "@/store/taskListViewSettings";
import { useTaskPageSettings } from "@/store/taskPageSettings";

import { Project, ProjectStatus } from "@/types/project";
import { Priority, Task, TaskStatus } from "@/types/task";

interface TaskListProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onCreateTask?: () => void;
  compact?: boolean;
}

const CONTROL_CLASS =
  "flex h-8 items-center gap-1.5 rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] px-2.5 text-[12px] font-medium text-[var(--control-fg-muted)] transition-colors duration-150 hover:bg-[var(--control-bg-hover)] hover:text-[var(--control-fg)] data-[state=open]:bg-[var(--control-bg-hover)] data-[state=open]:text-[var(--control-fg)]";

const MENU_ITEM_CLASS =
  "h-8 rounded px-2 text-[12px] text-[var(--text-primary)] focus:bg-[var(--menu-item-hover)]";

const COLUMN_LABELS: Record<TaskListColumn, string> = {
  project: "Project",
  deadline: "Deadline",
  duration: "Duration",
  priority: "Priority",
  status: "Status",
  energy: "Energy",
};

const PRIORITY_ORDER: Record<Priority, number> = {
  [Priority.HIGH]: 3,
  [Priority.MEDIUM]: 2,
  [Priority.LOW]: 1,
  [Priority.NONE]: 0,
};

const NO_PROJECT: Project = {
  id: "no-project",
  name: "No project",
  status: ProjectStatus.ACTIVE,
  createdAt: newDate(0),
  updatedAt: newDate(0),
};

function titleCase(value: string) {
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function taskDeadline(task: Task) {
  return task.deadline ?? task.dueDate ?? null;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(newDate(value));
}

function isOverdue(task: Task) {
  const deadline = taskDeadline(task);
  return Boolean(
    deadline &&
    task.status !== TaskStatus.COMPLETED &&
    newDate(deadline).getTime() < newDate().getTime()
  );
}

function priorityColor(priority?: Priority | null) {
  if (priority === Priority.HIGH) return "text-[var(--primitive-red-500)]";
  if (priority === Priority.MEDIUM) return "text-[var(--primitive-gold-400)]";
  if (priority === Priority.LOW) return "text-[var(--primitive-teal-400)]";
  return "text-[var(--text-muted)]";
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export function TaskList({
  tasks,
  onEdit,
  onStatusChange,
  onCreateTask,
  compact = false,
}: TaskListProps) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set()
  );
  const [listRef] = useAutoAnimate<HTMLTableSectionElement>({ duration: 160 });
  const { projects, activeProject, setActiveProject } = useProjectStore();
  const setViewMode = useTaskPageSettings((state) => state.setViewMode);
  const {
    sortBy,
    sortDirection,
    status,
    priority,
    energyLevel,
    search,
    groupBy,
    visibleColumns,
    setSortBy,
    setSortDirection,
    setGroupBy,
    setVisibleColumns,
    setFilters,
    resetFilters,
  } = useTaskListViewSettings();

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search?.trim().toLowerCase();
    return tasks.filter((task) => {
      if (activeProject) {
        if (activeProject.id === "no-project" && task.projectId) return false;
        if (
          activeProject.id !== "no-project" &&
          task.projectId !== activeProject.id
        ) {
          return false;
        }
      }
      if (status?.length && !status.includes(task.status)) return false;
      if (
        priority?.length &&
        !priority.includes(task.priority ?? Priority.NONE)
      ) {
        return false;
      }
      if (
        energyLevel?.length &&
        (!task.energyLevel || !energyLevel.includes(task.energyLevel))
      ) {
        return false;
      }
      if (
        normalizedSearch &&
        !task.title.toLowerCase().includes(normalizedSearch) &&
        !task.project?.name.toLowerCase().includes(normalizedSearch) &&
        !task.tags.some((tag) =>
          tag.name.toLowerCase().includes(normalizedSearch)
        )
      ) {
        return false;
      }
      return true;
    });
  }, [activeProject, energyLevel, priority, search, status, tasks]);

  const sortedTasks = useMemo(() => {
    const direction = sortDirection === "asc" ? 1 : -1;
    return [...filteredTasks].sort((left, right) => {
      if (sortBy === "title") {
        return direction * left.title.localeCompare(right.title);
      }
      if (sortBy === "priority") {
        return (
          direction *
          (PRIORITY_ORDER[left.priority ?? Priority.NONE] -
            PRIORITY_ORDER[right.priority ?? Priority.NONE])
        );
      }
      if (sortBy === "duration") {
        return direction * ((left.duration ?? 0) - (right.duration ?? 0));
      }
      if (sortBy === "status") {
        return direction * left.status.localeCompare(right.status);
      }
      if (sortBy === "project") {
        return (
          direction *
          (left.project?.name ?? "").localeCompare(right.project?.name ?? "")
        );
      }
      if (sortBy === "dueDate" || sortBy === "startDate") {
        const leftDate =
          sortBy === "dueDate" ? taskDeadline(left) : left.startDate;
        const rightDate =
          sortBy === "dueDate" ? taskDeadline(right) : right.startDate;
        if (!leftDate) return 1;
        if (!rightDate) return -1;
        return (
          direction *
          (newDate(leftDate).getTime() - newDate(rightDate).getTime())
        );
      }
      return (
        direction *
        (newDate(left.createdAt).getTime() - newDate(right.createdAt).getTime())
      );
    });
  }, [filteredTasks, sortBy, sortDirection]);

  const groups = useMemo(() => {
    const result = new Map<string, { label: string; tasks: Task[] }>();
    sortedTasks.forEach((task) => {
      const key =
        groupBy === "project"
          ? (task.projectId ?? "no-project")
          : groupBy === "status"
            ? task.status
            : "all";
      const label =
        groupBy === "project"
          ? (task.project?.name ?? "No project")
          : groupBy === "status"
            ? titleCase(task.status)
            : "All tasks";
      if (!result.has(key)) result.set(key, { label, tasks: [] });
      result.get(key)?.tasks.push(task);
    });
    return Array.from(result.entries());
  }, [groupBy, sortedTasks]);

  const activeFilterCount =
    (activeProject ? 1 : 0) +
    (priority?.length ?? 0) +
    (energyLevel?.length ?? 0) +
    (search ? 1 : 0) +
    (status?.length === 2 && !status.includes(TaskStatus.COMPLETED)
      ? 0
      : (status?.length ?? 0));

  const dueTodayCount = filteredTasks.filter((task) => {
    const date = taskDeadline(task) ?? task.scheduledStart;
    return Boolean(date && isToday(newDate(date)));
  }).length;
  const overdueCount = filteredTasks.filter(isOverdue).length;
  const openMinutes = filteredTasks.reduce(
    (total, task) => total + (task.duration ?? task.estimatedMinutes ?? 30),
    0
  );

  const toggleColumn = (column: TaskListColumn, checked: boolean) => {
    setVisibleColumns(
      checked
        ? Array.from(new Set([...visibleColumns, column]))
        : visibleColumns.filter((item) => item !== column)
    );
  };

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const setStatusFilter = (taskStatus: TaskStatus, checked: boolean) => {
    const current = status ?? [];
    setFilters({
      status: checked
        ? Array.from(new Set([...current, taskStatus]))
        : current.filter((item) => item !== taskStatus),
    });
  };

  const setPriorityFilter = (taskPriority: Priority, checked: boolean) => {
    const current = priority ?? [];
    setFilters({
      priority: checked
        ? Array.from(new Set([...current, taskPriority]))
        : current.filter((item) => item !== taskPriority),
    });
  };

  const clearFilters = () => {
    resetFilters();
    setActiveProject(null);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--surface-canvas)]">
      {!compact && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-[var(--border-subtle)] px-3 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(CONTROL_CLASS, "text-[var(--text-primary)]")}
            >
              <Group className="h-3.5 w-3.5" />
              Group by: {titleCase(groupBy)}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
                Groups
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={groupBy}
                onValueChange={(value) =>
                  setGroupBy(value as "project" | "status" | "none")
                }
              >
                <DropdownMenuRadioItem
                  value="project"
                  className={MENU_ITEM_CLASS}
                >
                  Project
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="status"
                  className={MENU_ITEM_CLASS}
                >
                  Status
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="none" className={MENU_ITEM_CLASS}>
                  No groups
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className={CONTROL_CLASS}>
              <SortAsc className="h-3.5 w-3.5" />
              Sort
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
                Sort tasks by
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={sortBy}
                onValueChange={(value) =>
                  setSortBy(
                    value as "dueDate" | "priority" | "title" | "duration"
                  )
                }
              >
                <DropdownMenuRadioItem
                  value="dueDate"
                  className={MENU_ITEM_CLASS}
                >
                  Deadline
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="priority"
                  className={MENU_ITEM_CLASS}
                >
                  Priority
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="title"
                  className={MENU_ITEM_CLASS}
                >
                  Name
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem
                  value="duration"
                  className={MENU_ITEM_CLASS}
                >
                  Duration
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                onSelect={() =>
                  setSortDirection(sortDirection === "asc" ? "desc" : "asc")
                }
              >
                {sortDirection === "asc" ? "Ascending" : "Descending"}
                <span className="ml-auto text-[var(--text-muted)]">↕</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex h-8 items-center rounded-[var(--control-radius)] border border-[var(--control-border)] bg-[var(--control-bg)] p-0.5">
            <button
              type="button"
              aria-label="List layout"
              className="flex h-7 items-center gap-1.5 rounded bg-[var(--menu-item-hover)] px-2 text-[12px] text-[var(--text-primary)]"
            >
              <List className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setViewMode("board")}
              className="flex h-7 items-center gap-1.5 rounded px-2 text-[12px] text-[var(--text-secondary)] hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]"
            >
              <Kanban className="h-3.5 w-3.5" />
              Kanban
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className={CONTROL_CLASS}>
              <Folder className="h-3.5 w-3.5" />
              Workspace: All
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
                Solo workspace
              </DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked
                className={MENU_ITEM_CLASS}
                onSelect={(event) => event.preventDefault()}
              >
                My Workspace
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className={CONTROL_CLASS}>
              <Filter className="h-3.5 w-3.5" />
              Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
                Status
              </DropdownMenuLabel>
              {Object.values(TaskStatus).map((taskStatus) => (
                <DropdownMenuCheckboxItem
                  key={taskStatus}
                  checked={status?.includes(taskStatus) ?? false}
                  onCheckedChange={(checked) =>
                    setStatusFilter(taskStatus, Boolean(checked))
                  }
                  onSelect={(event) => event.preventDefault()}
                  className={MENU_ITEM_CLASS}
                >
                  {titleCase(taskStatus)}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
                Priority
              </DropdownMenuLabel>
              {[Priority.HIGH, Priority.MEDIUM, Priority.LOW].map(
                (taskPriority) => (
                  <DropdownMenuCheckboxItem
                    key={taskPriority}
                    checked={priority?.includes(taskPriority) ?? false}
                    onCheckedChange={(checked) =>
                      setPriorityFilter(taskPriority, Boolean(checked))
                    }
                    onSelect={(event) => event.preventDefault()}
                    className={MENU_ITEM_CLASS}
                  >
                    {titleCase(taskPriority)}
                  </DropdownMenuCheckboxItem>
                )
              )}
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
                Project
              </DropdownMenuLabel>
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                onSelect={() => setActiveProject(null)}
              >
                All projects
                {!activeProject && <Check className="ml-auto h-3.5 w-3.5" />}
              </DropdownMenuItem>
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  className={MENU_ITEM_CLASS}
                  onSelect={() => setActiveProject(project)}
                >
                  <span
                    className="h-2 w-2 rounded-sm"
                    style={{ background: project.color ?? "var(--text-muted)" }}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {project.name}
                  </span>
                  {activeProject?.id === project.id && (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                onSelect={() => setActiveProject(NO_PROJECT)}
              >
                No project
                {activeProject?.id === "no-project" && (
                  <Check className="ml-auto h-3.5 w-3.5" />
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className={MENU_ITEM_CLASS}
                onSelect={clearFilters}
              >
                Reset filters
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger className={CONTROL_CLASS}>
              <Columns3 className="h-3.5 w-3.5" />
              Columns
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
                Visible fields
              </DropdownMenuLabel>
              {(Object.keys(COLUMN_LABELS) as TaskListColumn[]).map(
                (column) => (
                  <DropdownMenuCheckboxItem
                    key={column}
                    checked={visibleColumns.includes(column)}
                    onCheckedChange={(checked) =>
                      toggleColumn(column, Boolean(checked))
                    }
                    onSelect={(event) => event.preventDefault()}
                    className={MENU_ITEM_CLASS}
                  >
                    {COLUMN_LABELS[column]}
                  </DropdownMenuCheckboxItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="ml-1 hidden items-center gap-3 text-[10px] text-[var(--text-muted)] xl:flex">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-secondary)]" />
              {filteredTasks.length} tasks
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock className="h-3 w-3" />
              {dueTodayCount} today
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                overdueCount > 0 && "text-[var(--color-danger)]"
              )}
            >
              <Flag className="h-3 w-3" />
              {overdueCount} overdue
            </span>
            <span className="inline-flex items-center gap-1.5">
              <TimerReset className="h-3 w-3" />
              {formatDuration(openMinutes)} load
            </span>
          </div>

          <div className="relative ml-auto min-w-[190px] max-w-[280px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={search ?? ""}
              onChange={(event) =>
                setFilters({ search: event.target.value || undefined })
              }
              placeholder="Search tasks"
              aria-label="Search tasks"
              className="h-8 border-[var(--input-border)] bg-[var(--input-bg)] pl-8 text-[12px]"
            />
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead className="sticky top-0 z-20 bg-[var(--surface-panel)]">
            <tr className="h-8 border-b border-[var(--border-subtle)] text-[10px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
              <th className="min-w-[280px] px-3 font-medium">Name</th>
              {visibleColumns.includes("project") && (
                <th className="w-[150px] px-3 font-medium">Project</th>
              )}
              {visibleColumns.includes("deadline") && (
                <th className="w-[120px] px-3 font-medium">Deadline</th>
              )}
              {visibleColumns.includes("duration") && (
                <th className="w-[90px] px-3 font-medium">Duration</th>
              )}
              {visibleColumns.includes("priority") && (
                <th className="w-[110px] px-3 font-medium">Priority</th>
              )}
              {visibleColumns.includes("status") && (
                <th className="w-[120px] px-3 font-medium">Status</th>
              )}
              {visibleColumns.includes("energy") && (
                <th className="w-[100px] px-3 font-medium">Energy</th>
              )}
              <th className="w-10 px-1 font-medium" aria-label="Actions" />
            </tr>
          </thead>
          <tbody ref={listRef}>
            {groups.map(([groupId, group]) => {
              const isCollapsed = collapsedGroups.has(groupId);
              return (
                <GroupRows
                  key={groupId}
                  groupId={groupId}
                  label={group.label}
                  tasks={group.tasks}
                  isCollapsed={isCollapsed}
                  visibleColumns={visibleColumns}
                  onToggle={() => toggleGroup(groupId)}
                  onEdit={onEdit}
                  onStatusChange={onStatusChange}
                  onCreateTask={onCreateTask}
                />
              );
            })}
          </tbody>
        </table>

        {groups.length === 0 && (
          <div className="grid min-h-64 place-items-center px-6 text-center">
            <div>
              <CalendarClock className="mx-auto mb-3 h-5 w-5 text-[var(--text-muted)]" />
              <p className="text-[13px] text-[var(--text-secondary)]">
                {tasks.length === 0
                  ? "No tasks yet."
                  : "No tasks match this view."}
              </p>
              <button
                type="button"
                onClick={tasks.length === 0 ? onCreateTask : clearFilters}
                className="mt-2 text-[12px] text-[var(--text-primary)] underline-offset-4 hover:underline"
              >
                {tasks.length === 0 ? "Create task" : "Clear filters"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface GroupRowsProps {
  groupId: string;
  label: string;
  tasks: Task[];
  isCollapsed: boolean;
  visibleColumns: TaskListColumn[];
  onToggle: () => void;
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onCreateTask?: () => void;
}

function GroupRows({
  label,
  tasks,
  isCollapsed,
  visibleColumns,
  onToggle,
  onEdit,
  onStatusChange,
  onCreateTask,
}: GroupRowsProps) {
  const columnSpan = visibleColumns.length + 2;
  const groupMinutes = tasks.reduce(
    (total, task) => total + (task.duration ?? task.estimatedMinutes ?? 30),
    0
  );

  return (
    <>
      <tr className="h-9 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <td colSpan={columnSpan} className="px-3">
          <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center gap-2 text-left text-[12px] font-medium text-[var(--text-primary)]"
          >
            {isCollapsed ? (
              <ChevronRight className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
            )}
            <Folder className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
            <span>{label}</span>
            <span className="text-[11px] font-normal text-[var(--text-muted)]">
              {tasks.length}
            </span>
            <span className="ml-auto text-[10px] font-normal text-[var(--text-muted)]">
              {formatDuration(groupMinutes)}
            </span>
          </button>
        </td>
      </tr>

      {!isCollapsed &&
        tasks.map((task) => (
          <tr
            key={task.id}
            className="group h-10 cursor-pointer border-b border-[var(--border-subtle)] bg-[var(--surface-canvas)] text-[12px] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-hover)]"
            onClick={() => onEdit(task)}
          >
            <td className="px-3">
              <div className="flex min-w-0 items-center gap-2">
                <button
                  type="button"
                  aria-label={
                    task.status === TaskStatus.COMPLETED
                      ? `Reopen ${task.title}`
                      : `Complete ${task.title}`
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    onStatusChange(
                      task.id,
                      task.status === TaskStatus.COMPLETED
                        ? TaskStatus.TODO
                        : TaskStatus.COMPLETED
                    );
                  }}
                  className={cn(
                    "grid h-4 w-4 flex-none place-items-center rounded-full border transition-colors",
                    task.status === TaskStatus.COMPLETED
                      ? "border-[var(--color-success)] bg-[var(--color-success)] text-white"
                      : "border-[var(--text-muted)] hover:border-[var(--text-primary)]"
                  )}
                >
                  {task.status === TaskStatus.COMPLETED && (
                    <Check className="h-2.5 w-2.5" />
                  )}
                </button>
                <span
                  className={cn(
                    "min-w-0 truncate font-medium text-[var(--text-primary)]",
                    task.status === TaskStatus.COMPLETED &&
                      "text-[var(--text-muted)] line-through"
                  )}
                >
                  {task.title}
                </span>
                {task.isAutoScheduled && (
                  <span className="rounded bg-[var(--surface-selected)] px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[var(--text-muted)]">
                    Scheduled
                  </span>
                )}
              </div>
            </td>
            {visibleColumns.includes("project") && (
              <td className="max-w-[150px] truncate px-3">
                {task.project?.name ?? "No project"}
              </td>
            )}
            {visibleColumns.includes("deadline") && (
              <td
                className={cn(
                  "px-3",
                  isOverdue(task) && "text-[var(--color-danger)]"
                )}
              >
                {formatDate(taskDeadline(task))}
              </td>
            )}
            {visibleColumns.includes("duration") && (
              <td className="px-3">
                {task.duration ?? task.estimatedMinutes ?? 30}m
              </td>
            )}
            {visibleColumns.includes("priority") && (
              <td className={cn("px-3", priorityColor(task.priority))}>
                <span className="inline-flex items-center gap-1.5">
                  <Flag className="h-3.5 w-3.5" />
                  {titleCase(task.priority ?? Priority.NONE)}
                </span>
              </td>
            )}
            {visibleColumns.includes("status") && (
              <td className="px-3">{titleCase(task.status)}</td>
            )}
            {visibleColumns.includes("energy") && (
              <td className="px-3">
                {task.energyLevel ? titleCase(task.energyLevel) : "—"}
              </td>
            )}
            <td
              className="relative px-1"
              onClick={(event) => event.stopPropagation()}
            >
              <CalendarTaskActionsMenu
                task={task}
                onOpenTask={() => onEdit(task)}
              />
            </td>
          </tr>
        ))}

      {!isCollapsed && onCreateTask && (
        <tr className="h-9 border-b border-[var(--border-subtle)]">
          <td colSpan={columnSpan} className="px-3">
            <button
              type="button"
              onClick={onCreateTask}
              className="text-[12px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              + Add task
            </button>
          </td>
        </tr>
      )}
    </>
  );
}
