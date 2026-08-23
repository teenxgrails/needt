import {
  isBuildShaAllowed,
  isGitBuildSha,
  requireProductionBuildSha,
  resolveBuildSha,
} from "@/lib/health/build-sha";

const SHA = "a".repeat(40);

describe("release build SHA", () => {
  it("resolves the explicit Needt SHA before provider fallbacks", () => {
    expect(
      resolveBuildSha({
        NEEDT_BUILD_SHA: SHA,
        VERCEL_GIT_COMMIT_SHA: "b".repeat(40),
      })
    ).toBe(SHA);
  });

  it("accepts only full Git commit SHAs", () => {
    expect(isGitBuildSha(SHA)).toBe(true);
    expect(isGitBuildSha("A".repeat(40))).toBe(true);
    expect(isGitBuildSha("local")).toBe(false);
    expect(isGitBuildSha("a".repeat(39))).toBe(false);
  });

  it("fails closed for an invalid production identity", () => {
    expect(isBuildShaAllowed("local", "production")).toBe(false);
    expect(() => requireProductionBuildSha("local", "production")).toThrow(
      "NEEDT_BUILD_SHA must be a 40-character Git commit SHA in production"
    );
    expect(requireProductionBuildSha("local", "test")).toBe("local");
  });
});
