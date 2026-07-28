import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const ROOT_FILES = ["README.md", "package.json"];
const ROOTS = ["src", "public", "mcp", "docs", ".github", "openspec/specs"];
const TEXT_EXTENSIONS = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);
const FORBIDDEN = [
  /FluidCalendar/i,
  /Fluid Calendar/i,
  /FullCalendar/,
  /Flowday/i,
  /\bMina\b/i,
  /teenx planner/i,
];

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === "_old" ||
      entry.name === "archive"
    ) {
      continue;
    }
    const target = join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(target)));
    else if (TEXT_EXTENSIONS.has(extname(entry.name))) files.push(target);
  }
  return files;
}

const files = [
  ...ROOT_FILES.map((file) => join(ROOT, file)),
  ...(await Promise.all(ROOTS.map((root) => collect(join(ROOT, root))))).flat(),
];
const failures = [];

for (const file of files) {
  const lines = (await readFile(file, "utf8")).split(/\r?\n/);
  lines.forEach((line, index) => {
    if (
      line.includes("@fullcalendar/") ||
      line.includes("LEGACY_") ||
      line.includes("legacy fallback")
    ) {
      return;
    }
    for (const pattern of FORBIDDEN) {
      if (pattern.test(line)) {
        failures.push(
          `${relative(ROOT, file)}:${index + 1}: ${line.trim()}`
        );
      }
    }
  });
}

if (failures.length > 0) {
  console.error("Needt branding check failed:\n" + failures.join("\n"));
  process.exit(1);
}

console.log(`Needt branding check passed (${files.length} files).`);
