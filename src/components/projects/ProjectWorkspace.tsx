"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { DndContext, type DragEndEvent } from "@dnd-kit/core";
import {
  HiOutlineArchive,
  HiOutlineChartBar,
  HiOutlineCollection,
  HiOutlineExclamation,
  HiOutlineFolder,
  HiOutlineMenuAlt2,
  HiOutlinePencil,
  HiOutlinePlus,
  HiOutlineRefresh,
  HiOutlineTemplate,
  HiOutlineViewBoards,
} from "react-icons/hi";

import { ArchivedProjectsDialog } from "@/components/projects/ArchivedProjectsDialog";
import { ProjectGanttView } from "@/components/projects/ProjectGanttView";
import { ProjectHealthPanel } from "@/components/projects/ProjectHealthPanel";
import {
  ProjectKanbanView,
  UNASSIGNED_STAGE_ID,
} from "@/components/projects/ProjectKanbanView";
import { ProjectListView } from "@/components/projects/ProjectListView";
import { ProjectModal } from "@/components/projects/ProjectModal";
import { ProjectTemplatesDialog } from "@/components/projects/ProjectTemplatesDialog";
import type {
  ProjectWorkspaceDetail,
  ProjectWorkspaceTask,
} from "@/components/projects/project-workspace-types";
import { TaskModal } from "@/components/tasks/TaskModal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NeedtPicker } from "@/components/ui/needt-picker";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { logger } from "@/lib/logger";
import { notify } from "@/lib/notifications";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useProjectStore } from "@/store/project";
import { useTaskStore } from "@/store/task";

import { ProjectStatus } from "@/types/project";
import { type NewTask, TaskStatus } from "@/types/task";

const LOG_SOURCE = "ProjectWorkspace";
type ProjectView = "list" | "kanban" | "gantt";

