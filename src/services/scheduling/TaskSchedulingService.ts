import { getCalibrationContext } from "@/services/time-tracking/calibration";

import { canAutoScheduleMore } from "@/lib/entitlements";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

import { ProjectStatus } from "@/types/project";
import {
  EnergyLevel,
  Priority,
  SchedulingEnergyLevel,
  SchedulingTaskPriority,
  TaskStatus,
  TaskWithRelations,
  TimePreference,
} from "@/types/task";

import {
  CalendarBusyBlock,
  EnergyProfile,
  SchedulableTask,
  ScheduleResult,
  SchedulingPreferences,
  scheduleTasks,
} from "./engine";

const LOG_SOURCE = "TaskSchedulingService";
const DEFAULT_HORIZON_DAYS = 21;
const DEFAULT_WORK_HOURS: SchedulingPreferences["workHours"] = {
  "1": { start: "09:00", end: "17:00" },
  "2": { start: "09:00", end: "17:00" },
  "3": { start: "09:00", end: "17:00" },
  "4": { start: "09:00", end: "17:00" },
  "5": { start: "09:00", end: "17:00" },
};

type DbTaskWithRelations = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  dueDate: Date | null;
  startDate: Date | null;
  duration: number | null;
  priority: string | null;
  energyLevel: string | null;
  preferredTime: string | null;
  energyRequired: SchedulingEnergyLevel;
  estimatedMinutes: number | null;
  estLikely: number | null;
  minChunkMinutes: number | null;
  maxChunkMinutes: number | null;
  deadline: Date | null;
  priorityLevel: SchedulingTaskPriority;
  contextTag: string | null;
  isFrozen: boolean;
  dependsOnId: string | null;
  autoScheduled: boolean;
  scheduledBlocks?: {
    id: string;
    taskId: string;
    userId: string | null;
    start: Date;
    end: Date;
    chunkIndex: number;
    chunkCount: number;
    isFrozen: boolean;
  }[];
  projectId: string | null;
  createdAt: Date;
  updatedAt: Date;
  recurrenceRule: string | null;
  lastCompletedDate: Date | null;
  completedAt: Date | null;
  isRecurring: boolean;
  isAutoScheduled: boolean;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  scheduleScore: number | null;
  lastScheduled: Date | null;
  scheduleLocked: boolean;
  postponedUntil: Date | null;
  userId: string | null;
  tags: {
    id: string;
    name: string;
    color: string | null;
    userId: string | null;
  }[];
  project: {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string | null;
  } | null;
};

function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function parseWorkDays(value: string | null | undefined): number[] {
  if (!value) {
    return [1, 2, 3, 4, 5];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter(
          (item): item is number =>
            Number.isInteger(item) && item >= 0 && item <= 6
        )
      : [1, 2, 3, 4, 5];
  } catch {
    return [1, 2, 3, 4, 5];
  }
}

function toTime(hour: number): string {
  return `${hour.toString().padStart(2, "0")}:00`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function convertDbTaskToTaskWithRelations(
  dbTask: DbTaskWithRelations
): TaskWithRelations {
  return {
    ...dbTask,
    status: dbTask.status as TaskStatus,
    priority: dbTask.priority as Priority | null,
    energyLevel: dbTask.energyLevel as EnergyLevel | null,
    preferredTime: dbTask.preferredTime as TimePreference | null,
    tags: dbTask.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color || undefined,
    })),
    project: dbTask.project
      ? {
          ...dbTask.project,
          status: dbTask.project.status as ProjectStatus,
        }
      : null,
  };
}

function toSchedulableTask(task: DbTaskWithRelations): SchedulableTask {
  return {
    id: task.id,
    title: task.title,
    status: task.status,
    createdAt: task.createdAt,
    estimatedMinutes: task.estLikely ?? task.estimatedMinutes,
    durationMinutes: task.duration,
    minChunkMinutes: task.minChunkMinutes,
    maxChunkMinutes: task.maxChunkMinutes,
    deadline: task.deadline ?? task.dueDate,
    priority: task.priorityLevel,
    energyRequired: task.energyRequired,
    contextTag: task.contextTag,
    isFrozen: task.isFrozen || task.scheduleLocked,
    dependsOnId: task.dependsOnId,
    autoScheduled: task.autoScheduled || task.isAutoScheduled,
    scheduledStart: task.scheduledStart,
    scheduledEnd: task.scheduledEnd,
  };
}

