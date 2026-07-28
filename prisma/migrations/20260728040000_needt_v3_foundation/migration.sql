-- Additive foundation for scheduling runs, focus rituals, reminders,
-- dependencies, editor rollout, idempotent commands, and booking links.

CREATE TYPE "FocusSessionPhase" AS ENUM ('FOCUS', 'SHORT_BREAK', 'LONG_BREAK');
CREATE TYPE "FocusStrictnessMode" AS ENUM ('NORMAL', 'TIMEOUT', 'DEEP_FOCUS');
CREATE TYPE "SchedulingRunSource" AS ENUM ('MANUAL', 'TASK_MUTATION', 'CALENDAR_SYNC', 'CRON', 'CONNECTOR');
CREATE TYPE "SchedulingRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED');
CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'SUCCEEDED', 'FAILED');
CREATE TYPE "TaskReminderKind" AS ENUM ('BEFORE_START', 'BEFORE_DEADLINE');
CREATE TYPE "BookingStatus" AS ENUM ('CONFIRMED', 'CANCELED');

ALTER TABLE "DailyAgenda"
  ADD COLUMN "documentFormatVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Page"
  ADD COLUMN "documentFormatVersion" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "FocusSession"
  ADD COLUMN "phase" "FocusSessionPhase" NOT NULL DEFAULT 'FOCUS',
  ADD COLUMN "strictness" "FocusStrictnessMode" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "intention" TEXT,
  ADD COLUMN "stopRequestedAt" TIMESTAMP(3),
  ADD COLUMN "exitAttemptCount" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "FocusPreferences" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "defaultMinutes" INTEGER NOT NULL DEFAULT 25,
  "dailyGoalMinutes" INTEGER NOT NULL DEFAULT 25,
  "shortBreakMinutes" INTEGER NOT NULL DEFAULT 5,
  "longBreakMinutes" INTEGER NOT NULL DEFAULT 15,
  "sessionsBeforeLongBreak" INTEGER NOT NULL DEFAULT 4,
  "browserNotifications" BOOLEAN NOT NULL DEFAULT false,
  "quietHoursStart" TEXT,
  "quietHoursEnd" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FocusPreferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchedulingRun" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "source" "SchedulingRunSource" NOT NULL,
  "status" "SchedulingRunStatus" NOT NULL DEFAULT 'QUEUED',
  "dedupeKey" TEXT NOT NULL,
  "changedTaskCount" INTEGER NOT NULL DEFAULT 0,
  "placedBlockCount" INTEGER NOT NULL DEFAULT 0,
  "unchangedTaskCount" INTEGER NOT NULL DEFAULT 0,
  "unscheduled" JSONB,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchedulingRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CronState" (
  "id" TEXT NOT NULL,
  "pendingCursor" TEXT,
  "completedCursor" TEXT,
  "pendingUserIds" JSONB,
  "lastStartedAt" TIMESTAMP(3),
  "lastSucceededAt" TIMESTAMP(3),
  "lastError" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CronState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IdempotencyRecord" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "result" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskDependency" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "blockerTaskId" TEXT NOT NULL,
  "blockedTaskId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TaskDependency_not_self" CHECK ("blockerTaskId" <> "blockedTaskId")
);