export function ProjectWorkspace() {
  const { projects, loading, fetchProjects } = useProjectStore();
  const { tags, fetchTags, createTag } = useTaskStore();
  const { createTask, updateTask, completeTask, deleteTask } =
    useTaskMutations();
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [detail, setDetail] = useState<ProjectWorkspaceDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [view, setView] = useState<ProjectView>("list");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProjectWorkspaceTask>();
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [stageName, setStageName] = useState("");
  const [stageSaving, setStageSaving] = useState(false);

  const activeProjects = useMemo(
    () => projects.filter((project) => project.status === ProjectStatus.ACTIVE),
    [projects]
  );
  const archivedProjects = useMemo(
    () =>
      projects.filter((project) => project.status === ProjectStatus.ARCHIVED),
    [projects]
  );

  const fetchDetail = useCallback(async (projectId: string) => {
    if (!projectId) {
      setDetail(null);
      return;
    }
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Could not load project");
      setDetail((await response.json()) as ProjectWorkspaceDetail);
    } catch (error) {
      notify.error("Could not load the project.");
      void logger.error(
        "Failed to load project workspace",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
    void fetchTags();
  }, [fetchProjects, fetchTags]);

  useEffect(() => {
    if (
      selectedProjectId &&
      activeProjects.some((project) => project.id === selectedProjectId)
    ) {
      return;
    }
    setSelectedProjectId(activeProjects[0]?.id ?? "");
  }, [activeProjects, selectedProjectId]);

  useEffect(() => {
    void fetchDetail(selectedProjectId);
  }, [fetchDetail, selectedProjectId]);

  const refresh = useCallback(async () => {
    await Promise.all([fetchProjects(), fetchDetail(selectedProjectId)]);
  }, [fetchDetail, fetchProjects, selectedProjectId]);

  const openTask = (task: ProjectWorkspaceTask) => {
    setSelectedTask(task);
    setTaskModalOpen(true);
  };

  const openNewTask = () => {
    setSelectedTask(undefined);
    setTaskModalOpen(true);
  };

  const saveTask = async (task: NewTask) => {
    if (selectedTask) await updateTask(selectedTask.id, task);
    else await createTask({ ...task, projectId: selectedProjectId });
    await refresh();
  };

  const changeStatus = async (taskId: string, status: TaskStatus) => {
    if (status === TaskStatus.COMPLETED) await completeTask(taskId, status);
    else await updateTask(taskId, { status });
    await refresh();
  };

  const archiveTask = async (taskId: string) => {
    await deleteTask(taskId);
    await refresh();
  };

  const moveTask = async (event: DragEndEvent) => {
    if (!event.over) return;
    const taskId = String(event.active.id);
    const stageId =
      String(event.over.id) === UNASSIGNED_STAGE_ID
        ? null
        : String(event.over.id);
    const task = detail?.tasks.find((candidate) => candidate.id === taskId);
    if (!task || (task.stageId ?? null) === stageId) return;
    await updateTask(taskId, { stageId });
    await refresh();
  };

  const addStage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProjectId || !stageName.trim()) return;
    setStageSaving(true);
    try {
      const response = await fetch(
        `/api/projects/${selectedProjectId}/stages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: stageName.trim() }),
        }
      );
      if (!response.ok) throw new Error("Could not create stage");
      setStageName("");
      setStageModalOpen(false);
      await refresh();
      notify.success("Stage created.");
    } catch (error) {
      notify.error("Could not create the stage.");
      void logger.error(
        "Failed to create project stage",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    } finally {
      setStageSaving(false);
    }
  };

  const createTagForTask = async (name: string, color?: string) => {
    const tag = await createTag({ name, color });
    await fetchTags();
    return tag;
  };

  const selectCreatedProject = async (projectId: string) => {
    await fetchProjects();
    setSelectedProjectId(projectId);
  };

  const selectRestoredProject = async (projectId: string) => {
    await fetchProjects();
    setSelectedProjectId(projectId);
  };

  const selectedSummary = activeProjects.find(
    (project) => project.id === selectedProjectId
  );
  const unresolvedBlockers =
    detail?.blockers.filter(
      (blocker) =>
        !blocker.resolvedAt &&
        blocker.blockerTask?.status !== TaskStatus.COMPLETED
    ).length ?? 0;
  const progress = detail?.progress ?? selectedSummary?.progress ?? 0;

  if (!loading && activeProjects.length === 0) {
    return (
      <div className="flex min-h-[calc(100dvh-68px)] items-center justify-center px-5 lg:min-h-dvh">
        <div className="max-w-sm text-center">
          <HiOutlineFolder className="mx-auto h-8 w-8 text-[var(--text-secondary)]" />
          <h1 className="mt-4 text-lg font-semibold text-[var(--text-primary)]">
            {archivedProjects.length > 0
              ? "All projects are archived"
              : "Create your first project"}
          </h1>
          <p className="mt-2 text-[13px] text-[var(--text-secondary)]">
            {archivedProjects.length > 0
              ? "Restore an archived project or create a new one."
              : "Group tasks into stages, track progress, and switch between project views."}
          </p>
          <Button className="mt-5" onClick={() => setProjectModalOpen(true)}>
            <HiOutlinePlus className="h-4 w-4" />
            New project
          </Button>
          {archivedProjects.length > 0 && (
            <Button
              className="ml-2 mt-5"
              variant="outline"
              onClick={() => setArchivedOpen(true)}
            >
              <HiOutlineArchive className="h-4 w-4" />
              Archived
            </Button>
          )}
          <ProjectModal
            isOpen={projectModalOpen}
            onClose={() => {
              setProjectModalOpen(false);
              void fetchProjects();
            }}
          />
          <ArchivedProjectsDialog
            open={archivedOpen}
            onOpenChange={setArchivedOpen}
            projects={archivedProjects}
            onRestored={(projectId) => void selectRestoredProject(projectId)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100dvh-68px)] min-h-0 flex-col lg:h-dvh">
      <header className="flex flex-none flex-col gap-3 border-b border-[var(--border-subtle)] px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <NeedtPicker
              options={activeProjects.map((project) => ({
                value: project.id,
                label: project.name,
                description: `${project.completed ?? 0}/${project.total ?? project._count?.tasks ?? 0} tasks`,
                icon: (
                  <span
                    className="h-2.5 w-2.5 rounded-full border border-[var(--border-subtle)]"
                    style={{
                      backgroundColor:
                        project.color ?? "var(--surface-control)",
                    }}
                  />
                ),
              }))}
              mode="searchable"
              value={selectedProjectId}
              onValueChange={setSelectedProjectId}
              ariaLabel="Choose project"
              searchPlaceholder="Search projects"
              className="max-w-[min(70vw,360px)] text-[16px] font-semibold"
              showChevron
            />
            <button
              type="button"
              onClick={() => setProjectModalOpen(true)}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-[var(--control-radius)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:border focus-visible:border-[var(--border-control)]"
              aria-label="Edit project"
            >
              <HiOutlinePencil className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-2 flex max-w-xl items-center gap-2">
            <div
              className="h-1.5 min-w-20 flex-1 overflow-hidden rounded-full bg-[var(--surface-control)]"
              role="progressbar"
              aria-label="Project progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <div
                className="h-full rounded-full bg-[var(--text-primary)] transition-[width] motion-reduce:transition-none"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="w-9 text-right text-[11px] text-[var(--text-muted)]">
              {progress}%
            </span>
            {unresolvedBlockers > 0 && (
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-warning)]">
                <HiOutlineExclamation className="h-3.5 w-3.5" />
                {unresolvedBlockers}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {selectedProjectId && (
            <ProjectHealthPanel projectId={selectedProjectId} />
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setArchivedOpen(true)}
          >
            <HiOutlineArchive className="h-4 w-4" />
            Archived
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setTemplatesOpen(true)}
          >
            <HiOutlineTemplate className="h-4 w-4" />
            Templates
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStageModalOpen(true)}
          >
            <HiOutlineCollection className="h-4 w-4" />
            Stage
          </Button>
          <Button size="sm" onClick={openNewTask}>
            <HiOutlinePlus className="h-4 w-4" />
            Task
          </Button>
        </div>
      </header>

      <Tabs
        value={view}
        onValueChange={(value) => setView(value as ProjectView)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex h-11 flex-none items-center border-b border-[var(--border-subtle)] px-3 sm:px-4">
          <TabsList className="h-8 bg-transparent p-0">
            <TabsTrigger
              value="list"
              className="h-7 gap-1.5 px-2.5 text-[12px]"
            >
              <HiOutlineMenuAlt2 className="h-3.5 w-3.5" />
              List
            </TabsTrigger>
            <TabsTrigger
              value="kanban"
              className="h-7 gap-1.5 px-2.5 text-[12px]"
            >
              <HiOutlineViewBoards className="h-3.5 w-3.5" />
              Kanban
            </TabsTrigger>
            <TabsTrigger
              value="gantt"
              className="h-7 gap-1.5 px-2.5 text-[12px]"
            >
              <HiOutlineChartBar className="h-3.5 w-3.5" />
              Gantt
            </TabsTrigger>
          </TabsList>
        </div>
        <div className="relative min-h-0 flex-1">
          {detailLoading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--surface-canvas)]/80">
              <HiOutlineRefresh className="h-5 w-5 animate-spin text-[var(--text-secondary)] motion-reduce:animate-none" />
              <span className="sr-only">Loading project</span>
            </div>
          )}
          <TabsContent value="list" className="m-0 h-full">
            {detail && (
              <ProjectListView
                tasks={detail.tasks}
                stages={detail.stages}
                blockers={detail.blockers}
                onOpenTask={openTask}
                onStatusChange={(taskId, status) =>
                  void changeStatus(taskId, status)
                }
              />
            )}
          </TabsContent>
          <TabsContent value="kanban" className="m-0 h-full">
            {detail && (
              <DndContext onDragEnd={(event) => void moveTask(event)}>
                <ProjectKanbanView
                  tasks={detail.tasks}
                  stages={detail.stages}
                  blockers={detail.blockers}
                  onOpenTask={openTask}
                  onDeleteTask={(taskId) => void archiveTask(taskId)}
                />
              </DndContext>
            )}
          </TabsContent>
          <TabsContent value="gantt" className="m-0 h-full">
            {detail && (
              <ProjectGanttView project={detail} onOpenTask={openTask} />
            )}
          </TabsContent>
        </div>
      </Tabs>

      <TaskModal
        isOpen={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setSelectedTask(undefined);
        }}
        onSave={saveTask}
        task={selectedTask}
        tags={tags}
        onCreateTag={createTagForTask}
        initialProjectId={selectedTask ? undefined : selectedProjectId}
      />

      <ProjectModal
        isOpen={projectModalOpen}
        onClose={() => {
          setProjectModalOpen(false);
          void fetchProjects();
        }}
        project={detail ?? selectedSummary}
      />

      <ArchivedProjectsDialog
        open={archivedOpen}
        onOpenChange={setArchivedOpen}
        projects={archivedProjects}
        onRestored={(projectId) => void selectRestoredProject(projectId)}
      />

      {detail && (
        <ProjectTemplatesDialog
          open={templatesOpen}
          onOpenChange={setTemplatesOpen}
          project={detail}
          onProjectCreated={(projectId) => void selectCreatedProject(projectId)}
        />
      )}

      <Dialog open={stageModalOpen} onOpenChange={setStageModalOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Create stage</DialogTitle>
          </DialogHeader>
          <form onSubmit={addStage} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-stage-name">Name</Label>
              <Input
                id="project-stage-name"
                value={stageName}
                onChange={(event) => setStageName(event.target.value)}
                placeholder="Planning"
                autoFocus
                required
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStageModalOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={stageSaving || !stageName.trim()}>
                {stageSaving ? "Creating..." : "Create stage"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
