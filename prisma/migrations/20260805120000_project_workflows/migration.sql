-- Add project workflow structure without removing the legacy progress column.
-- Project progress remains rollback-compatible until every project view reads
-- the task-derived value.

CREATE TYPE "ProjectTemplateKind" AS ENUM ('REGULAR', 'WORKFLOW');
CREATE TYPE "ProjectRelativeDateAnchor" AS ENUM ('STAGE_START', 'STAGE_DEADLINE');

ALTER TABLE "Project"
ADD COLUMN "startDate" TIMESTAMP(3),
ADD COLUMN "deadline" TIMESTAMP(3),
ADD COLUMN "sourceTemplateId" TEXT;

CREATE TABLE "ProjectStage" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3),
  "deadline" TIMESTAMP(3),
  "expectedDurationDays" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectStage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectStage_expectedDurationDays_check"
    CHECK ("expectedDurationDays" IS NULL OR "expectedDurationDays" >= 0),
  CONSTRAINT "ProjectStage_dates_check"
    CHECK ("startDate" IS NULL OR "deadline" IS NULL OR "startDate" <= "deadline")
);

-- stageId was introduced before its parent table. No UI created values, but
-- abort with an exact count instead of discarding an unexpected legacy value.
DO $$
DECLARE
  orphan_stage_count BIGINT;
BEGIN
  SELECT COUNT(*) FROM "Task" WHERE "stageId" IS NOT NULL
  INTO orphan_stage_count;

  RAISE NOTICE 'Project stage orphan count: %', orphan_stage_count;
  IF orphan_stage_count <> 0 THEN
    RAISE EXCEPTION
      'Project workflow migration found % task stage IDs without ProjectStage rows',
      orphan_stage_count;
  END IF;
END $$;

CREATE TABLE "ProjectBlocker" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "taskId" TEXT,
  "stageId" TEXT,
  "blockerTaskId" TEXT,
  "title" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectBlocker_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectBlocker_one_target_check"
    CHECK (num_nonnulls("taskId", "stageId") = 1),
  CONSTRAINT "ProjectBlocker_one_source_check"
    CHECK (num_nonnulls("blockerTaskId", "title") = 1),
  CONSTRAINT "ProjectBlocker_not_self_check"
    CHECK ("taskId" IS NULL OR "blockerTaskId" IS NULL OR "taskId" <> "blockerTaskId"),
  CONSTRAINT "ProjectBlocker_title_check"
    CHECK ("title" IS NULL OR length(btrim("title")) > 0)
);

CREATE TABLE "ProjectTemplate" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "createdById" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "color" TEXT,
  "icon" TEXT,
  "kind" "ProjectTemplateKind" NOT NULL DEFAULT 'REGULAR',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProjectTemplateStage" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "startOffsetDays" INTEGER NOT NULL DEFAULT 0,
  "durationDays" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTemplateStage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTemplateStage_durationDays_check"
    CHECK ("durationDays" IS NULL OR "durationDays" >= 0)
);

CREATE TABLE "ProjectTemplateRole" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT,
  "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTemplateRole_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTemplateRole_name_check"
    CHECK (length(btrim("name")) > 0)
);

CREATE TABLE "ProjectTemplateTask" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "stageId" TEXT,
  "roleId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "position" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "estimatedMinutes" INTEGER,
  "priority" TEXT,
  "energyRequired" "SchedulingEnergyLevel" NOT NULL DEFAULT 'MEDIUM',
  "startAnchor" "ProjectRelativeDateAnchor",
  "startOffsetDays" INTEGER,
  "deadlineAnchor" "ProjectRelativeDateAnchor",
  "deadlineOffsetDays" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProjectTemplateTask_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTemplateTask_estimatedMinutes_check"
    CHECK ("estimatedMinutes" IS NULL OR "estimatedMinutes" > 0),
  CONSTRAINT "ProjectTemplateTask_start_rule_check"
    CHECK (num_nonnulls("startAnchor", "startOffsetDays") IN (0, 2)),
  CONSTRAINT "ProjectTemplateTask_deadline_rule_check"
    CHECK (num_nonnulls("deadlineAnchor", "deadlineOffsetDays") IN (0, 2))
);

CREATE TABLE "ProjectTemplateDependency" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "blockerTaskId" TEXT NOT NULL,
  "blockedTaskId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProjectTemplateDependency_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProjectTemplateDependency_not_self_check"
    CHECK ("blockerTaskId" <> "blockedTaskId")
);

