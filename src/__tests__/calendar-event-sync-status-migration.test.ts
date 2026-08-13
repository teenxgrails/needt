import { readFileSync } from "node:fs";

const migrationPath =
  "prisma/migrations/20260813120000_calendar_event_sync_status/migration.sql";

describe("calendar event sync status migration", () => {
  it("adds an additive nullable state for provider reconciliation", () => {
    const migration = readFileSync(migrationPath, "utf8");

    expect(migration).toContain('ALTER TABLE "CalendarEvent" ADD COLUMN "syncStatus" TEXT');
    expect(migration).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });
});
