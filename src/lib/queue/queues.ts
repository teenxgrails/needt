import { ConnectionOptions, Queue } from "bullmq";

import { getRedisConnection } from "@/lib/queue/connection";
import {
  CalendarSyncJobData,
  BugReportSyncJobData,
  MailSyncJobData,
  QUEUE_NAMES,
  RescheduleJobData,
  WebhookRenewJobData,
} from "@/lib/queue/types";

let calendarSyncQueue: Queue<CalendarSyncJobData> | null = null;
let rescheduleQueue: Queue<RescheduleJobData> | null = null;
let webhookRenewQueue: Queue<WebhookRenewJobData> | null = null;
let mailSyncQueue: Queue<MailSyncJobData> | null = null;
let bugReportSyncQueue: Queue<BugReportSyncJobData> | null = null;

const defaultJobOptions = {
  attempts: 4,
  backoff: { type: "exponential" as const, delay: 1_000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

function getBullConnection(): ConnectionOptions {
  // pnpm can retain BullMQ's compatible ioredis patch beside the app's newer
  // patch, making their nominal class types differ even though the runtime
  // connection contract is identical.
  return getRedisConnection() as unknown as ConnectionOptions;
}

export function getCalendarSyncQueue(): Queue<CalendarSyncJobData> {
  calendarSyncQueue ??= new Queue(QUEUE_NAMES.calendarSync, {
    connection: getBullConnection(),
    defaultJobOptions,
  });
  return calendarSyncQueue;
}

export function getRescheduleQueue(): Queue<RescheduleJobData> {
  rescheduleQueue ??= new Queue(QUEUE_NAMES.reschedule, {
    connection: getBullConnection(),
    defaultJobOptions,
  });
  return rescheduleQueue;
}

export function getWebhookRenewQueue(): Queue<WebhookRenewJobData> {
  webhookRenewQueue ??= new Queue(QUEUE_NAMES.webhookRenew, {
    connection: getBullConnection(),
    defaultJobOptions,
  });
  return webhookRenewQueue;
}

export function getMailSyncQueue(): Queue<MailSyncJobData> {
  mailSyncQueue ??= new Queue(QUEUE_NAMES.mailSync, {
    connection: getBullConnection(),
    defaultJobOptions,
  });
  return mailSyncQueue;
}

export function getBugReportSyncQueue(): Queue<BugReportSyncJobData> {
  bugReportSyncQueue ??= new Queue(QUEUE_NAMES.bugReportSync, {
    connection: getBullConnection(),
    defaultJobOptions,
  });
  return bugReportSyncQueue;
}

export async function closeQueues(): Promise<void> {
  const queues = [
    calendarSyncQueue,
    rescheduleQueue,
    webhookRenewQueue,
    mailSyncQueue,
    bugReportSyncQueue,
  ].filter((queue): queue is Queue => queue !== null);
  await Promise.all(queues.map((queue) => queue.close()));
  calendarSyncQueue = null;
  rescheduleQueue = null;
  webhookRenewQueue = null;
  mailSyncQueue = null;
  bugReportSyncQueue = null;
}
