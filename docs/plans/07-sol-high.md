# 07 — GPT-5.6 Sol High track

**Status:** ready for implementation.

This file contains only work assigned to GPT-5.6 Sol High: security boundaries,
data integrity, realtime/offline architecture, complex editor behavior,
scheduling and final adversarial reviews. Complete tasks by ID and respect the
Terra checkpoints listed in each prerequisite.

Every task gets its own reviewed commit. Do not mix opportunistic UI polish into
Sol tasks.

## S1 — Authentication and workspace isolation

**Prerequisite:** none. Start here.

**Status:** complete (2026-08-09). Prisma validation, unit tests, type-check,
lint and workspace E2E are green. The E2E gate ran against isolated local
PostgreSQL and Redis; the configured remote Neon database was not mutated.

- Verify that the JWT subject maps to an active user before resolving or
  creating a personal workspace. Orphaned/disabled sessions return `401`.
- Route workspace-owned AI, search, export, connector and task-sync operations
  through the shared server-side authorization helper.
- Maintain an explicit allowlist for account-global settings; never add
  cross-workspace aggregation.
- Protect `/api/logs/sources` with `requireAdmin`.
- Test forged workspace IDs, removed members, Viewer writes, stale sessions and
  users belonging to multiple workspaces.

**Primary areas:** `src/lib/auth/`, `src/app/api/ai/`, `src/app/api/search/`,
`src/app/api/export/`, `src/app/api/connect/`.

**Risk:** critical. Review every changed query for membership and role.

**Done when:** invalid sessions return `401`, unauthorized membership returns
`403`, and no read or mutation crosses a workspace boundary.

```bash
npm run test:unit -- --runInBand src/lib/auth src/app/api/ai src/app/api/search src/app/api/export
npm run test:e2e -- tests/workspace-invites.spec.ts tests/workspace-security.spec.ts
npm run type-check
npm run lint
```

## S2 — Recoverable deletion and AI mutation safety

**Prerequisite:** S1 authorization contract complete.

**Status:** complete (2026-08-09). Prisma validation, 614 unit tests,
type-check, lint and local task/calendar E2E are green. External Google Calendar
cases remain credential-gated and were skipped by their existing test guard.

- Replace user-triggered physical deletion with archive/trash/tombstones.
- Require an explicit confirmation showing the exact object before AI performs
  a destructive-looking mutation.
- Define connector removal as archive local data, detach provider data, or
  revoke credentials; never silently destroy local content.
- Make provider sync respect tombstones and support restore.
- Use additive migrations and idempotent backfills only.

**Primary areas:** `src/app/api/ai/chat/route.ts`,
`src/app/api/connect/control/route.ts`, `src/lib/task-sync/`, Prisma schema.

**Risk:** critical. Restore and provider reconciliation must agree.

**Done when:** UI, AI and connector paths cannot physically delete user data;
archive and restore preserve relations and history.

```bash
npx prisma validate
npm run test:unit -- --runInBand src/lib/task-sync src/app/api/connect src/app/api/ai
npm run test:e2e -- tests/tasks.spec.ts tests/google-calendar.spec.ts
npm run type-check
npm run lint
```

## S3 — Offline/PWA privacy and conflicts

**Prerequisite:** S1 complete. Terra T1 may run in parallel.

**Status:** complete (2026-08-09). Service-worker syntax, 619 unit tests,
type-check and lint are green. The dedicated Chromium E2E verifies scoped
offline queueing and purge on account change against isolated local services.

- Partition Cache Storage and IndexedDB by user, workspace and schema version.
- Purge caches and pending operations on logout/account change; deactivate the
  previous workspace queue on workspace switch.
- Replace global mutation interception with an allowlist of offline-safe calls.
- Add idempotency key, base revision and conflict state. Remove queued work only
  after accepted `2xx`; retain `401`, `403`, `409` and `5xx` for recovery.
- Never queue auth, admin, billing, public-link or unsupported destructive calls.
- Expose saved locally, syncing, conflict and sign-in-required states.

**Primary areas:** `public/sw.js`, PWA UI, logout/workspace lifecycle.

**Risk:** critical. Test upgrades and two accounts in one browser profile.

**Done when:** cached data cannot leak between accounts/workspaces and failed
mutations remain recoverable.

```bash
npm run test:unit -- --runInBand src/components/pwa
NEXT_PUBLIC_PWA_IN_DEV=1 npm run test:e2e -- tests/offline.spec.ts
npm run type-check
npm run lint
```

## S4 — Collaboration authorization and Yjs runtime

**Prerequisite:** S1 complete; Terra T2 must provide a working test environment.

- Authenticate Hocuspocus token, user, workspace membership, room and role on
  connect; handle reconnect, member removal and role downgrade safely.
- Eliminate duplicate Yjs constructor identity/import paths.
- Keep BullMQ and optional Valkey modules behind server-only boundaries.
- Define the collaboration smoke test that Terra T3 adds to CI/Docker.

**Risk:** high. Realtime authorization fails closed without breaking legitimate
reconnects.

**Done when:** socket denial/reconnect tests pass and runtime logs contain no Yjs
duplicate-import or client-bundle BullMQ warning.

```bash
npm run test:e2e -- tests/e2e/collaboration.spec.ts
npm run build
npm run build:collaboration
```

## S5 — Hardening adversarial review

**Prerequisite:** S1–S4 and Terra T1–T4 complete.

