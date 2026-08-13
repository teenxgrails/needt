import { readFileSync } from "node:fs";
import { join } from "node:path";

describe("Onboarding checklist contract", () => {
  const api = readFileSync(
    join(process.cwd(), "src/app/api/onboarding/route.ts"),
    "utf8"
  );
  const checklist = readFileSync(
    join(process.cwd(), "src/components/settings/OnboardingChecklist.tsx"),
    "utf8"
  );

  it("derives account, calendar, workspace and first-task progress server-side", () => {
    expect(api).toContain(
      "workspaceDataScopeWhere(auth.workspace, auth.userId)"
    );
    expect(api).toContain('id: "calendar"');
    expect(api).toContain('id: "workspace"');
    expect(api).toContain('id: "task"');
  });

  it("links incomplete steps to existing product flows", () => {
    expect(checklist).toContain('href: "#calendars"');
    expect(checklist).toContain('href: "#workspace"');
    expect(checklist).toContain('href: "/tasks"');
  });
});
