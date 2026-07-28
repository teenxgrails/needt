import {
  SchedulingRunSource,
  SchedulingRunStatus,
} from "@prisma/client";

import { sendConnectorWebhook } from "@/services/connectors/webhooks";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";

import { prisma } from "@/lib/prisma";
import { publishRealtimeEvent } from "@/lib/realtime/publish";
import { repushDirtyBlocks } from "@/lib/task-block-push";

type ScheduleSnapshot = Map<
  string,
  { start: number | null; end: number | null; auto: boolean }
>;

async function scheduleSnapshot(userId: string): Promise<ScheduleSnapshot> {
  const tasks = await prisma.task.findMany({
    where: { userId },
    select: {
      id: true,
      scheduledStart: true,
      scheduledEnd: true,
      isAutoScheduled: true,
      autoScheduled: true,
    },
  });
  return new Map(
    tasks.map((task) => [
      task.id,
      {
        start: task.scheduledStart?.getTime() ?? null,
        end: task.scheduledEnd?.getTime() ?? null,
        auto: task.isAutoScheduled || task.autoScheduled,
      },
    ])
  );
}

export async function createSchedulingRun(input: {
  userId: string;
  source: SchedulingRunSource;
  dedupeKey: string;
}) {
  return prisma.schedulingRun.upsert({
    where: {
      userId_dedupeKey: {
        userId: input.userId,
        dedupeKey: input.dedupeKey,
      },
    },
    update: {},
    create: input,
  });
}

export async function executeSchedulingRun(runId: string) {
  const run = await prisma.schedulingRun.findUnique({
    where: { id: runId },
  });
  // Queue retention and database retention are intentionally independent.
  // A delayed/retried job can outlive its finished run row; treating that as
  // already handled keeps the worker idempotent instead of retrying forever.
  if (!run) return null;
  if (run.status === SchedulingRunStatus.SUCCEEDED) return run;

  await prisma.schedulingRun.update({
    where: { id: run.id },
    data: {
      status: SchedulingRunStatus.RUNNING,
      startedAt: new Date(),
      errorCode: null,
      errorMessage: null,
    },
  });

  try {
    const before = await scheduleSnapshot(run.userId);
    const tasks = await scheduleAllTasksForUser(run.userId);
    const after = await scheduleSnapshot(run.userId);
    let changedTaskCount = 0;
    let placedBlockCount = 0;

    for (const [taskId, next] of after) {
      const previous = before.get(taskId);
      if (
        !previous ||
        previous.start !== next.start ||
        previous.end !== next.end
      ) {
        changedTaskCount += 1;
      }
      if (next.auto && next.start !== null && next.end !== null) {
        placedBlockCount += 1;
      }
    }

    const unscheduledTasks = tasks.filter(
      (task) =>
        (task.isAutoScheduled || task.autoScheduled) &&
        !task.scheduledStart &&
        task.status !== "completed"
    );
    const blockedTaskIds = new Set(
      (
        await prisma.taskDependency.findMany({
          where: {
            userId: run.userId,
            blockedTaskId: { in: unscheduledTasks.map((task) => task.id) },
            blocker: { status: { not: "completed" } },
          },
          select: { blockedTaskId: true },
        })
      ).map((dependency) => dependency.blockedTaskId)
    );
    const unscheduled = unscheduledTasks.map((task) => ({
        taskId: task.id,
        reason: blockedTaskIds.has(task.id)
          ? "DEPENDENCY_BLOCKED"
          : task.duration || task.estimatedMinutes
            ? "NO_WORKING_TIME"
            : "NO_DURATION",
      }));

    await repushDirtyBlocks(run.userId);
    await sendConnectorWebhook({
      userId: run.userId,
      event: "schedule.changed",
      payload: { changedTaskCount, unscheduledCount: unscheduled.length },
    });

    const completed = await prisma.schedulingRun.update({
      where: { id: run.id },
      data: {
        status: SchedulingRunStatus.SUCCEEDED,
        changedTaskCount,
        placedBlockCount,
        unchangedTaskCount: Math.max(0, tasks.length - changedTaskCount),
        unscheduled,
        finishedAt: new Date(),
      },
    });
    await publishRealtimeEvent(run.userId, "schedule-run-updated", {
      runId: run.id,
      status: completed.status,
    });
    await publishRealtimeEvent(run.userId, "tasks-updated");
    return completed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const failed = await prisma.schedulingRun.update({
      where: { id: run.id },
      data: {
        status: SchedulingRunStatus.FAILED,
        errorCode: "SCHEDULING_FAILED",
        errorMessage: message.slice(0, 500),
        finishedAt: new Date(),
      },
    });
    await publishRealtimeEvent(run.userId, "schedule-run-updated", {
      runId: run.id,
      status: failed.status,
    });
    throw error;
  }
}

export async function reapSchedulingRuns() {
  const staleBefore = new Date(Date.now() - 15 * 60 * 1_000);
  const retentionBefore = new Date(Date.now() - 30 * 24 * 60 * 60 * 1_000);
  const [failed, deleted] = await prisma.$transaction([
    prisma.schedulingRun.updateMany({
      where: {
        status: SchedulingRunStatus.RUNNING,
        startedAt: { lt: staleBefore },
      },
      data: {
        status: SchedulingRunStatus.FAILED,
        errorCode: "WORKER_TIMEOUT",
        errorMessage: "The worker stopped before completing this run.",
        finishedAt: new Date(),
      },
    }),
    prisma.schedulingRun.deleteMany({
      where: {
        status: {
          in: [
            SchedulingRunStatus.SUCCEEDED,
            SchedulingRunStatus.FAILED,
          ],
        },
        finishedAt: { lt: retentionBefore },
      },
    }),
  ]);
  return { failed: failed.count, deleted: deleted.count };
}
