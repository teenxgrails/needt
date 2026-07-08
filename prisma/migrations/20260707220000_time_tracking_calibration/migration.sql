-- Phase 9: time tracking and self-calibrating estimates.

CREATE TYPE "TimeEntrySource" AS ENUM ('timer', 'manual', 'focus');

ALTER TABLE "Task"
  ADD COLUMN "estOptimistic" INTEGER,
  ADD COLUMN "estLikely" INTEGER,
  ADD COLUMN "estPessimistic" INTEGER,
  ADD COLUMN "actualMinutes" INTEGER,
  ADD COLUMN "estimateDelta" INTEGER,
  ADD COLUMN "optimisticDelta" INTEGER,
  ADD COLUMN "likelyDelta" INTEGER,
  ADD COLUMN "pessimisticDelta" INTEGER;

CREATE TABLE "TimeEntry" (
  "id" TEXT NOT NULL,
  "taskId" TEXT NOT NULL,
  "userId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "source" "TimeEntrySource" NOT NULL DEFAULT 'timer',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TimeEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TimeEntry_taskId_idx" ON "TimeEntry"("taskId");
CREATE INDEX "TimeEntry_userId_startedAt_idx" ON "TimeEntry"("userId", "startedAt");
CREATE INDEX "TimeEntry_source_idx" ON "TimeEntry"("source");

ALTER TABLE "TimeEntry"
  ADD CONSTRAINT "TimeEntry_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimeEntry"
  ADD CONSTRAINT "TimeEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
