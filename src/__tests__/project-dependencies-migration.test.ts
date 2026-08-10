import { readFileSync } from "node:fs";

const migration = readFileSync(
  "prisma/migrations/20260805130000_project_scoped_dependencies/migration.sql",
  "utf8"
);
const compatibilityMigration = readFileSync(
  "prisma/migrations/20260805125000_task_dependency_workspace_compat/migration.sql",
  "utf8"
);

describe("project-scoped dependency migration", () => {
  it("backfills workspace scope and aborts on unsafe rows", () => {
    expect(migration).toContain('ADD COLUMN "workspaceId" TEXT');
    expect(migration).toContain(
      "TaskDependency backfill found % cross-workspace rows"
    );
    expect(migration).toContain('workspace."personalOwnerId" = dependency."userId"');
    expect(migration).toContain('WHERE "workspaceId" IS NULL');
    expect(migration).toContain('ALTER COLUMN "workspaceId" SET NOT NULL');
  });

  it("keeps the previous writer compatible during the rolling deploy", () => {
    expect(compatibilityMigration).toContain(
      'CREATE TRIGGER "TaskDependency_fill_workspaceId"'
    );
    expect(compatibilityMigration).toContain(
      "personal_workspace.\"personalOwnerId\" = NEW.\"userId\""
    );
    expect(compatibilityMigration).toContain(
      "Remove this trigger in a later contract release"
    );
  });

  it("adds soft removal and never rewrites existing dependency history", () => {
    expect(migration).toContain('ADD COLUMN "removedAt" TIMESTAMP(3)');
    expect(migration).toContain("ON DELETE RESTRICT");
    expect(migration).not.toMatch(/DELETE\s+FROM|DROP\s+TABLE|DROP\s+COLUMN/i);
  });
});
