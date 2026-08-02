# AGENTS.md — Needt

Project instructions for coding agents. Codex reads this automatically.

**Authoritative references:** [`docs/STACK.md`](docs/STACK.md) — stack, quality
gates, UI contracts, deploy order. [`CLAUDE.md`](CLAUDE.md) — conventions and
layout. [`design-refs/ui-conventions.md`](design-refs/ui-conventions.md) — the
fixed UI house format. If this file ever disagrees with those, they win.

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
- No team/org expansion beyond the existing entitlements.
- No rewriting the scheduling engine to be AI-driven.

---

## Definition of done

`npm run type-check` · `npm run lint` (zero warnings) · `npm run test:unit` ·
`npm run test:e2e` · visual/style suites when UI changed, diffs reviewed by hand
before updating baselines · `npm run build` · `npm run build:worker` ·
production Docker build · docs updated · one scoped commit · green CI.

Full deploy sequence and release gate: [`docs/STACK.md`](docs/STACK.md).
