# AGENTS.md — Needt

Project instructions for coding agents. Codex reads this automatically.

**Authoritative references:** [`docs/STACK.md`](docs/STACK.md) — stack, quality
gates, UI contracts, deploy order. [`CLAUDE.md`](CLAUDE.md) — conventions and
layout. [`design-refs/ui-conventions.md`](design-refs/ui-conventions.md) — the
fixed UI house format. If this file ever disagrees with those, they win.

**New chat with any bot (not just Codex/Claude Code)?** Paste
[`BOOTSTRAP.md`](BOOTSTRAP.md) as your first message. It is the minimal
prompt that forces any agent — including tools that do not auto-read this
file — through the required reading order and the end-of-session handoff
save, so a new chat never has to rediscover project state from scratch.

---

## Output rules (read first — applies to every response)

Output tokens cost several times more than input, so response shape is the
single biggest lever on usage.

1. **Edit with diffs.** Show only changed hunks; never re-print a whole file to
   communicate a small change.
2. **No preamble, no epilogue.** Skip "I'll now…" and closing summaries — the
   diff is the summary.
3. **Answer research questions in ≤10 lines.** Prefer `path:line` over pasted
   excerpts.
4. **Do not restate** the plan, the task, or file contents back to the user.
5. **Ask before large output.** If a faithful answer needs more than ~200 lines,
   say what it will contain and wait.
6. **One change at a time.** No unrelated refactors bundled into a task.
7. **Read narrowly.** Search to locate, then read only the relevant range.
8. **Stop when the gates pass.** Extra polish after green gates costs tokens
   without a signal.

---

## What Needt is

A multi-user intelligent planner: calendar, tasks with deterministic
auto-scheduling, Focus sessions, Pages/Today documents, boards, mail, and an AI
layer. Built from a FluidCalendar fork (MIT); one unified Next.js app plus a
BullMQ worker built from the same image and SHA.

Product surface is **multi-user with billing**. Scheduling runs, focus data,
reminders, dependencies, push subscriptions, bookings — everything is keyed by
`userId`, and FREE/PRO/LIFETIME limits are enforced server-side in
`src/lib/entitlements.ts`. Hidden UI is never the security boundary.

**Workspaces are being introduced as the tenancy boundary** (Motion-compatible
model: personal workspace for everyone, shared workspaces with Owner/Editor/
Viewer roles and invites). While that migration is in progress:

- New user-owned entities must carry a workspace scope, not only `userId`.
- Every authenticated route resolves membership **server-side** through the
  shared workspace authorization helper. A workspace ID in a request, a room
  ID, or a share link is never by itself proof of access.
- Personal workspaces stay available on FREE; joining or owning a shared
  workspace requires PRO/LIFETIME for every member.
- Shared calendars expose busy/free only — never titles or details of another
  member's personal events.

---

## Non-negotiable rules

1. **`next build` does not check types or lint.** It is deliberately configured
   that way to survive the production build. Every change must independently
   pass `npm run type-check` and `npm run lint` (zero warnings), plus the
   relevant tests. Never treat a green build as verification.
2. **npm only.** `package-lock.json` is authoritative; install with
   `npm install --legacy-peer-deps`. Node 22 (`.nvmrc`). Never introduce pnpm or
   yarn.
3. **Migrations are additive.** Expand/contract only — add columns and tables,
   never rewrite or delete existing migrations. Contract in a later release.
4. **Never delete user data.**
5. **License hygiene.** New dependencies must be MIT/Apache/BSD compatible. If a
   dependency is GPL/AGPL/MPL, pick an alternative and note why.
6. **Secrets are runtime env, never build args**, and never committed.

---

## Working method

- **Start every session with `npm run agent:context`.** It reports the current
  branch/dirty state, recent commits, local worktrees, and active handoffs.
  Read the matching handoff before planning or editing.
- **Plan before touching more than ~3 files.** Use plan mode. Skipping planning
  on hard tasks is the main cause of sessions where corrections compound instead
  of converging.
