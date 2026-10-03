# Plans — Needt delivery sequence

**Start at [00 — Roadmap](00-roadmap.md).** It was rewritten on 2026-09-15
against verified production state, and it is the only file that says what is
left and in what order. The chapters below hold detail.

| #   | Plan | Status | Ships |
| --- | --- | --- | --- |
| 00  | [Roadmap](00-roadmap.md) | **Governing** | What is true, what is left, in what order |
| 01  | [Scheduling and task lifecycle](01-scheduling.md) | Complete | Hard deadlines, archive, recurrence rework |
| 02  | [Workspaces, projects, security](02-workspaces.md) | Complete | The tenancy boundary small teams use |
| 04  | [Pages](04-pages.md) | Complete | Extends the existing editor |
| 06  | [Product gap audit](06-product-gap-audit.md) | Backlog | Research input, not authorization |
| 07  | [Sol High track](07-sol-high.md) | Complete | Security, data, architecture, scheduling |
| 08  | [Terra High track](08-terra-high.md) | Complete | UI, tests, CI, responsive quality |
| 11  | [Task shape and starting friction](11-task-model.md) | Backlog | T-1, T-2, T-4; T-3 settled by habits in the design port |
| 12  | [Remaining work to the first paying user](12-remaining-work.md) | Detail chapter | What each launch blocker means and how to verify it |
| 13  | [Pricing and plans](13-pricing.md) | **Active** | Prices, trial and hidden AI limits: what changes in code, Creem and copy |

**Archived to `docs/_old/` on 2026-09-15:** 03 animation and notifications
(complete), 05 moodboard (complete), 09 launch track (its sequencing was
superseded in August), 10 design identity (replaced by the Claude Design port),
12a Codex prompts (written for a queue that has since moved).

**The design** is not a plan in this folder. It lives in `docs/handoff/`:
`PORT.md`, `design-reconciliation-2026-09-11.md`, and `CODEX-NEXT.md` for the
port's remaining steps.

The table below is the historical 07/08 execution order, retained for context.

| Phase               | Tasks                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| Hardening contracts | S1 -> S2; T1 and T2 may run after file ownership is agreed            |
| Offline/realtime    | S3 -> S4; then T3 and T4                                              |
| Hardening gate      | S5                                                                    |
| Workspace           | S6 -> T5                                                              |
| Pages               | S7 -> T6 -> S8                                                        |
| Route completion    | S9 and S10 may run with T7                                            |
| Later product work  | S11 contract -> matching T8 UI (now sequenced by plan 09 L0.3 and L7) |
| Final gate          | T9 -> T10 -> S12                                                      |

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
- Pushing, opening PRs, merging branches, additive schema changes and reviewed
  baseline updates are owner-authorized as of 2026-08-22; see the autonomy block
  in `AGENTS.md`. The production deploy itself still belongs to the owner.
