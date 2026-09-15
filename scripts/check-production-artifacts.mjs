import { readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const NEXT_ROOT = join(ROOT, ".next");
const STATIC_ROOT = join(NEXT_ROOT, "static");
const SCAN_ROOTS = [join(NEXT_ROOT, "server"), STATIC_ROOT];
const TEXT_EXTENSIONS = new Set([".html", ".js", ".json", ".rsc", ".txt"]);
const FORBIDDEN = "mcp.figma.com/mcp/html-to-design/capture.js";

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(target)));
    else files.push(target);
  }
  return files;
}

const artifactFiles = (await Promise.all(SCAN_ROOTS.map(collect))).flat();
const sourceMaps = artifactFiles.filter(
  (file) => file.startsWith(`${STATIC_ROOT}/`) && extname(file) === ".map"
);
if (sourceMaps.length > 0) {
  console.error(
    `Production client source maps were not deleted after upload:\n${sourceMaps
      .map((file) => relative(ROOT, file))
      .join("\n")}`
  );
  process.exit(1);
}

const files = artifactFiles.filter((file) =>
  TEXT_EXTENSIONS.has(extname(file))
);
const matches = [];
for (const file of files) {
  if ((await readFile(file, "utf8")).includes(FORBIDDEN)) {
    matches.push(relative(ROOT, file));
  }
}

if (matches.length > 0) {
  console.error(
    `Production build contains the local Figma capture script:\n${matches.join("\n")}`
  );
  process.exit(1);
}

console.log(`Production artifact check passed (${files.length} files).`);
