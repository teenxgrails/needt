# НОЧНОЙ ПРОГОН — скопируй ВСЁ ниже этой строки и вставь Opus одним сообщением

You are running unattended overnight (~8 hours) in this repository. The owner is asleep and cannot answer questions. Work autonomously under these hard rules:

HARD RULES:

- NEVER deploy, push to main, force-push, rebase shared branches, or touch production (Coolify/Neon). No `prisma migrate deploy` against remote DBs; use `prisma migrate dev` locally only.
- Each feature goes on its OWN branch off the latest main: feat/timer, feat/mobile, feat/board. Commit in small logical steps with clear messages. Do not merge branches into main.
- Quality gate after EVERY feature before moving on: `npm run lint` (zero warnings), `npm run type-check`, `npm run test:unit`, `npm run build`. If a gate fails and you cannot fix it within a reasonable number of attempts, commit WIP with a "WIP:" prefix, write down what is broken, and move to the next feature.
- If a decision is ambiguous, pick the conservative option, add a //todo comment, and log the decision. Do not invent new scope.
- Do NOT start these (blocked by missing infra): the async queue task (BullMQ/Redis/webhooks/SSE — infra not deployed), MAIL (depends on it), TODO-SYNC (Nango not set up). Do not add Redis or worker code.

CONTEXT: Read CLAUDE.md and design-refs/ui-conventions.md first and follow all conventions strictly (prisma singleton from @/lib/prisma, dates via @/lib/date-utils, logger from @/lib/logger with LOG_SOURCE, requireAdmin, shadcn house format, Next 15 params-as-Promise). A FIX prompt was already executed by another agent — verify its changes are present on main before branching; if FIX work is unfinished (e.g. "Flowday" strings remain, root "/" still shows the legacy landing), finish it first on branch fix/leftovers.

QUEUE — execute in this order, one branch each. Full specs follow below.

1. TIMER (branch feat/timer)
2. MOBILE (branch feat/mobile)
3. BOARD (branch feat/board) — largest; two commit phases: (a) Prisma schema + API + store, (b) UI. If time runs out mid-BOARD, stop at a green (a) with UI stubbed behind //todo.
4. ONLY if all three are green and time remains (branch feat/quick-add-route): add a minimal /quick-add route — a single-input page that calls the existing brain-dump parsing endpoint and creates tasks; house format; no new dependencies.

FINAL STEP (mandatory, even if unfinished): create NIGHT-REPORT.md in the repo root with: per-branch summary (done/WIP), quality-gate results per branch, decisions made with reasoning, known issues needing the owner's review, and a recommended merge order. Commit it to the last active branch.

====================================================================
SPEC 1 — TIMER
====================================================================

Rebuild the Focus timer into a persistent, stats-backed focus system. Current bugs: the running session is lost on navigation (timer resets to 25:00 when leaving and returning to /focus); a session can start with no task selected while Quick Actions stay disabled with no explanation.

MODEL:

