import { readFileSync } from "fs";
import { join } from "path";

const repoRoot = join(__dirname, "..", "..");
const schema = readFileSync(join(repoRoot, "prisma", "schema.prisma"), "utf8");
const migrationPath = join(
  repoRoot,
  "prisma",
  "migrations",
  "20260824000000_page_tag_join_primary_key_compat",
  "migration.sql"
);

function modelBody(name: string): string {
  const startMarker = `model ${name} {`;
  const start = schema.indexOf(startMarker);
  const end = schema.indexOf("\n}", start);
  if (start === -1 || end === -1) {
    throw new Error(`Missing Prisma model: ${name}`);
  }
  return schema.slice(start + startMarker.length, end);
}

describe("additive Prisma drift compatibility", () => {
  it.each([
    ["AgentMemory", "@@index([userId, lastUsedAt])"],
    ["AgentMemory", "@@index([userId, weight])"],
    ["AiConversation", "@@index([userId, updatedAt])"],
    ["AiMessage", "@@index([conversationId, createdAt])"],
    ["AiMessage", "@@index([userId, createdAt])"],
  ])("retains legacy %s index %s", (model, index) => {
    expect(modelBody(model)).toContain(index);
  });

  it("promotes the existing page-tag unique index without dropping data", () => {
    const migration = readFileSync(migrationPath, "utf8");
    expect(migration).toMatch(
      /ADD CONSTRAINT "_PageToPageTag_AB_pkey"\s+PRIMARY KEY USING INDEX "_PageToPageTag_AB_unique"/
    );
    expect(migration).not.toMatch(/\bDROP\b/i);
  });
});
