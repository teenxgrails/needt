# Roadmap

## Now

- [x] **RC0 — Align and deploy one production commit** (`S`)
  - Coolify/VPS is the operational source of truth with managed PostgreSQL and Redis.
  - Web and worker run the same `main` SHA; the AI companion is included.
  - All 60 production migrations are present and Prisma reports no pending work.
  - Evidence: matching Coolify SHAs, healthy `/api/health`, migration and worker logs.

- [x] **RC1 — Prove the golden planning loop** (`M`, depends on RC0)
  - Sign in; create and edit a task; auto-schedule it around a busy calendar block.
  - Confirm it appears consistently in Calendar, Today, Focus, and Boards.
  - Complete/reschedule it and confirm persistence after reload and PWA navigation.
  - Evidence: production task created/edited, auto-scheduled into a free slot,
    persisted after reload, appeared in Today/Calendar/Workspace, and was removed;
    Focus and Boards loaded without errors and the schedule returned to its prior state.

- [x] **RC2 — Fix release blockers only** (`M`, depends on RC1)
  - Fix data loss, broken auth/navigation, failed migrations, scheduler correctness,
    provider failures, mobile overflow, or serious interaction jank found in RC1.
  - Cosmetic ideas and new features go to Backlog.
  - Evidence: migration-history bridge shipped; task auto-schedule state now says
    `(Off)` when disabled instead of incorrectly implying `(Pending)`.

- [ ] **RC3 — Final release gate** (`M`, depends on RC2)
  - Run once: lint with zero warnings, type-check, unit tests, app build,
    `build:worker`, and production Docker build.
  - Smoke Google, Outlook, Apple/iCloud, Mail, AI fallback, Redis/SSE, and connector
    paths that have credentials; record unavailable ones explicitly.
  - Update release docs and tag the personal beta only when the evidence is green.

## Next

- [ ] **Onboarding and first-run usefulness** (`M`)
  - Theme → work hours → first tasks → short tutorial; seed useful sample content.
  - Evidence: a new account reaches a meaningful Today view without manual setup.
- [ ] **Public launch package** (`M`)
  - Landing page, domain split, waitlist/onboarding path, launch copy, and support docs.
  - Depends on a stable personal beta and a deliberate billing decision.

## Later

- [ ] Task-sync conflict resolution and full bidirectional provider verification.
- [ ] Telegram/n8n clients built on the connector API.
- [ ] Native wrapper/App Store path after PWA retention is proven.
- [ ] Additional AI companion behaviors and visual experiments.
- [ ] Team/SaaS expansion only after the single-user product is stable.
