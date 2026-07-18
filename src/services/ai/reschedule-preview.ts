import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";
import { Prisma } from "@prisma/client";

import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { publishRealtimeEvent } from "@/lib/realtime/publish";

import { decryptSecret, encryptSecret } from "./encryption";

const LOG_SOURCE = "ai-reschedule-preview";
const TOKEN_TTL_MS = 15 * 60 * 1000;

type SnapshotTask = {
  id: string;
  title: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  scheduleScore: number | null;
  lastScheduled: string | null;
  isAutoScheduled: boolean;
  autoScheduled: boolean;
};

type SnapshotBlock = {
  taskId: string;
  start: string;
  end: string;
  chunkIndex: number;
  chunkCount: number;
  isFrozen: boolean;
};

export type ScheduleSnapshot = {
  tasks: SnapshotTask[];
  blocks: SnapshotBlock[];
};

type ScheduleToken = {
  version: 1;
  kind: "preview" | "undo";
  userId: string;
  expiresAt: string;
  before: ScheduleSnapshot;
  after: ScheduleSnapshot;
};

export type RescheduleChange = {
  taskId: string;
  title: string;
  fromStart: string | null;
  toStart: string | null;
  fromEnd: string | null;
  toEnd: string | null;
};

async function captureSnapshot(userId: string): Promise<ScheduleSnapshot> {
  const [tasks, blocks] = await Promise.all([
    prisma.task.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        scheduledStart: true,
        scheduledEnd: true,
        scheduleScore: true,
        lastScheduled: true,
        isAutoScheduled: true,
        autoScheduled: true,
      },
    }),
    prisma.scheduledBlock.findMany({
      where: { userId },
      select: {
        taskId: true,
        start: true,
        end: true,
        chunkIndex: true,
        chunkCount: true,
        isFrozen: true,
      },
    }),
  ]);
  return {
    tasks: tasks.map((task) => ({
      ...task,
      scheduledStart: task.scheduledStart?.toISOString() ?? null,
      scheduledEnd: task.scheduledEnd?.toISOString() ?? null,
      lastScheduled: task.lastScheduled?.toISOString() ?? null,
    })),
    blocks: blocks.map((block) => ({
      ...block,
      start: block.start.toISOString(),
      end: block.end.toISOString(),
    })),
  };
}

