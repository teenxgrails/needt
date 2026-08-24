import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/ci.yml", "utf8");

describe("CI security workflow", () => {
  it("does not expose an all-zero push baseline to Semgrep", () => {
    expect(workflow).toContain(
      'zero_sha="0000000000000000000000000000000000000000"'
    );
    expect(workflow).toContain('[ "$SEMGREP_BASELINE_COMMIT" != "$zero_sha" ]');
    expect(workflow).toContain(
      'semgrep --config=auto --error --baseline-commit "$SEMGREP_BASELINE_COMMIT"'
    );
    expect(workflow).toContain("unset SEMGREP_BASELINE_COMMIT");
    expect(workflow).toContain("semgrep --config=auto --error");
  });
});
