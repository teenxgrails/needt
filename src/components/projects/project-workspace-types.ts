import type { Project, ProjectBlocker, ProjectStage } from "@/types/project";
import type { Task } from "@/types/task";

export type ProjectWorkspaceTask = Task & {
  stage?: ProjectStage | null;
  assignee?: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  blockedByDependencies?: Array<{
    blocker: { id: string; title: string; status: string };
  }>;
};

export type ProjectWorkspaceBlocker = ProjectBlocker & {
  task?: { id: string; title: string; status: string } | null;
  stage?: { id: string; name: string } | null;
  blockerTask?: { id: string; title: string; status: string } | null;
};

export type ProjectWorkspaceDetail = Omit<Project, "stages" | "blockers"> & {
  tasks: ProjectWorkspaceTask[];
  stages: ProjectStage[];
  blockers: ProjectWorkspaceBlocker[];
};
