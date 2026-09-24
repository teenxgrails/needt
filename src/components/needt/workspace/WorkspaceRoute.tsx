"use client";

import * as React from "react";

import { usePathname, useRouter } from "next/navigation";

import { LuFolder, LuPlus } from "react-icons/lu";

import { useTheme } from "@/components/providers/ThemeProvider";
import { useWorkspace } from "@/components/providers/WorkspaceProvider";
import { TaskModal } from "@/components/task-editor/TaskModal";

import type {
  NeedtPerson,
  NeedtProject,
  NeedtStage,
  NeedtTask,
} from "@/lib/needt/types";
import { notify } from "@/lib/notifications";
import { deleteTaskRequest, updateTaskRequest } from "@/lib/task-api";
import { resolveThemeMode } from "@/lib/theme";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useProjectStore } from "@/store/project";
import { useTaskStore } from "@/store/task";

import type { ResolvedThemeMode } from "@/types/settings";
import type { NewTask } from "@/types/task";
import { TaskStatus } from "@/types/task";

import { TaskDialog } from "../dialogs";
import { MobileTaskSheet, MobileWorkspace } from "../mobile";
import { Glyph } from "../shell/chrome";
import { ProjectManagerDialog } from "./ProjectManagerDialog";
import { WorkspaceScreen } from "./WorkspaceScreen";

interface WorkspacePayload {
  workspaceId: string;
  now: string;
  todayKey: string;
  tasks: NeedtTask[];
  projects: NeedtProject[];
  people: NeedtPerson[];
  stages: NeedtStage[];
  canEdit: boolean;
}

function useResolvedTheme(): ResolvedThemeMode {
  const { theme, systemTheme } = useTheme();
  const [resolved, setResolved] = React.useState<ResolvedThemeMode>(() =>
    resolveThemeMode(theme, false, systemTheme)
  );

  React.useLayoutEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () =>
      setResolved(resolveThemeMode(theme, media.matches, systemTheme));
    sync();
    if (theme !== "system") return undefined;
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, [systemTheme, theme]);

  return resolved;
}

async function readWorkspace(): Promise<WorkspacePayload> {
  const response = await fetch("/api/needt/workspace", { cache: "no-store" });
  if (!response.ok) throw new Error("Could not load workspace");
  return response.json() as Promise<WorkspacePayload>;
}