async function computeStagedSnapshot(
  userId: string,
  before: ScheduleSnapshot
): Promise<ScheduleSnapshot> {
  const [legacy, preferences, energyWindows, sourceTasks] = await Promise.all([
    prisma.autoScheduleSettings.findUnique({ where: { userId } }),
    prisma.schedulingPreferences.findUnique({ where: { userId } }),
    prisma.energyProfileWindow.findMany({ where: { userId } }),
    prisma.task.findMany({
      where: {
        userId,
        OR: [{ isAutoScheduled: true }, { autoScheduled: true }],
        status: { notIn: ["completed", "in_progress"] },
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        dueDate: true,
        startDate: true,
        duration: true,
        priority: true,
        energyLevel: true,
        preferredTime: true,
        energyRequired: true,
        estimatedMinutes: true,
        estLikely: true,
        minChunkMinutes: true,
        maxChunkMinutes: true,
        deadline: true,
        priorityLevel: true,
        contextTag: true,
        isFrozen: true,
        dependsOnId: true,
        autoScheduled: true,
        isAutoScheduled: true,
        scheduleLocked: true,
        scheduledStart: true,
        scheduledEnd: true,
        scheduleScore: true,
        lastScheduled: true,
        postponedUntil: true,
        isRecurring: true,
        recurrenceRule: true,
        lastCompletedDate: true,
        completedAt: true,
      },
    }),
  ]);
  if (!legacy) {
    throw new Error("Auto-schedule settings not found for user");
  }

  const stagingUser = await prisma.user.create({
    data: { name: "Schedule preview staging" },
    select: { id: true },
  });
  try {
    await prisma.autoScheduleSettings.create({
      data: {
        userId: stagingUser.id,
        workDays: legacy.workDays,
        workHourStart: legacy.workHourStart,
        workHourEnd: legacy.workHourEnd,
        selectedCalendars: legacy.selectedCalendars,
        bufferMinutes: legacy.bufferMinutes,
        highEnergyStart: legacy.highEnergyStart,
        highEnergyEnd: legacy.highEnergyEnd,
        mediumEnergyStart: legacy.mediumEnergyStart,
        mediumEnergyEnd: legacy.mediumEnergyEnd,
        lowEnergyStart: legacy.lowEnergyStart,
        lowEnergyEnd: legacy.lowEnergyEnd,
        groupByProject: legacy.groupByProject,
        pushTasksToCalendar: false,
      },
    });
    if (preferences) {
      await prisma.schedulingPreferences.create({
        data: {
          userId: stagingUser.id,
          workHours:
            (preferences.workHours as Prisma.InputJsonValue | null) ??
            undefined,
          bufferMinutes: preferences.bufferMinutes,
          maxDeepWorkPerDay: preferences.maxDeepWorkPerDay,
          minBreakMinutes: preferences.minBreakMinutes,
          autoRescheduleOnMiss: preferences.autoRescheduleOnMiss,
          enableBodyDoubling: preferences.enableBodyDoubling,
          enableTaskBatching: preferences.enableTaskBatching,
          hardStopTime: preferences.hardStopTime,
          bufferMultiplier: preferences.bufferMultiplier,
        },
      });
    }
    if (energyWindows.length) {
      await prisma.energyProfileWindow.createMany({
        data: energyWindows.map((window) => ({
          userId: stagingUser.id,
          dayOfWeek: window.dayOfWeek,
          startTime: window.startTime,
          endTime: window.endTime,
          energyLevel: window.energyLevel,
          sortOrder: window.sortOrder,
        })),
      });
    }

    const stagedPairs = await Promise.all(
      sourceTasks.map(async ({ id, dependsOnId, ...task }) => ({
        originalId: id,
        dependsOnId,
        staged: await prisma.task.create({
          data: { ...task, userId: stagingUser.id },
          select: { id: true },
        }),
      }))
    );
    const stagedIdByOriginal = new Map(
      stagedPairs.map((pair) => [pair.originalId, pair.staged.id])
    );
    await Promise.all(
      stagedPairs.flatMap((pair) => {
        const stagedDependency = pair.dependsOnId
          ? stagedIdByOriginal.get(pair.dependsOnId)
          : null;
        return stagedDependency
          ? [
              prisma.task.update({
                where: { id: pair.staged.id },
                data: { dependsOnId: stagedDependency },
              }),
            ]
          : [];
      })
    );

    await scheduleAllTasksForUser(stagingUser.id, {
      entitlementUserId: userId,
    });
    const [stagedTasks, stagedBlocks] = await Promise.all([
      prisma.task.findMany({
        where: { userId: stagingUser.id },
        select: {
          id: true,
          scheduledStart: true,
          scheduledEnd: true,
          scheduleScore: true,
          lastScheduled: true,
          isAutoScheduled: true,
          autoScheduled: true,
        },
      }),
      prisma.scheduledBlock.findMany({
        where: { userId: stagingUser.id },
      }),
    ]);
    const originalIdByStaged = new Map(
      stagedPairs.map((pair) => [pair.staged.id, pair.originalId])
    );
    const stagedByOriginal = new Map(
      stagedTasks.flatMap((task) => {
        const originalId = originalIdByStaged.get(task.id);
        return originalId ? [[originalId, task] as const] : [];
      })
    );
    const mutableOriginalIds = new Set(
      sourceTasks
        .filter((task) => !task.isFrozen && !task.scheduleLocked)
        .map((task) => task.id)
    );

    return {
      tasks: before.tasks.map((task) => {
        const staged = stagedByOriginal.get(task.id);
        return staged
          ? {
              ...task,
              scheduledStart: staged.scheduledStart?.toISOString() ?? null,
              scheduledEnd: staged.scheduledEnd?.toISOString() ?? null,
              scheduleScore: staged.scheduleScore,
              lastScheduled: staged.lastScheduled?.toISOString() ?? null,
              isAutoScheduled: staged.isAutoScheduled,
              autoScheduled: staged.autoScheduled,
            }
          : task;
      }),
      blocks: [
        ...before.blocks.filter(
          (block) => !mutableOriginalIds.has(block.taskId)
        ),
        ...stagedBlocks.flatMap((block): SnapshotBlock[] => {
          const originalId = originalIdByStaged.get(block.taskId);
          return originalId
            ? [
                {
                  taskId: originalId,
                  start: block.start.toISOString(),
                  end: block.end.toISOString(),
                  chunkIndex: block.chunkIndex,
                  chunkCount: block.chunkCount,
                  isFrozen: block.isFrozen,
                },
              ]
            : [];
        }),
      ],
    };
  } finally {
    await prisma.user.delete({ where: { id: stagingUser.id } });
  }
}

