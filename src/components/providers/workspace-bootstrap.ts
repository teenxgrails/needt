import { logger } from "@/lib/logger";

import type { Project } from "@/types/project";
import type { Tag, Task } from "@/types/task";

const LOG_SOURCE = "WorkspaceProvider";

interface WorkspaceStoreBootstrap {
  projects: Project[];
  tags: Tag[];
  tasks: Task[];
}

export async function loadWorkspaceStores(): Promise<WorkspaceStoreBootstrap> {
  const [tasksResponse, tagsResponse, projectsResponse] = await Promise.all([
    fetch("/api/tasks", { cache: "no-store" }),
    fetch("/api/tags", { cache: "no-store" }),
    fetch("/api/projects", { cache: "no-store" }),
  ]);
  if (!tasksResponse.ok || !tagsResponse.ok || !projectsResponse.ok) {
    throw new Error("Could not load workspace stores.");
  }

  const [tasks, tags, projects] = await Promise.all([
    tasksResponse.json() as Promise<Task[]>,
    tagsResponse.json() as Promise<Tag[]>,
    projectsResponse.json() as Promise<Project[]>,
  ]);
  return { projects, tags, tasks };
}

export async function reportWorkspaceBootstrapFailure(error: unknown) {
  try {
    await logger.error(
      "Initial workspace request failed",
      { errorType: error instanceof Error ? error.name : "UnknownError" },
      LOG_SOURCE
    );
  } catch {
    // Logging must not turn a recoverable workspace request failure into one.
  }
}
