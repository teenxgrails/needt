CREATE TYPE "ProjectHealthStatus" AS ENUM (
  'UNKNOWN',
  'ON_TRACK',
  'AT_RISK',
  'OFF_TRACK'
);

ALTER TABLE "Project"
ADD COLUMN "healthStatus" "ProjectHealthStatus" NOT NULL DEFAULT 'UNKNOWN',
ADD COLUMN "healthVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "healthUpdatedAt" TIMESTAMP(3);

CREATE TABLE "ProjectHealthUpdate" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "authorId" TEXT,
  "status" "ProjectHealthStatus" NOT NULL,
  "previousStatus" "ProjectHealthStatus" NOT NULL,
  "summary" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectHealthUpdate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProjectHealthUpdate_projectId_version_key"
ON "ProjectHealthUpdate"("projectId", "version");
CREATE INDEX "ProjectHealthUpdate_workspaceId_createdAt_idx"
ON "ProjectHealthUpdate"("workspaceId", "createdAt");
CREATE INDEX "ProjectHealthUpdate_projectId_createdAt_idx"
ON "ProjectHealthUpdate"("projectId", "createdAt");
CREATE INDEX "ProjectHealthUpdate_authorId_idx"
ON "ProjectHealthUpdate"("authorId");

ALTER TABLE "ProjectHealthUpdate"
ADD CONSTRAINT "ProjectHealthUpdate_workspaceId_fkey"
FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectHealthUpdate"
ADD CONSTRAINT "ProjectHealthUpdate_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "Project"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProjectHealthUpdate"
ADD CONSTRAINT "ProjectHealthUpdate_authorId_fkey"
FOREIGN KEY ("authorId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
