# Needt — промты для Codex 5.6 + v0 — 2026-07-17

Порядок запуска: FIX → (твои готовые В → Б из needt-async-plan.md) → BOARD → TODO-SYNC → MAIL → TIMER. Лендинг (v0) — параллельно в любой момент.
Каждый промт запускай отдельной сессией Codex. После каждого: `npm run lint && npm run type-check && npm run test:unit && npm run build` + локальный `docker build` перед пушем.

---

## 0. ПРОМТ «FIX» — баги из аудита 17.07

**Моя инструкция:** запускай первым, до больших фич — всё остальное строится поверх. Риск: auth-фикс легко превратить в рефактор NextAuth; держи Codex в рамках «один источник состояния, без смены версии NextAuth».

```
Fix the following bugs in this Next.js 15 / React 19 app. Follow CLAUDE.md conventions strictly (prisma singleton from @/lib/prisma, dates via @/lib/date-utils, logger from @/lib/logger with LOG_SOURCE, shadcn/ui house format from design-refs/ui-conventions.md). Do NOT refactor unrelated code. Do NOT change NextAuth version or auth flow.

BUG 1 — Auth state flash. The sidebar avatar intermittently renders as an empty circle or a "Sign In" button right after login while session is loading; on /settings it renders correctly. Root cause: multiple components read session state independently. Fix: single source of truth for session (one hook/store consumed everywhere), render a skeleton placeholder while status === "loading", never render "Sign In" until status === "unauthenticated".

BUG 2 — Quick-create popover opens by itself when /calendar first loads (the "What needs to happen?" popover appears without any user click). Find why slot-selection fires on initial render (likely FullCalendar select callback triggered during mount or a stale stored selection) and ensure the popover only opens on explicit user interaction.

BUG 3 — Timeline view renders completed tasks as detached grey blocks floating outside the grid rows (not aligned to any project row or date column). Every task bar must be positioned inside its project row, aligned to the date axis. Completed tasks: either align them properly with a muted style or hide them behind the existing "Show completed" toggle. Reference: Motion Gantt (hatched non-work areas, bars in rows).

BUG 4 — AI Chat pill in the sidebar does not open the chat panel on click (keyboard shortcut may work, click does nothing). Make click open the same panel as the shortcut.

BUG 5 — Settings > Calendars shows red error banners "Missing Google Credentials" / "Missing Outlook Credentials". These are server configuration states, not user errors. Replace with a neutral empty-state style ("Google Calendar is not configured on this server yet") and disable the corresponding Connect buttons when credentials are absent. Keep Apple/iCloud CalDAV fully working.

BUG 6 — Focus page shows placeholder copy "Soundscape: rain, brown noise, or silence can plug in here." Remove or hide it behind a feature flag comment (//todo).

TASK 7 — Rebrand to "Needt". The app still shows the placeholder name "Flowday" everywhere (document titles, "Back to Flowday" in settings, metadata). Change the app name in src/lib/app-config.ts to "Needt" and verify every user-visible occurrence (titles, OG/meta tags, emails if any) picks it up from config — grep for hardcoded "Flowday" strings and route them through config.

TASK 8 — Remove the legacy start page (inherited from the FluidCalendar fork). Target domain setup: the app lives on use.needt.app, the marketing landing will be a separate deployment on needt.app. Therefore in THIS app the root route "/" must: redirect authenticated users to /calendar, unauthenticated users to the login page. Delete the legacy landing components if nothing else uses them.

Acceptance: lint (zero warnings), type-check, unit tests, build all green. Update CHANGELOG.md under [unreleased].
```

---

## 1. ПРОМТ «BOARD» — Notion-подобный Board v1 (фаза 2)

**Моя инструкция:** это самая большая фича — дай Codex сделать её в 2 прогона: сначала schema+API, потом UI. Следи, чтобы он НЕ строил параллельную систему задач: Board показывает те же Task-записи. Риск №1 — дублирование модели данных. Риск №2 — DnD-библиотека: в проекте уже есть DndProvider, пусть переиспользует. Карточка-панель = самый заметный кусок, требуй Motion-стиль модалки из ui-conventions.md.

