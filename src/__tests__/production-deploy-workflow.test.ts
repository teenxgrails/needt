import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/docker-publish.yml", "utf8");

describe("production deployment workflow", () => {
  it("fails closed when required deployment configuration is missing", () => {
    expect(workflow).toContain(
      "${WEB_HOOK:?COOLIFY_WEB_WEBHOOK_URL is required}"
    );
    expect(workflow).toContain(
      "${COLLABORATION_HOOK:?COOLIFY_COLLABORATION_WEBHOOK_URL is required}"
    );
    expect(workflow).toContain(
      "${COOLIFY_TOKEN:?COOLIFY_API_TOKEN is required}"
    );
    expect(workflow).not.toContain("if: ${{ env.WEB_HOOK != '' }}");
  });

  it("uses authenticated Coolify deploy webhooks and manual native rollback", () => {
    expect(
      workflow.match(/Authorization: Bearer \$COOLIFY_TOKEN/g)
    ).toHaveLength(3);
    expect(workflow.match(/--request GET/g)).toHaveLength(3);
    expect(workflow).not.toContain("COOLIFY_ROLLBACK_WEBHOOK_URL");
    expect(workflow).not.toContain("?sha=$DEPLOY_SHA");
    expect(workflow).toContain("Record current healthy web SHA");
    expect(workflow).toContain(
      "Previous production health is unavailable; continuing with bootstrap deployment"
    );
    expect(workflow).toContain('previous_sha="unavailable"');
    expect(workflow).toContain("Record manual rollback instructions");
    expect(workflow).toContain(
      "use Coolify Deployments to restore the previous successful local image"
    );

    const previousShaIndex = workflow.indexOf("Record current healthy web SHA");
    const webDeployIndex = workflow.indexOf("Trigger web redeploy");
    expect(previousShaIndex).toBeGreaterThan(-1);
    expect(webDeployIndex).toBeGreaterThan(previousShaIndex);
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
