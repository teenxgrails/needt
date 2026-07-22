# Roadmap

## Now

- [x] **RC0 — Align and deploy one production commit** (`S`)
  - Coolify/VPS is the operational source of truth with managed PostgreSQL and Redis.
  - Web and worker run the same `main` SHA; the AI companion is included.
  - All 60 production migrations are present and Prisma reports no pending work.
  - Evidence: matching Coolify SHAs, healthy `/api/health`, migration and worker logs.

- [ ] **P1 — Finish Today as the canonical daily planner** (`L`) — [implementation plan](../openspec/changes/finish-today-daily-planner/proposal.md)
  - Keep the existing left navigation; finish the central per-day Agenda and the
    desktop one-day timeline as one coherent working surface.
  - Task title opens Edit Task; inline date and duration menus behave like the
    references; `/task` creates a canonical task; text and completed tasks persist
    with their historical day.
  - Fix desktop/mobile layout, typography, overflow, loading, empty, error, and
    date-navigation states in both themes.
  - Evidence: create/edit/date/duration/complete/slash-command/history/reload pass
    on desktop and installed-mobile layout with no visual blocker.

## Next

- [ ] **P2 — Finish Workspace task management** (`L`, depends on P1 task rules)
  - Repair Space/List/Timeline state, task selection/actions, scheduling previews,
    reload persistence, responsive behavior, and the known jank/buggy transitions.
  - Evidence: one canonical task stays consistent through every Workspace view and
    Calendar/Today after create, edit, schedule, complete, delete, and reload.
- [ ] **P3 — Restore a useful Focus experience** (`M`, depends on P2)
  - Keep the minimal circular timer language, but restore task choice/current task,
    duration, start/pause/continue/stop, next task, completion choices, persistence,
    and clear idle/running/paused/finished states.
  - Evidence: task-bound and free sessions survive navigation/reload and log the
    correct result without exposing the old cluttered UI.
- [ ] **P4 — Repair Boards function and design** (`L`, depends on P2)
  - Fix board/card/stage persistence, drag/drop, task editor integration, all view
    modes, responsive overflow, empty/loading/error states, and Notion-canvas visual
    hierarchy without creating a second task model.
  - Evidence: board CRUD and canonical task movement pass across Board/List/Table;
    other views are either complete or deliberately hidden until complete.
- [ ] **P5 — Restore and finish Settings** (`M`)
  - Return desktop content to the previous left-aligned position beside the 230px
    settings rail; remove unnecessary centering and finish every ordinary-user tab.
  - Keep mobile grouped navigation, shared controls, and working save/error states.
  - Evidence: all visible settings load/save/reload correctly in both themes and no
    unfinished or developer-only control is exposed.
- [ ] **P6 — Finish and live-test Mail** (`L`)
  - Audit account setup, sync, message list/body, read/archive, task creation,
    sanitization, empty/error/loading states, and worker behavior.
  - Evidence: Gmail and Outlook live flows pass when credentials are available;
    IMAP and unavailable-provider behavior have targeted tests and honest UI states.
- [ ] **P7 — Whole-app GUI and interaction pass** (`L`, depends on P1-P6)
  - Enforce Calendar as the house style, repair spacing/alignment/typography, both
    themes, dialogs/pickers/toggles, mobile/PWA safe areas, transitions, and jank.
  - Evidence: visual matrix for Calendar/Today/Workspace/Focus/Boards/Mail/Settings
    on desktop and phone with zero known high/medium design defects.
- [ ] **RC1 — Real release gate** (`M`, depends on P1-P7)
  - Run the full functional golden loop, provider checks, installed-PWA smoke, lint,
    type-check, unit/e2e tests, app build, worker build, and production Docker build.
  - Tag the personal beta only when the product—not merely the routes—is complete.

## Later

- [ ] **Onboarding and first-run usefulness** (`M`)
  - Theme → work hours → first tasks → short tutorial; seed useful sample content.
  - Evidence: a new account reaches a meaningful Today view without manual setup.
- [ ] **Public launch package** (`M`)
  - Landing page, domain split, waitlist/onboarding path, launch copy, and support docs.
  - Depends on a stable personal beta and a deliberate billing decision.

- [ ] Task-sync conflict resolution and full bidirectional provider verification.
- [ ] Telegram/n8n clients built on the connector API.
- [ ] Native wrapper/App Store path after PWA retention is proven.
- [ ] Additional AI companion behaviors and visual experiments.
- [ ] Team/SaaS expansion only after the single-user product is stable.
