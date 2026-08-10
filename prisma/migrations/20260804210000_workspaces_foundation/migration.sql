-- Add the workspace tenancy foundation without removing legacy user ownership.
-- The workspace columns remain nullable during the feature-flagged rollout so
-- the old userId-scoped path can be restored by disabling the flag.

CREATE TYPE "WorkspaceKind" AS ENUM ('PERSONAL', 'SHARED');
CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

CREATE TABLE "Workspace" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "kind" "WorkspaceKind" NOT NULL DEFAULT 'PERSONAL',
  "personalOwnerId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceMember" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceInvite" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "WorkspaceRole" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "invitedById" TEXT,
  "acceptedById" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Project" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Task" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Board" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "Page" ADD COLUMN "workspaceId" TEXT;

CREATE UNIQUE INDEX "Workspace_personalOwnerId_key"
  ON "Workspace"("personalOwnerId");
CREATE INDEX "Workspace_kind_idx" ON "Workspace"("kind");
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key"
  ON "WorkspaceMember"("workspaceId", "userId");
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
CREATE INDEX "WorkspaceMember_workspaceId_role_idx"
  ON "WorkspaceMember"("workspaceId", "role");
CREATE UNIQUE INDEX "WorkspaceInvite_tokenHash_key"
  ON "WorkspaceInvite"("tokenHash");
CREATE INDEX "WorkspaceInvite_workspaceId_email_idx"
  ON "WorkspaceInvite"("workspaceId", "email");
CREATE INDEX "WorkspaceInvite_email_expiresAt_idx"
  ON "WorkspaceInvite"("email", "expiresAt");
CREATE INDEX "WorkspaceInvite_invitedById_idx"
  ON "WorkspaceInvite"("invitedById");
CREATE INDEX "WorkspaceInvite_acceptedById_idx"
  ON "WorkspaceInvite"("acceptedById");
CREATE INDEX "Project_workspaceId_idx" ON "Project"("workspaceId");
CREATE INDEX "Task_workspaceId_idx" ON "Task"("workspaceId");
CREATE INDEX "Board_workspaceId_idx" ON "Board"("workspaceId");
CREATE INDEX "Page_workspaceId_idx" ON "Page"("workspaceId");

ALTER TABLE "Workspace"
  ADD CONSTRAINT "Workspace_personalOwnerId_fkey"
  FOREIGN KEY ("personalOwnerId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember"
  ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMember"
  ADD CONSTRAINT "WorkspaceMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvite"
  ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvite"
  ADD CONSTRAINT "WorkspaceInvite_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkspaceInvite"
  ADD CONSTRAINT "WorkspaceInvite_acceptedById_fkey"
  FOREIGN KEY ("acceptedById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Project"
  ADD CONSTRAINT "Project_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Board"
  ADD CONSTRAINT "Board_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Page"
  ADD CONSTRAINT "Page_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Default-off server flag. Existing FeatureFlagOverride rows provide the
-- per-user allowlist without a second rollout mechanism.
INSERT INTO "FeatureFlag" (
  "key", "enabled", "rolloutPercentage", "description", "createdAt", "updatedAt"
)
VALUES (
  'workspaces', false, 0,
  'Workspace tenancy boundary rollout', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
)
ON CONFLICT ("key") DO NOTHING;

-- Idempotent backfill: one personal workspace and OWNER membership per user.
INSERT INTO "Workspace" (
  "id", "name", "kind", "personalOwnerId", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  'Personal Workspace',
  'PERSONAL'::"WorkspaceKind",
  u."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User" u
ON CONFLICT ("personalOwnerId") DO NOTHING;

INSERT INTO "WorkspaceMember" (
  "id", "workspaceId", "userId", "role", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  workspace."id",
  workspace."personalOwnerId",
  'OWNER'::"WorkspaceRole",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "Workspace" workspace
WHERE workspace."kind" = 'PERSONAL'
  AND workspace."personalOwnerId" IS NOT NULL
ON CONFLICT ("workspaceId", "userId") DO NOTHING;

UPDATE "Project" entity
SET "workspaceId" = workspace."id"
FROM "Workspace" workspace
WHERE entity."workspaceId" IS NULL
  AND entity."userId" = workspace."personalOwnerId"
  AND workspace."kind" = 'PERSONAL';

UPDATE "Task" entity
SET "workspaceId" = workspace."id"
FROM "Workspace" workspace
WHERE entity."workspaceId" IS NULL
  AND entity."userId" = workspace."personalOwnerId"
  AND workspace."kind" = 'PERSONAL';

UPDATE "Board" entity
SET "workspaceId" = workspace."id"
FROM "Workspace" workspace
WHERE entity."workspaceId" IS NULL
  AND entity."userId" = workspace."personalOwnerId"
  AND workspace."kind" = 'PERSONAL';

UPDATE "Page" entity
SET "workspaceId" = workspace."id"
FROM "Workspace" workspace
WHERE entity."workspaceId" IS NULL
  AND entity."userId" = workspace."personalOwnerId"
  AND workspace."kind" = 'PERSONAL';

-- Report the exact count and reject a partial backfill. This includes legacy
-- rows with no userId because they cannot safely be assigned by inference.
DO $$
DECLARE
  workspace_orphan_count BIGINT;
BEGIN
  SELECT
    (SELECT COUNT(*) FROM "Project" WHERE "workspaceId" IS NULL) +
    (SELECT COUNT(*) FROM "Task" WHERE "workspaceId" IS NULL) +
    (SELECT COUNT(*) FROM "Board" WHERE "workspaceId" IS NULL) +
    (SELECT COUNT(*) FROM "Page" WHERE "workspaceId" IS NULL)
  INTO workspace_orphan_count;

  RAISE NOTICE 'Workspace backfill orphan count: %', workspace_orphan_count;
  IF workspace_orphan_count <> 0 THEN
    RAISE EXCEPTION
      'Workspace backfill left % rows unassigned', workspace_orphan_count;
  END IF;
END $$;
