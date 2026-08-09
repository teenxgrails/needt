import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const VALID_STATUSES = new Set(["active", "blocked", "complete"]);
const REQUIRED_FIELDS = [
  "id",
  "owner",
  "branch",
  "status",
  "updated",
  "objective",
];
const REQUIRED_SECTIONS = [
  "Scope",
  "Completed",
  "Working state",
  "Verification",
  "Decisions and constraints",
  "Blockers",
  "Next action",
];

function parseFrontmatter(contents) {
  const match = contents.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^(["'])(.*)\1$/, "$2");
    fields[key] = value;
  }
  return fields;
}

function validateFile(filePath, ids) {
  const contents = fs.readFileSync(filePath, "utf8");
  const fields = parseFrontmatter(contents);
  const relativePath = path.relative(process.cwd(), filePath);
  const errors = [];

  if (!fields) return [`${relativePath}: missing YAML frontmatter`];

  for (const field of REQUIRED_FIELDS) {
    if (!fields[field]) errors.push(`${relativePath}: missing ${field}`);
  }

  if (fields.id && path.basename(filePath, ".md") !== fields.id) {
    errors.push(`${relativePath}: filename must match id (${fields.id}.md)`);
  }
  if (fields.id && ids.has(fields.id)) {
    errors.push(`${relativePath}: duplicate id ${fields.id}`);
  }
  if (fields.id) ids.add(fields.id);

  if (fields.status && !VALID_STATUSES.has(fields.status)) {
    errors.push(`${relativePath}: invalid status ${fields.status}`);
  }
  if (
    fields.updated &&
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(fields.updated)
  ) {
    errors.push(`${relativePath}: updated must be UTC YYYY-MM-DDTHH:mm:ssZ`);
  }
  if (fields.updated && Number.isNaN(Date.parse(fields.updated))) {
    errors.push(`${relativePath}: updated is not a valid timestamp`);
  }

  for (const section of REQUIRED_SECTIONS) {
    if (!contents.includes(`## ${section}`)) {
      errors.push(`${relativePath}: missing section "## ${section}"`);
    }
  }

  return errors;
}

const handoffDirectory = path.join(process.cwd(), ".agents", "handoffs");
if (!fs.existsSync(handoffDirectory)) {
  console.error("Missing .agents/handoffs directory");
  process.exit(1);
}

const files = fs
  .readdirSync(handoffDirectory, { withFileTypes: true })
  .filter(
    (entry) =>
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      !entry.name.startsWith("_")
  )
  .map((entry) => path.join(handoffDirectory, entry.name))
  .sort();

const ids = new Set();
const errors = files.flatMap((filePath) => validateFile(filePath, ids));

if (errors.length > 0) {
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Validated ${files.length} agent handoff${files.length === 1 ? "" : "s"}.`
);
