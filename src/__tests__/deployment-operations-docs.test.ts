import { readFileSync } from "node:fs";

const deployGuide = readFileSync("docs/deploy.md", "utf8");
const launchPlan = readFileSync("docs/plans/09-launch.md", "utf8");

describe("VPS-safe deployment contract", () => {
  it.each([
    ["deploy guide", deployGuide],
    ["launch plan", launchPlan],
  ])("keeps Coolify auto deploy intentionally disabled in the %s", (_, doc) => {
    expect(doc).toMatch(/Auto deploy[^\n]*disabled/i);
    expect(doc).toMatch(/must not be re-enabled|do not re-enable/i);
    expect(doc).toMatch(/GHCR/i);
  });

  it.each([
    ["deploy guide", deployGuide],
    ["launch plan", launchPlan],
  ])(
    "requires web health before worker and collaboration in the %s",
    (_, doc) => {
      expect(doc).toMatch(
        /web[^\n]*first[^]*\/api\/health[^]*(worker[^]*collaboration|worker and collaboration)/i
      );
    }
  );
});