function buildPreferences(
  smartPrefs: {
    workHours: unknown;
    bufferMinutes: number;
    maxDeepWorkPerDay: number;
    minBreakMinutes: number;
    autoRescheduleOnMiss: boolean;
    enableBodyDoubling: boolean;
    enableTaskBatching: boolean;
    hardStopTime: string;
    bufferMultiplier: number;
  } | null,
  legacySettings: {
    workDays: string;
    workHourStart: number;
    workHourEnd: number;
    bufferMinutes: number;
  }
): SchedulingPreferences {
  if (smartPrefs) {
    return {
      workHours:
        smartPrefs.workHours &&
        typeof smartPrefs.workHours === "object" &&
        !Array.isArray(smartPrefs.workHours)
          ? (smartPrefs.workHours as SchedulingPreferences["workHours"])
          : DEFAULT_WORK_HOURS,
      bufferMinutes: smartPrefs.bufferMinutes,
      maxDeepWorkPerDay: smartPrefs.maxDeepWorkPerDay,
      minBreakMinutes: smartPrefs.minBreakMinutes,
      autoRescheduleOnMiss: smartPrefs.autoRescheduleOnMiss,
      enableBodyDoubling: smartPrefs.enableBodyDoubling,
      enableTaskBatching: smartPrefs.enableTaskBatching,
      hardStopTime: smartPrefs.hardStopTime,
      bufferMultiplier: smartPrefs.bufferMultiplier,
    };
  }

  return {
    workHours: Object.fromEntries(
      parseWorkDays(legacySettings.workDays).map((day) => [
        String(day),
        {
          start: toTime(legacySettings.workHourStart),
          end: toTime(legacySettings.workHourEnd),
        },
      ])
    ),
    bufferMinutes: legacySettings.bufferMinutes,
    maxDeepWorkPerDay: 180,
    minBreakMinutes: 15,
    autoRescheduleOnMiss: true,
    enableBodyDoubling: false,
    enableTaskBatching: true,
    hardStopTime: toTime(legacySettings.workHourEnd),
    bufferMultiplier: 1.3,
  };
}

function buildFallbackEnergyProfile(legacySettings: {
  highEnergyStart: number | null;
  highEnergyEnd: number | null;
  mediumEnergyStart: number | null;
  mediumEnergyEnd: number | null;
  lowEnergyStart: number | null;
  lowEnergyEnd: number | null;
  workDays: string;
}): EnergyProfile {
  return {
    windows: parseWorkDays(legacySettings.workDays).flatMap((dayOfWeek) => [
      {
        dayOfWeek,
        startTime: toTime(legacySettings.highEnergyStart ?? 9),
        endTime: toTime(legacySettings.highEnergyEnd ?? 12),
        energyLevel: "HIGH",
      },
      {
        dayOfWeek,
        startTime: toTime(legacySettings.lowEnergyStart ?? 13),
        endTime: toTime(legacySettings.lowEnergyEnd ?? 14),
        energyLevel: "LOW",
      },
      {
        dayOfWeek,
        startTime: toTime(legacySettings.mediumEnergyStart ?? 15),
        endTime: toTime(legacySettings.mediumEnergyEnd ?? 18),
        energyLevel: "MEDIUM",
      },
    ]),
  };
}

function summarizeSchedule(result: ScheduleResult) {
  return {
    blocks: result.blocks.length,
    frozenBlocks: result.frozenBlocks.length,
    unscheduled: result.unscheduled.length,
  };
}

