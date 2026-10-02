import { assertVisualBaselineUpdateEnvironment } from "../../scripts/visual-baseline-update-guard";

describe("visual baseline update authority", () => {
  it.each([
    { ci: undefined, platform: "linux" as const },
    { ci: "false", platform: "linux" as const },
    { ci: "true", platform: "darwin" as const },
  ])("rejects $ci on $platform", (environment) => {
    expect(() => assertVisualBaselineUpdateEnvironment(environment)).toThrow(
      'Visual baseline updates are CI-authoritative and may run only with CI === "true" on Linux'
    );
  });

  it("allows an explicitly marked Linux CI run", () => {
    expect(() =>
      assertVisualBaselineUpdateEnvironment({ ci: "true", platform: "linux" })
    ).not.toThrow();
  });
});
