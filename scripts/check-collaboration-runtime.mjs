import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

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

process.stdout.write(
  "Collaboration runtime uses one Yjs installation and server module identity.\n"
);
