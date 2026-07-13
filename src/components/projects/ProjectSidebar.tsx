"use client";

import { useCallback, useEffect, useState } from "react";

import NumberFlow from "@number-flow/react";
import { BsArrowRepeat } from "react-icons/bs";
import { HiFolderOpen, HiPencil, HiPlus } from "react-icons/hi";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

import { getOverdueSummary } from "@/lib/overdue";
import { cn } from "@/lib/utils";

import { useProjectStore } from "@/store/project";
import { useTaskStore } from "@/store/task";

import { Project, ProjectStatus } from "@/types/project";
import { TaskStatus } from "@/types/task";

import { useDroppableProject } from "../dnd/useDragAndDrop";
import { ProjectModal } from "./ProjectModal";

// Special project object to represent "no project" state
const NO_PROJECT: Partial<Project> = {
  id: "no-project",
  name: "No Project",
};

// Interface for task list mappings
interface TaskListMapping {
  id: string;
  providerId: string;
  projectId: string;
  externalListId: string;
  externalListName: string;
}

export function ProjectSidebar() {
  const {
    projects,
    loading,
    error,
    fetchProjects,
    setActiveProject,
    activeProject,
  } = useProjectStore();
  const { tasks } = useTaskStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | undefined>();
  const [projectMappings, setProjectMappings] = useState<
    Record<string, TaskListMapping[]>
  >({});
  const [syncingProjects, setSyncingProjects] = useState<Set<string>>(
    new Set()
  );

  const { droppableProps: removeProjectProps, isOver: isOverRemove } =
    useDroppableProject(null);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Fetch task list mappings for projects
  useEffect(() => {
    if (projects.length > 0) {
      fetchProjectMappings();
    }
  }, [projects]);

  const fetchProjectMappings = async () => {
    try {
      const response = await fetch("/api/task-sync/mappings");
      const data = await response.json();

      if (data.mappings) {
        // Group mappings by project ID
        const mappingsByProject: Record<string, TaskListMapping[]> = {};

        data.mappings.forEach((mapping: TaskListMapping) => {
          if (!mappingsByProject[mapping.projectId]) {
            mappingsByProject[mapping.projectId] = [];
          }
          mappingsByProject[mapping.projectId].push(mapping);
        });

        setProjectMappings(mappingsByProject);
      }
    } catch (error) {
      console.error("Failed to fetch task list mappings:", error);
    }
  };

  const handleSyncProject = useCallback(
    async (projectId: string, mappingId: string) => {
      if (syncingProjects.has(projectId)) return;

      try {
        setSyncingProjects((prev) => new Set(prev).add(projectId));

        const response = await fetch("/api/task-sync/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mappingId,
            direction: "bidirectional",
          }),
        });

        if (response.ok) {
          const { fetchTasks } = useTaskStore.getState();
          await fetchTasks();
          toast.success("Sync Completed");
        } else {
          toast.error("Failed to sync tasks for project");
        }
      } catch (error) {
        console.error("Failed to sync project tasks:", error);
        toast.error("Failed to sync tasks for project");
      } finally {
        setSyncingProjects((prev) => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
        });
      }
    },
    [syncingProjects]
  );

  const activeProjects = projects.filter(
    (project) => project.status === ProjectStatus.ACTIVE
  );
  const archivedProjects = projects.filter(
    (project) => project.status === ProjectStatus.ARCHIVED
  );

  // Count non-completed tasks with no project
  const unassignedTasksCount = tasks.filter(
    (task) => !task.projectId && task.status !== TaskStatus.COMPLETED
  ).length;

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  return (
    <>
      <div className="glass hidden h-full w-64 flex-col md:flex">
        <div className="border-b border-white/10 p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Projects</h2>
            <Button
              size="icon"
              onClick={() => {
                setSelectedProject(undefined);
                setIsModalOpen(true);
              }}
            >
              <HiPlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            <Button
              variant={!activeProject ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveProject(null)}
            >
              All Tasks
            </Button>
            <Button
              variant={
                activeProject?.id === NO_PROJECT.id ? "secondary" : "ghost"
              }
              className="w-full justify-start gap-2"
              onClick={() => setActiveProject(NO_PROJECT as Project)}
            >
              <HiFolderOpen className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1">No Project</span>
              <span className="text-xs text-muted-foreground">
                {unassignedTasksCount}
              </span>
            </Button>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          {loading ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-sm text-muted-foreground">
                Loading projects...
              </div>
            </div>
          ) : error ? (
            <div className="p-2 text-sm text-destructive">{error.message}</div>
          ) : (
            <div className="space-y-4">
              {activeProjects.length > 0 && (
                <div className="space-y-1">
                  {activeProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={activeProject?.id === project.id}
                      onEdit={handleEditProject}
                      mappings={projectMappings[project.id] || []}
                      isSyncing={syncingProjects.has(project.id)}
                      onSync={handleSyncProject}
                    />
                  ))}
                </div>
              )}

              {archivedProjects.length > 0 && (
                <div className="space-y-1">
                  <div className="py-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Archived
                  </div>
                  {archivedProjects.map((project) => (
                    <ProjectItem
                      key={project.id}
                      project={project}
                      isActive={activeProject?.id === project.id}
                      onEdit={handleEditProject}
                      mappings={projectMappings[project.id] || []}
                      isSyncing={syncingProjects.has(project.id)}
                      onSync={handleSyncProject}
                    />
                  ))}
                </div>
              )}

              {projects.length === 0 && (
                <div className="glass--subtle py-5 text-center text-sm text-muted-foreground">
                  <div className="flowday-orb mx-auto mb-3 h-10 w-10 opacity-75" />
                  No projects yet
                </div>
              )}

              {/* Remove from project drop zone */}
              <div
                {...removeProjectProps}
                className={cn(
                  "mt-4 rounded-2xl border border-dashed p-4 text-center",
                  isOverRemove
                    ? "border-destructive bg-destructive/10"
                    : "border-white/10 bg-white/[0.025] hover:border-white/20"
                )}
              >
                <p className="text-sm text-muted-foreground">
                  Drop here to remove from project
                </p>
              </div>
            </div>
          )}
        </ScrollArea>
      </div>

      <ProjectModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedProject(undefined);
        }}
        project={selectedProject}
      />
    </>
  );
}

