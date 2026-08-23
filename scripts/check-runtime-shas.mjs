const EXPECTED_SHA = process.env.DEPLOY_SHA;
const POLL_INTERVAL_MS = Number(
  process.env.RUNTIME_SHA_POLL_INTERVAL_MS ?? 10_000
);
const TIMEOUT_MS = Number(process.env.RUNTIME_SHA_TIMEOUT_MS ?? 10 * 60_000);

const services = [
  { name: "web", url: process.env.WEB_HEALTH_URL ?? process.env.HEALTH_URL },
  { name: "worker", url: process.env.WORKER_HEALTH_URL },
  { name: "collaboration", url: process.env.COLLABORATION_HEALTH_URL },
];

if (!EXPECTED_SHA) {
  throw new Error("DEPLOY_SHA is required.");
}
for (const service of services) {
  if (!service.url) {
    throw new Error(`${service.name.toUpperCase()}_HEALTH_URL is required.`);
  }
}

async function getServiceSha(service) {
  try {
    const response = await fetch(service.url, {
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) return null;
    const body = await response.json();
    return body?.ok === true && typeof body.buildSha === "string"
      ? body.buildSha
      : null;
  } catch {
    return null;
  }
}

const deadline = Date.now() + TIMEOUT_MS;
let lastSeen = {};
while (Date.now() < deadline) {
  const shas = await Promise.all(services.map(getServiceSha));
  lastSeen = Object.fromEntries(
    services.map((service, index) => [service.name, shas[index]])
  );
  if (shas.every((sha) => sha === EXPECTED_SHA)) {
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