```
Implement "Boards" v1 — a Notion-like board system on top of the existing task model. Read CLAUDE.md and design-refs/ui-conventions.md first and follow all conventions. The existing Workspace page already has view tabs (Space / Task List / Timeline / Kanban + "+" button) — extend this system, do not build a parallel one.

DATA MODEL (Prisma, new migration):
- Board: id, userId, name, icon, createdAt, updatedAt.
- BoardColumn: id, boardId, name, color, position, and an optional mapping rule (see grouping below).
- Task gets: boardId?, boardColumnId?, boardPosition? (float for ordering), and a `properties Json?` field for future custom fields (phase Databases-lite). Keep all existing task fields and the scheduling engine untouched — tasks on boards are the SAME tasks the auto-scheduler works with.
- SavedView: id, userId, boardId?, type (board|list|timeline|calendar), groupBy, filters Json, sort Json, position — persists each view tab configuration.

NOTION UI PATTERNS TO REPLICATE (from reference screenshots, adapted to house format):
- Creation flow: clicking "+ New board" opens a compact side panel with: "Start empty", "Import CSV" (//todo v2), and 2-3 suggested templates (e.g. "Tasks Tracker", "Semester plan") shown as mini-previews; plus a one-line AI input "Describe what you want to build" that calls the existing agent to scaffold columns (only if agent is configured, hide otherwise).
- A board/database starts MINIMAL: just Name + "+ Add property" — no pre-created clutter; "+ New" inline row/card at the bottom of each column.
- View switcher: a view is added to the SAME data source via a "+ Add view" menu listing view types (Board, Table, List, Timeline, Calendar — implement Board now, register the menu so other types plug in during Databases-lite phase).
- Page chrome on the card panel: hover reveals "Add icon" (emoji picker with search + random, reuse an existing emoji picker lib consistent with house format) — icon shows on card and in sidebar.

FEATURES:
1. Users can create multiple boards (sidebar section "Boards" + "+"), rename, delete (soft confirm), reorder.
2. Board view: custom columns (create/rename/recolor/reorder via drag), drag-and-drop cards between columns and within a column (reuse the existing DndProvider), column WIP count in header, "+ New" quick-add at the bottom of each column.
3. Group-by modes for a board: manual columns (default), or auto-group by status / priority / project / tag (columns derived, cards read-only draggable only in manual mode). Toolbar pattern copied from Motion: Group by · Sort · Filters · view switcher.
4. Card click opens a side-panel (Motion-style modal per ui-conventions.md): title, description (plain textarea for now, NOT a block editor), properties (status, priority, deadline, duration, energy, project, tags), subtasks checklist, activity timestamps. This panel is shared with Task List view.
5. Filters (status, priority, tag, deadline range) and sort, persisted per SavedView.
6. Free plan limit hook: expose a single `canCreateBoard(userId)` helper in src/lib (return true for now, //todo billing).

API: route handlers under src/app/api/boards/** following Next 15 params-as-Promise convention. Zustand store src/store/boards.ts, TanStack Query for server state.

OUT OF SCOPE (do not build): block-based rich text editor, per-database custom property definitions UI, board sharing/permissions, Table/Calendar sub-views of boards.

Acceptance: lint/type-check/unit tests/build green; drag-and-drop works with keyboard fallback; CHANGELOG.md updated. Write unit tests for column reorder + card move position math.
```

---

## 2. ПРОМТ «TODO-SYNC» — импорт из To-do приложений (фаза 3)

**Моя инструкция:** сначала подними Nango self-host на Coolify (docker compose из репо NangoHQ/nango; env `NANGO_SECRET_KEY` и провайдеры Todoist/TickTick/Notion в nango.yaml) — 1 вечер руками. Если не захочешь Nango — скажи Codex делать OAuth напрямую по образцу googl-калдав файлов, для Todoist это просто. Riск: rate limits TickTick — пусть Codex закладывает backoff.

