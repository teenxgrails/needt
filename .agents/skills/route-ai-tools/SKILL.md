---
name: route-ai-tools
description: Automatically select and apply Needt's AI tooling. Use for any task involving third-party library, framework, API, or CLI semantics or dependency updates (Context7); user-visible UI, CSS, layout, responsive behavior, or visual verification (Playwright MCP); or execution and review of a multi-step plan that may suit ralphex. Also use when deciding that these tools are unnecessary for a small internal-code task.
---

# Route Needt AI Tools

Classify the task before planning or editing. Use only the matching tools; do
not invoke all tools mechanically.

## Context7

- Query Context7 before relying on third-party API, framework, library, or CLI
  behavior.
- Use the dependency version installed in this repository when available.
- Do not use Context7 to understand Needt's own code; search the repository.

## Playwright MCP

- Inspect the relevant route before and after user-visible UI, CSS, layout,
  responsive, or interaction changes.
- Start or request the dev server when needed. Use device-pixel screenshots for
  dense interfaces and test relevant mobile widths for responsive work.
- Treat Playwright MCP as visual evidence, never as a replacement for
  `npm run test:visual` or `npm run test:style`.

## ralphex

- Use ralphex only for a human-reviewed multi-step plan whose tasks each include
  validation commands.
- For a suitable task wave, recommend the command from
  `docs/AI-TOOLING-SETUP.md`; do not launch an unattended run unless the user
  explicitly requests it after reviewing the plan.
- Handle small fixes directly in Codex.

Read `docs/AI-TOOLING-SETUP.md` only when exact commands or troubleshooting are
needed.
