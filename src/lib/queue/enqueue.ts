import { logger } from "@/lib/logger";
import {
  getCalendarSyncQueue,
  getBugReportSyncQueue,
  getMailSyncQueue,
  getRescheduleQueue,
  getWebhookRenewQueue,
} from "@/lib/queue/queues";
import { CalendarWebhookProvider } from "@/lib/queue/types";

const LOG_SOURCE = "QueueEnqueue";
let reportedMissingRedis = false;

export function isQueueConfigured(): boolean {
  return Boolean(process.env.REDIS_URL?.trim());
}

async function skipWhenUnconfigured(operation: string) {
  if (isQueueConfigured()) return false;
  if (!reportedMissingRedis) {
    reportedMissingRedis = true;
    await logger.info(
      "Queue operation skipped because Redis is not configured",
      { operation },
      LOG_SOURCE
    );
  }
  return true;
}

export async function enqueueCalendarSync(feedId: string) {
  if (await skipWhenUnconfigured("calendar-sync")) return null;
  return getCalendarSyncQueue().add(
    "sync-feed",
    { feedId },
    { jobId: `calendar-sync-${feedId}` }
  );
}

export async function enqueueReschedule(userId: string) {
  if (await skipWhenUnconfigured("reschedule")) return null;
  return getRescheduleQueue().add(
    "reschedule-user",
    { userId },
    { jobId: `reschedule-${userId}` }
  );
}

export async function enqueueWebhookRenew(options?: {
  provider?: CalendarWebhookProvider;
  feedId?: string;
}) {
  if (await skipWhenUnconfigured("webhook-renew")) return null;
  const provider = options?.provider ?? "ALL";
  const feedId = options?.feedId ?? "all";
  return getWebhookRenewQueue().add("renew-webhooks", options ?? {}, {
    jobId: `webhook-renew-${provider}-${feedId}`,
  });
}

export async function enqueueMailSync(accountId: string) {
  if (await skipWhenUnconfigured("mail-sync")) return null;
  return getMailSyncQueue().add(
    "sync-account",
    { accountId },
    {
      jobId: `mail-sync-${accountId}`,
      removeOnComplete: true,
      removeOnFail: 50,
    }
  );
}

export async function ensureMailSyncSchedule(accountId: string) {
  if (await skipWhenUnconfigured("mail-sync-schedule")) return null;
  return getMailSyncQueue().upsertJobScheduler(
    `mail-sync-account-${accountId}`,
    { every: 5 * 60 * 1_000 },
    { name: "sync-account", data: { accountId } }
  );
}

export async function removeMailSyncSchedule(accountId: string) {
  if (await skipWhenUnconfigured("mail-sync-schedule-remove")) return false;
  return getMailSyncQueue().removeJobScheduler(
    `mail-sync-account-${accountId}`
  );
}

export async function enqueueBugReportSync(reportId: string) {
  if (await skipWhenUnconfigured("bug-report-sync")) return null;
  return getBugReportSyncQueue().add("sync-report", { reportId }, {
    jobId: `bug-report-sync-${reportId}`,
    attempts: 6,
    backoff: { type: "exponential", delay: 30_000 },
  });
}