CREATE TABLE "TaskReminder" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "kind" "TaskReminderKind" NOT NULL,
  "offsetMinutes" INTEGER NOT NULL,
  "channels" JSONB NOT NULL,
  "deliveredAt" TIMESTAMP(3),
  "canceledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskReminder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PushSubscription" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "userAgent" TEXT,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FeatureFlag" (
  "key" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "FeatureFlagOverride" (
  "id" TEXT NOT NULL,
  "flagKey" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "enabled" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FeatureFlagOverride_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookingPage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "durationMinutes" INTEGER NOT NULL DEFAULT 30,
  "bufferBefore" INTEGER NOT NULL DEFAULT 0,
  "bufferAfter" INTEGER NOT NULL DEFAULT 10,
  "minimumNotice" INTEGER NOT NULL DEFAULT 120,
  "bookingHorizonDays" INTEGER NOT NULL DEFAULT 60,
  "timeZone" TEXT NOT NULL DEFAULT 'UTC',
  "availability" JSONB NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookingPage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Booking" (
  "id" TEXT NOT NULL,
  "bookingPageId" TEXT NOT NULL,
  "ownerId" TEXT NOT NULL,
  "guestName" TEXT NOT NULL,
  "guestEmail" TEXT NOT NULL,
  "start" TIMESTAMP(3) NOT NULL,
  "end" TIMESTAMP(3) NOT NULL,
  "timeZone" TEXT NOT NULL,
  "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
  "calendarEventId" TEXT,
  "cancelTokenHash" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FocusPreferences_userId_key" ON "FocusPreferences"("userId");
CREATE UNIQUE INDEX "SchedulingRun_userId_dedupeKey_key" ON "SchedulingRun"("userId", "dedupeKey");
CREATE INDEX "SchedulingRun_userId_status_createdAt_idx" ON "SchedulingRun"("userId", "status", "createdAt");
CREATE INDEX "SchedulingRun_source_status_createdAt_idx" ON "SchedulingRun"("source", "status", "createdAt");
CREATE UNIQUE INDEX "IdempotencyRecord_userId_operation_key_key" ON "IdempotencyRecord"("userId", "operation", "key");
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");
CREATE UNIQUE INDEX "TaskDependency_blockerTaskId_blockedTaskId_key" ON "TaskDependency"("blockerTaskId", "blockedTaskId");
CREATE INDEX "TaskDependency_userId_blockedTaskId_idx" ON "TaskDependency"("userId", "blockedTaskId");
CREATE INDEX "TaskDependency_userId_blockerTaskId_idx" ON "TaskDependency"("userId", "blockerTaskId");
CREATE UNIQUE INDEX "TaskReminder_taskId_kind_offsetMinutes_key" ON "TaskReminder"("taskId", "kind", "offsetMinutes");
CREATE INDEX "TaskReminder_userId_deliveredAt_idx" ON "TaskReminder"("userId", "deliveredAt");
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX "PushSubscription_userId_idx" ON "PushSubscription"("userId");
CREATE UNIQUE INDEX "FeatureFlagOverride_flagKey_userId_key" ON "FeatureFlagOverride"("flagKey", "userId");
CREATE INDEX "FeatureFlagOverride_userId_idx" ON "FeatureFlagOverride"("userId");
CREATE UNIQUE INDEX "BookingPage_slug_key" ON "BookingPage"("slug");
CREATE INDEX "BookingPage_userId_isActive_idx" ON "BookingPage"("userId", "isActive");
CREATE UNIQUE INDEX "Booking_cancelTokenHash_key" ON "Booking"("cancelTokenHash");
CREATE INDEX "Booking_ownerId_start_idx" ON "Booking"("ownerId", "start");
CREATE INDEX "Booking_bookingPageId_start_idx" ON "Booking"("bookingPageId", "start");

ALTER TABLE "FocusPreferences" ADD CONSTRAINT "FocusPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchedulingRun" ADD CONSTRAINT "SchedulingRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IdempotencyRecord" ADD CONSTRAINT "IdempotencyRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockerTaskId_fkey" FOREIGN KEY ("blockerTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_blockedTaskId_fkey" FOREIGN KEY ("blockedTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskReminder" ADD CONSTRAINT "TaskReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskReminder" ADD CONSTRAINT "TaskReminder_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureFlagOverride" ADD CONSTRAINT "FeatureFlagOverride_flagKey_fkey" FOREIGN KEY ("flagKey") REFERENCES "FeatureFlag"("key") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FeatureFlagOverride" ADD CONSTRAINT "FeatureFlagOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookingPage" ADD CONSTRAINT "BookingPage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_bookingPageId_fkey" FOREIGN KEY ("bookingPageId") REFERENCES "BookingPage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "FeatureFlag" ("key", "enabled", "rolloutPercentage", "description", "createdAt", "updatedAt")
VALUES ('editor_v2', false, 0, 'Novel-style shared Today and Pages editor', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
