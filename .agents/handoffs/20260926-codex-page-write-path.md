---
id: 20260926-codex-page-write-path
owner: codex
branch: codex/page-write-path
status: active
updated: 2026-09-26T10:00:33Z
objective: Make one deep module own page block writes so REST autosaves cannot overwrite live collaboration state.
---

## Scope

- Governing plan/spec: `/Users/lol/Needt-handoff/2026-09-26-architecture/PROMPT.md`, candidate 1 only.
- In scope: page block write module, REST and Hocuspocus adapters, regression and existing page tests, required docs and gates.
- Out of scope: candidates 2-10, Neon, destructive or production migrations,
  production, deploys, PR merge.

## Completed

- Committed the CI follow-up as `199e554`: canonical v2 room names in the
  authorization E2E, a Prisma-safe advisory-lock result, and safe persistence
  of already-authorized document state after later membership revocation.
- Created the isolated branch and worktree from fresh `origin/main`.
- Added one canonical page block writer with a per-page PostgreSQL advisory
  lock, exact collaboration-session leases, transactional relational/CRDT
  persistence, in-lock authorization, and monotonic content-revision CAS.
- Routed REST saves, collaboration stores, template hydration, AI proposal
  apply, and revision restore through the canonical writer. Removed
  `replacePageBlocks` and the caller-controlled `syncCollaborationState` flag.
- Added document-level lease heartbeats and generation-safe load/unload/reset
  handling to the Hocuspocus server.
- Added three autosave authorities (`rest`, `collaboration`,
  `collaboration-offline`) so reconnects retain a durable local draft without a
  stale REST overwrite. Restore/AI approve perform an explicit safe handoff.
- Added a `page:v2:` protocol cutover. Legacy rooms are rejected so independent
  pre-fix Yjs histories cannot merge back in; legacy recovery drafts are kept
  until a v2 sync or REST save confirms them.
- Added the additive `PageCollaborationSession` migration and applied it only
  to the loopback database at `127.0.0.1:5432/fluid_calendar`.
- Added the additive `Page.contentRevision` migration and applied it only to
  the same loopback database.
- Added focused service, route, autosave, and collaboration lifecycle tests.

## Working state

- Files currently dirty or expected to change: this handoff checkpoint only.
- Foreign changes that must remain untouched: every other worktree and the primary checkout's tracked/untracked changes.

- PR #44 E2E reproduced locally: the authorization-boundary test still opened
  `page:${pageId}`, so the v2 server correctly rejected its token before sync.
- After correcting the room name, the same test exposed Prisma rejecting the
  PostgreSQL `void` result from `pg_advisory_xact_lock`; the lock query now
  casts that result to a supported text value without changing lock semantics.
- It also exposed a debounced-store race: a change accepted while the actor was
  authorized could not flush after that actor was removed. Collaboration
  persistence now uses the exact live session lease as its authority; message
  authorization still runs before each inbound write, so revoked updates never
  enter the server document.

## Verification

- Follow-up passed: `npm run type-check`; `npm run lint`; full
  `npm run test:unit` (171 passed suites / 828 passed tests, 1 suite/test
  skipped); focused page-write-path unit suite (9/9); and the real local
  `tests/e2e/collaboration.spec.ts` (2/2).
- Current CI visual failure is not a baseline mismatch: every snapshot suite
  passed, while `pages-block-editor` failed its first PUT because the advisory
  lock query returned PostgreSQL `void`. The cast fix covers that API path; no
  baseline changed.
- Follow-up pre-push gates passed: `npm run build` including the production
  artifact postcheck (1393 files), `npm run build:worker`,
  `npm run check:ui-contracts` (476 files), `npm run check:branding` (944
  files), and `npm run check:agent-handoffs` (28 handoffs). The build used a
  temporary local tracing root with webpack disk cache disabled; both config
  edits were reverted and `.next` was deleted immediately afterward.
- Passed: `npm run agent:context -- --json`; local `prisma migrate deploy` and
  `prisma generate`; `npm run type-check`; `npm run lint`; candidate-focused
  tests (5 suites / 31 tests); full `npm run test:unit` (171 passed suites / 828
  passed tests, 1 suite/test skipped); `npm run build`; `npm run build:worker`;
  `npm run check:ui-contracts`; `npm run check:branding`.
- The first build reached standalone tracing but failed with `ENOSPC`. Its
  `.next` was deleted immediately; only the npm and Playwright caches were
  cleared. The repeated build passed with a temporary local tracing-root line
  that was reverted before commit, and `.next` was deleted again.

## Decisions and constraints

- One candidate, one branch, one draft PR; stop after candidate 1.
- The CRDT policy must live inside the page-write module; callers cannot pass an opt-out flag.
- Collaboration stores must present their exact live session ID; another live
  generation cannot validate a stale store.
- A client snapshot revision is checked only after the page lock. Legacy callers
  without `If-Match` receive a server-captured revision fence. New clients use
  the monotonic `Page.contentRevision`, not a wall-clock timestamp.
- Deployment must stop and drain the old collaboration server before starting
  the v2 collaboration server. A rolling overlap would let the old binary flush
  an unfenced `page:*` store after v2 writes begin.
- Never connect Prisma to Neon. The only database command used the explicit
  loopback URL above after `npm run db:up`.
- Stage explicit paths only; delete `.next` immediately after build.

## Blockers

- No implementation blocker. The non-overlapping collaboration cutover remains
  a release constraint.

## Next action

- Push the follow-up and this checkpoint, update PR #44's CI/cutover sections,
  and wait for E2E and visual-style. Do not start candidate 2.
