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
    expect(workflow).toContain(
      "${WEB_HEALTH_URL:?NEEDT_PRODUCTION_HEALTH_URL is required}"
    );
    expect(workflow).toContain(
      "${COLLABORATION_HEALTH_URL:?NEEDT_PRODUCTION_COLLABORATION_HEALTH_URL is required}"
    );
    expect(workflow).not.toContain("NEEDT_PRODUCTION_WORKER_HEALTH_URL");
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
    expect(workflow).toContain("previous_sha=unknown");
    expect(workflow).toContain("Record manual rollback instructions");
    expect(workflow).toContain(
      "use Coolify Deployments to restore the previous successful local image"
    );

    const previousShaIndex = workflow.indexOf("Record current healthy web SHA");
    const webDeployIndex = workflow.indexOf("Trigger web redeploy");
    expect(previousShaIndex).toBeGreaterThan(-1);
    expect(webDeployIndex).toBeGreaterThan(previousShaIndex);
  });

  it("continues to a repair deploy when the previous web health is unavailable", () => {
    const recordPreviousSha = workflow.slice(
      workflow.indexOf("Record current healthy web SHA"),
      workflow.indexOf("Trigger web redeploy")
    );

    expect(recordPreviousSha).toContain("previous_sha=unknown");
    expect(recordPreviousSha).toContain(
      'curl --silent --show-error --max-time 30 "$WEB_HEALTH_URL" || true'
    );
    expect(recordPreviousSha).toContain("jq -r");
    expect(recordPreviousSha).toContain("2>/dev/null || true");
    expect(recordPreviousSha).toContain(
      '[[ "$candidate" =~ ^[0-9a-fA-F]{40}$ ]]'
    );
    expect(recordPreviousSha).not.toContain(
      'curl --fail --silent --show-error --max-time 30 "$WEB_HEALTH_URL"'
    );
    expect(recordPreviousSha).not.toContain("jq -er");
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

  it("checks runtime parity through public web and collaboration health", () => {
    const workerIndex = workflow.indexOf("Trigger worker redeploy");
    const collaborationIndex = workflow.indexOf(
      "Trigger collaboration redeploy"
    );
    const parityIndex = workflow.indexOf("Wait for all runtime SHAs");

    expect(workflow).toContain(
      "COLLABORATION_HEALTH_URL: ${{ secrets.NEEDT_PRODUCTION_COLLABORATION_HEALTH_URL }}"
    );
    expect(workflow).not.toContain("WORKER_HEALTH_URL");
    expect(workflow).toContain("run: npm run check:runtime-shas");
    expect(parityIndex).toBeGreaterThan(workerIndex);
    expect(parityIndex).toBeGreaterThan(collaborationIndex);
  });

  it("bounds the executable collaboration smoke in the gates job", () => {
    expect(workflow).toContain(
      "timeout 30s npm run check:collaboration-runtime"
    );
  });

  it("builds only the native AMD64 production image", () => {
    expect(workflow).toContain("platforms: linux/amd64");
    expect(workflow).not.toContain("linux/arm64");
    expect(workflow).not.toContain("docker/setup-qemu-action@v3");
  });

  it("fails before publishing when Sentry source-map credentials are empty", () => {
    expect(workflow).toContain(
      "Validate Sentry source-map upload configuration"
    );
    expect(workflow).toContain(
      "${SENTRY_AUTH_TOKEN:?SENTRY_AUTH_TOKEN is required}"
    );
    expect(workflow).toContain("${SENTRY_ORG:?SENTRY_ORG is required}");
    expect(workflow).toContain("${SENTRY_PROJECT:?SENTRY_PROJECT is required}");
  });

  it("deploys web in parallel with an amd64-only image publish", () => {
    expect(workflow).toContain("deploy-web:\n    needs: gates");
    expect(workflow).toContain("platforms: linux/amd64");
    expect(workflow).not.toContain("linux/arm64");
    expect(workflow).not.toContain("docker/setup-qemu-action");
    expect(workflow).toContain("deploy-runtimes:\n    needs: deploy-web");
  });
});
