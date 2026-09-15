---
id: 20260915-codex-design-port-main-merge
owner: codex
branch: codex/design-completion
status: active
updated: 2026-09-15T21:29:53Z
objective: Commit the existing Needt design port in eight path-scoped commits, merge origin/main safely, and stop for owner review.
---

## Scope

- Governing plan/spec: `/Users/lol/Needt-handoff/2026-09-15-docs-refresh/files/docs/handoff/CODEX-NEXT.md` sections 1 and 2.
- In scope: the eight port commit slices listed in section 1; fetch and merge `origin/main`; prescribed conflict resolution and final gates.
- Out of scope: docs refresh section 3, task-id work, migrations, database access, screen replacement, push, deploy, and any Neon operation.

## Completed

- Recovered branch, dirty state, active handoffs, governing design documents, and merge instructions.
- Confirmed the authoritative external CODEX-NEXT supersedes the repository copy for this workstream.
- Removed a stale empty `.git/index.lock` after confirming no process held it; preserved every working-tree file.
- Cleared five pre-existing staged entries without changing their working-tree content so the first port commit cannot absorb unrelated paths.

## Working state

- Files currently dirty or expected to change: the exact section 1 path groups, this handoff, merge-conflict resolutions, and the regenerated `package-lock.json` during section 2.
- Foreign changes that must remain untouched: `.codex/config.toml`, `AGENTS.md`, `CHANGELOG.md`, non-Needt legacy component changes, visual-test changes and snapshots, Figma/design source bundles, `pf-sync/`, `pnpm-lock.yaml`, and every path not explicitly assigned by sections 1 or 2.

## Verification

- Passed: `npm run agent:context`; read-only plan critique; stale-lock ownership check; index is empty; this handoff contains every template field and section.
- Baseline failure: `npm run check:agent-handoffs` reports only the stale `20260826-codex-figma-make-needt-variant.md` sections assigned to the later docs-refresh package; owner explicitly excluded that package from this workstream.
- Not run / still required: section 1 gates before each port commit; Prisma validation during merge; final type-check, lint, tokens check, unit tests, and build.

## Decisions and constraints

- Keep one writer in this checkout and stage explicit paths only; never use `git add -A`.
- Preserve the binding design decisions in `docs/handoff/PORT.md` sections 0, 6, and 8.
- Resolve the merge exactly as section 2 specifies; regenerate `package-lock.json` only with `npm install --legacy-peer-deps`.
- Do not push, deploy, start the local database, run migrations, or access Neon.
- Do not edit the stale Figma-Make handoff; the later docs-refresh package owns its closure.

## Blockers

- `None`.

## Next action

- Validate and commit this handoff, then run the required gates and create section 1 commit 1 for token vendoring and guards.
