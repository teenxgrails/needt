-- AI conversations, messages and retained memories are workspace-owned. The
-- legacy userId remains for creator ownership and the feature-flag rollback.
ALTER TABLE "AiConversation" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "AiMessage" ADD COLUMN "workspaceId" TEXT;
ALTER TABLE "AgentMemory" ADD COLUMN "workspaceId" TEXT;

UPDATE "AiConversation" AS conversation
SET "workspaceId" = workspace."id"
FROM "Workspace" AS workspace
WHERE conversation."workspaceId" IS NULL
  AND workspace."personalOwnerId" = conversation."userId"
  AND workspace."kind" = 'PERSONAL'::"WorkspaceKind";

UPDATE "AiMessage" AS message
SET "workspaceId" = conversation."workspaceId"
FROM "AiConversation" AS conversation
WHERE message."workspaceId" IS NULL
  AND message."conversationId" = conversation."id";

UPDATE "AgentMemory" AS memory
SET "workspaceId" = workspace."id"
FROM "Workspace" AS workspace
WHERE memory."workspaceId" IS NULL
  AND workspace."personalOwnerId" = memory."userId"
  AND workspace."kind" = 'PERSONAL'::"WorkspaceKind";

DO $$
DECLARE
  orphan_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM "AiConversation"
  WHERE "workspaceId" IS NULL;
  SELECT orphan_count + COUNT(*) INTO orphan_count
  FROM "AiMessage"
  WHERE "workspaceId" IS NULL;
  SELECT orphan_count + COUNT(*) INTO orphan_count
  FROM "AgentMemory"
  WHERE "workspaceId" IS NULL;

  IF orphan_count <> 0 THEN
    RAISE EXCEPTION 'AI workspace backfill left % orphaned rows', orphan_count;
  END IF;
END $$;

ALTER TABLE "AiConversation" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "AiMessage" ALTER COLUMN "workspaceId" SET NOT NULL;
ALTER TABLE "AgentMemory" ALTER COLUMN "workspaceId" SET NOT NULL;

ALTER TABLE "AiConversation"
  ADD CONSTRAINT "AiConversation_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiMessage"
  ADD CONSTRAINT "AiMessage_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentMemory"
  ADD CONSTRAINT "AgentMemory_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "AiConversation_workspaceId_userId_updatedAt_idx"
  ON "AiConversation"("workspaceId", "userId", "updatedAt");
CREATE INDEX "AiMessage_workspaceId_conversationId_createdAt_idx"
  ON "AiMessage"("workspaceId", "conversationId", "createdAt");
CREATE INDEX "AiMessage_workspaceId_userId_createdAt_idx"
  ON "AiMessage"("workspaceId", "userId", "createdAt");
CREATE INDEX "AgentMemory_workspaceId_userId_lastUsedAt_idx"
  ON "AgentMemory"("workspaceId", "userId", "lastUsedAt");
CREATE INDEX "AgentMemory_workspaceId_userId_weight_idx"
  ON "AgentMemory"("workspaceId", "userId", "weight");
