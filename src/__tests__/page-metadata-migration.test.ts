import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Page metadata migration", () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      "prisma/migrations/20260813170000_page_metadata/migration.sql"
    ),
    "utf8"
  );

  it("adds workspace-scoped metadata without rewriting Page data", () => {
    expect(sql).toContain('CREATE TABLE "PageFolder"');
    expect(sql).toContain('CREATE TABLE "PageTag"');
    expect(sql).toContain('CREATE TABLE "PageSmartFolder"');
    expect(sql).toContain('ALTER TABLE "Page" ADD COLUMN "folderId"');
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
    expect(sql).not.toMatch(/DELETE\s+FROM/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+"Page"\s+DROP/i);
  });
});
