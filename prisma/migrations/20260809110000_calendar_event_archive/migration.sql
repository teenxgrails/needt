-- Preserve deleted calendar events as recoverable tombstones. This is
-- intentionally additive so existing rows remain active.
ALTER TABLE "CalendarEvent" ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "CalendarEvent_feedId_archivedAt_idx"
ON "CalendarEvent"("feedId", "archivedAt");
