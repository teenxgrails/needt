# Decisions

- 2026-07-18: Mail OAuth requests the specified Gmail `gmail.readonly` and Microsoft `Mail.Read` scopes incrementally, plus `gmail.modify` and `Mail.ReadWrite`, because the required mark-read and archive actions cannot sync back to providers with read-only scopes alone.
- 2026-07-07: The product name requested by the human for this fork is "Mina Calendar"; the Phase 1 visible app rebrand will still follow AGENTS.md and use configurable `APP_NAME = "teenx planner"` unless the human changes that requirement.
- 2026-07-07: Phase 0 used the bundled pnpm executable only to run `npm@10.9.3` because the desktop shell did not expose `npm`; dependencies were installed from the existing `package-lock.json`, so no package-manager migration is intended.
- 2026-07-07: Baseline auto-scheduler behavior is documented in `ARCHITECTURE.md` before changing scheduling logic.
- 2026-07-07: The existing scheduler schedules only unlocked `isAutoScheduled` tasks, preserves locked tasks as conflicts, skips completed/in-progress tasks, scores one-week slots, writes scheduled timestamps directly to Prisma, and does not split tasks or report overflow reasons.
- 2026-07-07: Added `DESIGN.md` via `getdesign@latest add framer`; later UI phases will use its dark-canvas, monochrome surface, sparse blue accent, and dense control guidance as reference while adapting it for a productivity app rather than a marketing page.
- 2026-07-07: Phase 1 keeps the upstream GitHub attribution links and old package/storage identifiers intact, but all reachable app UI/email strings now use `APP_NAME`.
- 2026-07-07: Public signup and registration are hard-disabled for single-user mode; first-run setup remains the path for creating the local planner account.
- 2026-07-07: Apple/iCloud Calendar is implemented as a CalDAV preset (`https://caldav.icloud.com`) because the human must supply an Apple app-specific password for end-to-end testing.
- 2026-07-07: Phase 2 keeps the legacy lowercase `Task.priority` field for existing task UI/sync compatibility and adds uppercase `Task.priorityLevel` for the new deterministic scheduler.
- 2026-07-07: Phase 3 keeps the pure scheduler capable of returning split chunks, but the current Prisma `Task` shape can persist only one visible slot per task; the adapter writes the first chunk until a dedicated scheduled-block model is added.
- 2026-07-07: Phase 4 keeps AI optional and advisory; provider `None` remains the default, brain-dump parsing has a local fallback, and AI schedule suggestions return an accept/reject-ready diff instead of silently moving tasks.
- 2026-07-07: Phase 5 ships ADHD planning affordances as a dense calendar sidebar panel first: brain dump, energy timeline, overcommitment, buffers, quick reschedule, and shutdown ritual remain visible without adding another route.
- 2026-07-07: Phase 6 uses a restrained Motion-like dark shell with compact controls and sparse blue accent; the app defaults new users to dark while still allowing light/system in settings.
- 2026-07-07: Phase 7 exposes a single-user local connector API with one hashed personal bearer token; outbound webhooks are best-effort and never block scheduling or task completion.
- 2026-07-07: Phase 8 keeps deployment/tagging local only; Phase 12 deployment work from `AGENTS_ADDON.md` is intentionally skipped for the separate session.
- 2026-07-07: Phase 9 uses median actual/likely ratios per `contextTag` after five completed tasks as the personal correction factor; the global ADHD buffer remains only as fallback for sparse categories.
- 2026-07-08: Phase 10 motivation uses completion, streak, focus-hours, and estimate-fit feedback only; no blocking, shame mechanics, paywalls, or coercive streak loss patterns.
- 2026-07-08: Phase 11 uses a hand-rolled service worker instead of `next-pwa` to avoid a new dependency; offline mutations are queued client-side and replayed last-write-wins on reconnect.
- 2026-07-08: Phase 12 targets Vercel + Neon with Prisma `directUrl`, protected cron routes, and a health check; Neon adapter packages are documented but not added because this offline build cannot safely update dependencies.
- 2026-07-08: Design Part 1 renames the visible product to `Mina`; historical upstream `FluidCalendar` attribution remains in README/license docs.
- 2026-07-08: Design Part 1 setup now returns database/migration errors directly and upserts default system settings so a partially initialized database does not block first account creation.
- 2026-07-08: Design Part 2 persists all scheduler chunks in `ScheduledBlock` while keeping `Task.scheduledStart/scheduledEnd` as first-block compatibility fields.
- 2026-07-08: Design Part 2 declares Neon adapter dependencies and loads them optionally at runtime; this sandbox lacks npm/pnpm, so the lockfile must be refreshed in a normal package-manager environment.
- 2026-07-08: Design Part 3 defines Liquid Glass as CSS tokens/utilities plus React primitives; lucide-react remains the icon base with 1.75-style line treatment to avoid proprietary SF Symbols.
- 2026-07-08: Design Part 3 uses CSS gradients for Mina glow/orb treatments rather than copied Opal assets; the provided reference file is `design-refs/opal-reference.jpg` despite the spec saying `.png`.
- 2026-07-08: Design Part 4 applies Liquid Glass through shared controls, app chrome, FullCalendar CSS, focus mode, tasks, and settings so older feature screens inherit the redesign without changing scheduler or data logic.
- 2026-07-08: Design Part 5 replaces the inherited calendar logo with an original SVG glass-orb/shard mark and reuses the same CSS orb language for loading, empty states, and the focus completion bloom.
- 2026-07-08: Design Part 6 adds direct `gaxios` and `yaml` dependencies because pnpm strict module resolution does not allow app/tests to import those transitive packages reliably.
- 2026-07-08: Design Part 6 records DB-backed runtime checks as environment-blocked in `QA_REPORT.md` because Docker is unavailable and local Postgres is unreachable; build, type, schema validation, Jest, manifest, and HTTP shell smoke passed.
- 2026-07-08: AGENTS_NEXT Phase A refreshed/verified `pnpm-lock.yaml` with Neon packages, but live local setup is environment-blocked because no Docker/Postgres binary exists and `localhost:5432` refuses connections.
- 2026-07-08: AGENTS_NEXT Phase B cannot create Neon/Vercel resources from this workspace because no `neon`/`vercel` CLI config or account credentials are present; deploy docs were updated to the actual pnpm + Neon adapter flow and domain remains TODO until owned/configured.
- 2026-07-08: AGENTS_NEXT Phase C implements Mina MCP as a dependency-free stdio JSON-RPC server that wraps `/api/connect/*`; connector route aliases were added for the requested `GET /api/connect/tasks` and `POST /api/connect/schedule` contracts.
- 2026-07-08: AGENTS_NEXT Phase D only records future Capacitor, Telegram/n8n, and extra-cron work in `TODO.md`; none of those integrations are implemented in this session.
- 2026-07-08: AGENTS_NEXT Phase F does not tag `v0.3.0` because local DB, Neon/Vercel production, and live MCP task-creation checks are blocked by missing external infrastructure rather than passing green.
- 2026-07-08: Schedule-all now returns all current user tasks after scheduling and the client refetches the filtered task list, so running auto-schedule with no eligible auto-scheduled tasks no longer blanks the UI.
- 2026-07-08: UI Part 1 maps Motion's calendar layout to Mina glass by making the left rail navigation/planning-only and moving the existing mini-calendar/feed controls into a right panel; empty-slot creation still uses the existing event/task modals and stores.
- 2026-07-08: UI pass pivoted to the updated AGENTS_UI.md direction: target screens now use flat Motion-like dark tokens instead of Liquid Glass, while existing shared glass utilities remain untouched for future design work.
- 2026-07-08: UI Part 2 maps the Motion "Hard deadline" toggle to Mina's existing `isFrozen` task field so the modal stays UI-only and does not introduce new scheduling schema or behavior.
- 2026-07-08: UI Part 3 keeps existing settings components but relabels the left navigation to Motion-style sections; Smart Scheduling represents the requested Energy profile section because it already owns those controls.
- 2026-07-09: Polish Part 1 flattens the existing glass/glow utility classes instead of deleting them because other screens still import those class names; this removes ambient visuals without changing component contracts.
- 2026-07-09: Polish Part 3 uses Framer's `useReducedMotion` at each animated shell/chip/modal surface so animations can be disabled without adding app-level state or changing planner behavior.
- 2026-07-09: Master Phase 4 stores separate encrypted API keys per AI provider; Grok/GLM use the OpenAI-compatible client with configurable base URLs so endpoint changes do not require scheduler changes.
- 2026-07-09: AI chat continuation keeps planner mutations server-owned: Anthropic/OpenAI-compatible providers may select tools and stream final text, but `/api/ai/chat` validates/executes actions, gates dangerous tools with confirmation, and falls back to deterministic local handling when provider tool selection fails.
- 2026-07-10: With live authenticated AI tool execution still blocked by no reachable database/session, coverage was extended at the provider-adapter boundary using mocked fetch calls for Anthropic, OpenAI-compatible, and Custom AI chat/tool protocols.
- 2026-07-10: Flowday Phase 4 stores customization in a dedicated per-user `UserCustomization` table and applies `--accent` live on the client so future locked themes can extend visuals without touching scheduler data.
- 2026-07-11: Motion parity calendar controls use the live measured 25px control height, `#313538` surface, `#3A3F42` border, and 150ms ease-out color changes; spring/translate button motion was removed because Motion keeps toolbar interactions visually still.
- 2026-07-11: The common authenticated layout relies on the root SessionProvider only. Removing its nested SessionProvider keeps one consistent client session cache and prevents the sidebar profile control from flashing a false Sign In state on navigation.
- 2026-07-11: Motion replaces the normal product sidebar with its settings sidebar. Flowday follows that layout only on `/settings`, preserving the normal application navigation everywhere else and keeping all settings data/control wiring intact.
- 2026-07-11: Shared dialog, dropdown, popover, and command palette surfaces use Motion's measured elevated #26292B surface, #313538 border, 6-8px radii, and 150ms ease-out visibility transitions; task-editor spring animation was removed.
- 2026-07-12: AI OAuth is an OAuth 2.0 authorization-code + PKCE flow for Custom AI endpoints only, because OpenAI and Anthropic direct APIs authenticate with API keys; tokens are encrypted, state is one-use/short-lived, and expired tokens refresh before planner calls.
- 2026-07-12: The compact task editor keeps only creation essentials visible and places planner-specific controls in an in-modal Advanced settings panel; built-in task templates are intentionally local presets until users need persisted custom templates.
- 2026-07-12: Custom AI deployments can set `AI_CUSTOM_URL` once so its OAuth connection is a user-level select-and-connect action; OpenAI and Anthropic retain an explicit API-key setup flow because their direct APIs do not accept normal product-account OAuth tokens.
- 2026-07-13: Empty calendar-slot creation is task-first to match the planner’s scheduling model: Enter creates an auto-scheduled task using the selected duration, while Event remains an explicit fixed-time choice and both full editors preserve the existing stores and scheduling engine.
- 2026-07-16: The finished Calendar is the Needt visual source of truth; styling now follows primitive → semantic → component CSS tokens, with `data-app-theme` reserved for palette presets and `data-theme` kept exclusively for light/dark mode.

