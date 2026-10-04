---
id: 20260924-codex-phase-d-mail
owner: codex
branch: codex/phase-d-mail
status: complete
updated: 2026-09-24T17:53:05Z
objective: Restore the existing Mail surface at /mail without reintroducing the legacy tasks UI.
---

## Scope

- Governing plan/spec: `docs/plans/00-roadmap.md` carried-over `/mail` visual-suite item; Phase D mail regression request.
- In scope: bind `/mail` to the existing `MailPage`; prove the seeded mail list and message route contract.
- Out of scope: Mail UI redesign, legacy task UI, snapshots, Docker, Neon, production, and pushes.

## Completed

- Confirmed `/mail` redirects to `/tasks?view=mail`, while `WorkspaceRoute` does not implement that query view.
- Confirmed `tests/visual/secondary-surfaces.spec.ts` already asserts the seeded message list and opened message at `/mail`.
- Replaced the redirect with the existing `MailPage`; the ported workspace route and all snapshots remain untouched.
- Recorded in the scoped local commit `fix(mail): restore mail route`.

## Working state

- Files currently dirty or expected to change: none.
- Foreign changes that must remain untouched: none; this isolated worktree started clean.

## Verification

- Passed: `npm run type-check`; `npm run lint`; `npx playwright test tests/visual/secondary-surfaces.spec.ts --config=playwright.visual.config.ts --list` (three desktop/tablet/mobile route contracts); `npm run check:branding`; `npm run check:ui-contracts`.
- Passed: `npm run check:agent-handoffs`; `git diff --check`.
- Not run / still required: none.

## Decisions and constraints

- Reuse `src/components/mail/MailPage.tsx`; no query-view branch belongs in the ported workspace route.
- Do not update visual snapshots or start Docker/Neon.

## Blockers

- None.

## Next action

- No follow-up action; the scoped commit records the completed regression repair.
