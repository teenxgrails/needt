"use client";

import { useEffect, useMemo, useState } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Box,
  CalendarRange,
  ChevronDown,
  Kanban,
  ListTodo,
  MoreHorizontal,
  Plus,
  RotateCw,
  Sparkles,
} from "lucide-react";

import { ProjectModal } from "@/components/projects/ProjectModal";
import { BoardView } from "@/components/tasks/BoardView/BoardView";
import { SpaceView } from "@/components/tasks/SpaceView";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskModal } from "@/components/tasks/TaskModal";
import { TimelineView } from "@/components/tasks/TimelineView";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  APP_TOOLBAR_BUTTON_CLASS,
  APP_TOOLBAR_ICON_BUTTON_CLASS,
} from "@/components/ui/app-toolbar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useProjectStore } from "@/store/project";
import { useTaskStore } from "@/store/task";
import { useTaskModalStore } from "@/store/taskModal";
import { ViewMode, useTaskPageSettings } from "@/store/taskPageSettings";

import { NewTask, Task, TaskStatus } from "@/types/task";

const LOG_SOURCE = "TasksPage";
const VIEW_BUTTON_CLASS =
  "flex h-[var(--calendar-toolbar-height)] items-center gap-1.5 rounded-md px-2 text-[length:var(--calendar-toolbar-font-size)] font-medium transition-colors duration-150";

const PRIMARY_VIEWS: Array<{
  id: ViewMode;
  label: string;
  icon: typeof Sparkles;
}> = [
  { id: "space", label: "Space", icon: Sparkles },
  { id: "list", label: "Task List", icon: ListTodo },
  { id: "timeline", label: "Timeline", icon: CalendarRange },
];