export function WorkspaceRoute() {
  const pathname = usePathname();
  const router = useRouter();
  const theme = useResolvedTheme();
  const dark = theme === "dark" || theme === "dim";
  const { activeWorkspace } = useWorkspace();
  const { updateTask } = useTaskMutations();
  const fullTasks = useTaskStore((state) => state.tasks);
  const tags = useTaskStore((state) => state.tags);
  const createTag = useTaskStore((state) => state.createTag);
  const fetchTags = useTaskStore((state) => state.fetchTags);
  const fetchProjects = useProjectStore((state) => state.fetchProjects);
  const activeWorkspaceId = activeWorkspace?.workspace.id;
  const [data, setData] = React.useState<WorkspacePayload | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<NeedtTask | null>(
    null
  );
  const [error, setError] = React.useState(false);
  const [projectManagerOpen, setProjectManagerOpen] = React.useState(false);
  const pendingTaskIds = React.useRef(new Set<string>());
  const openedTaskParam = React.useRef<string | null>(null);

  const refresh = React.useCallback(async () => {
    if (!activeWorkspaceId) throw new Error("Workspace unavailable");
    const next = await readWorkspace();
    if (next.workspaceId !== activeWorkspaceId) {
      throw new Error("Workspace changed while loading tasks");
    }
    setData(next);
    setSelectedTask((current) =>
      current
        ? (next.tasks.find((task) => task.id === current.id) ?? null)
        : current
    );
    setError(false);
    return next;
  }, [activeWorkspaceId]);

  React.useEffect(() => {
    let current = true;
    setData(null);
    setSelectedTask(null);
    openedTaskParam.current = null;
    setError(false);
    if (!activeWorkspaceId) return () => undefined;
    void readWorkspace()
      .then((next) => {
        if (current && next.workspaceId === activeWorkspaceId) setData(next);
      })
      .catch(() => {
        if (current) setError(true);
      });
    return () => {
      current = false;
    };
  }, [activeWorkspaceId]);

  React.useEffect(() => {
    if (!data || selectedTask) return;
    const taskId = new URLSearchParams(window.location.search).get("task");
    if (!taskId || taskId === openedTaskParam.current) return;
    openedTaskParam.current = taskId;
    setSelectedTask(data.tasks.find((task) => task.id === taskId) ?? null);
  }, [data, selectedTask]);

  const closeTask = React.useCallback(() => {
    setSelectedTask(null);
    if (window.location.search) router.replace(pathname);
  }, [pathname, router]);

  const addTask = React.useCallback(() => router.push("/quick-add"), [router]);

  const toggleTask = React.useCallback(
    async (id: string) => {
      if (!data?.canEdit || pendingTaskIds.current.has(id)) return;
      const task = data.tasks.find((candidate) => candidate.id === id);
      if (!task) return;
      pendingTaskIds.current.add(id);
      try {
        await updateTaskRequest(id, {
          status: task.done ? TaskStatus.TODO : TaskStatus.COMPLETED,
        });
        await refresh();
      } catch {
        notify.error("Could not update this task");
      } finally {
        pendingTaskIds.current.delete(id);
      }
    },
    [data, refresh]
  );

  const archiveTask = React.useCallback(
    async (id: string) => {
      if (!data?.canEdit) return;
      try {
        await deleteTaskRequest(id);
        closeTask();
        await refresh();
        notify.success("Task archived");
      } catch {
        notify.error("Could not archive this task");
      }
    },
    [closeTask, data?.canEdit, refresh]
  );

  const selectedFullTask = selectedTask
    ? fullTasks.find((task) => task.id === selectedTask.id)
    : undefined;

  const saveFullTask = React.useCallback(
    async (updates: NewTask) => {
      if (!selectedFullTask) throw new Error("Task details are still loading");
      await updateTask(selectedFullTask.id, updates);
      await Promise.all([refresh(), fetchProjects()]);
    },
    [fetchProjects, refresh, selectedFullTask, updateTask]
  );

  const createFullTag = React.useCallback(
    async (name: string, color?: string) => {
      const tag = await createTag({ name, color });
      await fetchTags();
      return tag;
    },
    [createTag, fetchTags]
  );

  const shellStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    minHeight: 0,
    background: "var(--background)",
    color: "var(--text-primary)",
    font: "var(--type-ui)",
  };

  if (!data || data.workspaceId !== activeWorkspaceId) {
    return (
      <div className="needt-v2" data-theme={theme} style={shellStyle}>
        <div className="grid flex-1 place-items-center px-6 text-center text-sm text-[var(--text-muted)]">
          {error ? (
            <div>
              <p>Tasks could not be loaded.</p>
              <button
                type="button"
                className="mt-3 min-h-11 rounded-[var(--radius-lg)] px-4 text-[var(--accent)] shadow-[var(--shadow-ring)]"
                onClick={() => void refresh().catch(() => setError(true))}
              >
                Try again
              </button>
            </div>
          ) : (
            <span role="status">Loading tasks…</span>
          )}
        </div>
      </div>
    );
  }

  const canEdit = data.canEdit;
  const isProjectsRoute = pathname === "/projects";
  return (
    <div className="needt-v2" data-theme={theme} style={shellStyle}>
      <div className="hidden min-h-0 flex-1 flex-col px-5 pb-5 pt-4 sm:flex">
        <WorkspaceScreen
          tasks={data.tasks}
          people={data.people}
          projects={data.projects}
          stages={data.stages}
          todayKey={data.todayKey}
          dark={dark}
          onToggle={canEdit ? toggleTask : undefined}
          onOpen={setSelectedTask}
          onCreate={canEdit ? addTask : undefined}
          onManageProjects={
            canEdit && isProjectsRoute
              ? () => setProjectManagerOpen(true)
              : undefined
          }
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col sm:hidden">
        <header className="flex items-center gap-3 px-4 pb-3 pt-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[var(--text-muted)]">Workspace</p>
            <h1 className="truncate text-xl font-semibold">
              {activeWorkspace?.workspace.name ?? "Workspace"}
            </h1>
          </div>
          {canEdit ? (
            <div className="flex gap-2">
              {isProjectsRoute ? (
                <button
                  type="button"
                  onClick={() => setProjectManagerOpen(true)}
                  aria-label="Manage projects"
                  className="grid size-11 flex-none place-items-center rounded-[var(--radius-floating)] bg-[var(--fill-2)] text-[var(--text-secondary)]"
                >
                  <Glyph of={LuFolder} size={18} />
                </button>
              ) : null}
              <button
                type="button"
                onClick={addTask}
                aria-label="Add task"
                className="grid size-11 flex-none place-items-center rounded-[var(--radius-floating)] bg-[var(--fill-accent)] text-[var(--accent)]"
              >
                <Glyph of={LuPlus} size={18} />
              </button>
            </div>
          ) : null}
        </header>
        <div className="scroll-inner min-h-0 flex-1 overflow-auto">
          <MobileWorkspace
            tasks={data.tasks}
            projects={data.projects}
            onOpenTask={setSelectedTask}
            onToggleTask={canEdit ? toggleTask : undefined}
            onCreate={canEdit ? addTask : undefined}
          />
        </div>
      </div>

      {selectedTask && canEdit && selectedFullTask ? (
        <TaskModal
          isOpen
          task={selectedFullTask}
          tags={tags}
          onClose={closeTask}
          onSave={saveFullTask}
          onCreateTag={createFullTag}
          onDelete={archiveTask}
        />
      ) : null}
      <div className="hidden sm:block">
        {selectedTask && !canEdit ? (
          <TaskDialog
            key={selectedTask.id}
            open
            task={selectedTask}
            projects={data.projects}
            people={data.people}
            editable={false}
            partsEditable={false}
            prototypeControls={false}
            onClose={closeTask}
          />
        ) : null}
      </div>
      <div className="sm:hidden">
        <MobileTaskSheet
          task={!canEdit ? selectedTask : null}
          open={Boolean(selectedTask && !canEdit)}
          projects={data.projects}
          people={data.people}
          onClose={closeTask}
        />
      </div>
      {canEdit && isProjectsRoute ? (
        <ProjectManagerDialog
          open={projectManagerOpen}
          onOpenChange={setProjectManagerOpen}
          onChanged={refresh}
        />
      ) : null}
    </div>
  );
}