Use needt-critique to review workspace isolation, orphan sessions, archive
semantics, offline replay, public access, collaboration tokens and migrations.
Return blockers to their owning task; do not implement unrelated polish here.

```bash
npm run type-check
npm run lint
npm run test:unit
npm run test:e2e
npm run check:branding
npm run check:ui-contracts
npm run test:style
npm run test:visual
npm run build
npm run build:worker
npm run build:collaboration
docker build -f docker/production/Dockerfile .
```

## S6 — Workspace product contract

**Prerequisite:** S5 green and hardening deployed/smoke-tested.

- Define current-workspace behavior for API requests, TanStack Query keys,
  Zustand state, realtime rooms and offline queues.
- Specify create/switch/invite/accept/decline/role/revoke/leave behavior and
  Owner/Editor/Viewer permissions. Protect the last Owner.
- Enforce PRO/LIFETIME for each shared-workspace member server-side; personal
  workspaces remain FREE and billing remains non-seat-based.
- Preserve busy/free-only privacy for another member's personal calendar.
- Supply decision-complete API/types and a cross-workspace leakage matrix for
  Terra T5.

**Risk:** critical. This contract owns all workspace transitions.

**Done when:** integration tests cover every role, entitlement and switch state.

```bash
npm run test:unit -- --runInBand src/lib/auth src/lib/entitlements
npm run test:e2e -- tests/e2e/workspaces.spec.ts tests/e2e/security.spec.ts
npm run type-check
npm run lint
```

## S7 — Pages Notes-first editor contract

**Prerequisite:** S3 and S6 complete. May run while Terra implements T5.

- Keep the existing Tiptap/Yjs/Hocuspocus architecture and self-hosted runtime.
- Define mobile selection, IME composition, `visualViewport`, keyboard toolbar,
  undo/redo and collaborative cursor behavior.
- Move AI transformations from comments into selection/context actions with
  preview and explicit Apply/Cancel.
- Integrate Pages with offline revision/conflict handling from S3.
- Define additive folders/tags and Smart Folders as versioned saved queries.
- Enforce budgets: 500-block warm render at most 1.5s and typing p95 below 50ms
  on the reference device.

**Risk:** critical. Test IME, selection, realtime and offline together.

**Done when:** types, data flow, failure behavior and editor contract tests are
complete enough that Terra T6 makes no architectural decisions.

```bash
npx prisma validate
npm run test:unit -- --runInBand src/components/pages src/services/pages
npm run test:e2e -- tests/e2e/pages.spec.ts tests/e2e/collaboration.spec.ts tests/e2e/offline.spec.ts
npm run type-check
npm run lint
```

## S8 — Pages adversarial review

**Prerequisite:** S7 and Terra T6 complete.

Use needt-critique to review permissions, workspace boundaries, publication
tokens, IME/selection, Yjs identity, offline conflict recovery and performance.
Return implementation issues to S7 or T6.

```bash
npm run test:e2e -- tests/e2e/pages.spec.ts tests/e2e/public-pages.spec.ts tests/e2e/collaboration.spec.ts
npm run build:collaboration
npm run test:visual
```

## S9 — Calendar and provider correctness

**Prerequisite:** S5. May run in parallel with Terra route work T7.

- Complete recurrence and single-instance editing for CalDAV.
- Include `externalListId` in external task collision identity.
- Prevent provider mapping from overwriting locally owned scheduling fields.
- Persist Outlook events locally as pending before provider synchronization.
- Implement the documented task-sync operation or remove the `501` endpoint
  from the client contract.
- Consolidate scheduler buffer handling and add invariant tests.

**Risk:** high. Preserve local-first behavior and idempotent retries.

```bash
npm run test:unit -- --runInBand src/lib/task-sync src/services/scheduling
npm run test:e2e -- tests/e2e/calendar.spec.ts tests/e2e/tasks.spec.ts
npm run type-check
npm run lint
```

## S10 — AI action correctness

**Prerequisite:** S2 and S6. May run in parallel with S9.

- Make every AI read/mutation workspace-safe and confirmation-aware.
- Return links to every created or changed entity.
- Preserve deterministic scheduling; AI may explain or trigger it, not replace it.
- Give quota, provider and partial-failure states explicit recovery paths.

```bash
npm run test:unit -- --runInBand src/app/api/ai
npm run test:e2e -- tests/e2e/ai.spec.ts
npm run type-check
npm run lint
```

## S11 — Later product contracts

**Prerequisite:** S6–S10 and Terra T5–T7 deployed and stable. Implement each item
as a separate release, followed by its matching Terra UI task.

1. Privacy-safe capacity, schedule explanations and reversible what-if preview.
2. Personal/workspace Saved Views query contract without cross-workspace data.
3. Project health model, update history and stale-update rules.
4. Flexible habits and weekly focus targets using the deterministic scheduler.
5. Meeting-note proposals requiring approval before task/schedule mutations.

Not authorized here: a new AI scheduler, seat billing, cross-workspace views,
third-party document storage or physical deletion of user content.

## S12 — Final product security review

**Prerequisite:** all authorized Sol and Terra tasks complete.

Use needt-critique across tenancy, Pages, public links, provider sync, AI actions,
offline state and migrations. No unresolved P0/P1 may remain.

```bash
npm run type-check
npm run lint
npm run test:unit
npm run test:e2e
npm run check:branding
npm run check:ui-contracts
npm run test:style
npm run test:visual
npm run build
npm run build:worker
npm run build:collaboration
docker build -f docker/production/Dockerfile .
```
