ALTER TABLE "Task"
ADD COLUMN "recurrenceMasterId" TEXT,
ADD COLUMN "recurrenceInstanceAt" TIMESTAMP(3);

-- Existing recurring rows are masters because recurrenceMasterId remains NULL.
-- Historical completed copies remain standalone: legacy data has no reliable
-- occurrence key, so guessing a master would risk corrupting user history.
CREATE INDEX "Task_recurrenceMasterId_idx" ON "Task"("recurrenceMasterId");
CREATE UNIQUE INDEX "Task_recurrenceMasterId_recurrenceInstanceAt_key"
ON "Task"("recurrenceMasterId", "recurrenceInstanceAt");

ALTER TABLE "Task"
ADD CONSTRAINT "Task_recurrenceMasterId_fkey"
FOREIGN KEY ("recurrenceMasterId") REFERENCES "Task"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
