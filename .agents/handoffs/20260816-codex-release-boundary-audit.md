---
id: 20260816-codex-release-boundary-audit
owner: codex
branch: codex/design-completion
status: blocked
updated: 2026-08-16T04:30:40Z
objective: Keep the current release branch aligned with the plan's deployment-gated S11/T8 boundary.
---

## Scope

- Governing plan/spec: `docs/plans/README.md`, `docs/plans/07-sol-high.md` S11-S12, and `docs/plans/08-terra-high.md` T8-T10.
- In scope: release-boundary audit and durable next-action record.
- Out of scope: deployment, production operations, importing later-release commits, UI redesign, and foreign dirty files.

## Completed

- Confirmed the authorized current-branch sequence through T10/S12 is committed and locally gated through `cb1f1dd`.
- Confirmed S11 contract commit `a180003` and T8.1-T8.4 commits `44d225f` through `e0a1dc2` are not ancestors of `codex/design-completion`; they remain on `codex/sol-s11-contracts` and `codex/terra-t8-product-ui`.
- Completed a read-only integration critique. A three-way merge reports conflicts in `CHANGELOG.md` and `playwright.config.ts`; `prisma/schema.prisma` is independently changed by both release lines and must preserve the current AI workspace scope during a future reconciliation.
- Confirmed the deferred branch has only narrow pure-unit coverage for the new Saved Views and reschedule-preview contracts; its Tasks and Projects Playwright specs contain no capacity/preview, Saved View, or health-journal journeys.

## Working state

- Files currently dirty or expected to change: this handoff only.
- Foreign changes that must remain untouched: `.codex/config.toml`, `AGENTS.md`, `CLAUDE.md`, `docs/plans/README.md`, `src/app/layout.tsx`, existing untracked handoffs, `.playwright-mcp/`, and `pages-mobile-slash-390.png`.

## Verification

- Passed: `npm run agent:context`; current-branch ancestry and left/right commit audit; inspection of the S11/T8 plan prerequisites; read-only three-way merge and deferred route/test review.
- Not run / still required: authorized deployment and smoke test of the current release before beginning the next S11/T8 release integration; browser E2E coverage for each new S11/T8 user journey after reconciliation.

## Decisions and constraints

- Do not cherry-pick or merge the separate S11/T8 release branches early. The governing plan requires S6-S10 and T5-T7 to be deployed and stable before S11, and requires S11 before matching T8 work.
- The existing S12 review applies to the current authorized release scope; it is not evidence that the unintegrated later-release branch is production-ready.
- The future integration is not a fast-forward. Resolve the test-server configuration and schema manually, retaining the polling E2E workaround and current `AiConversation`, `AiMessage`, and `AgentMemory` workspace fields.

## Blockers

- Production deployment and smoke-test authority are required before the next separately released S11/T8 work can be integrated. No deployment is authorized in this workstream.

## Next action

- After the current release is deployed and smoke-tested, create an isolated worktree for the S11/T8 integration release, manually reconcile its configuration/schema conflicts, add browser coverage for every new user journey, and run its full gates before merge.
