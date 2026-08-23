const EXPECTED_SHA = process.env.DEPLOY_SHA;
const POLL_INTERVAL_MS = Number(
  process.env.RUNTIME_SHA_POLL_INTERVAL_MS ?? 10_000
);
const TIMEOUT_MS = Number(process.env.RUNTIME_SHA_TIMEOUT_MS ?? 10 * 60_000);
const GIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

const webHealthUrl = process.env.WEB_HEALTH_URL ?? process.env.HEALTH_URL;
const collaborationHealthUrl = process.env.COLLABORATION_HEALTH_URL;

if (!EXPECTED_SHA || !GIT_SHA_PATTERN.test(EXPECTED_SHA)) {
  throw new Error("DEPLOY_SHA must be a 40-character Git commit SHA.");
}
if (!webHealthUrl) {
  throw new Error("WEB_HEALTH_URL is required.");
}
if (!collaborationHealthUrl) {
  throw new Error("COLLABORATION_HEALTH_URL is required.");
}

async function getHealth(url) {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    return body?.ok === true ? body : null;
  } catch {
    return null;
  }
}

function observedSha(value) {
  return typeof value === "string" && GIT_SHA_PATTERN.test(value)
    ? value
    : null;
}

const deadline = Date.now() + TIMEOUT_MS;
let lastSeen = {};
while (Date.now() < deadline) {
  const [webHealth, collaborationHealth] = await Promise.all([
    getHealth(webHealthUrl),
    getHealth(collaborationHealthUrl),
  ]);
  lastSeen = {
    web: observedSha(webHealth?.buildSha),
    worker: observedSha(webHealth?.workerBuildSha),
    collaboration: observedSha(collaborationHealth?.buildSha),
  };
  if (Object.values(lastSeen).every((sha) => sha === EXPECTED_SHA)) {
    process.stdout.write(
      `All Needt services are healthy at ${EXPECTED_SHA}.\n`
    );
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
}

process.stderr.write(
  `Needt services did not converge on ${EXPECTED_SHA}: ${JSON.stringify(lastSeen)}\n`
);
process.exit(1);
