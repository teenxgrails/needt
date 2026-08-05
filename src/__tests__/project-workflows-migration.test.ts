import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("project workflows migration", () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      "prisma/migrations/20260805120000_project_workflows/migration.sql"
    ),
    "utf8"
  );

  it("adds stages, blockers, and reusable workflow templates", () => {
    expect(sql).toContain('CREATE TABLE "ProjectStage"');
    expect(sql).toContain('CREATE TABLE "ProjectBlocker"');
    expect(sql).toContain('CREATE TABLE "ProjectTemplate"');
    expect(sql).toContain('CREATE TABLE "ProjectTemplateRole"');
    expect(sql).toContain('CREATE TABLE "ProjectTemplateTask"');
    expect(sql).toContain('CREATE TABLE "ProjectTemplateDependency"');
    expect(sql).toContain("CREATE TYPE \"ProjectTemplateKind\" AS ENUM ('REGULAR', 'WORKFLOW')");
  });

  it("keeps template dates relative to stage boundaries", () => {
    expect(sql).toContain('"startAnchor" "ProjectRelativeDateAnchor"');
    expect(sql).toContain('"startOffsetDays" INTEGER');
    expect(sql).toContain('"deadlineAnchor" "ProjectRelativeDateAnchor"');
    expect(sql).toContain('"deadlineOffsetDays" INTEGER');
    expect(sql).toContain('CHECK (num_nonnulls("startAnchor", "startOffsetDays") IN (0, 2))');
    expect(sql).toContain('CHECK (num_nonnulls("deadlineAnchor", "deadlineOffsetDays") IN (0, 2))');
  });

  it("requires every blocker to have one target and one source", () => {
    expect(sql).toContain('CHECK (num_nonnulls("taskId", "stageId") = 1)');
    expect(sql).toContain('CHECK (num_nonnulls("blockerTaskId", "title") = 1)');
    expect(sql).toContain('CHECK ("taskId" IS NULL OR "blockerTaskId" IS NULL OR "taskId" <> "blockerTaskId")');
  });

  it("keeps a task stage inside the task project", () => {
    expect(sql).toContain(
      'FOREIGN KEY ("stageId", "projectId") REFERENCES "ProjectStage"("id", "projectId")'
    );
  });

  it("keeps blockers and template children inside their parent scope", () => {
    expect(sql).toContain(
      'FOREIGN KEY ("taskId", "projectId") REFERENCES "Task"("id", "projectId")'
    );
    expect(sql).toContain(
      'FOREIGN KEY ("stageId", "templateId") REFERENCES "ProjectTemplateStage"("id", "templateId")'
    );
    expect(sql).toContain(
      'FOREIGN KEY ("blockerTaskId", "templateId") REFERENCES "ProjectTemplateTask"("id", "templateId")'
    );
  });

  it("preserves the legacy progress column and rejects orphaned stage IDs", () => {
    expect(sql).toContain("Project stage orphan count: %");
    expect(sql).toContain("IF orphan_stage_count <> 0 THEN");
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i);
    expect(sql).not.toMatch(/DELETE\s+FROM/i);
    expect(sql).not.toMatch(/DROP\s+COLUMN\s+"progress"/i);
  });
});
