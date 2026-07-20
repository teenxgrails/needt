# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- Fixed production startup accidentally downloading Prisma 7 through `npx`, which rejected the Prisma 6 datasource schema and skipped migrations. Runtime images now ship and invoke the lockfile-pinned CLI, reuse the client generated at build time, and no longer make a fragile middleware request back into the same container for the root redirect.

### Added

- Expanded Boards into a full-page Notion-style workspace with persistent Table, Board, List, Timeline, Calendar, and Gallery views over the same Needt tasks. Timeline and Calendar also surface existing calendar events as read-only context; Boards now have a dedicated index, inline title/icon editing, a full-screen view-first creation flow, and responsive dark/light visual coverage.
- Added deterministic Playwright visual-regression coverage for Calendar, Today, and Space at 1440px desktop, 768px tablet, and 375px mobile viewports, including isolated test data, fixed time/timezone, and portable baseline names.
- Replaced the inherited placeholder/Stripe billing path with Creem merchant-of-record checkout for Needt Pro ($6 monthly or $60 yearly) and Lifetime ($79), a signed idempotent webhook mapper, customer portal access, subscription lifecycle fields, and a complete house-format Billing settings page. Added server-side Free/Pro/Lifetime entitlements for calendars, auto-scheduling, Boards, Mail, AI, and Focus analytics, with neutral behavior when Creem is not configured.
- Expanded the existing AI chat into a user-scoped planner copilot with one Zod-validated tool catalog for Tasks, Boards, Focus, read-only Mail, Settings, and durable non-sensitive memory. Added ranked, token-budgeted prompt assembly with today's schedule, hosted DeepSeek-compatible fallback and monthly action metering, daily briefing and overload entry points, Settings memory controls, and deterministic reschedule previews with explicit Apply/Cancel plus one-step Undo.
- Added a local-first, read-only unified Mail inbox for Gmail, Outlook, and IMAP with encrypted IMAP credentials, provider cursor sync in the existing BullMQ worker, lazy sanitized message bodies, remote-image blocking, unread/archive actions, and task creation from email.
- Rebuilt Focus into a persistent, server-backed timer: the running session is now owned by the server (`FocusSession` with an active `endedAt = null` row, accumulated pause time, and source), so the timer survives navigation and full page reloads instead of resetting. Start/pause/resume/stop go through `/api/focus/session`, the sidebar Focus item shows the live ticking time, sessions can be bound to a task or run explicitly as a "Free session", completing a session prompts to mark the task done / log and continue / start a break, browser notifications (with an in-app toast fallback) fire on completion, and a house-format week bar chart joins the Focus / Streak / Hours stats. Added `GET /api/focus/active` returning `{ active, taskId, endsAt }` for a future website-blocking Chrome extension, an `actualFocusedMinutes` field written onto tasks, a "Start focus" task action, and an explanation on the Focus Quick Actions when no task is bound.
- Added Boards v1 — a Notion-like board system on top of the existing task model. New Prisma models (Board, BoardColumn, SavedView) plus additive Task fields (boardId, boardColumnId, boardPosition, properties) that leave the scheduling engine untouched: a board task is the same task the auto-scheduler works with. A "Boards" sidebar section lists boards with a "+" to create one (Start empty or a Tasks Tracker / Semester plan template). The board view has custom columns with per-column WIP counts, an inline "+ New" card add, an "Add column" affordance, and keyboard-accessible drag-and-drop of cards within and across columns (fractional-index ordering, unit-tested). Clicking a card opens the shared task editor as a side panel. REST API under `/api/boards/**` and a `canCreateBoard(userId)` free-plan seam. (Group-by / Sort / Filters toolbar, per-SavedView persistence, emoji icon picker, CSV import, and the AI "describe your board" scaffolder are marked //todo for a follow-up.)
- Made the app usable on mobile with the same routes and no parallel component tree: a persistent Calendar, Today, Tasks, Focus, and Me tab bar; a dedicated top-bar AI entry; a Tiimo-structured Today agenda; swipeable Calendar day navigation; horizontally snapping Boards; stacked Mail list/reader panes; responsive Focus; and full-screen AI Chat. Shared bottom sheets, safe-area spacing, 44px touch targets, the "Space is best on desktop" treatment, and the second-visit PWA install prompt keep the phone experience app-like without changing its APIs.
- Added persistent Motion-style task defaults for project, status, priority, scheduling, duration, chunks, dates, deadlines, and schedule; new task forms now consume those defaults.
- Added a user-ready Billing page backed by the existing subscription model, with plan state and included-usage details.
- Added BullMQ-backed calendar sync, rescheduling, and webhook-renewal queues with a separately deployable worker bundle.
- Added verified Google Calendar push channels and Microsoft Graph subscriptions, incremental provider sync, and automatic subscription renewal.
- Added authenticated Redis-backed SSE updates so calendar and task changes refresh connected clients within seconds.
- Added a Motion-style Settings information architecture with dedicated Calendars, Auto-scheduling, Task defaults, Theme, Timezone, Notifications, Schedules, Desktop app, Integrations, API, Privacy, AI Assistant, and Account pages.
- Added a full-screen weekly schedule editor with per-day drag selection, copy-to-week, timezone context, and persistent scheduling-engine work hours.
- Added a minimal `/quick-add` route: a single brain-dump input that runs text through the existing `/api/ai/parse-tasks` parser and creates the resulting tasks (Cmd/Ctrl+Enter to submit), house-format and dependency-free.
- Added Space as the primary Solo workspace view: a lightweight animated constellation of the same scheduled tasks used by Calendar, with project clusters, task details, pan/zoom, completed-task visibility, and drag-to-reschedule across the next 14 days.
- Added configurable Solo workspace views and Motion-style menus for grouping, sorting, layout, filters, projects, visible columns, view management, creation, and task actions.
- Added a Motion-matched calendar task actions menu with completion, cancellation, link, scheduling, duplication, project, template, archive, and delete actions.
- Added spring-based task dragging with a Motion-style lift preview, reduced-motion fallbacks, and direct Today-sidebar drops onto the Day and Week calendar grids.
- Added a lightly staggered spring settle animation when auto-scheduling moves task chips into their new calendar slots.
- Added an immersive Focus transition that dims side content without blur, centers a Liquid Glass focus card, and animates the timer with an accessible SVG progress ring.
- Polished the command palette with fuzzy-ranked matches, highlighted match characters, a subtle result stagger, and a reduced-motion-aware spring open/close transition.
- Added native, reduced-motion-aware view transitions between Calendar, Tasks, and Focus while keeping the persistent navigation and overlays stable.
- Added reduced-motion-aware number transitions for task counts, project alerts, focus stats, tracked time, and planning capacity.
- Added reduced-motion-aware list transitions for task tables, project boards, and the Today sidebar so optimistic changes settle smoothly without delaying input.
- Added instant optimistic task creation, editing, completion, movement, and deletion across Tasks, Calendar, Focus, Smart Planning, and project drag-and-drop, with server reconciliation and automatic rollback when a request fails.
- Added Motion-style calendar creation: clicking or dragging an empty Week/Day time slot now opens a lightweight task-first quick creator. Press Enter to create an auto-scheduled task, choose Event for a fixed block, or open the full Task editor for advanced options.
- Rebuilt the Event creator as a full Motion-style, two-column editor with time controls, repeat settings, and a dedicated Event details panel.
- Restored the month mini-calendar in the left sidebar with Motion-sized 24px dates, a white selected day, a TODAY marker, seven-day navigation, and a month/year picker.
- Added a "Today's tasks" panel in the left sidebar listing incomplete tasks that are overdue or due today, sorted most-urgent first with a colored urgency circle (red for overdue/due soon and pinned to the top, yellow for approaching, green for plenty of time). Hovering a row reveals an animated circular start button that opens a "Start task now" modal — choose how long to work (5–120 min), optionally start Focus, and the block is allocated now while the scheduling engine moves other tasks around it. Chosen durations are learned per task title so similar new tasks are prefilled. Urgency thresholds are configurable under Settings → Task urgency

### Changed

- Reduced Focus to a distraction-free full-canvas timer with one contextual Start/Pause/Continue control. The Magic UI circular gauge now renders clock content and advances every second from the existing server-owned focus session while preserving completion, notification, and task-binding behavior underneath. Replaced the purple AI Chat CTA with a black Needt-adapted Rainbow Button whose animated color is limited to a thin border, and applied the Magic UI circular theme reveal to theme changes from navigation, profile, and Appearance settings.
- Unified page, sidebar, panel, popover, and dialog backgrounds onto one canvas color per theme with a subtle top-lit gradient limited to the first 40% of the surface. Expanded the Create Task editor and its scheduling sidebar, reorganized Advanced settings into clearly explained time, placement, and label groups, and upgraded the sidebar AI Chat action to a vivid token-based gradient CTA without glow.
- Reworked the phone shell around a native-style four-tab floating dock (To-do, Today, Focus, Me), safe-area-aware chrome, smoother persistent route transitions, and a Tiimo-inspired Today header with centered serif day typography, progress, quick add, and horizontal day swipes. Installed PWA launches now open Today, refresh their service worker without stale RSC caching, and preserve offline mutation queues across upgrades.
- Rebased both appearance themes on shared top-lit depth tokens. Dark mode now uses a neutral `#0E0E10` canvas with closely stepped `#151517` / `#1A1A1E` / `#212126` surfaces, thin neutral borders, radial page and panel depth, and a stronger top-to-bottom modal scrim; light mode supplies matching inverted depth without blur or glow.
- Completed the responsive Needt design pass for Boards, Focus, Mail, and AI Chat in both dark and light themes. Boards now separate card-open and drag handles, Focus uses a flat Opal-inspired timer hierarchy with an early-exit sheet, Mail follows the compact Inbox toolbar/row rhythm, and AI Chat shares the common composer, loading, history, and message surfaces.
- Renamed Settings → Theme to Appearance, made the mobile Me tab point to account settings, and isolated custom dark background tinting from light-mode semantic tokens so switching themes never leaves a dark inline canvas behind.
- Replaced the task description Markdown textarea with a rendered Tiptap editor supporting headings, bold/italic/underline/strike, lists, checklists, code, links, images, undo, and redo. Rich descriptions are sanitized before storage and render consistently in task quick views, Boards, and Focus while legacy plain-text and Markdown descriptions remain readable.
- Refined Calendar, Today, Create Task, and Space as one coherent Needt UI pass: 12-hour grid labels now use `1 PM` spacing, the current-time dot is smaller, working hours use the plain canvas while non-working hours receive the optional quiet tint, Today uses a centered day/date hierarchy with time-of-day task groups, and the full task editor consumes shared theme tokens with a functional description-formatting toolbar.
- Made Space a purely exploratory environment: its darker animated star canvas and compact controls remain draggable and zoomable, but moving task nodes no longer rewrites or freezes their scheduling fields.
- Finished the remaining Settings tabs with the shared Motion-style row, card, picker, switch, loading, and advanced-section patterns; Theme, Timezone, Notifications, API, Privacy, AI Assistant, Schedules, Desktop, and Account now share the same responsive user-facing layout.
- Finished the ordinary-user Settings experience around Motion's measured layout: matching calendar account/group dialogs, compact auto-scheduling choices, searchable task pickers, integration cards, a unified canvas background, and collapsed advanced-only controls.
- Removed System and Logs from the user Settings navigation and replaced calendar credential error panels with quiet provider availability feedback.
- Rebuilt Settings around the measured Motion layout: a compact 230px navigation rail, 57px page header, dense token-based rows, and shared Needt controls throughout.
- Moved existing Needt-only features into the closest Settings homes without dropping functionality: task sync under Integrations, connector tokens and webhooks under API, import/export and retention under Privacy, and advanced energy rules under Auto-scheduling.
- Rebranded the application shell, metadata, PWA assets, AI copy, local calendars, and documentation from Flowday to Needt through the shared app configuration.
- Replaced the inherited root landing page with an auth-aware redirect to Calendar or Sign In.
- Consolidated Needt into one production build by removing edition-specific routing, file variants, feature gates, repository sync tooling, and the legacy worker scripts.
- Unified Workspace and Calendar control styling through one shared compact toolbar contract, and moved Space zoom into a small canvas control with cursor-anchored wheel zoom.
- Removed the Space Inbox cluster and orbit rings: tasks without a project now float independently, project centers use compact neutral labels, and lightweight star layers drift and pulse without a JavaScript animation loop.
- Upgraded Workspace into a practical mission-control view: readable project constellations and task chips, Today/7-day/14-day horizons, search and project focus, workload metrics, an inline task inspector, and an explicit calendar-aware drag-to-reschedule grid. The simplified Task List now surfaces today, overdue, and workload context while keeping advanced controls optional.
- Rebuilt Workspace around the Solo-focused `Space`, `Task List`, and `Timeline` views, removed the legacy project sidebar, and simplified the default task table to the six fields most users need while keeping additional fields optional.
- Reworked calendar quick-create with the shared Needt popover, input, control, and focus tokens; matched the current-time dot/rule to Motion and aligned hour labels directly with their horizontal grid lines.
- Restyled the calendar task-actions menu and Start task dialog with the shared Needt menu, dialog, control, and status tokens.
- Moved the today-only task list above the sidebar mini-calendar, removed its redundant heading/count, and replaced the accent start control with a compact neutral action button.
- Established the finished Calendar palette and controls as the Needt design system, with primitive, semantic, and component tokens, theme-ready root switching, and shared buttons, inputs, pickers, menus, dialogs, switches, checkboxes, and tooltips consuming the same source of truth.
- Matched calendar toolbar controls to Motion's exact 25px height and 13px type, while restoring a configurable multi-color accent palette instead of forcing the interface to one graphite color.
- Aligned the week header/time gutter with Motion and added a compact gridded all-day rail.
- Refined calendar working and non-working hour shades while preserving the current-day hierarchy and consistent one-pixel grid lines.
- Rebuilt the full Create task editor around Motion's measured 1016×767 desktop frame, with a 696px editing canvas, 320px scheduling sidebar, matching property groups, templates, recurrence, and collapsed advanced settings.
- Rebased the calendar canvas and time gutter on the shared canvas token, with subtle stepped shades for non-current working and non-working hours while preserving every grid line.
- Rebuilt calendar task and event cards in Motion’s grid language: tasks are neutral, checkbox-led blocks with compact time metadata and a hover actions affordance; events retain a restrained color marker and their own event-specific layout.
- Matched the Task and Event editors more closely to Motion’s actual layouts: Task now uses a wide, borderless editing canvas with property rows in the scheduling sidebar; Event uses Motion’s compact single-column creation flow with time controls, repeat controls, and Event details below.
- Reorganized Settings into grouped Calendars, Scheduling, Tasks, Appearance, Notifications, AI, Integrations, Import / Export, and Account pages; legacy hashes now route to their consolidated home.
- Moved calendar display and working-hour controls out of Calendars so calendar account/default-calendar settings have a single home.
- Consolidated calendar account management under Calendars, added an Account profile page, and restyled Tasks, Notifications, Import / Export, Integrations, and Logs with consistent Motion-style settings rows.
- Removed duplicate legacy energy and work-hours editors so scheduling rules have one source of truth; Appearance now owns the calendar working-hours display toggle.
- Moved the AI Chat button from the top of the sidebar to the bottom-left, just above the profile/settings row (keeps the pill styling and ⌘/ label)
- Made switching between app sections instant: the calendar route no longer blocks on a server-side query of every event on each navigation. It now renders as a static, prefetched route and hydrates from the persistent in-memory calendar store, revalidating in the background — so revisiting the calendar shows cached data immediately with no spinner or flash

### Fixed

- Restored reliable Board card opening by moving drag listeners onto a dedicated handle and including task tags in Board detail payloads for the shared task editor.
- Prevented development service workers from serving stale client bundles after HMR or reload, and kept authenticated navigation off auth, setup, and Settings routes where it could trigger unrelated feature requests.
- Hardened the post-reland feature seams: the sidebar AI pill and Cmd/Ctrl+/ now open the chat overlay, elapsed Focus sessions keep their completion prompt, Flow sessions preserve their completion status after reload, and task deadline inputs retain local wall-clock time.
- Made optional integrations fail soft: the billing client no longer throws at module import without Creem configuration, Redis-backed enqueue/realtime publishing becomes a guarded no-op in the web process, SSE reconnects back off while Redis is unavailable, and unconfigured Google/Outlook calendar and Mail actions render as neutral disabled states.
- Added controlled logging/error responses around Boards, Focus, and Mail routes plus feature-local Mail and Boards render fallbacks, so an isolated provider or database failure does not blank the app or escape as an unhandled route rejection.
- Recomputed Outlook sync windows per request and parsed opaque delta tokens safely, instead of freezing the date range at module import or retaining trailing query parameters.
- Added a SavedView-to-Board foreign key with `SET NULL` cleanup, completed the customization/token rebrand defaults, and kept the integrated CalendarWebhook, Mail, Focus, Boards, AgentMemory, and AiUsage schema additive.
- Split the shared app-session context from its provider component so Settings, account controls, and admin checks consume the same stable client export without a Turbopack runtime mismatch.
- Unified client session reads behind one provider so the sidebar keeps a skeleton during authentication instead of flashing an empty avatar or Sign In action.
- Prevented mount-time FullCalendar selections from opening quick-create without an explicit user click or drag.
- Kept Timeline task bars inside their project rows and aligned them to the date grid, with muted completed tasks and hatched weekend columns.
- Fixed Coolify production images omitting build-time dependencies during `npm ci`, and kept the pinned Prisma 6 CLI in runtime dependencies so container startup cannot download an incompatible Prisma major before migrations.
- Escape and outside-click now dismiss calendar quick-create and clear its temporary FullCalendar selection instead of leaving the draft block behind.
- Calendar tasks now open their full editor on click, while their checkbox completes them directly without opening the editor.
- Made Refresh all tasks run the scheduler, reload the calendar, animate the updated layout, and report success or rollback errors clearly.
- Fixed the current-time indicator gap, removed the extra time-gutter divider, and added matching open/close motion to the Create Task / Event menu.
- Kept hourly grid rules visible above working-hours overlays, made every all-day cell consume the shared canvas token with four-sided dividers, and removed the redundant main-calendar date controls.
- Reset the calendar to the real current day after a new session, prevented week changes from remounting the whole view, and made mini-calendar arrows move exactly seven days.
- Hid the empty Today tasks placeholder, included tasks scheduled for today, and based urgency color/order on the explicit deadline before the due-date fallback.
- Matched the Calendar Options weekday picker to its panel background and replaced the oversized create dropdown with a compact two-action menu in the calendar palette.
- Fixed the Week calendar's full task editor occasionally refusing to close because its grid-creation state remained active after Close, Cancel, or Escape.
- Fixed the command palette keeping an invisible modal scroll lock mounted after closing, which could prevent calendar scrolling and pointer interaction.
- Fixed calendar task quick views for auto-scheduled chunks: click handlers now resolve the underlying task id instead of the generated calendar-block id, and the popover anchors to the clicked item.
- Removed the wide highlighted band that appeared across the whole hovered hour in the calendar (the app-wide `table tbody tr:hover` highlight was bleeding into FullCalendar's timegrid rows); the thin Motion-style dashed cursor guide is now the only hover affordance
- The dashed cursor guide in week view spans the full grid width (all day columns) and shows consistently over working hours, non-working hours, and every day, matching Motion
- Restored the calendar grid lines (hourly rows and day-column separators at `#2B2F31`, half-hour lines hidden) and added Motion-style column shading: the current-day column stays flat `#202425`, while other days show a two-step tint — working hours `#24282A`, non-working hours `#282C2E`

### Changed

- Redesigned the calendar toolbar and week grid to match the Motion reference: the header now shows a compact "Mon YYYY" title, and the right side groups a "Calendar options" menu (24-hour time, start week on Monday, highlight working hours), a "Refresh all tasks" action, a "+" new-event button, and a single "Week" view-switcher dropdown (replacing the separate Day/Week/Month/Year buttons). Week day headers now read "Mon 6" and a timezone abbreviation is shown in the top-left axis corner

### Added

- Import tasks from CalDAV servers (Baikal, Nextcloud, Fastmail, etc.): a connected CalDAV account's task collections (calendars that expose `VTODO`) can be mapped to a project and their tasks imported into FluidCalendar. Import is one-way for now - title, description, due/start dates, status, priority, and recurrence are read from the server, and an external-owned field cleared upstream (e.g. a completed task reopened) is cleared locally too so the import mirrors the server (#144)
- Create a multi-day all-day event by dragging the mouse across multiple days on the all-day row, like Google Calendar; the New Event modal opens pre-filled as an all-day event spanning the selected days (#79)
- Added `.github/copilot-instructions.md` with repository-wide guidance for GitHub Copilot's coding agent (setup, commands, architecture, SAAS/open-source separation, code-style conventions)
- Show the application version in a footer on every page, linking to the project's GitHub page (#111)
- Added a button to mark tasks as completed directly from the task quick view popup
- Added visual indicator for externally synced tasks in task list view
- Added Stripe configuration file (`src/lib/stripe.saas.ts`) for SAAS payment processing
- Lifetime access purchase feature
  - Added Stripe integration for one-time payments
  - Implemented early bird 50% discount for first 50 purchases
  - Added lifetime access status tracking for users
  - Created webhook handler for Stripe events
  - Added server actions and API routes for purchase flow
- Lifetime access subscription plan with special early bird pricing
- Server actions for handling lifetime access purchases
- Early bird discount for first 50 lifetime subscribers ($200 instead of $400)
- Lifetime Access subscription plan with early bird pricing
  - Early bird offer: $200 for first 50 subscribers
  - Regular price: $400 after early bird period
  - Includes all Pro features with perpetual access
- Lifetime subscription success page with modern design and animations
- New reusable PageHeader component for consistent page headers
- Enhanced payment success flow with session verification
- New success page for lifetime subscription purchases
- API endpoint to verify Stripe checkout sessions
- Refactored the lifetime subscription success page (`src/app/(saas)/subscription/lifetime/success/page.tsx`) to use the new pattern for `searchParams` and `params` as Promise types, updating usages accordingly.
- Added a password setup page at /subscription/lifetime/setup-password for new users after successful payment (SAAS only).
- Updated the 'Set Up Your Account' button on the lifetime success page to redirect to the password setup page.
- The 'Set Up Your Account' button now sends name and email in query params to the password setup page, which displays them if present.
- Implemented backend API route and service for password setup at /subscription/lifetime/setup-password/api (SAAS only).
- Added client service to call the backend API for password setup.
- Integrated password setup form with the backend using Tanstack Query, including loading, error, and success states.
- Made `/subscription/lifetime/success` route public in middleware so it no longer requires authentication after successful payment.
- Made `/subscription/lifetime/setup-password` route public in middleware so users can set their password after payment without authentication.
- Enhanced lifetime subscription success page with automatic user verification and redirection
- Added subscription status verification and automatic updates for existing users
- Improved payment verification with early bird discount detection
- Updated LifetimeSuccessPage and LifetimeSuccessClient to show 'Go to login' or 'Go to Calendar' for existing users after successful lifetime subscription payment, based on whether the user is logged in or not. The setup button is now only shown for new users.
- Added a dismissible "Buy Lifetime Access" banner at the top of the main calendar/dashboard view for SAAS users who have not purchased lifetime access. The banner links to /beta for payment.
- The "Upgrade to Lifetime Access" banner is now only shown if the user does not have a lifetime subscription. Added `/api/subscription/lifetime/status` endpoint for this check.
- Fixed "Upgrade to Lifetime Access" banner to remain hidden initially until verification confirms user doesn't have lifetime access, preventing banner flash for lifetime subscribers
- Added Asia/Karachi to the timezone options in user settings
- Improved calendar rendering performance with Server Components
  - Added server-side pre-fetching of calendar feeds and events data
  - Modified client components to hydrate with server-fetched data
  - Reduced client-side data loading operations and API calls
  - Eliminated loading delay for initial calendar view rendering
- Updated application logo to use SVG format instead of PNG for better quality
  - Replaced inline SVG calendar icons with the logo.svg file
  - Updated favicon configuration to use the SVG logo
  - Added SVG icon support in metadata
  - Made logo background transparent for better display on different colored backgrounds
  - Optimized logo viewBox for better visibility at small sizes in browser tabs
  - Added explicit size hints in metadata for better browser rendering
  - Added logo to main navigation bar with app name for better branding

### Changed

- Upgraded the runtime from Node.js 20 to Node.js 22 (LTS): updated `.nvmrc`, both Docker base images, bumped `@types/node` to v22, and added an `engines.node >=22.11.0` constraint to `package.json`
- Removed "Upcoming:" prefix from due dates in task views to reduce confusion with the "upcoming" label used for tasks with future start dates
- Updated future task detection to consider tasks as "upcoming" only if they are scheduled for tomorrow or later
- Added new `isFutureDate` utility function in date-utils
- Improved date formatting in task views to consistently show "Upcoming" label for future tasks
- Fixed task overdue check to not mark today's tasks as overdue
- Modified auto-scheduling to exclude tasks that are in progress, preventing them from being automatically rescheduled
- Updated User model to track lifetime access status
- Added new LifetimeAccessPurchase model for purchase tracking
- Updated success URL in checkout session to include session ID
- Improved UX for payment success confirmation
- Updated lifetime subscription checkout to use Stripe price IDs instead of inline product data
- Added new environment variables:
  - `STRIPE_LIFETIME_EARLY_BIRD_PRICE_ID`: Price ID for early bird lifetime access
  - `STRIPE_LIFETIME_REGULAR_PRICE_ID`: Price ID for regular lifetime access
- Updated verifyPaymentStatus to include additional payment information
- Improved error handling and logging in subscription flow
- Improved SAAS/open source code separation:
  - Renamed subscription-related files to include `.saas.ts` extension:
    - `/src/lib/actions/subscription.ts` → `/src/lib/actions/subscription.saas.ts`
    - `/src/lib/services/subscription.ts` → `/src/lib/services/subscription.saas.ts`
    - `/src/lib/hooks/useSubscription.ts` → `/src/lib/hooks/useSubscription.saas.ts`
    - `/src/app/api/subscription/lifetime/route.ts` → `/src/app/api/subscription/lifetime/route.saas.ts`
    - `/src/app/api/subscription/lifetime/status/route.ts` → `/src/app/api/subscription/lifetime/status/route.saas.ts`
    - `/src/app/api/subscription/lifetime/verify/route.ts` → `/src/app/api/subscription/lifetime/verify/route.saas.ts`
    - `/src/app/(saas)/subscription/lifetime/success/page.tsx` → `/src/app/(saas)/subscription/lifetime/success/page.saas.tsx`
  - Updated all imports referencing these files to use the new paths
  - Created separate implementations of components with SAAS-specific code:
    - Split `LifetimeAccessBanner` into `.saas.tsx` and `.open.tsx` versions
    - Modified Calendar component to use dynamic imports based on `isSaasEnabled` flag
    - Removed direct SAAS imports from common components

### Fixed

- Fixed deleting a single occurrence of a recurring Google Calendar event removing the wrong instance: single-occurrence deletes re-queried Google for the "next upcoming" instance (`timeMin: now`, `maxResults: 1`) and deleted that, so deleting a past or non-next row could silently delete a different (often future) occurrence. Single-mode deletion now targets the clicked occurrence directly. Affects all calendar views and pushed task blocks (#199)
- Fixed the Tasks list so sorting by the Priority or Energy column orders rows by meaning (low < medium < high) instead of alphabetically by label; tasks with no priority/energy (including the "None" priority) sort to the end (#131)
- Fixed CalDAV connection failures (unreachable server, DNS error, connection refused/timeout, or an untrusted/self-signed TLS certificate) being reported as "Failed to authenticate with CalDAV server. Please check your credentials." When the underlying failure is a network/TLS problem, the Test Connection, Connect, and calendar-discovery flows now return a connection-oriented error ("Could not connect to the CalDAV server. Please check the server URL, your network/firewall, and the server's TLS certificate.") with an HTTP 502, while genuine credential rejections still show the credentials message with HTTP 401. This stops sending users with Radicale/Nextcloud/Baikal down the wrong debugging path (#122, #117, #115)
- Fixed being unable to connect a second CalDAV server when its username matched one already connected: the account uniqueness constraint was `(userId, provider, email)` and CalDAV stores the login username in `email`, so two different CalDAV servers sharing a username collided and the second connection failed with a misleading "Incorrect credentials" error. CalDAV account identity now includes the server URL (`(userId, provider, email, caldavUrl)` with `NULLS NOT DISTINCT`), so multiple CalDAV servers can be connected even with the same username; OAuth providers (Google/Outlook) are unaffected and still allow only one account per email. Re-adding the exact same server now returns a clear "already connected" message instead of a credentials error (#145)
- Fixed the Docker quick-start being unreachable on `http://localhost:3000` when the operator's `.env` contained an unrelated `PORT` (e.g. `PORT=80`) or `HOSTNAME` (e.g. `localhost`): `docker-compose.yml` forwarded the whole `.env` into the app container, and the Next.js standalone server binds to `HOSTNAME:PORT`, so the app bound to the wrong address/port while compose still published `3000:3000`. The `app` service now pins `PORT=3000` and `HOSTNAME=0.0.0.0`, so the published port always reaches a listening server; the README quick-start documents that `PORT`/`HOSTNAME` in `.env` do not change where the app binds (#151)
- Fixed connecting a personal Microsoft account (outlook.com / hotmail.com / live.com, Microsoft 365 Personal/Family) to Outlook failing with `profile-fetch-failed` after a successful sign-in; these accounts return `mail: null` from Microsoft Graph, so the account email now falls back to `userPrincipalName`. The "Connect Outlook" button is also no longer disabled when no Tenant ID is set (tenant is optional and defaults to `common`), and the Outlook redirect URI in the README, `docs/_old/outlook.md`, and the self-hosting checklist is corrected to the path the app actually uses (`/api/calendar/outlook`) (#97)
- Corrected the Google Calendar OAuth setup instructions so the README and the in-app System Settings panel agree: both now document the two required redirect URIs (`/api/auth/callback/google` for sign-in and `/api/calendar/google` for calendar connect), and the README adds troubleshooting for the common `redirect_uri_mismatch`/"Invalid Redirect" failures (`NEXTAUTH_URL` must match the public URL; bare private IPs and `.local` hosts are rejected by Google) (#76)
- Fixed CalDAV events created or updated in FluidCalendar appearing at the wrong time in other calendar clients (Thunderbird, Home Assistant) when their timezone differs from the server's. Timed events are now serialized with an explicit timezone (`DTSTART;TZID=<zone>` plus a generated `VTIMEZONE`, falling back to UTC `Z` when no timezone is known) instead of floating local time, so recurring events also keep their wall-clock time across DST and the `TZ` environment-variable workaround is no longer needed (#135)
- Fixed creating and updating all-day events on CalDAV servers (Baikal, Nextcloud) failing with an error; the generated iCalendar no longer emits an invalid duplicated `VALUE=date;VALUE=DATE` parameter on `DTSTART`/`DTEND` (#100)
- Fixed the "Hide upcoming tasks" filter on the Tasks list so it hides exactly the tasks marked "Upcoming"; it now uses the same day-granularity rule as the "Upcoming" badge instead of an instant comparison that also hid tasks starting later today (#109)
- Auto-Schedule settings time dropdowns (Working Hours and energy-level ranges) now honor the 12h/24h preference from General settings instead of always showing 24-hour times (#129)
- Improved all-day event UI by removing time selection when "All day" is checked, showing only date picker instead
- Fixed Google Calendar event deletion by adding missing userId parameter for authentication
- Fixed Outlook task sync issues with recurring tasks
- Fixed Caldav feed failing to add when syncToken is an integer
- Fixed: Updated Stripe checkout session success_url in lifetime subscription API to use double curly braces ({{CHECKOUT_SESSION_ID}}) so users are redirected to the success page after payment.
- Fixed lifetime subscription error toast to show the actual error message ("User already has lifetime access") instead of generic "request failed with status code 400" message.
- Fixed name input in account setup page after payment to allow users to enter their complete name without the input disappearing after first character.
- Fixed infinite login redirect loop in staging environment by:
  - Correcting the login URL from "/login" to "/auth/signin" in lifetime success page
  - Adding explicit handling in middleware to redirect "/login" to the correct authentication route
  - Preventing redirect loops between /auth/signin and /setup pages by improving middleware and setup check logic
  - Adding special handling in middleware to detect and break circular redirects
- Fixed edge case where sign-in button remained visible after user logged in by adding proper session loading state handling in UserMenu component
- Fixed calendar page authentication to use JWT tokens instead of session-based authentication, maintaining consistency with the rest of the application
- Fixed authentication in subscription API routes by replacing session-based auth with JWT tokens:
  - Updated `/api/subscription/lifetime/status` to use getToken instead of getServerSession
  - Updated `/api/subscription/lifetime/verify` to use getToken instead of getServerSession
  - Updated `/subscription/lifetime/success` page to use JWT token authentication
- Fixed all linting errors related to usage of 'any' in API routes for subscription lifetime status and verify endpoints.
- Refactored usage of getToken in (saas) subscription lifetime success page and API routes to use NextRequest and proper cookie handling.
- Replaced console.log with logger.error in (common)/calendar/page.tsx for proper logging.

### Removed

## [1.3.0] 2025-03-25

### Added

- Comprehensive bidirectional task synchronization system with support for Outlook
  - Field mapping system for consistent task property synchronization
  - Recurrence rule conversion for recurring tasks
  - Intelligent conflict resolution based on timestamps
  - Support for task priorities and status synchronization
- Password reset functionality with email support for both SAAS and open source versions
- Smart email service with queued (SAAS) and direct (open source) delivery options
- System setting to optionally disable homepage and redirect to login/calendar
- Daily email updates for upcoming meetings and tasks (configurable)
- Resend API key management through SystemSettings

### Changed

- Enhanced task sync manager for true bidirectional synchronization
- Improved date and timezone handling across calendar and task systems
- Moved sensitive credentials from environment variables to SystemSettings
- Replaced Google Fonts CDN with self-hosted Inter font
- Updated API routes to follow NextJS 15 conventions
- Split task sync route into SAAS and open source versions
  - Moved background job-based sync to `route.saas.ts`
  - Created synchronous version in `route.open.ts` for open source edition

### Fixed

- Multiple task synchronization issues:
  - Prevented duplicate task creation in Outlook
  - Fixed task deletion synchronization
  - Resolved bidirectional sync conflicts
  - Fixed task mapping and direction issues
- All-day events timezone and display issues
- Various TypeScript and linter errors throughout the task sync system

### Removed

- Legacy one-way Outlook task import system and related components
- OutlookTaskListMapping model in favor of new TaskListMapping
- RESEND_API_KEY from environment variables

## [1.2.3]

### Added

- Added task start date feature to specify when a task should become active
  - Tasks with future start dates won't appear in focus mode
  - Auto-scheduling respects start dates, not scheduling tasks before their start date
  - Visual indicators for upcoming tasks in task list view
  - Filter option to hide upcoming tasks
  - Ability to sort and filter by start date
- Added week start day setting to Calendar Settings UI to allow users to choose between Monday and Sunday as the first day of the week
- Expanded timezone options in user settings to include a more comprehensive global list fixes #68
- Bulk resend invitations functionality for users with INVITED status
- Added "Resend Invitation" button to individual user actions in waitlist management

### Changed

- Updated email templates to use "FluidCalendar" instead of "Fluid Calendar" for consistent branding
- Refactored task scheduling logic into a common service to reduce code duplication
  - Created `TaskSchedulingService` with shared scheduling functionality
  - Updated both API route and background job processor to use the common service
- Improved SAAS/open source code separation
  - Moved SAAS-specific API routes to use `.saas.ts` extension
  - Renamed NotificationProvider to NotificationProvider.saas.tsx
  - Relocated NotificationProvider to SAAS layout for better code organization
  - Updated client-side code to use the correct endpoints based on version

### Fixed

- Fixed type errors in the job retry API by using the correct compound unique key (queueName + jobId)
- Fixed database connection exhaustion issue in task scheduling:
  - Refactored SchedulingService to use the global Prisma instance instead of creating new connections
  - Updated CalendarServiceImpl and TimeSlotManagerImpl to use the global Prisma instance
  - Added proper cleanup of resources in task scheduling API route
  - Resolved "Too many database connections" errors in production

### Technical Debt

- Added proper TypeScript types to replace `any` types
- Added eslint-disable comments only where absolutely necessary
- Fixed linter and TypeScript compiler errors
- Improved code maintainability with better type definitions
- Added documentation for the job processing system
- Standardized error handling across the codebase

### Removed

- Separate one-way sync methods in favor of a more efficient bidirectional approach

## [1.2.1] 2025-03-13

### Added

- Added login button to SAAS home page that redirects to signin screen or app root based on authentication status
- Added SessionProvider to SAAS layout to support authentication state across SAAS pages
- Added pre-commit hooks with husky and lint-staged to run linting and type checking before commits

### Changed

- Removed Settings option from the main navigation bar since it's already available in the user dropdown menu
- Improved dark mode by replacing black with dark gray colors for better visual comfort and reduced contrast

### Fixed

- Fixed event title alignment in calendar events to be top-aligned instead of vertically centered
- Removed minimum height constraint for all-day events in WeekView and DayView components to improve space utilization
- Made EventModal and TaskModal content scrollable on small screens to ensure buttons remain accessible

## [1.2.0] 2025-03-13

### Added

- Added background job processing system with BullMQ
  - Implemented BaseProcessor for handling job processing
  - Added DailySummaryProcessor for generating and sending daily summary emails
  - Added EmailProcessor for sending emails via Resend
  - Created job tracking system to monitor job status in the database
- Added admin interface for job management
  - Created admin jobs page with statistics and job listings
  - Added ability to trigger daily summary emails for testing
  - Implemented toast notifications for user feedback
- Added Toaster component to the saas layout and admin layout
- Added Redis configuration for job queues
- Added Prisma schema updates for job records
- Added worker process for background job processing
  - Created worker.ts and worker.cjs for running the worker process
  - Added run-worker.ts script for starting the worker
- Added Kubernetes deployment configuration for the worker
- Added Docker configuration for the worker
- Added date utilities for handling timezones in job processing
- Added maintenance job system for database cleanup
  - Implemented MaintenanceProcessor for handling system maintenance tasks
  - Added daily scheduled job to clean up orphaned job records
  - Created cleanup logic to mark old pending jobs as failed
- Centralized email service that uses the queue system for all email sending
- Task reminder processor and templates for sending task reminder emails
- Email queue system for better reliability and performance

### Fixed

- Fixed TypeScript errors in the job processing system:
  - Replaced `any` types with proper type constraints in BaseProcessor, job-creator, and job-tracker
  - Added proper type handling for job data and results
  - Fixed handling of undefined values in logger metadata
  - Added proper error handling for Prisma event system
  - Fixed BullMQ job status handling to use synchronous properties instead of Promise-returning methods
  - Added proper null fallbacks for potentially undefined values
  - Fixed type constraints for job data interfaces
  - Added proper type casting with eslint-disable comments where necessary
- Fixed meeting and task utilities to use proper date handling
- Fixed worker deployment in CI/CD pipeline
- Fixed job ID uniqueness issues by implementing UUID generation for all queue jobs
  - Resolved unique constraint violations when the same job ID was used across different queues
  - Replaced console.log calls with proper logger usage in worker.ts
- Fixed job tracking reliability issues
  - Reordered operations to create database records before adding jobs to the queue
  - Improved error handling and logging for job tracking operations
  - Added automated cleanup for orphaned job records
- Improved error handling in email sending process
- Reduced potential for rate limiting by queueing emails

### Changed

- Updated job tracking system to be more robust:
  - Improved error handling in job tracker
  - Added better type safety for job data and results
  - Enhanced logging with proper null fallbacks
  - Improved job status detection logic
  - Changed job creation sequence to ensure database records exist before processing begins
  - Added daily maintenance job to clean up orphaned records
- Updated GitHub workflow to include worker deployment
- Updated Docker Compose configuration to include Redis
- Updated package.json with new dependencies for job processing
- Updated tsconfig with worker-specific configuration
- Refactored date utilities to be more consistent
- Improved API routes for job management
- Enhanced admin interface with better job visualization
- Refactored all direct email sending to use the queue system
- Updated waitlist email functions to use the new email service

### Security

- Added Stripe webhook signature verification
- Secure handling of payment processing
- Protected routes with authentication checks

## [0.1.0] - 2024-04-01

### Added

- Initial release
