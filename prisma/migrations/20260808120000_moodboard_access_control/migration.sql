-- Workspace-scoped Moodboards with direct roles and self-hosted Yjs state.
CREATE TYPE "MoodboardAccessRole" AS ENUM ('FULL_ACCESS', 'EDITOR', 'VIEWER');

CREATE TABLE "Moodboard" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'Untitled Moodboard',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Moodboard_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MoodboardAccessGrant" (
    "id" TEXT NOT NULL,
    "moodboardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "MoodboardAccessRole" NOT NULL,
    "grantedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodboardAccessGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MoodboardCollaborationState" (
    "id" TEXT NOT NULL,
    "moodboardId" TEXT NOT NULL,
    "state" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodboardCollaborationState_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Moodboard_workspaceId_archivedAt_idx" ON "Moodboard"("workspaceId", "archivedAt");
CREATE INDEX "Moodboard_createdById_idx" ON "Moodboard"("createdById");
CREATE UNIQUE INDEX "MoodboardAccessGrant_moodboardId_userId_key" ON "MoodboardAccessGrant"("moodboardId", "userId");
CREATE INDEX "MoodboardAccessGrant_userId_role_idx" ON "MoodboardAccessGrant"("userId", "role");
CREATE INDEX "MoodboardAccessGrant_grantedById_idx" ON "MoodboardAccessGrant"("grantedById");
CREATE UNIQUE INDEX "MoodboardCollaborationState_moodboardId_key" ON "MoodboardCollaborationState"("moodboardId");
CREATE INDEX "MoodboardCollaborationState_updatedAt_idx" ON "MoodboardCollaborationState"("updatedAt");

ALTER TABLE "Moodboard" ADD CONSTRAINT "Moodboard_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Moodboard" ADD CONSTRAINT "Moodboard_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MoodboardAccessGrant" ADD CONSTRAINT "MoodboardAccessGrant_moodboardId_fkey" FOREIGN KEY ("moodboardId") REFERENCES "Moodboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MoodboardAccessGrant" ADD CONSTRAINT "MoodboardAccessGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MoodboardAccessGrant" ADD CONSTRAINT "MoodboardAccessGrant_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MoodboardCollaborationState" ADD CONSTRAINT "MoodboardCollaborationState_moodboardId_fkey" FOREIGN KEY ("moodboardId") REFERENCES "Moodboard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
