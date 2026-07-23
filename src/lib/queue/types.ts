export const QUEUE_NAMES = {
  calendarSync: "calendar-sync",
  reschedule: "reschedule",
  webhookRenew: "webhook-renew",
  mailSync: "mail-sync",
  bugReportSync: "bug-report-sync",
} as const;

export type CalendarWebhookProvider = "GOOGLE" | "OUTLOOK";

export interface CalendarSyncJobData {
  feedId: string;
}

export interface RescheduleJobData {
  userId: string;
}

export interface WebhookRenewJobData {
  provider?: CalendarWebhookProvider;
  feedId?: string;
}

export interface MailSyncJobData {
  accountId: string;
}

export interface BugReportSyncJobData {
  reportId?: string;
}
