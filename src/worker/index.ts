import { syncBugReportToGithub } from "@/services/bug-reports/bug-report-service";
import { generateProactiveNudges } from "@/services/nudges/proactive-assist";
import { collectOperationsHealth } from "@/services/operations/health";
import {
  deliverTaskReminder,
  findDueReminderIds,
} from "@/services/reminders/reminder-delivery";
import { scheduleAllTasksForUser } from "@/services/scheduling/TaskSchedulingService";
import { executeSchedulingRun } from "@/services/scheduling/runs";
import {
  startWorkerHealthServer,
  stopWorkerHealthServer,
} from "@/worker/health-server";
import * as Sentry from "@sentry/node";
import { ConnectionOptions, Job, Worker } from "bullmq";

import { CalDAVCalendarService } from "@/lib/caldav-calendar";
import {
  getCalendarFeedForSync,
  updateCalendarFeedSyncState,
} from "@/lib/calendar-db";
import { renewCalendarWebhooks } from "@/lib/calendar-webhooks/renew";
import { newDate } from "@/lib/date-utils";
import { syncGoogleCalendar } from "@/lib/google-sync";
import { logger } from "@/lib/logger";
import { listActiveMailAccountIds } from "@/lib/mail-db";
import {
  closeImapIdleWatchers,
  ensureImapIdleWatcher,
} from "@/lib/mail/imap-idle";
import { syncMailAccount } from "@/lib/mail/sync";
import { getOutlookClient } from "@/lib/outlook-calendar";
import { syncOutlookCalendar } from "@/lib/outlook-sync";
import {
  closeRedisConnection,
  getRedisConnection,
} from "@/lib/queue/connection";
import {
  enqueueReminderDelivery,
  enqueueReschedule,
  enqueueWebhookRenew,
  ensureMailSyncSchedule,
} from "@/lib/queue/enqueue";
import {
  closeQueues,
  getBugReportSyncQueue,
  getNudgeQueue,
  getReminderQueue,
  getWebhookRenewQueue,
} from "@/lib/queue/queues";
import {
  BugReportSyncJobData,
  CalendarSyncJobData,
  MailSyncJobData,
  NudgeJobData,
  QUEUE_NAMES,
  ReminderJobData,
  RescheduleJobData,
  WebhookRenewJobData,
} from "@/lib/queue/types";
import { publishRealtimeEvent } from "@/lib/realtime/publish";
import {
  dropSentryBreadcrumb,
  scrubSentryEvent,
  scrubSentrySpan,
} from "@/lib/sentry/privacy";

const LOG_SOURCE = "NeedtWorker";
const WEBHOOK_RENEW_INTERVAL_MS = 6 * 60 * 60 * 1_000;
let workerHealthServer: Awaited<
  ReturnType<typeof startWorkerHealthServer>
> | null = null;

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT,
    release: process.env.NEEDT_BUILD_SHA,
    initialScope: { tags: { service: "worker" } },
    tracesSampleRate: 0.02,
    sendDefaultPii: false,
    beforeBreadcrumb: dropSentryBreadcrumb,
    beforeSend: scrubSentryEvent,
    beforeSendTransaction: () => null,
    beforeSendSpan: scrubSentrySpan,
  });
}

