export interface SchedulableProjectBlocker {
  id: string;
  blockerTask: { status: string } | null;
}

export function deriveProjectBlockerDependencies(
  blockers: SchedulableProjectBlocker[]
) {
  const dependencyIds = blockers.map(
    (blocker) => `project-blocker:${blocker.id}`
  );
  const completedDependencyIds = blockers.flatMap((blocker) =>
    blocker.blockerTask?.status === "completed"
      ? [`project-blocker:${blocker.id}`]
      : []
  );
  return { dependencyIds, completedDependencyIds };
}