```
Extend the existing one-way task sync framework (src/lib/task-sync/, read its README.md first — selective field sync: external-owned fields overwritten on each sync, local-owned fields preserved) with three new providers: Todoist, TickTick, Notion databases. Microsoft To Do already works via the Outlook path.

ARCHITECTURE:
- OAuth + token storage for these providers goes through a self-hosted Nango instance: env NANGO_HOST, NANGO_SECRET_KEY. Create a thin client src/lib/task-sync/nango-client.ts (server-side only) that exchanges a connectionId for a fresh access token. If NANGO_HOST is unset, the providers show as "not configured" in UI (same neutral pattern as calendar providers).
- Each provider implements the existing provider interface used by Outlook/Google Tasks sync: list projects/lists, fetch tasks (incremental where the API allows: Todoist sync API with sync_token; TickTick full fetch + updatedAt diff; Notion database query with last_edited_time filter), map to the internal task shape.
- Field mapping: title, status/completed, due date, recurrence (Todoist RRULE strings), tags where available -> external-owned. Notion: user picks which database and which property maps to status/date (simple mapping UI, reuse the existing field-mapping patterns).
- Sync scheduling: register these providers in the existing sync flow triggered by /api/cron/sync + manual "Sync now" button per connection in Settings > Integrations. Respect rate limits: exponential backoff, log via logger with LOG_SOURCE.
- Settings > Integrations UI: connection cards (provider logo, account label, last sync, item count, Sync now, Disconnect) in house format.

OUT OF SCOPE: two-way write-back, real-time webhooks (later phase), Apple Reminders.

Acceptance: lint/type-check/tests/build green; unit tests for each provider's mapping function with fixture JSON; CHANGELOG.md updated.
```

---

## 3. ПРОМТ «MAIL» — почта в сайдбаре (фаза 4, ПОСЛЕ задачи Б)

**Моя инструкция:** самый рискованный кусок. Требования к запуску: воркер BullMQ уже жив (задача Б), иначе IMAP-синк повесит веб-процесс. Прогоняй в 2 сессии: (1) схема+синк-движок, (2) UI. Тестируй на своём ящике + одном GMX/Yahoo. Gmail API квоты бесплатные — но нужен OAuth verification для продакшена (для «internal/test users» хватит на бете).

```
Implement "Mail" v1 — a read-only unified inbox in the left sidebar, following the app's local-first pattern (external data synced into our DB; UI reads only local data; same philosophy as CalendarFeed/CalendarEvent).

PROVIDERS (three connection types):
1. Gmail via Gmail API (existing Google OAuth infra + token-manager; add gmail.readonly scope as a separate incremental consent).
2. Outlook/Microsoft via Graph (existing Azure infra; Mail.Read scope).
3. Generic IMAP: host/port/TLS + username + app password, using the `imapflow` library, MIME parsing via `postal-mime`. Credentials encrypted at rest with the same encryption approach as AI keys (AI_ENCRYPTION_KEY pattern).

DATA MODEL: MailAccount (provider, address, encrypted credentials/connection ref, lastSyncAt, status), MailMessage (accountId, externalId, threadId, from, to, subject, snippet, date, isRead, isArchived, labels Json, bodyHtml stored lazily/on-open). Index on (accountId, date). Retention: sync last 90 days, cap per account (//todo setting).

SYNC ENGINE (runs in the BullMQ worker, NOT in web process):
- Initial backfill job + incremental job (Gmail historyId, Graph delta links, IMAP UID ranges + IDLE where the server allows).
- Repeatable job every 5 min per account as fallback; push/webhooks later.
- Errors -> logger with LOG_SOURCE, account status "error" surfaced in UI.

UI:
- Sidebar item "Mail" with unread badge, positioned under Workspace/Focus.
- Mail page: left = account/folder list (All inboxes, per-account), center = message list (sender, subject, snippet, time, unread dot), right/panel = message view (sanitized HTML via DOMPurify-equivalent, images blocked by default with "Load images" button).
- Actions v1: mark read/unread, archive (synced back for Gmail/Graph; local-only flag for IMAP v1), and "Create task from email" — creates a Task with title = subject, description = link back to the message, opens the task panel prefilled.
- Empty states and "not configured" states in house format.

SECURITY: never log message bodies or credentials; sanitize all HTML; bodies fetched over server only.
OUT OF SCOPE: sending/replying, search across bodies, labels management, push notifications.

Acceptance: lint/type-check/tests/build green; mapping unit tests with fixture MIME messages; CHANGELOG.md updated.
```

---

## 4. ПРОМТ «TIMER» — Focus как у Opal (фаза 1–2, можно рано)

**Моя инструкция:** главное здесь — персистентность (баг из аудита) и честная модель «что реально в вебе». Блокировка сайтов в вебе невозможна — только Chrome-расширение (MV3 declarativeNetRequest); это отдельный мини-проект НА ПОТОМ, в промт не включён, но API под него закладывается. Блокировка нативных приложений — вообще не веб-история (у Opal это iOS Screen Time API), не обещай её на лендинге.

