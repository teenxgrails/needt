# Project state

Updated: 2026-07-22

## Current outcome

Ship a stable **Needt v0.1 personal beta** on `use.needt.app`. The feature set is
frozen: work now moves from feature creation to production verification, blocker
fixes, and release evidence.

## Status

- Completed:
  - Single-user Needt shell, deterministic scheduler, smart-scheduling data,
    scheduled chunks, optional provider-neutral AI, and connector API.
  - Calendar, Today daily agenda, Focus timer, Boards, Mail, Settings, command
    palette, responsive mobile shell, PWA/offline foundation, and realtime worker.
  - Dark/light design-token foundation and the current cross-screen design pass.
  - Docker startup fix pins the Prisma 6 CLI instead of downloading Prisma 7.
  - `main`, the Coolify web service, and BullMQ worker are aligned; both runtime
    services are healthy and production reports all 60 migrations applied.
  - Production golden-loop smoke passed: create/edit, explicit auto-schedule,
    Calendar/Today/Workspace persistence, Focus, Boards, cleanup, and schedule restore.
- Active:
  - Final engineering/provider release gate (RC3).
  - Coolify/VPS with managed PostgreSQL and Redis is confirmed as production.
- Verify:
  - Live Google, Outlook, Apple/iCloud, Mail, AI, Redis/SSE, and connector behavior.
  - Installed-PWA/mobile golden loop and final one-time engineering gate.
- Blocked:
  - Provider-level verification needs production credentials and access owned by
    the project owner.

## Next action

**Owner: Codex.** Run RC3 once: targeted provider smoke where credentials exist,
installed-PWA/mobile smoke, then lint, type-check, tests, app build, worker build,
and production Docker build.

Inputs: production provider credentials/sessions and the existing Coolify access.

Done condition: available provider paths and the installed PWA are recorded,
engineering gates are green, unavailable external checks are explicit, and the
personal beta can be tagged without a known release blocker.

## Open decisions

- None currently blocking RC0. Creem remains implemented but is not a personal-beta
  gate; the AI companion is included in the release candidate and must pass smoke.