- **Ground claims in the code.** When stating what the project currently does,
  cite `path:line`. Plans written from assumption have shipped real errors here.
- **Scope tightly.** Do not add tables, endpoints, or features that the task did
  not ask for, even if they seem useful later.
- **Commit per completed unit of work**, with the gates green, and update
  `CHANGELOG.md` under `[unreleased]` for user-facing changes.
- **Leave `//todo` comments in place**; add new ones for deferred work.

### Autonomous Terra delivery

When a user asks an agent to carry a Terra scope through implementation, the
agent must:

- Inspect the current worktree, active handoff, governing plans, TODOs and
  existing code before editing. Preserve unfamiliar dirty files.
- Maintain a concise, dependency-ordered implementation checklist. Prioritize
  broken core flows, security and integration gaps ahead of visual polish.
- Make and record reasonable assumptions when they do not alter product
  architecture. Stop only for a decision, credential, approval or external
  state that cannot be safely inferred or verified locally.
- Reuse the existing architecture, shared components and dependencies. Do not
  add placeholders, mock behavior, commented-out implementations or unrelated
  refactors while completing a scoped feature.
- Use targeted checks while actively implementing; run the complete Definition
  of Done gates only at the final validation boundary or when the user requests
  them.
- Respect an explicitly local-only user request: do not browse, deploy,
  publish, open PRs, push commits or contact external services. In that mode,
  leave verified local changes and a current handoff for the release owner.
- Before claiming a scope complete, compare every requested plan item with
  current code and direct verification evidence. Treat missing or indirect
  evidence as unfinished.

### Shared work and session handoff

This repository is used by multiple people and AI agents. Follow
[`docs/AI-COLLABORATION.md`](docs/AI-COLLABORATION.md) for every change that
continues beyond a short read-only investigation.

- **One writer per worktree.** Concurrent writers must use separate Git
  worktrees and separate branches. A shared checkout is safe for readers, not
  for simultaneous edits, staging, or commits.
- **One handoff per workstream.** Create it from
  `.agents/handoffs/_TEMPLATE.md`; never reuse or overwrite another active
  workstream's file. Keep `branch`, `status`, `updated`, verification, dirty
  state, and the exact next action current.
- **Checkpoint at durable boundaries:** after a completed unit/commit, before a
  risky operation, when blocked, and before ending or transferring a session.
  Do not log every conversational step.
- **Inspect before writing.** Run `git status --short` immediately before edits
  and commits. Treat unfamiliar changes as another user's work; do not modify,
  stage, stash, revert, clean, or delete them. Stage explicit paths only.
- **Make ownership visible.** List files currently being edited in the handoff.
  If another active handoff overlaps, coordinate or choose a disjoint task
  before changing those files.
- **Preserve useful history.** Mark completed handoffs `complete`; do not delete
  them in the same change. Handoffs contain decisions and progress, while Mulch
  stores reusable project knowledge when its CLI is available.
- **Never record secrets, credentials, tokens, personal data, or raw production
  logs** in handoffs or Mulch.
- Use `.agents/skills/handoff-project-work/SKILL.md` when starting, resuming,
  pausing, or transferring a workstream.

### Automatic tool routing

- **Context7:** before planning or editing anything whose correctness depends
  on a third-party framework, library, API, or CLI, query its current docs for
  the version installed here. Use repository search for Needt's own code.
- **Playwright MCP:** for user-visible UI, CSS, layout, responsive, or
  interaction changes, inspect the relevant route before and after the edit.
  Use device-pixel screenshots for dense UI and relevant mobile widths. This
  never replaces `npm run test:visual` or `npm run test:style`.
- **ralphex:** use only for a human-reviewed multi-step plan whose tasks have
  validation commands. Recommend the invocation in
  `docs/AI-TOOLING-SETUP.md` for a suitable task wave; never start an unattended
  run on an unreviewed plan, and handle small fixes directly in Codex.
- Apply the decision workflow in `.agents/skills/route-ai-tools/SKILL.md`.

