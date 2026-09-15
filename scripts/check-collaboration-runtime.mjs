import { spawn, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { connect, createServer } from "node:net";

const BUNDLE_PATH = "dist/collaboration/index.mjs";
const HOST = "127.0.0.1";
const PORT = 1234;
const STARTUP_TIMEOUT_MS = 10_000;

const result = spawnSync(
  process.platform === "win32" ? "npm.cmd" : "npm",
  ["ls", "--parseable", "yjs", "y-protocols"],
  { encoding: "utf8" }
);

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status ?? 1);
}

const installations = result.stdout
  .split(/\r?\n/u)
  .map((line) => line.trim())
  .filter(Boolean);
const yjs = installations.filter((path) =>
  /[/\\]node_modules[/\\]yjs$/u.test(path)
);
const protocols = installations.filter((path) =>
  /[/\\]node_modules[/\\]y-protocols$/u.test(path)
);

if (yjs.length !== 1 || protocols.length !== 1) {
  process.stderr.write(
    `Expected one Yjs and one y-protocols installation; found ${yjs.length} and ${protocols.length}.\n`
  );
  process.exit(1);
}

const nextConfig = readFileSync("next.config.js", "utf8");
if (!nextConfig.includes('"yjs",')) {
  process.stderr.write(
    "Next server bundles must externalize Yjs to preserve one constructor identity.\n"
  );
  process.exit(1);
}

function canConnect() {
  return new Promise((resolve) => {
    const socket = connect({ host: HOST, port: PORT });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
    socket.setTimeout(250, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function hasExpectedHealth() {
  try {
    // Fixed loopback smoke carries no credentials and never leaves the runner.
    // nosemgrep: typescript.react.security.react-insecure-request.react-insecure-request
    const response = await fetch(`http://${HOST}:${PORT}/health`, {
      signal: AbortSignal.timeout(250),
    });
    const body = await response.json();
    return (
      response.ok &&
      body?.ok === true &&
      body?.service === "collaboration" &&
      body?.buildSha === "collaboration-smoke-sha"
    );
  } catch {
    return false;
  }
}

function waitForExit(child, timeoutMs) {
  return Promise.race([
    new Promise((resolve) =>
      child.once("exit", (code, signal) => resolve({ code, signal }))
    ),
    new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}

function spawnBundle() {
  return spawn(process.execPath, [BUNDLE_PATH], {
    env: {
      ...process.env,
      NODE_ENV: "test",
      NEEDT_BUILD_SHA: "collaboration-smoke-sha",
      COLLABORATION_HOST: HOST,
      COLLABORATION_PORT: String(PORT),
      DATABASE_URL: "",
      REDIS_URL: "",
      SENTRY_DSN: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const child = spawnBundle();

let output = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  output += chunk;
});
child.stderr.on("data", (chunk) => {
  output += chunk;
});

const deadline = Date.now() + STARTUP_TIMEOUT_MS;
let started = false;
while (Date.now() < deadline && child.exitCode === null) {
  if ((await canConnect()) && (await hasExpectedHealth())) {
    started = true;
    break;
  }
  await new Promise((resolve) => setTimeout(resolve, 100));
}

if (!started) {
  child.kill("SIGKILL");
  await waitForExit(child, 1_000);
  process.stderr.write(
    output || `Collaboration bundle did not listen on ${HOST}:${PORT}.\n`
  );
  process.exit(1);
}

child.kill("SIGTERM");
const stopped = await waitForExit(child, 5_000);
if (!stopped) {
  child.kill("SIGKILL");
  await waitForExit(child, 1_000);
}

const occupiedPort = createServer();
await new Promise((resolve, reject) => {
  occupiedPort.once("error", reject);
  occupiedPort.listen(PORT, HOST, resolve);
});
const failingChild = spawnBundle();
let failureOutput = "";
failingChild.stdout.setEncoding("utf8");
failingChild.stderr.setEncoding("utf8");
failingChild.stdout.on("data", (chunk) => {
  failureOutput += chunk;
});
failingChild.stderr.on("data", (chunk) => {
  failureOutput += chunk;
});
const failureExit = await waitForExit(failingChild, 5_000);
await new Promise((resolve) => occupiedPort.close(resolve));
if (!failureExit || failureExit.code === 0) {
  failingChild.kill("SIGKILL");
  process.stderr.write(
    failureOutput || "Collaboration bundle did not fail on a listen error.\n"
  );
  process.exit(1);
}

process.stdout.write(
  "Collaboration bundle accepted TCP connections and exits nonzero on listen failure.\n"
);
