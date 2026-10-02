import { readFileSync } from "node:fs";

describe("AI usage token migration", () => {
  const migration = readFileSync(
    "prisma/migrations/20260916090000_ai_usage_token_counters/migration.sql",
    "utf8"
  );

  it("adds non-null counters without changing existing usage rows", () => {
    expect(migration).toContain(
      'ADD COLUMN "inputTokens" INTEGER NOT NULL DEFAULT 0'
    );
    expect(migration).toContain(
      'ADD COLUMN "outputTokens" INTEGER NOT NULL DEFAULT 0'
    );
  });
});
