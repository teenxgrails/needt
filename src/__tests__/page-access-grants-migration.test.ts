import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Page access grants migration", () => {
  const sql = readFileSync(
    join(
      process.cwd(),
      "prisma/migrations/20260806040000_page_access_grants/migration.sql"
    ),
    "utf8"
  );

  it("adds direct roles with one grant per Page and member", () => {
    expect(sql).toContain('CREATE TYPE "PageAccessRole"');
    expect(sql).toContain('CREATE TABLE "PageAccessGrant"');
    expect(sql).toContain('"PageAccessGrant_pageId_userId_key"');
    expect(sql).toContain("ON DELETE CASCADE");
  });
});
