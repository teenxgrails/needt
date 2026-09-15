import { readFileSync } from "node:fs";

describe("Sentry browser release identity", () => {
  it("exposes the production build SHA to the browser before Next compiles", () => {
    const dockerfile = readFileSync("docker/production/Dockerfile", "utf8");
    const buildIndex = dockerfile.indexOf("RUN npm run build");

    expect(dockerfile.indexOf("ARG NEEDT_BUILD_SHA=local")).toBeLessThan(
      buildIndex
    );
    expect(dockerfile.indexOf("ENV NEEDT_BUILD_SHA=$NEEDT_BUILD_SHA")).toBeLessThan(
      buildIndex
    );
    expect(
      dockerfile.indexOf("ENV NEXT_PUBLIC_NEEDT_BUILD_SHA=$NEEDT_BUILD_SHA")
    ).toBeLessThan(buildIndex);
  });
});
