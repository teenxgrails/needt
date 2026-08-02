import { access, readFile, readdir } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx"]);
const failures = [];

async function collect(path) {
  const entries = await readdir(path, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(path, entry.name);
    if (entry.isDirectory()) files.push(...(await collect(target)));
    else if (SOURCE_EXTENSIONS.has(extname(entry.name))) files.push(target);
  }
  return files;
}

async function source(path) {
  return readFile(join(ROOT, path), "utf8");
}

function requireText(path, text, contents) {
  if (!contents.includes(text)) {
    failures.push(`${path}: missing ${JSON.stringify(text)}`);
  }
}

function forbidText(path, text, contents) {
  if (contents.includes(text)) {
    failures.push(`${path}: contains retired ${JSON.stringify(text)}`);
  }
}

function forbidPattern(path, pattern, description, contents) {
  if (pattern.test(contents)) {
    failures.push(`${path}: contains retired ${description}`);
  }
}

const LEGACY_TOKEN_NAMES = [
  "app-bg",
  "raised",
  "raised-2",
  "active",
  "line",
  "line-strong",
  "text-hi",
  "text-lo",
  "accent",
  "accent-contrast",
  "accent-foreground",
  "bg-0",
  "bg-1",
  "bg-2",
  "acc-blue",
  "acc-violet",
  "acc-magenta",
  "acc-teal",
  "acc-gold",
];

for (const retired of [
  "src/components/ui/option-picker.tsx",
  "src/components/ui/combobox-picker.tsx",
]) {
  try {
    await access(join(ROOT, retired));
    failures.push(`${retired}: retired picker still exists`);
  } catch {
    // Expected: NeedtPicker is the only picker.
  }
}

const productSources = [
  ...(await collect(join(ROOT, "src/app"))),
  ...(await collect(join(ROOT, "src/components"))),
];
for (const file of productSources) {
  const contents = await readFile(file, "utf8");
  const name = relative(ROOT, file);
  for (const retired of [
    "@/components/ui/option-picker",
    "@/components/ui/combobox-picker",
    "MotionPicker",
    "OptionPicker",
  ]) {
    forbidText(name, retired, contents);
  }
  if (
    contents.includes('from "sonner"') &&
    name !== "src/components/ui/sonner.tsx"
  ) {
    failures.push(`${name}: product surface bypasses notification facade`);
  }

  for (const legacyToken of LEGACY_TOKEN_NAMES) {
    const escaped = legacyToken.replaceAll("-", "\\-");
    forbidPattern(
      name,
      new RegExp(`var\\(--${escaped}\\)`),
      `var(--${legacyToken})`,
      contents
    );
  }

  if (name !== "src/components/ui/design-system-lab.tsx") {
    forbidText(name, 'from "@/components/ui/select"', contents);
    forbidText(name, "<select", contents);
    forbidPattern(
      name,
      /(?:border|bg|text)-\[#(?:323234|262627|9aa0a6)\]|hover:bg-\[#2b2f31\]/i,
      "hard-coded legacy UI palette",
      contents
    );
  }
}

for (const integrationPath of ["src/app/globals.css", "tailwind.config.ts"]) {
  const contents = await source(integrationPath);
  for (const legacyToken of LEGACY_TOKEN_NAMES) {
    const escaped = legacyToken.replaceAll("-", "\\-");
    forbidPattern(
      integrationPath,
      new RegExp(`(?:var\\(--${escaped}\\)|--${escaped}\\s*:)`),
      `legacy token --${legacyToken}`,
      contents
    );
  }
}

const focusPath = "src/components/focus/FocusTimerPanel.tsx";
const focus = await source(focusPath);
requireText(focusPath, 'data-testid="focus-flat-canvas"', focus);
for (const retired of [
  "needt-panel-depth",
  "rounded-[22px]",
  "rounded-[18px]",
]) {
  forbidText(focusPath, retired, focus);
}

const todayPath = "src/components/today/TodayView.tsx";
const today = await source(todayPath);
requireText(todayPath, 'data-testid="today-route-scroll"', today);
requireText(todayPath, 'data-testid="today-document-scroll"', today);

const timelinePath = "src/components/today/DayTimeline.tsx";
const timeline = await source(timelinePath);
requireText(timelinePath, 'data-testid="today-timeline-scroll"', timeline);

const companionPath = "src/components/ai/AICompanion.tsx";
const companion = await source(companionPath);
for (const required of [
  "DRAG_THRESHOLD = 6",
  "setPointerCapture",
  "requestAnimationFrame",
  "toNormalized",
  "max-sm:h-16 max-sm:w-16",
]) {
  requireText(companionPath, required, companion);
}

const packageJson = JSON.parse(await source("package.json"));
if (packageJson.name !== "needt") {
  failures.push(`package.json: expected name "needt", got ${packageJson.name}`);
}
requireText(
  "package.json",
  "ghcr.io/teenxgrails/needt:main",
  JSON.stringify(packageJson)
);
requireText(
  "docker-compose.yml",
  "ghcr.io/teenxgrails/needt:main",
  await source("docker-compose.yml")
);
requireText(
  "src/lib/theme.ts",
  'if (theme === "gray") return "graphite"',
  await source("src/lib/theme.ts")
);

if (failures.length) {
  console.error(`Needt UI contract check failed:\n${failures.join("\n")}`);
  process.exit(1);
}

console.log(
  `Needt UI contract check passed (${productSources.length} product files).`
);