```
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
```

---

## 4.2 ПРОМТ «MOBILE» — мобильный layout + PWA (после FIX, до Product Hunt)

**Моя инструкция:** это НЕ отдельная страница и не отдельный роут — те же страницы, другой layout по брейкпоинту. Так ты не нарушаешь unified build и не поддерживаешь два кода. Самая частая ошибка — Codex начнёт делать «mobile/» роуты, запрети явно. Тестируй в Chrome DevTools device mode + на своём телефоне через 192.168.х.х.

```
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

TOUCH DETAILS: 44px minimum touch targets; long-press on a task -> action sheet (Complete / Postpone 1h/1d / Edit); pull-to-refresh triggers sync on Today and Mail (if present).
OUT OF SCOPE: push notifications, offline mutations, native wrappers.
Acceptance: lint/type-check/tests/build green; test at 375px and 768px widths; no horizontal body scroll anywhere; CHANGELOG.md updated.
```

---

## 4.3 ПРОМТ «DESKTOP» — Tauri-оболочка Mac/Win/Linux (после Product Hunt)

**Моя инструкция:** отдельный маленький репозиторий (needt-desktop), НЕ в монорепо — у оболочки свой релизный цикл. Запускать только когда use.needt.app стабилен и PWA обкатана. До этого десктоп-юзерам говори «Install as app» через браузер. Подпись: сначала выпусти без Windows-сертификата (SmartScreen-warning терпим), Mac подпиши сразу — Gatekeeper иначе реально блокирует.

```
Create a new standalone repository "needt-desktop": a Tauri 2 desktop shell for an existing web app, targeting macOS (universal), Windows and Linux (AppImage + deb).

CORE: the window loads the remote URL https://use.needt.app (remote-URL mode, no bundled frontend). All product updates ship server-side; this shell must stay thin and stable.

SHELL FEATURES:
1. Main window: 1280x800 default, min 900x600, remembers size/position, hidden titlebar with native traffic lights on macOS (overlay style), dark background #1B1D1E behind the webview to avoid white flash on load.
2. System tray: icon + menu (Open Needt, Quick add, Start focus, Quit). Closing the window hides to tray (configurable), does not quit.
3. Global shortcut Alt+Space (configurable): opens a small always-on-top frameless "Quick add" window that loads https://use.needt.app/quick-add (the web app will provide this minimal route; if it 404s, fall back to opening the main window).
4. Native notifications: bridge Web Notification permission from the webview to OS notifications so focus-session and reminder notifications fire natively.
5. Autostart on login (toggle in tray menu), single-instance lock (second launch focuses the existing window).
6. Offline state: if the URL fails to load, show a minimal local "You're offline — retry" page (bundled asset), auto-retry with backoff.
7. Auto-update: Tauri updater wired to GitHub Releases; check on launch + every 24h; silent download, prompt to restart.
8. External links (target=_blank / non-needt.app domains) open in the default browser, not inside the webview.

CI: GitHub Actions workflow with a matrix build (macos-latest universal, windows-latest, ubuntu-22.04), producing signed artifacts where secrets are provided (APPLE_* secrets for notarized macOS build; Windows signing optional behind an if), attached to a GitHub Release on tag push.
Deliverables: working builds for all three OS, README with release instructions (how to bump version, tag, and ship an update).
```

---

## 4.5 ПРОМТ «AI-AGENT» — агент во всём приложении (фаза 5.5)

**Моя инструкция:** запускать ПОСЛЕ Board и Timer (агенту нужны их API), почтовые тулзы — после MAIL. Главные риски: (1) Codex полезет переписывать движок расписания — запрещено явно; (2) память превратится в свалку — поэтому факты типизированы и с лимитом; (3) стоимость — не проблема, ключи юзерские (BYOK). Прогоняй в 2 сессии: (1) тулзы+память, (2) проактивность+UI.

