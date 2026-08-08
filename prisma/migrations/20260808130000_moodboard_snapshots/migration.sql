-- Periodic, restorable snapshots for self-hosted Moodboard collaboration.
ALTER TABLE "MoodboardCollaborationState" ADD COLUMN "lastSnapshotAt" TIMESTAMP(3);

CREATE TABLE "MoodboardSnapshot" (
    "id" TEXT NOT NULL,
    "moodboardId" TEXT NOT NULL,
    "scene" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoodboardSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MoodboardSnapshot_moodboardId_createdAt_idx" ON "MoodboardSnapshot"("moodboardId", "createdAt");

ALTER TABLE "MoodboardSnapshot" ADD CONSTRAINT "MoodboardSnapshot_moodboardId_fkey" FOREIGN KEY ("moodboardId") REFERENCES "Moodboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
