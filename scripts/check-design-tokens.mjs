#!/usr/bin/env node
/**
 * Guards the one invariant that keeps the design port from blanking the app:
 * every rule in the vendored design-system stylesheets stays inside the
 * `.needt-v2` scope.
 *
 * Nine token names are declared by both systems, and four of them are fatal if
 * they reach the document root — Tailwind reads --background, --foreground,
 * --border and --destructive as HSL triplets, the design system writes hex and
 * oklch into them, and `hsl(#fcfdfe)` is invalid CSS that paints transparent
 * with no console error, in one theme at a time.
 *
 * Run by `npm run tokens:check`, and by lint-staged whenever a vendored
 * stylesheet is staged.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import postcss from "postcss";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCOPE = ".needt-v2";
const FILES = [
  "src/styles/needt-ds-tokens.css",
  "src/styles/needt-themes.css",
  "src/styles/needt-motion.css",
];

/** The names both systems declare. The first four are the fatal ones. */
const COLLIDING = [
  "--background", "--foreground", "--border", "--destructive",
  "--surface-canvas", "--surface-raised",
  "--text-primary", "--text-secondary", "--text-muted",
];

const problems = [];

for (const rel of FILES) {
  const file = join(ROOT, rel);
  let root;
  try {
    root = postcss.parse(readFileSync(file, "utf8"), { from: file });
  } catch (error) {
    problems.push(`${rel}: does not parse as CSS — ${error.message}`);
    continue;
  }

  // A keyframe step list ("0%, 100%") is not a selector. The sync script masks
  // @keyframes blocks so the selector pass cannot touch them; this catches the
  // regression if that masking ever breaks, because the failure is silent —
  // `.needt-v2 0%` is invalid, the browser drops the frame, and the animation
  // interpolates from whatever survived instead of erroring.
  root.walkAtRules("keyframes", (atRule) => {
    atRule.walkRules((step) => {
      for (const selector of step.selectors) {
        if (/^(from|to|\d+(\.\d+)?%)$/.test(selector.trim())) continue;
        problems.push(
          `${rel}:${step.source?.start?.line} — keyframe step "${selector}" in ` +
            `@keyframes ${atRule.params} is not a step; the selector pass scoped it`,
        );
      }
    });
  });

  root.walkRules((rule) => {
    if (rule.parent?.type === "atrule" && rule.parent.name === "keyframes") return;

    for (const selector of rule.selectors) {
      if (selector.startsWith(SCOPE)) continue;
      const declares = rule.nodes
        .filter((n) => n.type === "decl" && COLLIDING.includes(n.prop))
        .map((n) => n.prop);
      const why = declares.length
        ? `declares ${declares.join(", ")} outside the scope`
        : "is not scoped";
      problems.push(`${rel}:${rule.source?.start?.line} — "${selector}" ${why}`);
    }
  });
}

if (problems.length) {
  console.error("Vendored design tokens have escaped their scope:\n");
  for (const p of problems) console.error("  " + p);
  console.error(
    `\nEvery rule in these files must be scoped under ${SCOPE}. They are generated,` +
    `\nso fix scripts/sync-design-tokens.mjs and re-run \`npm run tokens:sync\`.`,
  );
  process.exit(1);
}

console.log(`All rules in ${FILES.length} vendored stylesheets are scoped under ${SCOPE}.`);