```
Extend the existing AI agent (streaming chat, per-user encrypted BYOK keys for Anthropic/OpenAI/Grok/GLM, tool-calling with confirmation for destructive actions, soul presets) into an app-wide copilot. Read the existing agent code first and extend its patterns — do NOT rewrite the agent core, do NOT modify the deterministic scheduling engine (src/services/scheduling/) — the agent only calls it.

PART 1 — TOOL COVERAGE (each tool = thin wrapper over existing service/API logic, server-side, Zod-validated params):
- Boards: list_boards, create_board, move_card(taskId, columnId, position), create_column, query_board.
- Focus: start_focus_session(taskId?, mode), stop_focus_session, get_focus_stats.
- Mail (only if mail module exists): search_mail(query, accountId?), get_message(id), create_task_from_email(messageId) — read-only plus task creation; the agent must NEVER send mail.
- Settings: get_user_settings, update_work_hours, update_scheduling_preferences (confirmation required).
- Existing task/schedule/project tools stay as-is.
Tool registry: single typed catalog file so new tools are registered in one place; every tool declares `dangerous: boolean` — dangerous ones reuse the existing confirmation flow.

PART 2 — USER MEMORY:
- Prisma model AgentMemory: id, userId, kind (preference|pattern|goal|fact), content (short text), source (chat|inferred), weight, createdAt, lastUsedAt. Cap 100 entries per user (LRU eviction by lastUsedAt).
- Tools: remember(kind, content), forget(memoryId), list_memories.
- The agent's system prompt is assembled per request: base soul preset + top-N memories (by weight/recency) + today's schedule summary. Assembly in one function with a token budget.
- Settings > AI gets a "Memory" section: list of remembered facts, delete buttons, "Clear all" — full user control, house format.
- Agent behavior rule in system prompt: silently store durable preferences the user states ("I never work before 10am", "Fridays are for uni"), never store sensitive data (health, credentials, finances).

PART 3 — PROACTIVITY (lightweight, no new infra):
- "Daily briefing" tool + UI card: when the user opens the app first time in a day (client checks lastBriefingAt), the chat panel offers a one-tap "Plan my day" that runs a scripted agent turn: query_schedule + memories -> short plan + suggested actions as buttons (each button = pre-filled tool call requiring one tap to confirm).
- Overload detection: if today's scheduled load exceeds available work hours, the sidebar AI pill shows a subtle dot; clicking opens chat pre-seeded with "Your Thursday is overbooked — want me to reshuffle?".
- No background LLM calls without a user-visible trigger (BYOK = user pays; every call must be user-initiated or one-tap).

PART 4 — HOSTED AI (make BYOK optional, not required):
- Add a server-side default provider: env NEEDT_AI_API_KEY + NEEDT_AI_MODEL (decision: a cheap model — GLM or DeepSeek; the provider abstraction already exists, add the endpoint config). Resolution order per request: user's own key (BYOK) if set, else hosted key. Keep the model swappable via env only — if cheap-model tool-calling proves unreliable in manual evals, we will route tool-turns to a stronger model later (//todo).
- Metering: Prisma model AiUsage (userId, yearMonth, actionCount). Every agent turn on the hosted key increments it; enforce a per-plan monthly cap via one helper canUseHostedAi(userId) (limits config in one place; //todo billing wiring). BYOK requests are NOT metered.
- UI: usage indicator in the chat panel ("240/300 actions left this month"); when the cap is hit, show upsell + "or use your own API key" link to Settings > AI. Settings > AI reframes BYOK as "Advanced: use your own key (unlimited)".

PART 5 — RESCHEDULE PREVIEW (top Motion complaint: AI reshuffles the day without asking):
- Add a dry-run mode to the auto-schedule invocation path: the engine computes the new placement WITHOUT persisting; the agent (and the "Reflow schedule" button) presents a diff — "these N tasks move: old slot -> new slot" — with Apply / Cancel. Engine itself stays untouched; this is a wrapper that stages results. Applied reflows keep a one-step Undo (store previous scheduledStart/End snapshot).

SECURITY: all tools operate strictly on the authenticated user's data; log tool calls via logger with LOG_SOURCE; destructive tools (delete_*, update_settings) always confirm.
Acceptance: lint/type-check/tests/build green; unit tests for prompt assembly (token budget, memory ranking), usage metering, and reschedule diff staging; CHANGELOG.md updated.
```

---

## 5. ПРОМТ ДЛЯ v0 — интерактивный лендинг

