import { TimeEntrySource } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function minutesBetween(start: Date, end: Date): number {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60_000));
}

function delta(actual: number, estimate?: number | null): number | null {
  return estimate ? actual - estimate : null;
}

export async function recomputeTaskActuals(taskId: string) {
  const [task, entries] = await Promise.all([
    prisma.task.findUnique({
      where: { id: taskId },
      select: {
        id: true,
        estimatedMinutes: true,
        estOptimistic: true,
        estLikely: true,
        estPessimistic: true,
      },
    }),
    prisma.timeEntry.findMany({
      where: { taskId, endedAt: { not: null } },
      select: { startedAt: true, endedAt: true },
    }),
  ]);

  if (!task) return null;

  const actualMinutes = entries.reduce((total, entry) => {
    if (!entry.endedAt) return total;
    return total + minutesBetween(entry.startedAt, entry.endedAt);
  }, 0);

  return prisma.task.update({
    where: { id: taskId },
    data: {
      actualMinutes,
      estimateDelta: delta(actualMinutes, task.estimatedMinutes),
      optimisticDelta: delta(actualMinutes, task.estOptimistic),
      likelyDelta: delta(actualMinutes, task.estLikely),
      pessimisticDelta: delta(actualMinutes, task.estPessimistic),
    },
  });
}

export async function getTaskTimeSummary(taskId: string, userId: string) {
  const entries = await prisma.timeEntry.findMany({
    where: { taskId, userId },
    orderBy: { startedAt: "desc" },
  });
  const activeEntry = entries.find((entry) => !entry.endedAt) ?? null;
  const totalMinutes = entries.reduce((total, entry) => {
    if (!entry.endedAt) return total;
    return total + minutesBetween(entry.startedAt, entry.endedAt);
  }, 0);

  return { activeEntry, totalMinutes, entries };
}

export async function startTaskTimer(
  taskId: string,
  userId: string,
  source: TimeEntrySource = TimeEntrySource.timer
) {
  const active = await prisma.timeEntry.findFirst({
    where: { taskId, userId, endedAt: null },
  });

  if (active) return active;

  return prisma.timeEntry.create({
    data: {
      taskId,
      userId,
      startedAt: new Date(),
      source,
    },
  });
}

export async function stopTaskTimer(taskId: string, userId: string) {
  const active = await prisma.timeEntry.findFirst({
    where: { taskId, userId, endedAt: null },
    orderBy: { startedAt: "desc" },
  });

  if (!active) {
    return null;
  }

  const entry = await prisma.timeEntry.update({
    where: { id: active.id },
    data: { endedAt: new Date() },
  });

  await recomputeTaskActuals(taskId);
  return entry;
}

export async function addManualTimeEntry(
  taskId: string,
  userId: string,
  minutes: number
) {
  const endedAt = new Date();
  const startedAt = new Date(endedAt.getTime() - minutes * 60_000);
  const entry = await prisma.timeEntry.create({
    data: {
      taskId,
      userId,
      startedAt,
      endedAt,
      source: TimeEntrySource.manual,
    },
  });

  await recomputeTaskActuals(taskId);
  return entry;
}
