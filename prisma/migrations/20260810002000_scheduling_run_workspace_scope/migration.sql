ALTER TABLE "SchedulingRun" ADD COLUMN "workspaceId" TEXT;

ALTER TABLE "SchedulingRun"
ADD CONSTRAINT "SchedulingRun_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "SchedulingRun_workspaceId_status_createdAt_idx"
ON "SchedulingRun"("workspaceId", "status", "createdAt");
