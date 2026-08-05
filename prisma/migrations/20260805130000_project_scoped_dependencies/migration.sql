ALTER TABLE "TaskDependency" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "TaskDependency" ADD COLUMN "removedAt" TIMESTAMP(3);

DO $$
DECLARE
  cross_workspace_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cross_workspace_count
  FROM "TaskDependency" AS dependency
  JOIN "Task" AS blocked ON blocked."id" = dependency."blockedTaskId"
  JOIN "Task" AS blocker ON blocker."id" = dependency."blockerTaskId"
  WHERE blocked."workspaceId" IS NOT NULL
    AND blocker."workspaceId" IS NOT NULL
    AND blocked."workspaceId" <> blocker."workspaceId";

  IF cross_workspace_count <> 0 THEN
    RAISE EXCEPTION 'TaskDependency backfill found % cross-workspace rows', cross_workspace_count;
  END IF;
END $$;

UPDATE "TaskDependency" AS dependency
SET "workspaceId" = COALESCE(
  (SELECT task."workspaceId" FROM "Task" AS task WHERE task."id" = dependency."blockedTaskId"),
  (SELECT task."workspaceId" FROM "Task" AS task WHERE task."id" = dependency."blockerTaskId"),
  (SELECT workspace."id" FROM "Workspace" AS workspace WHERE workspace."personalOwnerId" = dependency."userId")
);

DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM "TaskDependency"
  WHERE "workspaceId" IS NULL;

  IF orphan_count <> 0 THEN
    RAISE EXCEPTION 'TaskDependency workspace backfill left % orphaned rows', orphan_count;
  END IF;
END $$;

ALTER TABLE "TaskDependency" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "TaskDependency"
  ADD CONSTRAINT "TaskDependency_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "TaskDependency_workspaceId_removedAt_idx"
  ON "TaskDependency"("workspaceId", "removedAt");