async function restoreSnapshot(userId: string, snapshot: ScheduleSnapshot) {
  const ownedTasks = await prisma.task.findMany({
    where: { userId, id: { in: snapshot.tasks.map((task) => task.id) } },
    select: { id: true },
  });
  const ownedIds = new Set(ownedTasks.map((task) => task.id));
  const tasks = snapshot.tasks.filter((task) => ownedIds.has(task.id));
  const blocks = snapshot.blocks.filter((block) => ownedIds.has(block.taskId));

  await prisma.$transaction(async (tx) => {
    await tx.scheduledBlock.deleteMany({
      where: { userId, taskId: { in: [...ownedIds] } },
    });
    await Promise.all(
      tasks.map((task) =>
        tx.task.updateMany({
          where: { id: task.id, userId },
          data: {
            scheduledStart: task.scheduledStart
              ? newDate(task.scheduledStart)
              : null,
            scheduledEnd: task.scheduledEnd ? newDate(task.scheduledEnd) : null,
            scheduleScore: task.scheduleScore,
            lastScheduled: task.lastScheduled
              ? newDate(task.lastScheduled)
              : null,
            isAutoScheduled: task.isAutoScheduled,
            autoScheduled: task.autoScheduled,
          },
        })
      )
    );
    if (blocks.length) {
      await tx.scheduledBlock.createMany({
        data: blocks.map((block) => ({
          userId,
          taskId: block.taskId,
          start: newDate(block.start),
          end: newDate(block.end),
          chunkIndex: block.chunkIndex,
          chunkCount: block.chunkCount,
          isFrozen: block.isFrozen,
        })),
      });
    }
  });
}

export function diffScheduleSnapshots(
  before: ScheduleSnapshot,
  after: ScheduleSnapshot
) {
  const oldById = new Map(before.tasks.map((task) => [task.id, task]));
  return after.tasks.flatMap((task): RescheduleChange[] => {
    const previous = oldById.get(task.id);
    if (
      previous?.scheduledStart === task.scheduledStart &&
      previous?.scheduledEnd === task.scheduledEnd
    ) {
      return [];
    }
    return [
      {
        taskId: task.id,
        title: task.title,
        fromStart: previous?.scheduledStart ?? null,
        toStart: task.scheduledStart,
        fromEnd: previous?.scheduledEnd ?? null,
        toEnd: task.scheduledEnd,
      },
    ];
  });
}

function encodeToken(
  kind: ScheduleToken["kind"],
  userId: string,
  before: ScheduleSnapshot,
  after: ScheduleSnapshot
) {
  return encryptSecret(
    JSON.stringify({
      version: 1,
      kind,
      userId,
      expiresAt: newDate(newDate().getTime() + TOKEN_TTL_MS).toISOString(),
      before,
      after,
    } satisfies ScheduleToken)
  );
}

function decodeToken(
  token: string,
  userId: string,
  kind: ScheduleToken["kind"]
) {
  const decrypted = decryptSecret(token);
  if (!decrypted) throw new Error("Invalid schedule token");
  const value = JSON.parse(decrypted) as ScheduleToken;
  if (
    value.version !== 1 ||
    value.kind !== kind ||
    value.userId !== userId ||
    newDate(value.expiresAt) < newDate()
  ) {
    throw new Error("Expired or invalid schedule token");
  }
  return value;
}

export async function createReschedulePreview(userId: string) {
  const before = await captureSnapshot(userId);
  const after = await computeStagedSnapshot(userId, before);
  const changes = diffScheduleSnapshots(before, after);
  logger.info(
    "Created schedule preview",
    { userId, changes: changes.length },
    LOG_SOURCE
  );
  return {
    changes,
    previewToken: encodeToken("preview", userId, before, after),
  };
}

export async function applyReschedulePreview(userId: string, token: string) {
  const value = decodeToken(token, userId, "preview");
  await restoreSnapshot(userId, value.after);
  await publishScheduleChange(userId);
  logger.info("Applied schedule preview", { userId }, LOG_SOURCE);
  return {
    changes: diffScheduleSnapshots(value.before, value.after),
    undoToken: encodeToken("undo", userId, value.before, value.after),
  };
}

export async function undoReschedulePreview(userId: string, token: string) {
  const value = decodeToken(token, userId, "undo");
  await restoreSnapshot(userId, value.before);
  await publishScheduleChange(userId);
  logger.info("Undid schedule preview", { userId }, LOG_SOURCE);
  return { changes: diffScheduleSnapshots(value.after, value.before) };
}

async function publishScheduleChange(userId: string) {
  try {
    await publishRealtimeEvent(userId, "tasks-updated");
  } catch (error) {
    logger.warn(
      "Could not publish schedule realtime event",
      { userId, error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
  }
}

export function schedulePreviewJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
