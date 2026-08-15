---
id: 20260815-claude-docs-cleanup
owner: claude-cowork
branch: codex/design-completion
status: complete
updated: 2026-08-15T23:40:00Z
objective: Archive superseded root-level planning docs and add a universal new-chat bootstrap prompt, without touching any file owned by the active codex handoffs.
---

## Scope

- Governing plan/spec: none (repo hygiene / agent-collaboration tooling, not
  a Sol/Terra plan item).
- In scope: moving dead root-level `.md`/scratch files into `docs/_old/`,
  adding a `BOOTSTRAP.md` pointer, a short addition to `AGENTS.md`, and this
  handoff.
- Out of scope: anything in `.codex/config.toml`, `CLAUDE.md`,
  `docs/plans/README.md`, `src/app/layout.tsx`, `.playwright-mcp/`,
  `NEXT_AGENT.md`, `docs/plans/08-terra-high.md`, `pages-mobile-slash-390.png`
  — all confirmed dirty/owned by the active codex handoffs
  (`20260815-codex-delivery-audit`, `20260815-codex-e2e-reproducibility`) and
  left untouched.

## Completed

- Moved 34 superseded root-level files (dated Jul 7–19, predating the current
  `AGENTS.md`/`docs/plans/*` structure) into `docs/_old/` with `git mv`:
  `AGENTS_ADDON.md`, `AGENTS_DESIGN.md`, `AGENTS_DESIGN_RESUME.md`,
  `AGENTS_FLOWDAY.md`, `AGENTS_MASTER.md`, `AGENTS_MOTION_PARITY.md`,
  `AGENTS_NEXT.md`, `AGENTS_POLISH.md`, `AGENTS_REDESIGN.md`, `AGENTS_UI.md`,
  `CALENDAR_TASK_INTERACTIONS.md`, `CLAUDE_CODE_TASKS.md`, `DESIGN.md`,
  `HANDOFF-DESIGN-PASS.md`, `NEEDT-MASTER-PLAN.md`, `NEEDT-NIGHT-FULL.md`,
  `NEEDT-NIGHT-PROMT.md`, `NEEDT-PROGRESS.md`, `NEEDT-PROMTY.md`,
  `NIGHT-REPORT.md`, `PROMT-DLYA-FABLE.md`, `QA_REPORT.md`,
  `SETTINGS_REDESIGN.md`, `TODO.md`, `needt-landing-v0-prompt.md`,
  `needt-reland-branches-prompt.md`, 6x `needt-zadacha-*.md`,
  `landing-mockup.html`, `main-rule.mdc`, `migrate.js`. Verified none were
  referenced live from code, package.json, or current docs (only an already
  archived `docs/_old/sqlite-migration.md` mentioned `migrate.js`, and
  `DECISIONS.md`/the moved `HANDOFF-DESIGN-PASS.md` mention some by name as
  historical record, which still resolves fine after the move).
- Added `BOOTSTRAP.md` (repo root): a copy-paste-first-message prompt for any
  new agent chat (Codex, Claude Code, Cowork, or a repo-unaware bot) that
  enforces reading `AGENTS.md` → `docs/AI-COLLABORATION.md` → active
  handoffs before editing, and explicitly instructs writing/updating a
  handoff *before* running low on context/limits, not after.
- Added one paragraph to `AGENTS.md` pointing to `BOOTSTRAP.md` for
  non-repo-aware tools.
- Updated `CHANGELOG.md` under `[Unreleased]`.

## Working state

- Files currently dirty or expected to change: none after this commit — all
  changes in this handoff's scope were committed together.
- Foreign changes that must remain untouched: unchanged from the active
  codex handoffs (see Scope above) — none of them were touched.

## Verification

- Passed: `npm run check:agent-handoffs`, `npm run check:branding`.
- Not run / still required: type-check/lint/tests were not run because no
  application code changed (docs/markdown only); full gate sequence remains
  owned by the active codex handoffs for their in-flight code changes.

## Decisions and constraints

- User (owner) explicitly authorized working as a second collaborator
  alongside the active codex agent in the primary checkout, on the condition
  that no file already owned by an active codex handoff is touched. This
  handoff only ever staged paths disjoint from those files.
- Archived rather than deleted, per the repo's additive/non-destructive
  convention — history is preserved in git and in `docs/_old/`.

## Blockers

- `None`.

## Next action

- None for this workstream. For the next AGENTS.md/handoff-system
  consolidation pass (owner-requested, not yet started): fold `NEXT_AGENT.md`
  into the standard `.agents/handoffs/` convention once codex closes its
  current active handoffs, since it currently duplicates that system outside
  of it.