export async function scheduleAllTasksForUser(
  userId: string,
  options: { entitlementUserId?: string } = {}
): Promise<TaskWithRelations[]> {
  try {
    logger.info("Starting task scheduling for user", { userId }, LOG_SOURCE);

    const legacySettings = await prisma.autoScheduleSettings.findUnique({
      where: { userId },
    });

    if (!legacySettings) {
      throw new Error("Auto-schedule settings not found for user");
    }

    const smartPrefs = await prisma.schedulingPreferences.findUnique({
      where: { userId },
    });
    const calibration = await getCalibrationContext(userId);
    const energyWindows = await prisma.energyProfileWindow.findMany({
      where: { userId },
      orderBy: [{ dayOfWeek: "asc" }, { sortOrder: "asc" }],
    });
    const now = new Date();
    const selectedCalendarIds = parseJsonArray(
      legacySettings.selectedCalendars
    );
    const busyEvents = await prisma.calendarEvent.findMany({
      where: {
        feedId: { in: selectedCalendarIds },
        start: { lt: addDays(now, DEFAULT_HORIZON_DAYS) },
        end: { gt: now },
      },
    });

    let dbTasks = (await prisma.task.findMany({
      where: {
        OR: [{ isAutoScheduled: true }, { autoScheduled: true }],
        status: {
          not: {
            in: [TaskStatus.COMPLETED, TaskStatus.IN_PROGRESS],
          },
        },
        userId,
      },
      include: {
        project: true,
        tags: true,
        scheduledBlocks: { orderBy: { chunkIndex: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    })) as DbTaskWithRelations[];
    const entitlement = await canAutoScheduleMore(
      options.entitlementUserId || userId
    );
    if (entitlement.remaining !== null) {
      const alreadyScheduled = dbTasks.filter(
        (task) =>
          task.scheduledStart !== null || Boolean(task.scheduledBlocks?.length)
      );
      const newCandidates = dbTasks.filter(
        (task) => task.scheduledStart === null && !task.scheduledBlocks?.length
      );
      dbTasks = [
        ...alreadyScheduled,
        ...newCandidates.slice(0, entitlement.remaining),
      ];
    }

    const result = scheduleTasks({
      tasks: dbTasks.map(toSchedulableTask),
      busyBlocks: busyEvents.map(
        (event): CalendarBusyBlock => ({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          source: "calendar",
        })
      ),
      energyProfile:
        energyWindows.length > 0
          ? {
              windows: energyWindows.map((window) => ({
                dayOfWeek: window.dayOfWeek,
                startTime: window.startTime,
                endTime: window.endTime,
                energyLevel: window.energyLevel,
              })),
            }
          : buildFallbackEnergyProfile(legacySettings),
      prefs: {
        ...buildPreferences(smartPrefs, legacySettings),
        calibrationFactors: calibration.factors,
      },
      now,
    });

    await prisma.task.updateMany({
      where: {
        id: {
          in: dbTasks
            .filter((task) => !task.scheduleLocked && !task.isFrozen)
            .map((task) => task.id),
        },
        userId,
      },
      data: {
        scheduledStart: null,
        scheduledEnd: null,
        scheduleScore: null,
      },
    });
    await prisma.scheduledBlock.deleteMany({
      where: {
        userId,
        taskId: {
          in: dbTasks
            .filter((task) => !task.scheduleLocked && !task.isFrozen)
            .map((task) => task.id),
        },
      },
    });

    const firstBlockByTask = new Map<string, (typeof result.blocks)[number]>();
    for (const block of result.blocks) {
      const existing = firstBlockByTask.get(block.taskId);
      if (!existing || block.start < existing.start) {
        firstBlockByTask.set(block.taskId, block);
      }
    }

    await Promise.all(
      [...firstBlockByTask.values()].map((block) =>
        prisma.task.update({
          where: { id: block.taskId, userId },
          data: {
            scheduledStart: block.start,
            scheduledEnd: block.end,
            isAutoScheduled: true,
            autoScheduled: true,
            scheduleScore: 1,
            lastScheduled: now,
          },
        })
      )
    );
    if (result.blocks.length > 0) {
      await prisma.scheduledBlock.createMany({
        data: result.blocks.map((block) => ({
          taskId: block.taskId,
          userId,
          start: block.start,
          end: block.end,
          chunkIndex: block.chunkIndex,
          chunkCount: block.chunkCount,
          isFrozen: block.isFrozen,
        })),
        skipDuplicates: true,
      });
    }

    const updatedDbTasks = (await prisma.task.findMany({
      where: {
        userId,
      },
      include: {
        tags: true,
        project: true,
        scheduledBlocks: { orderBy: { chunkIndex: "asc" } },
      },
      orderBy: {
        createdAt: "desc",
      },
    })) as DbTaskWithRelations[];

    const tasksWithRelations = updatedDbTasks.map(
      convertDbTaskToTaskWithRelations
    );

    logger.info(
      "Task scheduling completed successfully",
      { userId, summary: JSON.stringify(summarizeSchedule(result)) },
      LOG_SOURCE
    );

    return tasksWithRelations;
  } catch (error) {
    logger.error(
      "Error scheduling tasks",
      {
        error: error instanceof Error ? error.message : String(error),
        userId,
      },
      LOG_SOURCE
    );
    throw error;
  }
}
