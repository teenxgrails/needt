CREATE TYPE "ProactiveNudgeType" AS ENUM (
  'OVERDUE_TASK',
  'OVERBOOKED_DAY',
  'MISSED_FOCUS',
  'DEADLINE_UNREACHABLE'
);

CREATE TABLE "ProactiveNudge" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "taskId" TEXT,
  "type" "ProactiveNudgeType" NOT NULL,
  "timeWindow" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "deepLink" TEXT NOT NULL,
  "deliveredAt" TIMESTAMP(3),
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProactiveNudge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProactiveNudge_userId_dedupeKey_key"
  ON "ProactiveNudge"("userId", "dedupeKey");
CREATE INDEX "ProactiveNudge_userId_deliveredAt_readAt_idx"
  ON "ProactiveNudge"("userId", "deliveredAt", "readAt");
CREATE INDEX "ProactiveNudge_taskId_type_idx"
  ON "ProactiveNudge"("taskId", "type");

ALTER TABLE "ProactiveNudge"
  ADD CONSTRAINT "ProactiveNudge_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProactiveNudge"
  ADD CONSTRAINT "ProactiveNudge_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
