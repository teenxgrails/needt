ALTER TABLE "Task"
ADD COLUMN "hardDeadline" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "Task_userId_isArchived_idx" ON "Task"("userId", "isArchived");
