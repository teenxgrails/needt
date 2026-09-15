---
id: 20260815-codex-mail-focused-splits
owner: codex
branch: codex/design-completion
status: complete
updated: 2026-08-23T00:42:52Z
objective: Deliver T8.5 user-defined focused Mail splits as private, user-scoped rules.
---

## Scope

- Governing plan/spec: `docs/plans/08-terra-high.md` T8.5 and the owner decision in `NEXT_AGENT.md`.
- In scope: additive private focused-split persistence, authenticated CRUD/filtering, Mail controls, direct access/isolation tests, and T8.5 status.
- Out of scope: workspace visibility, grants, shared Mail, provider sync behavior, UI redesign, and the protected Figma capture files.

## Completed

- Recovered the owner-approved contract: every focused split is scoped only to `userId`; it has no workspace or sharing model.
- Added the additive `MailFocusedSplit` persistence model and migration. Every split has a required `userId`, and its compound unique sender rule prevents duplicate personal splits.
- Added authenticated split list/create/delete routes, with split message filtering that fails closed for a forged or deleted split instead of falling back to the inbox.
- Added the existing Mail view's focused sender action, private split list, selection, and removal controls without changing the layout system.
- Updated T8.5 status in `docs/plans/08-terra-high.md`.
- Closed L0.1 on `codex/launch-l0`: the production-server Mail visual spec
  passes at desktop, tablet, and mobile, and the complete visual matrix passes.
  No baseline changed.

## Working state

- Files currently dirty or expected to change: none after the scoped L0.1 commit.
- Foreign changes that must remain untouched: `.codex/config.toml`, `CLAUDE.md`, `docs/plans/README.md`, `playwright.config.ts`, `src/app/layout.tsx`, `.playwright-mcp/`, `NEXT_AGENT.md`, and `pages-mobile-slash-390.png`.

## Verification

- Passed: `npx prisma validate`; `npx prisma generate`; `npm run type-check`; `npm run lint`; `npm run test:unit -- --runInBand src/app/api/mail/focused-splits/__tests__/route.test.ts src/lib/__tests__/mail-focused-splits.test.ts src/lib/mail/__tests__/mail-snooze-contract.test.ts` (3 suites, 8 tests); standard `npm run test:e2e` (24 passed, 3 credential-gated skips); `npm run build`; `git diff --check`.
- Passed during L0.1: production build; `npm run check:ui-contracts`;
  `npm run type-check`; targeted production-server `secondary-surfaces` (3/3);
  targeted production-server `style-lab` (15/15, with one transient tablet
  timeout passing on immediate focused rerun); complete production-server
  visual matrix (65 passed, 4 intentional skips). No baseline was updated.
- Not run / still required: none for this workstream.

## Decisions and constraints

- A split is a personal user-owned filter rule. Its message query must join through a Mail account owned by the authenticated user; no workspace membership resolution is involved.
- Preserve the existing Mail layout and use only its established controls/components.

## Blockers

- None.

## Next action

- None for this completed workstream. Continue plan 09 at L0.2 in
  `.agents/handoffs/20260822-codex-launch-l0.md`.
