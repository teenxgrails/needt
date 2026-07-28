import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export class TaskDependencyError extends Error {
  constructor(
    public readonly code:
      | "TASK_NOT_FOUND"
      | "SELF_DEPENDENCY"
      | "DUPLICATE_DEPENDENCY"
      | "DEPENDENCY_CYCLE"
  ) {
    super(code);
    this.name = "TaskDependencyError";
  }
}

export function wouldCreateDependencyCycle(
  edges: Array<{ blockerTaskId: string; blockedTaskId: string }>,
  blockerTaskId: string,
  blockedTaskId: string
) {
  if (blockerTaskId === blockedTaskId) return true;
  const outgoing = new Map<string, string[]>();
  for (const edge of edges) {
    const next = outgoing.get(edge.blockerTaskId) ?? [];
    next.push(edge.blockedTaskId);
    outgoing.set(edge.blockerTaskId, next);
  }
  const pending = [blockedTaskId];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (current === blockerTaskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    pending.push(...(outgoing.get(current) ?? []));
  }
  return false;
}

export async function listTaskDependencies(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    select: { id: true },
  });
  if (!task) throw new TaskDependencyError("TASK_NOT_FOUND");

  const [blocks, blockedBy] = await Promise.all([
    prisma.taskDependency.findMany({
      where: { userId, blockerTaskId: taskId },
      include: {
        blocked: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.taskDependency.findMany({
      where: { userId, blockedTaskId: taskId },
      include: {
        blocker: { select: { id: true, title: true, status: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    blocks: blocks.map(({ id, blocked }) => ({ dependencyId: id, task: blocked })),
    blockedBy: blockedBy.map(({ id, blocker }) => ({
      dependencyId: id,
      task: blocker,
    })),
  };
}

export async function addTaskDependency(input: {
  userId: string;
  blockerTaskId: string;
  blockedTaskId: string;
}) {
  if (input.blockerTaskId === input.blockedTaskId) {
    throw new TaskDependencyError("SELF_DEPENDENCY");
  }

  const taskCount = await prisma.task.count({
    where: {
      userId: input.userId,
      id: { in: [input.blockerTaskId, input.blockedTaskId] },
    },
  });
  if (taskCount !== 2) throw new TaskDependencyError("TASK_NOT_FOUND");

  const edges = await prisma.taskDependency.findMany({
    where: { userId: input.userId },
    select: { blockerTaskId: true, blockedTaskId: true },
  });
  // The new edge is blocker -> blocked. It creates a cycle when blocker is
  // already reachable from blocked.
  if (
    wouldCreateDependencyCycle(
      edges,
      input.blockerTaskId,
      input.blockedTaskId
    )
  ) {
    throw new TaskDependencyError("DEPENDENCY_CYCLE");
  }

  try {
    return await prisma.taskDependency.create({
      data: input,
      include: {
        blocker: { select: { id: true, title: true, status: true } },
        blocked: { select: { id: true, title: true, status: true } },
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new TaskDependencyError("DUPLICATE_DEPENDENCY");
    }
    throw error;
  }
}

export async function removeTaskDependency(input: {
  userId: string;
  dependencyId: string;
}) {
  const deleted = await prisma.taskDependency.deleteMany({
    where: { id: input.dependencyId, userId: input.userId },
  });
  if (deleted.count === 0) throw new TaskDependencyError("TASK_NOT_FOUND");
}
