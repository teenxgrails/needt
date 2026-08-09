import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

function git(args, cwd = process.cwd()) {
  try {
    return execFileSync("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch {
    return "";
  }
}

function parseFrontmatter(contents) {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  return Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => {
        const separator = line.indexOf(":");
        if (separator === -1) return null;
        return [
          line.slice(0, separator).trim(),
          line
            .slice(separator + 1)
            .trim()
            .replace(/^(["'])(.*)\1$/, "$2"),
        ];
      })
      .filter(Boolean)
  );
}

function readSection(contents, heading) {
  const marker = `## ${heading}`;
  const headingStart = contents.indexOf(marker);
  if (headingStart === -1) return "";

  const bodyStart = contents.indexOf("\n", headingStart + marker.length);
  if (bodyStart === -1) return "";

  const remaining = contents.slice(bodyStart + 1);
  const nextHeading = remaining.search(/\r?\n## /);
  return remaining
    .slice(0, nextHeading === -1 ? undefined : nextHeading)
    .trim();
}

function parseWorktrees(output) {
  return output
    .split(/\r?\n\r?\n/)
    .filter(Boolean)
    .map((block) => {
      const fields = {};
      for (const line of block.split(/\r?\n/)) {
        const separator = line.indexOf(" ");
        const key = separator === -1 ? line : line.slice(0, separator);
        fields[key] = separator === -1 ? true : line.slice(separator + 1);
      }
      return {
        path: fields.worktree,
        head: fields.HEAD?.slice(0, 12) ?? "unknown",
        branch: fields.branch?.replace("refs/heads/", "") ?? "detached",
        locked: Boolean(fields.locked),
        prunable: Boolean(fields.prunable),
      };
    });
}

function readHandoffs(worktree) {
  const directory = path.join(worktree.path, ".agents", "handoffs");
  if (!fs.existsSync(directory)) return [];

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.endsWith(".md") &&
        !entry.name.startsWith("_")
    )
    .flatMap((entry) => {
      const filePath = path.join(directory, entry.name);
      const contents = fs.readFileSync(filePath, "utf8");
      const fields = parseFrontmatter(contents);
      if (!fields || fields.branch !== worktree.branch) return [];
      return [
        {
          ...fields,
          nextAction: readSection(contents, "Next action"),
          workingState: readSection(contents, "Working state"),
          file: filePath,
          sourceWorktree: worktree.path,
        },
      ];
    });
}

const root = git(["rev-parse", "--show-toplevel"]);
if (!root) {
  console.error("agent:context must run inside a Git worktree");
  process.exit(1);
}

const worktrees = parseWorktrees(
  git(["worktree", "list", "--porcelain"], root)
).map((worktree) => {
  const status = git(["status", "--short"], worktree.path);
  return { ...worktree, dirtyFiles: status ? status.split(/\r?\n/) : [] };
});
const current = {
  path: root,
  branch: git(["branch", "--show-current"], root) || "detached",
  head: git(["rev-parse", "--short=12", "HEAD"], root),
  dirtyFiles: (git(["status", "--short"], root) || "")
    .split(/\r?\n/)
    .filter(Boolean),
};
const handoffs = worktrees
  .flatMap(readHandoffs)
  .filter(
    (handoff) => handoff.status === "active" || handoff.status === "blocked"
  )
  .sort((left, right) => right.updated.localeCompare(left.updated));
const warnings = [];

for (const handoff of handoffs) {
  if (Date.now() - Date.parse(handoff.updated) > STALE_AFTER_MS) {
    warnings.push(`stale active handoff: ${handoff.id} (${handoff.updated})`);
  }
}
for (const branch of new Set(handoffs.map((handoff) => handoff.branch))) {
  if (handoffs.filter((handoff) => handoff.branch === branch).length > 1) {
    warnings.push(`multiple active handoffs claim branch ${branch}`);
  }
}
if (
  current.dirtyFiles.length > 0 &&
  !handoffs.some((handoff) => handoff.branch === current.branch)
) {
  warnings.push(
    `dirty current worktree has no active handoff for ${current.branch}`
  );
}

const snapshot = {
  generatedAt: new Date().toISOString(),
  current,
  worktrees,
  handoffs,
  warnings,
  recentCommits: git(["log", "-5", "--pretty=format:%h %s"], root)
    .split(/\r?\n/)
    .filter(Boolean),
};

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(snapshot, null, 2));
  process.exit(0);
}

console.log(`Current: ${current.branch} @ ${current.head}`);
console.log(`Path: ${current.path}`);
console.log(`Dirty: ${current.dirtyFiles.length}`);
for (const file of current.dirtyFiles) console.log(`  ${file}`);

console.log(`\nWorktrees (${worktrees.length}):`);
for (const worktree of worktrees) {
  const flags = [
    worktree.locked && "locked",
    worktree.prunable && "prunable",
  ].filter(Boolean);
  console.log(
    `  ${worktree.branch} @ ${worktree.head} — ${worktree.dirtyFiles.length} dirty — ${worktree.path}${
      flags.length ? ` [${flags.join(", ")}]` : ""
    }`
  );
}

console.log(`\nActive handoffs (${handoffs.length}):`);
for (const handoff of handoffs) {
  console.log(
    `  ${handoff.id} [${handoff.status}] ${handoff.owner} — ${handoff.objective}`
  );
  console.log(`    ${handoff.branch} · ${handoff.updated} · ${handoff.file}`);
  if (handoff.nextAction) {
    console.log(`    Next: ${handoff.nextAction.replace(/\s+/g, " ")}`);
  }
}
if (handoffs.length === 0) console.log("  none");

console.log("\nRecent commits:");
for (const commit of snapshot.recentCommits) console.log(`  ${commit}`);

if (warnings.length > 0) {
  console.log("\nWarnings:");
  for (const warning of warnings) console.log(`  - ${warning}`);
}
