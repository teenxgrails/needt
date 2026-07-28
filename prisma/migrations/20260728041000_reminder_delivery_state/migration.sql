CREATE TYPE "ReminderDeliveryStatus" AS ENUM ('PENDING', 'DELIVERING', 'DELIVERED', 'FAILED');

ALTER TABLE "TaskReminder"
  ADD COLUMN "deliveryStatus" "ReminderDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "lastAttemptAt" TIMESTAMP(3),
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastError" TEXT;

DROP INDEX IF EXISTS "TaskReminder_userId_deliveredAt_idx";
CREATE INDEX "TaskReminder_userId_deliveryStatus_deliveredAt_idx"
  ON "TaskReminder"("userId", "deliveryStatus", "deliveredAt");
