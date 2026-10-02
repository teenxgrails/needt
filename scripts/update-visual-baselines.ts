import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { assertVisualBaselineUpdateEnvironment } from "./visual-baseline-update-guard";

assertVisualBaselineUpdateEnvironment({
  ci: process.env.CI,
  platform: process.platform,
});

const playwright = join(process.cwd(), "node_modules", ".bin", "playwright");
const result = spawnSync(
  playwright,
  [
    "test",
    "--config=playwright.visual.config.ts",
    "--update-snapshots",
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" }
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
