import * as Sentry from "@sentry/node";
import { Queue } from "bullmq";

import { prisma } from "@/lib/prisma";
import { getRedisConnection } from "@/lib/queue/connection";
import {
  getBugReportSyncQueue,
  getCalendarSyncQueue,
  getMailSyncQueue,
  getNudgeQueue,
  getReminderQueue,
  getRescheduleQueue,
  getWebhookRenewQueue,
} from "@/lib/queue/queues";

const CRON_INTERVALS_MS: Record<string, number> = {
  reschedule: 30 * 60_000,
  "calendar-sync": 15 * 60_000,
  "task-reminder-sweep": 60_000,
  "proactive-nudge-sweep": 15 * 60_000,
  "calendar-webhook-renewal": 6 * 60 * 60_000,
  "bug-report-retry": 30 * 60_000,
};

export function operationsQueues(): Queue[] {
  return [
    getRescheduleQueue(),
    getCalendarSyncQueue(),
    getWebhookRenewQueue(),
    getMailSyncQueue(),
    getBugReportSyncQueue(),
    getReminderQueue(),
    getNudgeQueue(),
  ];
}

async function alertOnce(key: string, level: "warning" | "critical", message: string) {
  const redis = getRedisConnection();
  const acquired = await redis.set(
    `needt:operations-alert:${key}:${level}`,
    "1",
    "EX",
    300,
    "NX"
  );
  if (!acquired) return;
  Sentry.captureMessage(message, level === "critical" ? "fatal" : "warning");
}

export async function collectOperationsHealth(options?: {
  alert?: boolean;
}) {
  const queueMetrics = await Promise.all(
    operationsQueues().map(async (queue) => {
      const [counts, oldest] = await Promise.all([
        queue.getJobCounts("waiting", "active", "failed"),
        queue.getWaiting(0, 0),
      ]);
      const oldestTimestamp = oldest[0]?.timestamp ?? null;
      const oldestWaitingAgeMs = oldestTimestamp
        ? Math.max(0, Date.now() - oldestTimestamp)
        : 0;
      const severity =
        counts.waiting > 500 || oldestWaitingAgeMs > 10 * 60_000
          ? "critical"
          : counts.waiting > 100 || oldestWaitingAgeMs > 2 * 60_000
            ? "warning"
            : "healthy";
      if (options?.alert && severity !== "healthy") {
        await alertOnce(
          `queue:${queue.name}`,
          severity,
          `${queue.name} queue is ${severity}: ${counts.waiting} waiting, oldest ${Math.round(oldestWaitingAgeMs / 1000)}s`
        );
      }
      return {
        name: queue.name,
        ...counts,
        severity,
        oldestWaitingAt: oldestTimestamp
          ? new Date(oldestTimestamp).toISOString()
          : null,
        oldestWaitingAgeMs,
      };
    })
  );

  const cronStates = await prisma.cronState.findMany({ orderBy: { id: "asc" } });
  const cronHealth = cronStates.map((cron) => {
    const interval =
      CRON_INTERVALS_MS[cron.id] ??
      Object.entries(CRON_INTERVALS_MS).find(([key]) =>
        cron.id.includes(key)
      )?.[1] ??
      30 * 60_000;
    const ageMs = cron.lastSucceededAt
      ? Date.now() - cron.lastSucceededAt.getTime()
      : Number.POSITIVE_INFINITY;
    return {
      ...cron,
      expectedIntervalMs: interval,
      overdue: ageMs > interval * 1.5,
    };
  });
  if (options?.alert) {
    await Promise.all(
      cronHealth
        .filter((cron) => cron.overdue)
        .map((cron) =>
          alertOnce(
            `cron:${cron.id}`,
            "critical",
            `${cron.id} cron missed its execution window`
          )
        )
    );
  }
  return { queues: queueMetrics, cronStates: cronHealth };
}
