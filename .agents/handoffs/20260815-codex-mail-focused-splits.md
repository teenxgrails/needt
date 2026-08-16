---
id: 20260815-codex-mail-focused-splits
owner: codex
branch: codex/design-completion
status: blocked
updated: 2026-08-16T03:22:00Z
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

## Working state

- Files currently dirty or expected to change: `prisma/schema.prisma`, one new additive migration, `src/lib/mail-db.ts`, `src/app/api/mail/focused-splits/route.ts`, `src/app/api/mail/focused-splits/[id]/route.ts`, `src/app/api/mail/messages/route.ts`, `src/components/mail/MailPage.tsx`, focused Mail tests, `docs/plans/08-terra-high.md`, and this handoff.
- Foreign changes that must remain untouched: `.codex/config.toml`, `CLAUDE.md`, `docs/plans/README.md`, `playwright.config.ts`, `src/app/layout.tsx`, `.playwright-mcp/`, `NEXT_AGENT.md`, and `pages-mobile-slash-390.png`.

## Verification

- Passed: `npx prisma validate`; `npx prisma generate`; `npm run type-check`; `npm run lint`; `npm run test:unit -- --runInBand src/app/api/mail/focused-splits/__tests__/route.test.ts src/lib/__tests__/mail-focused-splits.test.ts src/lib/mail/__tests__/mail-snooze-contract.test.ts` (3 suites, 8 tests); standard `npm run test:e2e` (24 passed, 3 credential-gated skips); `npm run build`; `git diff --check`.
- Known unrelated failures: `WATCHPACK_POLLING=true npm run test:style` passed 12 checks but failed the existing motion runtime assertion in each viewport; the full visual matrix first failed on an unrelated Calendar assertion. The targeted `secondary-surfaces` visual spec timed out on `/mail` navigation in the dev matrix, although the production build compiled `/mail` successfully. No visual baselines were updated.
- Not run / still required: a clean focused Mail visual route check, handoff validation, scoped commit.

## Decisions and constraints

- A split is a personal user-owned filter rule. Its message query must join through a Mail account owned by the authenticated user; no workspace membership resolution is involved.
- Preserve the existing Mail layout and use only its established controls/components.

## Blockers

- The focused Mail visual dev-matrix route check times out; the full style/visual suites also contain unrelated pre-existing failures.

## Next action

- Review the dev-matrix `/mail` timeout, rerun `secondary-surfaces` after it is resolved, and inspect any visual diff before changing a baseline.
