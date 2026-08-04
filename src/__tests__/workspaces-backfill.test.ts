import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("workspace foundation migration", () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      "prisma/migrations/20260804210000_workspaces_foundation/migration.sql"
    ),
    "utf8"
  );

  it("creates personal workspaces and memberships idempotently", () => {
    expect(sql).toContain('INSERT INTO "Workspace"');
    expect(sql).toContain('ON CONFLICT ("personalOwnerId") DO NOTHING');
    expect(sql).toContain('INSERT INTO "WorkspaceMember"');
    expect(sql).toContain(
      'ON CONFLICT ("workspaceId", "userId") DO NOTHING'
    );
    expect(sql).toContain("'OWNER'::\"WorkspaceRole\"");
  });

  it.each(["Project", "Task", "Board", "Page"])(
    "backfills %s into its owner's personal workspace",
    (table) => {
      expect(sql).toContain(`UPDATE "${table}" entity`);
      expect(sql).toContain('entity."workspaceId" IS NULL');
      expect(sql).toContain(
        'entity."userId" = workspace."personalOwnerId"'
      );
    }
  );

  it("reports zero orphaned rows or aborts the migration", () => {
    expect(sql).toContain("workspace_orphan_count BIGINT");
    expect(sql).toContain(
      "RAISE NOTICE 'Workspace backfill orphan count: %', workspace_orphan_count"
    );
    expect(sql).toContain("IF workspace_orphan_count <> 0 THEN");
    expect(sql).toContain(
      "'Workspace backfill left % rows unassigned', workspace_orphan_count"
    );
  });

  it("seeds a default-off workspaces flag and keeps the migration additive", () => {
    expect(sql).toContain("'workspaces', false, 0");
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN|TYPE)/i);
    expect(sql).not.toMatch(/DELETE\s+FROM/i);
  });
});
