import { readFileSync } from "node:fs";

const workflow = readFileSync(".github/workflows/docker-publish.yml", "utf8");
const deployScript = readFileSync("scripts/coolify-deploy-image.sh", "utf8");

function job(name: string) {
  const start = workflow.indexOf(`\n  ${name}:\n`);
  expect(start).toBeGreaterThan(-1);
  const next = workflow.slice(start + 1).search(/\n  [a-z-]+:\n/);
  return next === -1
    ? workflow.slice(start)
    : workflow.slice(start, start + 1 + next);
}

describe("production deployment workflow", () => {
  it("accepts privileged workflow runs only from a successful main push in this repository", () => {
    const changes = job("changes");
    expect(changes).toContain("github.event.workflow_run.event == 'push'");
    expect(changes).toContain(
      "github.event.workflow_run.head_repository.full_name == github.repository"
    );
    expect(changes).toContain(
      "github.event.workflow_run.head_branch == github.event.repository.default_branch"
    );
    expect(changes).toContain(
      "github.event.workflow_run.conclusion == 'success'"
    );
    expect(changes).toContain(
      "github.ref == format('refs/heads/{0}', github.event.repository.default_branch)"
    );
    // Every later job hangs off `changes`, so none can run without the gate.
    for (const name of [
      "gates",
      "images",
      "promote-rollback",
      "deploy-web",
      "deploy-runtimes",
    ]) {
      expect(job(name)).toMatch(/needs: (changes|\[changes)/);
    }
    expect(workflow).not.toContain(
      "ref: ${{ github.event.repository.default_branch }}"
    );
    // Every checkout after `changes` pins the one release SHA it decided.
    expect(
      workflow.match(/ref: \$\{\{ needs\.changes\.outputs\.sha \}\}/g)
    ).toHaveLength(4);
  });

  it("pins every third-party action to an immutable commit", () => {
    const actionRefs = [
      ...workflow.matchAll(/^\s*-?\s*uses:\s*([^\s]+)$/gm),
    ].map(([, ref]) => ref);
    expect(actionRefs.length).toBeGreaterThan(0);
    for (const ref of actionRefs) {
      expect(ref).toMatch(/^[^@]+@[0-9a-f]{40}$/);
    }
  });

  it("skips the release when only documentation changed since production", () => {
    const changes = job("changes");
    // Compared with what production serves, not HEAD~1, so merges landed
    // during a skipped release are never lost.
    expect(changes).toContain(
      'git diff --name-only "$previous_sha" "$HEAD_SHA"'
    );
    expect(changes).toContain("fetch-depth: 0");
    expect(changes).toContain("docs/|openspec/");
    // Unknown production history deploys rather than skips.
    expect(changes).toContain('if [ "$previous_sha" = unknown ]');
    expect(job("images")).toContain("needs: [changes, gates]");
    expect(job("gates")).toContain("needs.changes.outputs.deploy == 'true'");
  });

  it("builds the three runtimes as amd64 images tagged with the release SHA", () => {
    const images = job("images");
    for (const target of ["production", "worker", "collaboration"]) {
      expect(images).toContain(`target: ${target}`);
    }
    expect(images).toContain("file: Dockerfile");
    expect(images).toContain("target: ${{ matrix.target }}");
    expect(images).toContain(
      "${{ env.IMAGE_PREFIX }}-${{ matrix.image }}:${{ env.RELEASE_SHA }}"
    );
    expect(images).toContain("platforms: linux/amd64");
    expect(workflow).not.toContain("linux/arm64");
    expect(workflow).not.toContain("docker/setup-qemu-action");
    // Separate cache scopes, or the three builds evict each other.
    expect(images).toContain("cache-to: type=gha,scope=${{ matrix.target }}");
  });

  it("fails closed when build-time or deployment configuration is missing", () => {
    const images = job("images");
    for (const name of [
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_COLLABORATION_URL",
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      "NEXT_PUBLIC_SENTRY_DSN",
    ]) {
      expect(images).toContain(`\${${name}:?vars.${name} is required}`);
    }
    expect(images).toContain(
      "${SENTRY_AUTH_TOKEN:?SENTRY_AUTH_TOKEN is required}"
    );
    expect(images).toContain("${SENTRY_ORG:?SENTRY_ORG is required}");
    expect(images).toContain("${SENTRY_PROJECT:?SENTRY_PROJECT is required}");
    expect(workflow).toContain(
      "${COOLIFY_TOKEN:?COOLIFY_API_TOKEN is required}"
    );
    expect(workflow).toContain("${WEB_UUID:?COOLIFY_WEB_UUID is required}");
    expect(workflow).toContain(
      "${COLLABORATION_UUID:?COOLIFY_COLLABORATION_UUID is required}"
    );
    expect(workflow).toContain(
      "${WEB_HEALTH_URL:?NEEDT_PRODUCTION_HEALTH_URL is required}"
    );
    expect(workflow).toContain(
      "${COLLABORATION_HEALTH_URL:?NEEDT_PRODUCTION_COLLABORATION_HEALTH_URL is required}"
    );
    expect(workflow).not.toContain("NEEDT_PRODUCTION_WORKER_HEALTH_URL");
  });

  it("deploys the main tag through one script that needs only deploy rights", () => {
    expect(
      workflow.match(/\.\/scripts\/coolify-deploy-image\.sh/g)
    ).toHaveLength(3);
    expect(workflow).not.toContain("trigger-coolify-deploy.sh");
    expect(deployScript).toContain("Authorization: Bearer $COOLIFY_TOKEN");
    expect(deployScript).toContain("/api/v1/deploy?uuid=");
    expect(deployScript).toContain("exit 1");
    // Changing a resource's configured tag needs the token's `write`
    // ability, which the release token does not have (HTTP 403 on
    // 2026-10-08). CI moves the `main` tag instead.
    expect(deployScript).not.toContain("PATCH");
    expect(deployScript).not.toContain("docker_registry_image_tag");
    expect(job("images")).toContain(
      "${{ env.IMAGE_PREFIX }}-${{ matrix.image }}:main"
    );
  });

  it("continues to a repair deploy when the previous web health is unavailable", () => {
    const changes = job("changes");
    expect(changes).toContain("previous_sha=unknown");
    expect(changes).toContain(
      'curl --silent --show-error --max-time 30 "${WEB_HEALTH_URL:-}" || true'
    );
    expect(changes).toContain("2>/dev/null || true");
    expect(changes).toContain('[[ "$candidate" =~ ^[0-9a-fA-F]{40}$ ]]');
    expect(changes).not.toContain("jq -er");
  });

  it("waits for the exact deployed web SHA before dependent runtimes", () => {
    const web = job("deploy-web");
    const runtimes = job("deploy-runtimes");
    expect(web).toContain('healthy_sha" = "$DEPLOY_SHA');
    expect(runtimes).toContain(
      "needs: [changes, images, promote-rollback, deploy-web]"
    );
    expect(runtimes).toContain("needs.deploy-web.result != 'failure'");
    expect(runtimes).toContain("needs.deploy-web.result != 'cancelled'");
  });

  it("checks runtime parity through public web and collaboration health", () => {
    const runtimes = job("deploy-runtimes");
    expect(runtimes).toContain(
      "COLLABORATION_HEALTH_URL: ${{ secrets.NEEDT_PRODUCTION_COLLABORATION_HEALTH_URL }}"
    );
    expect(workflow).not.toContain("WORKER_HEALTH_URL");
    expect(runtimes).toContain("run: npm run check:runtime-shas");
    expect(runtimes.indexOf("Wait for all runtime SHAs")).toBeGreaterThan(
      runtimes.indexOf("Deploy the collaboration image")
    );
  });

  it("rolls back by redeploying a published tag without building", () => {
    expect(workflow).toContain("rollback_sha:");
    const changes = job("changes");
    expect(changes).toContain('[[ "$ROLLBACK_SHA" =~ ^[0-9a-f]{40}$ ]]');
    expect(job("gates")).toContain("needs.changes.outputs.rollback != 'true'");
    const promote = job("promote-rollback");
    expect(promote).toContain("needs.changes.outputs.rollback == 'true'");
    expect(promote).toContain("docker buildx imagetools create");
    expect(promote).toContain('"$IMAGE_PREFIX-$image:main"');
    expect(job("deploy-web")).toContain(
      "needs.promote-rollback.result == 'success'"
    );
    expect(workflow).toContain(
      "gh workflow run docker-publish.yml -f rollback_sha="
    );
  });

  it("bounds the executable collaboration smoke in the gates job", () => {
    expect(job("gates")).toContain(
      "timeout 30s npm run check:collaboration-runtime"
    );
  });
});
