# Decisions

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