# Settings schedules

- 2026-07-17: The Motion-style Schedules editor writes per-day hours to the existing `SchedulingPreferences.workHours` JSON used by the deterministic engine, while mirroring its primary range into legacy calendar/auto-schedule settings for compatibility; no duplicate schedule table was added.
- 2026-07-18: Settings keeps one visible page title, uses shared Motion rows/cards for every ordinary-user tab, hides advanced appearance/retention/webhook details by default, and omits destructive or export actions that have no implemented backend.
- 2026-07-21: Focus is temporarily reduced to one canvas, a live circular timer, and one Start/Pause/Continue action. Existing server-owned sessions, task binding, pause/resume, completion logging, notifications, task completion, queue/actions, analytics, breaks, modes, and early-stop services remain intact for the later Focus rebuild rather than being deleted.
- 2026-07-21: Magic UI components are adapted to Needt rather than used verbatim: Rainbow Button keeps a black fill and thin animated border without blur/glow, while all theme entry points share one reduced-motion-safe circular View Transition and retain Light/Dark/System persistence.

# 2026-07-22

- Today follows Motion AI Agenda's document-per-day model: prose is stored in `DailyAgenda`, while task blocks remain references to canonical `Task` records so completion, scheduling, Calendar, and historical views never fork task data.
- The Today redesign owns `src/components/today/*`, `/api/daily-agenda`, and the `DailyAgenda` schema/migration; parallel Settings or other-tab work should avoid these files until this block is merged.
