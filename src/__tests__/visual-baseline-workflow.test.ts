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

  it("fails closed when visual drift is detected", () => {
    const enforcementStep = workflow.slice(
      workflow.indexOf("- name: Enforce visual gate")
    );

    expect(enforcementStep).toContain("run: exit 1");
    expect(enforcementStep).not.toContain(
      "Visual/style drift is temporarily non-blocking"
    );
  });
});
