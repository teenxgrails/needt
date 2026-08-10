import { readFileSync } from "node:fs";

const workflow = readFileSync(
  ".github/workflows/docker-publish.yml",
  "utf8"
);

describe("production deployment workflow", () => {
  it("fails closed when required deployment configuration is missing", () => {
    expect(workflow).toContain(
      '${WEB_HOOK:?COOLIFY_WEB_WEBHOOK_URL is required}'
    );
    expect(workflow).toContain(
      '${COLLABORATION_HOOK:?COOLIFY_COLLABORATION_WEBHOOK_URL is required}'
    );
    expect(workflow).not.toContain("if: ${{ env.WEB_HOOK != '' }}");
  });

  it("waits for the exact deployed web SHA before dependent runtimes", () => {
    const healthIndex = workflow.indexOf(
      "Wait for the exact web SHA and database health"
    );
    const workerIndex = workflow.indexOf("Trigger worker redeploy");
    const collaborationIndex = workflow.indexOf(
      "Trigger collaboration redeploy"
    );

    expect(workflow).toContain('healthy_sha" = "$DEPLOY_SHA');
    expect(healthIndex).toBeGreaterThan(-1);
    expect(workerIndex).toBeGreaterThan(healthIndex);
    expect(collaborationIndex).toBeGreaterThan(healthIndex);
  });
});
