import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8")) as {
  scripts?: Record<string, string>;
};

describe("visual baseline workflow authority", () => {
  it("routes updates through the guarded updater", () => {
    expect(packageJson.scripts?.["test:visual:update"]).toBe(
      "tsx scripts/update-visual-baselines.ts"
    );
  });

  it("creates a baseline-only branch from origin/main", () => {
    expect(workflow).toContain("update-linux-visual-baselines:");
    expect(workflow).toContain("runs-on: ubuntu-latest");
    expect(workflow).toContain("git merge-base --is-ancestor origin/main HEAD");
    expect(workflow).toContain(
      'git switch --create "$TARGET_BRANCH" origin/main'
    );
    expect(workflow).toContain(
      "git add -- ':(glob)tests/visual/**/*-linux.png'"
    );
    expect(workflow).toContain("Baseline update touched forbidden path: $path");
  });

  it("keeps visual drift reported but temporarily non-blocking", () => {
    const enforcementStep = workflow.slice(
      workflow.indexOf("- name: Enforce visual gate")
    );

    expect(enforcementStep).toContain(
      "Restore `exit 1` after the CI-generated Linux baseline refresh"
    );
    expect(enforcementStep).not.toContain("run: exit 1");
    expect(enforcementStep).toContain(
      "Visual/style drift is temporarily non-blocking"
    );
  });
});
