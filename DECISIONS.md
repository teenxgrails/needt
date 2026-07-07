# Decisions

- 2026-07-07: The product name requested by the human for this fork is "Mina Calendar"; the Phase 1 visible app rebrand will still follow AGENTS.md and use configurable `APP_NAME = "teenx planner"` unless the human changes that requirement.
- 2026-07-07: Phase 0 used the bundled pnpm executable only to run `npm@10.9.3` because the desktop shell did not expose `npm`; dependencies were installed from the existing `package-lock.json`, so no package-manager migration is intended.
- 2026-07-07: Baseline auto-scheduler behavior is documented in `ARCHITECTURE.md` before changing scheduling logic.
- 2026-07-07: The existing scheduler schedules only unlocked `isAutoScheduled` tasks, preserves locked tasks as conflicts, skips completed/in-progress tasks, scores one-week slots, writes scheduled timestamps directly to Prisma, and does not split tasks or report overflow reasons.
- 2026-07-07: Added `DESIGN.md` via `getdesign@latest add framer`; later UI phases will use its dark-canvas, monochrome surface, sparse blue accent, and dense control guidance as reference while adapting it for a productivity app rather than a marketing page.
