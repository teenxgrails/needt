---
id: 20260915-codex-design-port-main-merge
owner: codex
branch: codex/design-completion
status: blocked
updated: 2026-09-15T21:41:12Z
objective: Commit the existing Needt design port in eight path-scoped commits, merge origin/main safely, and stop for owner review.
---

## Scope

- Governing plan/spec: `/Users/lol/Needt-handoff/2026-09-15-docs-refresh/files/docs/handoff/CODEX-NEXT.md` sections 1 and 2.
- In scope: the eight port commit slices listed in section 1; fetch and merge `origin/main`; prescribed conflict resolution and final gates.
- Out of scope: docs refresh section 3, task-id work, migrations, database access, screen replacement, push, deploy, and any Neon operation.

## Completed

- Opened this workstream in `3c26542` after recovering branch state and the authoritative external instructions.
- Committed the port in the eight required path-scoped commits: `082c9a6`, `1b2fc09`, `b884f32`, `79593d6`, `c9cb5da`, `691f98c`, `14d9369`, and `0a58502`.
- Ran type-check, lint, token validation, and all unit tests successfully before every port commit; each commit hook repeated lint and type-check successfully.
- Removed a stale empty `.git/index.lock` after confirming no process held it; preserved every working-tree file.
- Cleared five pre-existing staged entries without changing their working-tree content so the first port commit could not absorb unrelated paths.

## Working state

- Files currently dirty: this handoff plus 29 tracked and 28 top-level/untracked status entries not assigned to the eight section 1 groups.
- Foreign changes that must remain untouched: `.codex/config.toml`, `AGENTS.md`, `CHANGELOG.md`, non-Needt legacy component changes, visual-test changes and snapshots, Figma/design source bundles, `pf-sync/`, `pnpm-lock.yaml`, and every path not explicitly assigned by sections 1 or 2.

## Verification

- Passed before each of eight port commits: `npm run type-check`, `npm run lint`, `npm run tokens:check`, `npm run test:unit` (168 suites passed, 1 skipped; 1159 tests passed, 1 skipped). Commit hooks also passed lint and type-check.
- Baseline failure: `npm run check:agent-handoffs` reports only the stale `20260826-codex-figma-make-needt-variant.md` sections assigned to the later docs-refresh package; owner explicitly excluded that package from this workstream.
- Not run / still required: fetch/merge, Prisma format/validation during conflict resolution, and the final type-check, lint, tokens check, unit tests, and build.

## Decisions and constraints

- Keep one writer in this checkout and stage explicit paths only; never use `git add -A`.
- Preserve the binding design decisions in `docs/handoff/PORT.md` sections 0, 6, and 8.
- Resolve the merge exactly as section 2 specifies; regenerate `package-lock.json` only with `npm install --legacy-peer-deps`.
- Do not push, deploy, start the local database, run migrations, or access Neon.
- Do not edit the stale Figma-Make handoff; the later docs-refresh package owns its closure.

## Blockers

- Section 2 requires an empty worktree, but following the owner's strict section 1 path list leaves 29 tracked changes and 28 untracked status entries outside that scope. Starting the merge would require committing, stashing, reverting, or moving work that the current instructions do not authorize.

## Next action

- Owner chooses how to preserve the out-of-scope dirty paths; then make the worktree merge-safe and continue section 2 exactly as specified.