interface ProjectItemProps {
  project: Project;
  isActive: boolean;
  onEdit: (project: Project) => void;
  mappings: TaskListMapping[];
  isSyncing: boolean;
  onSync: (projectId: string, mappingId: string) => void;
}

function ProjectItem({
  project,
  isActive,
  onEdit,
  mappings,
  isSyncing,
  onSync,
}: ProjectItemProps) {
  const { setActiveProject } = useProjectStore();
  const { tasks } = useTaskStore();
  const { droppableProps, isOver } = useDroppableProject(project);

  // Count non-completed tasks for this project
  const taskCount = tasks.filter(
    (task) =>
      task.projectId === project.id && task.status !== TaskStatus.COMPLETED
  ).length;
  const overdueSummary = getOverdueSummary(
    tasks.filter((task) => task.projectId === project.id)
  );

  // Check if project has any task mappings
  const hasMappings = mappings.length > 0;

  return (
    <div
      {...droppableProps}
      className={cn(
        "group flex w-full cursor-pointer items-center space-x-2 rounded-xl px-3 py-2 transition-all",
        isActive
          ? "bg-white/10 text-secondary-foreground shadow-[0_0_24px_-18px_var(--acc-violet)]"
          : "hover:bg-white/[0.06]",
        isOver && "ring-2 ring-ring"
      )}
      onClick={() => setActiveProject(project)}
    >
      <div
        className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-md text-[11px] font-semibold"
        style={{
          backgroundColor: project.color
            ? `color-mix(in srgb, ${project.color} 22%, var(--raised))`
            : "var(--active)",
          color: project.color || "var(--text-lo)",
        }}
      >
        {project.icon || project.name.slice(0, 1).toUpperCase()}
      </div>
      <span className="project-name min-w-0 flex-1 truncate">
        {project.name}
        {(project.progress ?? 0) > 0 && (
          <span className="ml-1 text-[10px] text-[var(--text-lo)]">
            {project.progress ?? 0}%
          </span>
        )}
      </span>
      {overdueSummary.count > 0 && (
        <span
          className={cn(
            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
            overdueSummary.severity === "red"
              ? "bg-red-500/20 text-red-200"
              : "bg-orange-500/20 text-orange-200"
          )}
        >
          ‼{" "}
          <NumberFlow
            value={overdueSummary.count}
            transformTiming={{ duration: 180, easing: "ease-out" }}
            respectMotionPreference
          />
        </span>
      )}
      <span className="text-xs text-muted-foreground">
        <NumberFlow
          value={taskCount}
          transformTiming={{ duration: 180, easing: "ease-out" }}
          respectMotionPreference
        />
      </span>

      {hasMappings && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          disabled={isSyncing}
          onClick={(e) => {
            e.stopPropagation();
            onSync(project.id, mappings[0].id);
          }}
        >
          <BsArrowRepeat
            className={cn("h-3.5 w-3.5", isSyncing && "animate-spin")}
          />
        </Button>
      )}

      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onEdit(project);
        }}
      >
        <HiPencil className="h-3 w-3" />
      </Button>
    </div>
  );
}