### Design, copy, and critique skills

- **Hallmark:** load the project-scoped skill from
  `.codex/skills/hallmark/SKILL.md` for a new or redesigned user-facing surface,
  or when auditing a screen for generic AI-looking design. The repository copy
  is authoritative for every agent; do not depend on a personal installation.
  It informs the visual direction but never overrides
  `design-refs/ui-conventions.md`, accessibility, or the existing Needt
  component system.
- **humanize:** use for new user-facing product copy and when revising copy
  that is generic, robotic, or over-polished. Preserve product facts, locale,
  and the user's intended voice; never claim it bypasses AI detectors.
- **ai-check:** use before publishing or shipping substantial user-facing copy
  when an AI-tell audit is useful. Treat findings as editorial suggestions, not
  a detector verdict.
- **needt-critique:** load the project-scoped skill from
  `.codex/skills/needt-critique/SKILL.md` to review a plan, diff, API, or UI
  proposal before a risky or multi-step change. It is read-only: no sandbox
  bypasses, external agents, raw diagnostics, or hidden automated changes.

---

## Conventions that are easy to get wrong

- **Prisma:** import the singleton `prisma` from `@/lib/prisma`. Never
  `new PrismaClient()`. Types come from `@prisma/client`.
- **Dates:** always through `@/lib/date-utils` — including `new Date()`. Do not
  reach for `date-fns` directly.
- **Calendar DB access:** through `@/lib/calendar-db.ts`.
- **Logging:** the `logger` from `@/lib/logger`, never `console.log`. Each file
  defines a `LOG_SOURCE` passed as the last argument.
- **Notifications:** the typed facade in `src/lib/notifications.ts`. Only that
  facade and the shared Toaster may import Sonner.
- **API routes (Next 15):** `params` is a Promise — `const { id } = await params`.
- **Admin:** `requireAdmin` from `@/lib/auth/api-auth` on the server; `useAdmin`
  or `<AdminOnly>` in the UI.
- **UI:** one picker only — `src/components/ui/needt-picker.tsx`. Token-based
  colors, no glow, no backdrop blur. Add shadcn components with
  `npx shadcn@latest add`; icons from `react-icons`.
- **JSX text:** escape quotes and apostrophes as `&quot;` / `&apos;`.
- **Branding:** product copy and internal event names say Needt only. The
  `@fullcalendar/*` package IDs and legal attribution are the only exceptions;
  `npm run check:branding` enforces this.

---

## Architecture pointers

- `src/services/scheduling/` — deterministic auto-scheduling engine. **AI may
  trigger it; AI must not replace it.**
- `src/worker/` — BullMQ worker (provider sync, rescheduling, reminders, nudges,
  webhook renewal). `src/app/api/cron/` handlers remain periodic safety nets.
- `src/lib/task-sync/` — one-way sync from external task providers with
  selective field sync.
- `src/store/` — small Zustand stores; server state via TanStack Query.
- `src/app/(app)/` — authenticated app shell (structural route group, not a
  product edition).

Calendars are **local-first**: external providers sync into our DB and the UI
always reads local data.

---

## Non-goals

- No edition flags, parallel component variants, or repository-sync gates — one
  unified build.
- No new UI primitives when a shared one exists.
- No site/app blocking (deferred to desktop clients).
- No seat-based billing. Team membership is gated by each member holding their
  own PRO/LIFETIME plan, not by charging per seat.
- No cross-workspace data access, aggregation, or "global" views that expose
  content from a workspace the caller is not a member of.
- No rewriting the scheduling engine to be AI-driven.

---

## Definition of done

`npm run type-check` · `npm run lint` (zero warnings) · `npm run test:unit` ·
`npm run test:e2e` · visual/style suites when UI changed, diffs reviewed by hand
before updating baselines · `npm run build` · `npm run build:worker` ·
production Docker build · docs updated · one scoped commit · green CI.

Full deploy sequence and release gate: [`docs/STACK.md`](docs/STACK.md).
