export interface ProjectProgressTask {
  status: string;
  isArchived?: boolean;
}

export interface ProjectProgress {
  completed: number;
  total: number;
  progress: number;
}

export function deriveProjectProgress(
  tasks: ProjectProgressTask[]
): ProjectProgress {
  const activeTasks = tasks.filter((task) => !task.isArchived);
  const completed = activeTasks.filter(
    (task) => task.status === "completed"
  ).length;
  const total = activeTasks.length;

  return {
    completed,
    total,
    progress: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}
