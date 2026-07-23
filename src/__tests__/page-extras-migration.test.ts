import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Page extras migration", () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      "prisma/migrations/20260723233000_page_assets_comments_templates_forms/migration.sql"
    ),
    "utf8"
  );

  it("adds private Page-owned models without public sharing tables", () => {
    expect(sql).toContain('CREATE TABLE "PageAsset"');
    expect(sql).toContain('CREATE TABLE "PageComment"');
    expect(sql).toContain('CREATE TABLE "PageTemplate"');
    expect(sql).toContain('CREATE TABLE "PageFormSubmission"');
    expect(sql).not.toMatch(/PublicShare|AnonymousSubmission|WorkspaceRole/);
  });

  it("only adds schema and never rewrites existing Page or Board data", () => {
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
    expect(sql).not.toMatch(/DELETE\s+FROM/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+"Page"\s+DROP/i);
    expect(sql).not.toMatch(/ALTER\s+TABLE\s+"Board"\s+DROP/i);
  });
});
