import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

describe("Sol S11 additive migrations", () => {
  it.each([
    ["20260813204500_sol_s11_saved_views", "SavedView_queryVersion_check"],
    ["20260813210500_sol_s11_project_health", "ProjectHealthUpdate_projectId_version_key"],
    ["20260813213000_sol_s11_habits_focus_targets", "Task_habitId_habitOccurrenceAt_key"],
    ["20260813220000_sol_s11_meeting_proposals", "MeetingNoteProposal_actionVersion_check"],
  ])("keeps %s additive and constrained", (directory, marker) => {
    const sql = readFileSync(
      join(root, "prisma", "migrations", directory, "migration.sql"),
      "utf8"
    );
    expect(sql).toContain(marker);
    expect(sql).not.toMatch(/DROP\s+(TABLE|COLUMN)/i);
  });
});
