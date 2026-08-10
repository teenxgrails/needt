import { readFileSync } from "node:fs";
import path from "node:path";

describe("Page publications migration", () => {
  it("adds one revocable public link per Page", () => {
    const migration = readFileSync(
      path.join(
        process.cwd(),
        "prisma/migrations/20260806060000_page_publications/migration.sql"
      ),
      "utf8"
    );

    expect(migration).toContain('CREATE TABLE "PagePublication"');
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "PagePublication_pageId_key"'
    );
    expect(migration).toContain('"revokedAt" TIMESTAMP(3)');
    expect(migration).toContain("ON DELETE CASCADE");
  });
});