**Моя инструкция:** v0 — норм выбор (Next+Tailwind+shadcn — твой же стек, компоненты потом переносимы в репо как /(marketing) роут). Демо-календарь делай ПОЛНОСТЬЮ фейковым (стейт в памяти, никакого бэка) — это критично для скорости и конверсии. «AI» в демо — заскриптованные сценарии с эффектом печати, не настоящий LLM (нулевая задержка, нулевая стоимость, всегда идеальный результат). Скорость: hero должен рендериться < 1 сек, демо догружается лениво.

```
Build a single-page marketing landing for "Needt" — an AI planner that auto-schedules your tasks into your calendar (Motion-style) and includes Notion-like boards. Dark theme: background #1B1D1E, elevated surfaces #262627, accent Indigo #6366F1, system-ui font, flat design (no gradients/glow), 8px radius. Tech: Next.js + Tailwind + shadcn/ui. Must be fast: hero interactive under 1s, demo lazy-loaded below the fold, all demo logic client-side in-memory (NO backend calls).

STRUCTURE:
1. HERO: headline "Your week, planned by AI." subline "Needt schedules your tasks around your real calendar — and costs $6, not $34." CTA "Start free" + secondary "See it plan ↓" (scrolls to demo). Right side: auto-playing looped mini-animation of tasks flying into calendar slots (CSS/Framer Motion, not video).
2. INTERACTIVE DEMO (the centerpiece): a working fake week-calendar (Mon-Fri, 8:00-18:00 grid) pre-filled with a realistic student/freelancer week (lectures, client call, gym). Left panel: a chat-style "AI" input with 3 suggested prompts as chips: "Plan my essay in 3 sessions before Friday", "Add gym 3x this week", "I lost Tuesday — reshuffle". Clicking a chip types the text with a typing effect, then task blocks animate into free calendar slots one by one (staggered, 250ms). Users can ALSO drag any block to another slot (drag = snap to 30-min grid), toggle category filters (Work/Study/Personal chips recolor and show/hide blocks), and switch Week/Day. Everything is scripted and deterministic — no real AI. A small reset button restores the initial state.
3. FEATURES ROW (3 cards): "AI auto-scheduling" / "Boards like Notion" / "Focus timer with streaks" — each with a small looping visual.
4. COMPARISON STRIP: Needt $6 vs Motion $34 vs Notion+extra tools — 4-row table (auto-scheduling, boards, focus timer, price).
5. PRICING: Free (1 calendar, 1 board, 15 auto-scheduled tasks/mo) vs Pro $6/mo or $60/yr — cards with a monthly/yearly toggle, 14-day trial note, "Student-friendly, cancel anytime".
6. FAQ (5 items) + footer with waitlist email input (posts to a placeholder /api/waitlist, show success state locally).
Mobile: demo degrades to an auto-playing animation with "Try on desktop" note. Add subtle scroll-reveal animations, respect prefers-reduced-motion.
```

**После v0:** лендинг живёт на **needt.app**, приложение — на **use.needt.app** (CTA «Start free» → https://use.needt.app/login). Два варианта деплоя лендинга: (а) отдельный маленький Next-проект на том же Coolify (проще всего, полная независимость от релизов приложения — рекомендую) или (б) перенос в репо как route group `(marketing)` и роутинг по домену. Waitlist-заглушку замени на реальный endpoint (модель waitlist уже в Prisma-схеме) или на форму провайдера.

---

## Чеклист порядка (сведённый)

1. Руками: Фаза 0 (кроны/env/Neon/имя).
2. Codex: FIX (вкл. ребрендинг Needt + выпил старой стартовой страницы) → deploy.
   2.5 Codex: MOBILE (обязательно до Product Hunt).
3. Codex: Задача В → deploy → Задача Б (из needt-async-plan.md) → ручной чеклист Б (Redis, worker, domain verification).
4. Codex: BOARD (2 прогона) → deploy.
5. Руками: Nango self-host. Codex: TODO-SYNC → deploy.
6. Codex: TIMER (можно раньше, после FIX — не зависит от Б).
7. Codex: MAIL (строго после Б) → deploy.
   7.5 Codex: AI-AGENT (после BOARD+TIMER; почтовые тулзы — после MAIL).
8. v0: лендинг → перенос в репо → Stripe → онбординг-сид задачи → Product Hunt.
9. Codex: DESKTOP (Tauri, отдельный репо) — после Product Hunt, когда use.needt.app стабилен.
