# Plans — Needt delivery sequence

Plans are sequential releases with their own migrations and gates. **Do not
start a later active plan before the earlier one is deployed and smoke-tested.**

| # | Plan | Status | Model | Ships |
|---|------|--------|-------|-------|
| 01 | [Scheduling and task lifecycle](01-scheduling.md) | Complete | Sol High | Hard deadlines, archive, recurrence rework |
| 02 | [Workspaces, projects, security](02-workspaces.md) | Complete | Sol High | Tenancy boundary — riskiest, feature-flagged |
| 03 | [Animation, notifications, Space](03-motion-ui.md) | Complete | Terra Medium | Visual only, no schema |
| 04 | [Pages](04-pages.md) | Complete | Terra High | Extends the existing editor |
| 05 | [Moodboard](05-moodboard.md) | Complete | Terra High | Excalidraw canvas |
| 06 | [Product gap audit](06-product-gap-audit.md) | Backlog | Mixed | Audited opportunities, not implementation authorization |
| 07 | [Sol High track](07-sol-high.md) | Ready | Sol High | Security, data, architecture, scheduling, adversarial review |
| 08 | [Terra High track](08-terra-high.md) | Ready with gates | Terra High | UI, tests, CI, responsive quality, copy and docs |

Plans 01–05 are implemented. Plans 07 and 08 are model-specific tracks; execute
their task IDs in this shared order. Plan 06 remains research input and does not
independently authorize schema or product scope.

| Phase | Tasks |
|-------|-------|
| Hardening contracts | S1 -> S2; T1 and T2 may run after file ownership is agreed |
| Offline/realtime | S3 -> S4; then T3 and T4 |
| Hardening gate | S5 |
| Workspace | S6 -> T5 |
| Pages | S7 -> T6 -> S8 |
| Route completion | S9 and S10 may run with T7 |
| Later product work | S11 contract -> matching T8 UI |
| Final gate | T9 -> T10 -> S12 |

A final security pass (Sol High) runs at the end of 02, 04, and 05 — not as a
separate plan. It reviews only workspace isolation, invites, entitlement
bypass, calendar privacy, collaboration tokens, scheduler determinism, and
migrations.

## Decisions that apply to all five

**Collaboration backend is self-hosted.** Liveblocks was rejected: it is a paid
SaaS whose storage would physically hold page and board content on third-party
infrastructure, which conflicts with Needt's privacy stance (private pages are
excluded even from our own AI context). Use **Hocuspocus v4** — MIT licensed,
self-hosted, Node 22+, the reference Yjs WebSocket backend for Tiptap and
Yjs-based whiteboards. It runs beside the existing BullMQ worker and can use
the existing Redis for scaling and Postgres for persistence.

**The document editor already exists.** `src/components/documents/BlockIdentity.ts`
(ProseMirror plugin enforcing unique block IDs), `document-contract.ts`,
`documentFormatVersion` v1/v2 wired through `src/app/(app)/today/page.tsx` and
`src/app/(app)/pages/[id]/page.tsx`, and the server-controlled `editorV2` flag
are in place on Tiptap 3. Plan 04 **extends** this. Do not introduce a second
editor architecture.

**"Like Motion" means a compatible behaviour model**, not copying closed code
or design. Deliberate differences: Owner/Editor/Viewer roles, restorable
archive instead of deletion, and no seat billing — every member of a shared
workspace holds their own PRO/LIFETIME plan.

**No physical deletion of user data** is introduced anywhere in these plans.

## Working rules

- Every task below carries its own validation command. That is what makes the
  plan safe to run through `ralphex --codex` (see `docs/AI-TOOLING-SETUP.md`).
- Migrations are additive expand/backfill only. Removing old `userId`-scoped
  contracts is a separate future contract release.
- Verify third-party APIs, versions, peer dependencies and licenses through
  Context7 before installing anything.
- No push, no deploy from the agent. Commit locally.
