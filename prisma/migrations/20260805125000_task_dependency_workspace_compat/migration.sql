-- Keep the previous application version compatible while workspaceId is added
-- to TaskDependency in the following migration. The old writer only supplies
-- userId and task IDs, so derive the personal workspace before NOT NULL and
-- foreign-key checks run. Remove this trigger in a later contract release,
-- after at least one fallback release can no longer write the legacy shape.
CREATE OR REPLACE FUNCTION "fill_task_dependency_workspace_id"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- This migration intentionally sorts before the workspaceId column exists.
  -- The JSON shape check keeps the trigger harmless until the next migration
  -- adds that column, including during a rolling deploy.
  IF to_jsonb(NEW) ? 'workspaceId' THEN
    IF NEW."workspaceId" IS NULL THEN
      SELECT COALESCE(
        blocked."workspaceId",
        blocker."workspaceId",
        personal_workspace."id"
      )
      INTO NEW."workspaceId"
      FROM "Task" blocked
      JOIN "Task" blocker ON blocker."id" = NEW."blockerTaskId"
      LEFT JOIN "Workspace" personal_workspace
        ON personal_workspace."personalOwnerId" = NEW."userId"
       AND personal_workspace."kind" = 'PERSONAL'::"WorkspaceKind"
      WHERE blocked."id" = NEW."blockedTaskId";
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "TaskDependency_fill_workspaceId"
BEFORE INSERT ON "TaskDependency"
FOR EACH ROW
EXECUTE FUNCTION "fill_task_dependency_workspace_id"();
