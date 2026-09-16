---
id: 20260916-codex-account-deletion-export
owner: codex
branch: codex/account-deletion-export
status: complete
updated: 2026-09-16T19:39:07Z
objective: Add a complete user-owned data export and recoverable account deletion that removes personal data while preserving shared-workspace integrity.
---

## Scope

- Governing plan/spec: GOAL phase 3.3; `docs/plans/12-remaining-work.md` P0.4; `docs/plans/12-codex-prompts.md` section 6.
- In scope: full account export, re-authenticated deletion with a stated grace window, worker execution, Settings entry points, workspace-safe tombstones, lifecycle tests.
- Out of scope: editing owner-approved legal copy, deployment, production data, Neon, merging PRs.

## Completed

- Created a clean worktree from `origin/main` at `72eeef6` and opened this workstream.
- Audited the published legal routes: both are noindex drafts and make no concrete deletion, retention, or portability promise.
- Audited the full Prisma ownership graph. A direct `User.delete()` is unsafe because optional relations retain secrets, required cascade relations destroy shared artifacts, and grantor/moodboard `RESTRICT` relations block deletion.
- Added an additive account-lifecycle migration, session-bound one-use re-authentication grants, asynchronous export/deletion jobs, one-use 24-hour archive links, and seven-day recoverable deletion.
- Added Settings entry points for full archive requests and deletion scheduling/cancellation, including password and connected OAuth re-authentication.
- Implemented ownership-anchored exports that omit credentials and other members' data while including directly owned uploads, assignments, and access/publication records; deletion now scrubs current and former shared-workspace contributions, promotes a surviving shared-workspace owner, and removes empty shared workspaces.
- Recurring Creem billing is canceled immediately before final erasure; a provider failure leaves the deletion request retryable and preserves the local account.
- Added DB-backed lifecycle coverage for API re-authentication, single-use downloads, expiry cleanup, cancellation, shared and former-member tombstones, owner transfer, exact token cleanup, personal-data erasure, and secret/workspace leakage, plus unit coverage for recurring billing cancellation.
- Legal review result: no false sentence found in the current `/terms` or `/privacy` drafts. Future final copy must not promise immediate deletion from third-party provider, Resend, Sentry, Creem, GitHub, backup, or audit-retention systems that this local finalizer cannot erase.

## Working state

- Files currently dirty or expected to change: this completed handoff plus the scoped implementation listed in Git status; ready for one scoped commit.
- Foreign changes that must remain untouched: none in this worktree.

## Verification

- Passed: `npm run agent:context`; `npx prisma format`; `npx prisma validate`; `npm run type-check`; `npm run lint`; `npm run test:unit -- --runInBand` (170 suites passed, one skipped; 810 tests passed, one skipped); local `npx prisma migrate deploy` against `postgresql://fluid:fluid@127.0.0.1:5432/fluid_calendar`; targeted account/legal/workspace E2E (10 passed total, with account lifecycle rerun after final hardening); `npm run build`; `npm run build:worker`; `npm run check:ui-contracts`; `npm run check:branding`; `npm run check:agent-handoffs`; `git diff --check`.
- `npm run tokens:check` is not a repository script on this `origin/main` base; the UI-contract check is the available token/UI contract gate.

## Decisions and constraints

- Normal object deletion remains archive/tombstone; irreversible account deletion may physically remove the deleting user's personal data only.
- Shared-workspace content needed by remaining members must survive as authorless, scrubbed tombstones and must not leak the deleted user's personal data.
- Deletion uses a seven-day recoverable grace window and consumes a one-use re-authentication grant bound to the current session and expiring after 15 minutes. OAuth completion must replace the initiating session and prove a fresh provider sign-in.
- Account export is generated asynchronously, stored temporarily as a gzip-compressed JSON archive, delivered by a hashed one-use link, expires after 24 hours, and excludes credentials, OAuth/API tokens, session/reset secrets, and other members' private data.
- Full export is anchored to the account's authorship/ownership, never to the active workspace scope, because workspace-wide selection would leak other members' data.
- When the departing user is the only shared-workspace owner, the oldest surviving member is promoted atomically; a shared workspace with no surviving members is deleted with its data instead of becoming an inaccessible orphan.
- Queue enqueue failures roll back deletion scheduling or mark export requests failed, so no request remains pending without a worker job.
- Deletion sweep items are isolated and stale processing claims recover after 30 minutes, so one poison request cannot starve later accounts.
- Legal copy is owner-gated: implementation mismatches will be listed here, not edited.
- Migrations are additive only. Any migration execution must target an explicitly displayed local database after `npm run db:up`; Neon is forbidden.
- Push only this feature branch and open a draft PR. Do not push `main`, merge, deploy, or touch production.

## Blockers

- None.

## Known limits

- Local provider rows, tokens, webhooks, and user-owned DB data are erased, and Creem recurring billing is canceled. Remote Google/Microsoft/CalDAV data retention and provider-side OAuth revocation remain governed by those providers; final legal copy must not promise immediate third-party erasure.
- Existing BullMQ jobs may retain opaque object/user IDs until normal queue retention removes them; after DB erasure they cannot resolve to account data. They contain no email or provider tokens in the current job schemas.

## Next action

- Commit the explicit scoped paths, push `codex/account-deletion-export`, open a draft PR to `main`, start CI, then remove this worktree's `.next` and stop its local Docker container without deleting its volume.