- FocusSession (Prisma): id, userId, taskId?, mode (pomodoro|deep|custom), plannedMinutes, startedAt, endedAt?, pausedTotalSeconds, completed boolean, source.
- Server is the source of truth for start/pause/resume/stop (API routes under /api/focus/**). The client renders remaining time computed from startedAt + plannedMinutes - pausedTotal; a persisted Zustand slice keeps the active sessionId so ANY page can show the ticking timer (sidebar Focus item already shows a live timer — wire it to this).
- On app load, fetch active session and resume rendering. Timer survives navigation and full page reload.

FEATURES:

1. Pomodoro cycle (work/break/deep values already in UI) with auto-advance prompt; custom one-off session.
2. Task binding: start from a task (task panel gets "Start focus"), or pick task on Focus page; allow explicit "Free session" mode instead of silently starting task-less. Quick Actions (Complete/Edit/Postpone) enable when a task is bound; when disabled, show why.
3. Stats (already sketched: Focus score, Streak, Focus hours, This week) computed from FocusSession history server-side; streak = consecutive days with >= 1 completed session. Add a simple week bar chart (house-format, no new chart lib if one exists).
4. Completion: on session end, prompt "Mark task done? / Log and continue"; write focused minutes onto the task (actualFocusedMinutes field, new).
5. Notifications: browser Notification API on session end (permission requested on first start), plus in-app toast fallback.
6. Expose GET /api/focus/active returning {active, taskId, endsAt} — a future Chrome extension will poll this to enforce website blocking; document it in a code comment.

OUT OF SCOPE: website/app blocking, soundscapes, mobile PWA behavior.
Acceptance: timer survives reload and navigation (add a unit test for remaining-time math incl. pauses); lint/type-check/tests/build green; CHANGELOG.md updated.

====================================================================
SPEC 2 — MOBILE
====================================================================

Make the app genuinely usable on mobile (viewport < 768px) WITHOUT creating separate mobile routes or a parallel component tree — same routes, responsive layout. Follow CLAUDE.md conventions and the house format. No native app; this must work as a PWA.

LAYOUT SHELL:

- Below md breakpoint: hide the left sidebar and any right panels; show a fixed bottom tab bar with 4 tabs: Today, Calendar, Tasks, Focus. Top bar: app name, date, avatar (opens settings/profile sheet).
- "Today" is a NEW mobile-first screen (also accessible on desktop as a view, but it is the mobile default): a chronological list of today's events + scheduled tasks, with checkboxes to complete tasks, overdue section on top, and a floating "+" quick-add button (opens the existing quick-create as a bottom sheet).
- Calendar tab on mobile: day view by default with horizontal swipe between days; week view allowed in landscape only. FullCalendar supports touch — configure, don't rebuild.
- Tasks tab: Task List view; Kanban as horizontally scrollable columns with snap; Space view shows a "Best on desktop" placeholder card with a screenshot, not a broken canvas.
- Focus tab: existing focus page, single column.
- All modals/panels become bottom sheets on mobile (shared primitive, house format); popovers become full-width sheets.

PWA:

- Add manifest.json (name Needt, icons, standalone display, theme #1B1D1E), service worker with a minimal offline shell (cache static assets + show cached Today data with an "offline" banner; no complex sync).
- Install prompt: subtle banner on second mobile visit ("Add Needt to your home screen").

TOUCH DETAILS: 44px minimum touch targets; long-press on a task -> action sheet (Complete / Postpone 1h/1d / Edit); pull-to-refresh triggers sync on Today.
OUT OF SCOPE: push notifications, offline mutations, native wrappers.
Acceptance: lint/type-check/tests/build green; test at 375px and 768px widths; no horizontal body scroll anywhere; CHANGELOG.md updated.

====================================================================
SPEC 3 — BOARD
====================================================================

Implement "Boards" v1 — a Notion-like board system on top of the existing task model. Read CLAUDE.md and design-refs/ui-conventions.md first and follow all conventions. The existing Workspace page already has view tabs (Space / Task List / Timeline / Kanban + "+" button) — extend this system, do not build a parallel one.

DATA MODEL (Prisma, new migration):

- Board: id, userId, name, icon, createdAt, updatedAt.
- BoardColumn: id, boardId, name, color, position, and an optional mapping rule (see grouping below).
- Task gets: boardId?, boardColumnId?, boardPosition? (float for ordering), and a `properties Json?` field for future custom fields. Keep all existing task fields and the scheduling engine untouched — tasks on boards are the SAME tasks the auto-scheduler works with.
- SavedView: id, userId, boardId?, type (board|list|timeline|calendar), groupBy, filters Json, sort Json, position — persists each view tab configuration.

NOTION UI PATTERNS TO REPLICATE (adapted to house format):

- Creation flow: clicking "+ New board" opens a compact side panel with: "Start empty", "Import CSV" (//todo v2), and 2-3 suggested templates (e.g. "Tasks Tracker", "Semester plan") shown as mini-previews; plus a one-line AI input "Describe what you want to build" that calls the existing agent to scaffold columns (only if agent is configured, hide otherwise).
- A board starts MINIMAL: just Name + "+ Add property" — no pre-created clutter; "+ New" inline card at the bottom of each column.
- View switcher: a view is added to the SAME data source via a "+ Add view" menu listing view types (Board, Table, List, Timeline, Calendar — implement Board now, register the menu so other types plug in later).
- Page chrome on the card panel: hover reveals "Add icon" (emoji picker with search + random, reuse an existing emoji picker lib consistent with house format) — icon shows on card and in sidebar.

FEATURES:

1. Users can create multiple boards (sidebar section "Boards" + "+"), rename, delete (soft confirm), reorder.
2. Board view: custom columns (create/rename/recolor/reorder via drag), drag-and-drop cards between columns and within a column (reuse the existing DndProvider), column WIP count in header, "+ New" quick-add at the bottom of each column.
3. Group-by modes for a board: manual columns (default), or auto-group by status / priority / project / tag (columns derived, cards draggable only in manual mode). Toolbar pattern: Group by · Sort · Filters · view switcher.
4. Card click opens a side-panel (Motion-style modal per ui-conventions.md): title, description (plain textarea, NOT a block editor), properties (status, priority, deadline, duration, energy, project, tags), subtasks checklist, activity timestamps. This panel is shared with Task List view.
5. Filters (status, priority, tag, deadline range) and sort, persisted per SavedView.
6. Free plan limit hook: expose a single `canCreateBoard(userId)` helper in src/lib (return true for now, //todo billing).

API: route handlers under src/app/api/boards/** following Next 15 params-as-Promise convention. Zustand store src/store/boards.ts, TanStack Query for server state.

OUT OF SCOPE (do not build): block-based rich text editor, per-database custom property definitions UI, board sharing/permissions, Table/Calendar sub-views of boards.

Acceptance: lint/type-check/unit tests/build green; drag-and-drop works with keyboard fallback; CHANGELOG.md updated. Write unit tests for column reorder + card move position math.
