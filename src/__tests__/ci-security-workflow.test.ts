import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

describe("CI security workflow", () => {
  it("scans only findings added after the actual main merge base", () => {
    expect(workflow).toContain(
      "git fetch --no-tags origin +refs/heads/main:refs/remotes/origin/main"
    );
    expect(workflow).toContain("BASE_SHA=$(git merge-base origin/main HEAD)");
    expect(workflow).toContain(
      'semgrep --config=auto --error --baseline-commit "$BASE_SHA"'
    );
    expect(workflow).not.toContain("SEMGREP_BASELINE_COMMIT");
    expect(workflow).not.toContain('zero_sha="');
  });
});