async function processCalendarSync(job: Job<CalendarSyncJobData>) {
  const feed = await getCalendarFeedForSync(job.data.feedId);
  if (!feed || !feed.enabled) {
    await logger.info(
      "Skipping unavailable or disabled calendar feed",
      { feedId: job.data.feedId },
      LOG_SOURCE
    );
    return;
  }
  if (!feed.userId || !feed.url || !feed.account) {
    throw new Error("Calendar feed is missing user, URL, or account data.");
  }

  try {
    if (feed.type === "CALDAV") {
      await new CalDAVCalendarService(feed.account).syncCalendar(
        feed.id,
        feed.url,
        feed.userId
      );
      await updateCalendarFeedSyncState(feed.id, {
        lastSync: newDate(),
        error: null,
      });
    } else if (feed.type === "OUTLOOK") {
      const client = await getOutlookClient(feed.account.id, feed.userId);
      const result = await syncOutlookCalendar(
        client,
        { id: feed.id, url: feed.url },
        feed.syncToken
      );
      await updateCalendarFeedSyncState(feed.id, {
        lastSync: newDate(),
        syncToken: result.nextSyncToken ?? feed.syncToken,
        error: null,
      });
    } else if (feed.type === "GOOGLE") {
      await syncGoogleCalendar(feed);
    } else {
      throw new Error(`Unsupported calendar feed type: ${feed.type}`);
    }

    await publishRealtimeEvent(feed.userId, "calendar-updated", {
      feedId: feed.id,
    });
    await enqueueReschedule(feed.userId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateCalendarFeedSyncState(feed.id, { error: message });
    throw error;
  }
}

async function processReschedule(job: Job<RescheduleJobData>) {
  if (job.data.runId) {
    await executeSchedulingRun(job.data.runId);
  } else {
    await scheduleAllTasksForUser(job.data.userId);
  }
  await publishRealtimeEvent(job.data.userId, "tasks-updated");
}

async function processWebhookRenew(job: Job<WebhookRenewJobData>) {
  await renewCalendarWebhooks(job.data);
}

async function processMailSync(job: Job<MailSyncJobData>) {
  await syncMailAccount(job.data.accountId);
  await ensureImapIdleWatcher(job.data.accountId);
}

async function processBugReportSync(job: Job<BugReportSyncJobData>) {
  await syncBugReportToGithub(job.data.reportId);
}

async function processReminder(job: Job<ReminderJobData>) {
  if (job.data.kind === "deliver") {
    await deliverTaskReminder(job.data.reminderId);
    return;
  }
  const reminderIds = await findDueReminderIds();
  await Promise.all(
    reminderIds.map((reminderId) => enqueueReminderDelivery(reminderId))
  );
}

async function processNudges() {
  await generateProactiveNudges();
}

// BullMQ and the app can resolve distinct compatible ioredis patch versions,
// so bridge their nominal types at this boundary.
const connection = getRedisConnection() as unknown as ConnectionOptions;
const workers = [
  new Worker<CalendarSyncJobData>(
    QUEUE_NAMES.calendarSync,
    processCalendarSync,
    { connection, concurrency: 3 }
  ),
  new Worker<RescheduleJobData>(QUEUE_NAMES.reschedule, processReschedule, {
    connection,
    concurrency: 2,
  }),
  new Worker<WebhookRenewJobData>(
    QUEUE_NAMES.webhookRenew,
    processWebhookRenew,
    { connection, concurrency: 1 }
  ),
  new Worker<MailSyncJobData>(QUEUE_NAMES.mailSync, processMailSync, {
    connection,
    concurrency: 3,
  }),
  new Worker<BugReportSyncJobData>(
    QUEUE_NAMES.bugReportSync,
    processBugReportSync,
    {
      connection,
      concurrency: 1,
    }
  ),
  new Worker<ReminderJobData>(QUEUE_NAMES.reminders, processReminder, {
    connection,
    concurrency: 5,
  }),
  new Worker<NudgeJobData>(QUEUE_NAMES.nudges, processNudges, {
    connection,
    concurrency: 1,
  }),
];

for (const worker of workers) {
  worker.on("failed", (job, error) => {
    Sentry.withScope((scope) => {
      scope.setTag("queue", worker.name);
      if (job?.id) scope.setTag("jobId", job.id);
      Sentry.captureException(error);
    });
  });
}

for (const worker of workers) {
  worker.on("failed", (job, error) => {
    void logger.error(
      "Background job failed",
      {
        queue: worker.name,
        jobId: job?.id ?? "unknown",
        error: error.message,
      },
      LOG_SOURCE
    );
  });
}

async function start(): Promise<void> {
  await getWebhookRenewQueue().upsertJobScheduler(
    "calendar-webhook-renewal",
    { every: WEBHOOK_RENEW_INTERVAL_MS },
    { name: "renew-webhooks", data: {} }
  );
  await enqueueWebhookRenew();
  await getBugReportSyncQueue().upsertJobScheduler(
    "bug-report-retry",
    { every: 30 * 60 * 1_000 },
    { name: "retry-unsynced-reports", data: {} }
  );
  await getReminderQueue().upsertJobScheduler(
    "task-reminder-sweep",
    { every: 60_000 },
    { name: "sweep-reminders", data: { kind: "sweep" } }
  );
  await getNudgeQueue().upsertJobScheduler(
    "proactive-nudge-sweep",
    { every: 15 * 60_000 },
    { name: "sweep-nudges", data: { kind: "sweep" } }
  );
  const mailAccountIds = await listActiveMailAccountIds();
  await Promise.all(
    mailAccountIds.map((accountId) => ensureMailSyncSchedule(accountId))
  );
  await Promise.all(
    mailAccountIds.map((accountId) => ensureImapIdleWatcher(accountId))
  );
  workerHealthServer = await startWorkerHealthServer();
  await logger.info(
    "Needt background worker started",
    {
      buildSha: process.env.NEEDT_BUILD_SHA || "local",
      queues: workers.map((worker) => worker.name),
    },
    LOG_SOURCE
  );
}

let shuttingDown = false;
const healthInterval = setInterval(() => {
  void collectOperationsHealth({ alert: true }).catch((error) => {
    Sentry.captureException(error);
  });
}, 60_000);
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  clearInterval(healthInterval);
  await logger.info("Needt background worker stopping", { signal }, LOG_SOURCE);
  await stopWorkerHealthServer(workerHealthServer);
  workerHealthServer = null;
  await closeImapIdleWatchers();
  await Promise.all(workers.map((worker) => worker.close()));
  await closeQueues();
  await closeRedisConnection();
}

process.once("SIGTERM", () => {
  void shutdown("SIGTERM").finally(() => process.exit(0));
});
process.once("SIGINT", () => {
  void shutdown("SIGINT").finally(() => process.exit(0));
});

void start().catch(async (error) => {
  await logger.error(
    "Needt background worker could not start",
    { error: error instanceof Error ? error.message : String(error) },
    LOG_SOURCE
  );
  await shutdown("startup-error");
  process.exit(1);
});