export default function TasksPage() {
  const { tasks, tags, error, fetchTasks, fetchTags, createTag } =
    useTaskStore();
  const { createTask, updateTask, completeTask, deleteTask } =
    useTaskMutations();
  const { projects, fetchProjects, activeProject } = useProjectStore();
  const { viewMode, setViewMode } = useTaskPageSettings();
  const { isOpen, setOpen } = useTaskModalStore();
  const prefersReducedMotion = useReducedMotion();

  const [selectedTask, setSelectedTask] = useState<Task | undefined>();
  const [initialProjectId, setInitialProjectId] = useState<
    string | null | undefined
  >(undefined);
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [isReflowing, setIsReflowing] = useState(false);
  const [reflowPreview, setReflowPreview] = useState<{
    previewToken: string;
    changes: Array<{
      taskId: string;
      title: string;
      fromStart: string | null;
      toStart: string | null;
    }>;
  } | null>(null);
  const [reflowUndoToken, setReflowUndoToken] = useState<string | null>(null);
  const [openedTaskParam, setOpenedTaskParam] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
    fetchTags();
    fetchProjects();
  }, [fetchProjects, fetchTags, fetchTasks]);

  useEffect(() => {
    const taskId = new URLSearchParams(window.location.search).get("task");
    if (!taskId || taskId === openedTaskParam) return;
    const task = tasks.find((candidate) => candidate.id === taskId);
    if (!task) return;
    setSelectedTask(task);
    setInitialProjectId(undefined);
    setOpen(true);
    setOpenedTaskParam(taskId);
  }, [openedTaskParam, setOpen, tasks]);

  const deadlineTasks = useMemo(
    () => tasks.filter((task) => task.deadline || task.dueDate),
    [tasks]
  );

  const openTask = (task: Task) => {
    setSelectedTask(task);
    setInitialProjectId(undefined);
    setOpen(true);
  };

  const openCreateTask = () => {
    setSelectedTask(undefined);
    setInitialProjectId(
      activeProject
        ? activeProject.id === "no-project"
          ? null
          : activeProject.id
        : undefined
    );
    setOpen(true);
  };

  const handleCreateTask = async (task: NewTask) => {
    await createTask(task);
    await fetchProjects();
  };

  const handleUpdateTask = async (task: NewTask) => {
    if (!selectedTask) return;
    await updateTask(selectedTask.id, task);
    await fetchProjects();
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
    await fetchProjects();
  };

  const handleStatusChange = async (taskId: string, status: TaskStatus) => {
    if (status === TaskStatus.COMPLETED) {
      await completeTask(taskId, status);
    } else {
      await updateTask(taskId, { status });
    }
    await fetchProjects();
  };

  const handleSpaceReschedule = (task: Task, start: Date, end: Date) => {
    void updateTask(task.id, {
      startDate: start,
      scheduledStart: start,
      scheduledEnd: end,
      isAutoScheduled: true,
      autoScheduled: false,
      scheduleLocked: true,
      isFrozen: true,
    }).catch((scheduleError: unknown) => {
      void logger.error(
        "Failed to reschedule task from Space",
        {
          taskId: task.id,
          error:
            scheduleError instanceof Error
              ? scheduleError.message
              : String(scheduleError),
        },
        LOG_SOURCE
      );
    });
  };

  const handleCreateTag = async (name: string, color?: string) => {
    try {
      const newTag = await createTag({ name, color });
      await fetchTags();
      return newTag;
    } catch (tagError) {
      void logger.error(
        "Failed to create task tag",
        {
          error:
            tagError instanceof Error ? tagError.message : String(tagError),
        },
        LOG_SOURCE
      );
      throw tagError;
    }
  };

  const handleReflow = async () => {
    if (isReflowing) return;
    setIsReflowing(true);
    try {
      const response = await fetch("/api/tasks/reschedule-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "preview" }),
      });
      if (!response.ok) throw new Error("Failed to prepare schedule preview");
      setReflowPreview(await response.json());
    } catch (scheduleError) {
      void logger.error(
        "Failed to reflow Workspace tasks",
        {
          error:
            scheduleError instanceof Error
              ? scheduleError.message
              : String(scheduleError),
        },
        LOG_SOURCE
      );
    } finally {
      setIsReflowing(false);
    }
  };

  const applyReflow = async () => {
    if (!reflowPreview) return;
    setIsReflowing(true);
    try {
      const response = await fetch("/api/tasks/reschedule-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "apply",
          token: reflowPreview.previewToken,
        }),
      });
      if (!response.ok) throw new Error("Failed to apply schedule preview");
      const data = (await response.json()) as { undoToken: string };
      setReflowUndoToken(data.undoToken);
      setReflowPreview(null);
      await fetchTasks();
    } finally {
      setIsReflowing(false);
    }
  };

  const undoReflow = async () => {
    if (!reflowUndoToken) return;
    setIsReflowing(true);
    try {
      const response = await fetch("/api/tasks/reschedule-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "undo", token: reflowUndoToken }),
      });
      if (!response.ok) throw new Error("Failed to undo schedule changes");
      setReflowUndoToken(null);
      await fetchTasks();
    } finally {
      setIsReflowing(false);
    }
  };

  const activePrimaryView = PRIMARY_VIEWS.some((view) => view.id === viewMode)
    ? viewMode
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[var(--surface-canvas)] text-[var(--text-primary)]">
      <header className="flex h-12 flex-none items-center border-b border-[var(--border-subtle)] px-2">
        <div className="flex min-w-0 items-center gap-2">
          <Box className="h-4 w-4 text-[var(--text-secondary)]" />
          <h1 className="truncate text-[14px] font-semibold">Workspace</h1>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleReflow}
            disabled={isReflowing}
            className={APP_TOOLBAR_BUTTON_CLASS}
          >
            <RotateCw
              className={cn("h-3.5 w-3.5", isReflowing && "animate-spin")}
            />
            {isReflowing ? "Reflowing..." : "Reflow schedule"}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger className={APP_TOOLBAR_BUTTON_CLASS}>
              <Plus className="h-3.5 w-3.5" />
              New
              <ChevronDown className="h-3 w-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem
                onSelect={openCreateTask}
                className="h-9 text-[12px]"
              >
                <ListTodo />
                Create task
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setProjectModalOpen(true)}
                className="h-9 text-[12px]"
              >
                <Box />
                Create project
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {(reflowPreview || reflowUndoToken) && (
        <div className="flex flex-none items-start justify-between gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)] px-3 py-2 text-xs">
          {reflowPreview ? (
            <>
              <div className="min-w-0">
                <div className="font-medium">
                  Preview: {reflowPreview.changes.length} schedule changes
                </div>
                <div className="mt-1 max-w-3xl truncate text-[var(--text-secondary)]">
                  {reflowPreview.changes
                    .slice(0, 4)
                    .map((change) => change.title)
                    .join(" · ") || "Your schedule is already up to date."}
                </div>
              </div>
              <div className="flex flex-none gap-2">
                <button
                  type="button"
                  onClick={() => setReflowPreview(null)}
                  className={APP_TOOLBAR_BUTTON_CLASS}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyReflow}
                  disabled={!reflowPreview.changes.length || isReflowing}
                  className={APP_TOOLBAR_BUTTON_CLASS}
                >
                  Apply
                </button>
              </div>
            </>
          ) : (
            <>
              <span>Schedule updated.</span>
              <button
                type="button"
                onClick={undoReflow}
                disabled={isReflowing}
                className={APP_TOOLBAR_BUTTON_CLASS}
              >
                Undo
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex h-10 flex-none items-center gap-1 border-b border-[var(--border-subtle)] px-2">
        <nav
          aria-label="Workspace views"
          className="flex min-w-0 items-center gap-0.5"
        >
          {PRIMARY_VIEWS.map((view) => {
            const Icon = view.icon;
            const isActive = activePrimaryView === view.id;
            return (
              <button
                key={view.id}
                type="button"
                onClick={() => setViewMode(view.id)}
                className={cn(
                  VIEW_BUTTON_CLASS,
                  isActive
                    ? "bg-[var(--surface-hover)] text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--calendar-toolbar-bg)] hover:text-[var(--text-primary)]"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {view.label}
              </button>
            );
          })}
          {viewMode === "deadlines" && (
            <button
              type="button"
              className={cn(
                VIEW_BUTTON_CLASS,
                "bg-[var(--surface-hover)] text-[var(--text-primary)]"
              )}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Deadlines
            </button>
          )}
          {viewMode === "board" && (
            <button
              type="button"
              className={cn(
                VIEW_BUTTON_CLASS,
                "bg-[var(--surface-hover)] text-[var(--text-primary)]"
              )}
            >
              <Kanban className="h-3.5 w-3.5" />
              Kanban
            </button>
          )}
        </nav>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Manage workspace views"
            className={cn(
              APP_TOOLBAR_ICON_BUTTON_CLASS,
              "border-transparent bg-transparent text-[var(--text-muted)]"
            )}
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
              View order
            </DropdownMenuLabel>
            {PRIMARY_VIEWS.map((view) => (
              <DropdownMenuItem
                key={view.id}
                onSelect={() => setViewMode(view.id)}
                className="h-8 text-[12px]"
              >
                <view.icon />
                {view.label}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => setViewMode("space")}
              className="h-8 text-[12px]"
            >
              Reset to Solo defaults
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Add workspace view"
            className={cn(
              APP_TOOLBAR_ICON_BUTTON_CLASS,
              "border-transparent bg-transparent text-[var(--text-muted)]"
            )}
          >
            <Plus className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-[11px] text-[var(--text-muted)]">
              Add view
            </DropdownMenuLabel>
            <DropdownMenuItem
              onSelect={() => setViewMode("deadlines")}
              className="h-9 text-[12px]"
            >
              <CalendarRange />
              Deadlines
              <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                {deadlineTasks.length}
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setViewMode("board")}
              className="h-9 text-[12px]"
            >
              <Kanban />
              Kanban
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="h-9 text-[12px]">
              Team views
              <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                Solo
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error && (
        <Alert variant="destructive" className="m-3 flex-none">
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <main className="min-h-0 flex-1 overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={viewMode}
            className="h-full min-h-0"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
          >
            {viewMode === "space" ? (
              <SpaceView
                projects={projects}
                tasks={tasks}
                onOpenTask={openTask}
                onRescheduleTask={handleSpaceReschedule}
                onStatusChange={handleStatusChange}
                onCreateTask={openCreateTask}
              />
            ) : viewMode === "timeline" ? (
              <div className="h-full p-3">
                <TimelineView tasks={tasks} />
              </div>
            ) : viewMode === "board" ? (
              <BoardView
                tasks={tasks}
                onEdit={openTask}
                onDelete={handleDeleteTask}
                onStatusChange={handleStatusChange}
              />
            ) : (
              <TaskList
                tasks={viewMode === "deadlines" ? deadlineTasks : tasks}
                onEdit={openTask}
                onStatusChange={handleStatusChange}
                onCreateTask={openCreateTask}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <TaskModal
        isOpen={isOpen}
        onClose={() => {
          setOpen(false);
          setSelectedTask(undefined);
          setInitialProjectId(undefined);
        }}
        onSave={selectedTask ? handleUpdateTask : handleCreateTask}
        task={selectedTask}
        tags={tags}
        onCreateTag={handleCreateTag}
        initialProjectId={initialProjectId}
      />

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => setProjectModalOpen(false)}
      />
    </div>
  );
}