CREATE INDEX "Project_sourceTemplateId_idx" ON "Project"("sourceTemplateId");
CREATE UNIQUE INDEX "Task_id_projectId_key" ON "Task"("id", "projectId");
CREATE INDEX "ProjectStage_projectId_position_idx" ON "ProjectStage"("projectId", "position");
CREATE UNIQUE INDEX "ProjectStage_id_projectId_key" ON "ProjectStage"("id", "projectId");
CREATE INDEX "ProjectBlocker_projectId_resolvedAt_idx" ON "ProjectBlocker"("projectId", "resolvedAt");
CREATE INDEX "ProjectBlocker_taskId_idx" ON "ProjectBlocker"("taskId");
CREATE INDEX "ProjectBlocker_stageId_idx" ON "ProjectBlocker"("stageId");
CREATE INDEX "ProjectBlocker_blockerTaskId_idx" ON "ProjectBlocker"("blockerTaskId");
CREATE INDEX "ProjectBlocker_createdById_idx" ON "ProjectBlocker"("createdById");
CREATE INDEX "ProjectTemplate_workspaceId_kind_idx" ON "ProjectTemplate"("workspaceId", "kind");
CREATE INDEX "ProjectTemplate_createdById_idx" ON "ProjectTemplate"("createdById");
CREATE INDEX "ProjectTemplateStage_templateId_position_idx" ON "ProjectTemplateStage"("templateId", "position");
CREATE UNIQUE INDEX "ProjectTemplateStage_id_templateId_key" ON "ProjectTemplateStage"("id", "templateId");
CREATE UNIQUE INDEX "ProjectTemplateRole_templateId_name_key" ON "ProjectTemplateRole"("templateId", "name");
CREATE UNIQUE INDEX "ProjectTemplateRole_id_templateId_key" ON "ProjectTemplateRole"("id", "templateId");
CREATE INDEX "ProjectTemplateRole_templateId_position_idx" ON "ProjectTemplateRole"("templateId", "position");
CREATE INDEX "ProjectTemplateTask_templateId_position_idx" ON "ProjectTemplateTask"("templateId", "position");
CREATE UNIQUE INDEX "ProjectTemplateTask_id_templateId_key" ON "ProjectTemplateTask"("id", "templateId");
CREATE INDEX "ProjectTemplateTask_stageId_idx" ON "ProjectTemplateTask"("stageId");
CREATE INDEX "ProjectTemplateTask_roleId_idx" ON "ProjectTemplateTask"("roleId");
CREATE UNIQUE INDEX "ProjectTemplateDependency_blockerTaskId_blockedTaskId_key"
  ON "ProjectTemplateDependency"("blockerTaskId", "blockedTaskId");
CREATE INDEX "ProjectTemplateDependency_templateId_idx" ON "ProjectTemplateDependency"("templateId");
CREATE INDEX "ProjectTemplateDependency_blockedTaskId_idx" ON "ProjectTemplateDependency"("blockedTaskId");

ALTER TABLE "Project"
  ADD CONSTRAINT "Project_sourceTemplateId_fkey"
  FOREIGN KEY ("sourceTemplateId") REFERENCES "ProjectTemplate"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectStage"
  ADD CONSTRAINT "ProjectStage_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task"
  ADD CONSTRAINT "Task_stageId_fkey"
  FOREIGN KEY ("stageId", "projectId") REFERENCES "ProjectStage"("id", "projectId")
  ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "ProjectBlocker"
  ADD CONSTRAINT "ProjectBlocker_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBlocker"
  ADD CONSTRAINT "ProjectBlocker_taskId_fkey"
  FOREIGN KEY ("taskId", "projectId") REFERENCES "Task"("id", "projectId")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBlocker"
  ADD CONSTRAINT "ProjectBlocker_stageId_fkey"
  FOREIGN KEY ("stageId", "projectId") REFERENCES "ProjectStage"("id", "projectId")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBlocker"
  ADD CONSTRAINT "ProjectBlocker_blockerTaskId_fkey"
  FOREIGN KEY ("blockerTaskId", "projectId") REFERENCES "Task"("id", "projectId")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectBlocker"
  ADD CONSTRAINT "ProjectBlocker_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTemplate"
  ADD CONSTRAINT "ProjectTemplate_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTemplate"
  ADD CONSTRAINT "ProjectTemplate_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProjectTemplateStage"
  ADD CONSTRAINT "ProjectTemplateStage_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTemplateRole"
  ADD CONSTRAINT "ProjectTemplateRole_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTemplateTask"
  ADD CONSTRAINT "ProjectTemplateTask_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTemplateTask"
  ADD CONSTRAINT "ProjectTemplateTask_stageId_fkey"
  FOREIGN KEY ("stageId", "templateId") REFERENCES "ProjectTemplateStage"("id", "templateId")
  ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "ProjectTemplateTask"
  ADD CONSTRAINT "ProjectTemplateTask_roleId_fkey"
  FOREIGN KEY ("roleId", "templateId") REFERENCES "ProjectTemplateRole"("id", "templateId")
  ON DELETE NO ACTION ON UPDATE CASCADE;
ALTER TABLE "ProjectTemplateDependency"
  ADD CONSTRAINT "ProjectTemplateDependency_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "ProjectTemplate"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTemplateDependency"
  ADD CONSTRAINT "ProjectTemplateDependency_blockerTaskId_fkey"
  FOREIGN KEY ("blockerTaskId", "templateId") REFERENCES "ProjectTemplateTask"("id", "templateId")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectTemplateDependency"
  ADD CONSTRAINT "ProjectTemplateDependency_blockedTaskId_fkey"
  FOREIGN KEY ("blockedTaskId", "templateId") REFERENCES "ProjectTemplateTask"("id", "templateId")
  ON DELETE CASCADE ON UPDATE CASCADE;
