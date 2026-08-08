# Plans — Motion-compatible expansion

Five sequential plans. Each is an independent release with its own migration,
gates, and commit. **Do not start a later plan before the earlier one is
deployed and smoke-tested** — every plan after 02 assumes workspace scoping
exists.

| # | Plan | Status | Model | Ships |
|---|------|--------|-------|-------|
| 01 | [Scheduling and task lifecycle](01-scheduling.md) | Complete | Sol High | Hard deadlines, archive, recurrence rework |
| 02 | [Workspaces, projects, security](02-workspaces.md) | Complete | Sol High | Tenancy boundary — riskiest, feature-flagged |
| 03 | [Animation, notifications, Space](03-motion-ui.md) | Complete | Terra Medium | Visual only, no schema |
| 04 | [Pages](04-pages.md) | Complete | Terra High | Extends the existing editor |
| 05 | [Moodboard](05-moodboard.md) | Complete | Terra High | Excalidraw canvas |

The implementation plans are complete. Remaining product opportunities and
known debt are tracked in [06 — Product gap audit](06-product-gap-audit.md).

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
