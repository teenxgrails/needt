-- Expand legacy board views into versioned, workspace-safe product views.
CREATE TYPE "SavedViewVisibility" AS ENUM ('PERSONAL', 'WORKSPACE');
CREATE TYPE "SavedViewResource" AS ENUM ('TASKS', 'PROJECTS', 'PAGES');

ALTER TABLE "SavedView"
ADD COLUMN "workspaceId" TEXT,
ADD COLUMN "name" TEXT NOT NULL DEFAULT 'Saved view',
ADD COLUMN "visibility" "SavedViewVisibility" NOT NULL DEFAULT 'PERSONAL',
ADD COLUMN "resource" "SavedViewResource" NOT NULL DEFAULT 'TASKS',
ADD COLUMN "queryVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "archivedAt" TIMESTAMP(3);

ALTER TABLE "SavedView"
ADD CONSTRAINT "SavedView_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "SavedView" AS view
SET "workspaceId" = workspace."id"
FROM "Workspace" AS workspace
WHERE workspace."personalOwnerId" = view."userId"
AND view."workspaceId" IS NULL;

CREATE INDEX "SavedView_workspaceId_resource_archivedAt_position_idx"
ON "SavedView"("workspaceId", "resource", "archivedAt", "position");

CREATE INDEX "SavedView_workspaceId_visibility_archivedAt_idx"
ON "SavedView"("workspaceId", "visibility", "archivedAt");

ALTER TABLE "SavedView"
ADD CONSTRAINT "SavedView_queryVersion_check"
CHECK ("queryVersion" = 1);
