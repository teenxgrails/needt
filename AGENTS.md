# AGENTS.md — Build Spec for "teenx planner" (FluidCalendar fork)

> Drop this file in the repo root. Codex reads it automatically as project instructions.
> You are working inside a fork of **dotnetfactory/fluid-calendar** (MIT). Base stack:
> Next.js 15 (App Router), TypeScript, Prisma, FullCalendar, NextAuth.js, Tailwind CSS, PostgreSQL.

---

## 0. Mission

Turn this FluidCalendar fork into a **single-user, Motion-style intelligent planner** with:
- A deterministic (rule-based) scheduling engine as the **default**.
- A **pluggable AI layer** (bring-your-own API key OR OAuth) that can override/assist scheduling, with a clean stub so a **custom in-house AI** can be dropped in later.
- **ADHD-friendly features** and **Reclaim-style energy phases** (schedule hard tasks in peak-energy windows).
- A **Motion-like UI** (dark, clean, dense, keyboard-driven).
- **Apple Calendar** support (via existing CalDAV), alongside Google + Outlook.
- A **connector/plugin interface** so external apps can push tasks into this planner and read the schedule.

This is for personal use first. Do **not** build team/multi-tenant/billing features. Keep the door open for SaaS later, but don't implement it now.

---

## 1. Execution rules for the agent

1. **Work autonomously through all phases below. Do not stop to ask for confirmation between phases.** Only stop if you hit a hard blocker (missing secret that only the human has, or an ambiguous product decision not covered here — in that case, pick the most sensible default, write your assumption into `DECISIONS.md`, and keep going).
2. After each phase: run the app, run `npm run build`, fix type errors, commit with a clear message (`feat(phase-N): ...`), then continue.
3. Never delete the human's data or existing migrations. Add new migrations, don't rewrite history.
4. Keep everything in TypeScript, typed. No `any` unless unavoidable (comment why).
5. Preserve MIT license headers. New third-party deps must be MIT/Apache/BSD compatible — if a dep is GPL/AGPL, pick an alternative and note it in `DECISIONS.md`.
6. Write the schedule engine and AI layer as **isolated, testable services** — no scheduling logic inside React components or API route handlers.
7. Keep a running log in `DECISIONS.md` (create it): every non-obvious choice, one line each.
8. Use `pnpm` if a lockfile exists for it, else stay with whatever the repo uses.

---

## 2. Phase 0 — Orientation & baseline (do first)

- Read the full repo. Produce `ARCHITECTURE.md` describing: where the current scheduling logic lives (`TaskSchedulingService`), the Prisma schema, calendar sync services (Google/Outlook/CalDAV), auth flow (NextAuth), and the FullCalendar integration.
- Get the app running locally against a local Postgres (Docker compose already exists). Confirm `http://localhost:3000` loads.
- Create a `.env.local` template (`ENV_TEMPLATE.md`) listing every env var the app needs, marking which ones the human must supply (Google/Outlook/Apple/AI keys) vs. which have safe defaults.
- Write down in `DECISIONS.md` the exact current behavior of the auto-scheduler before you change anything.

**Acceptance:** app boots, `ARCHITECTURE.md` + `ENV_TEMPLATE.md` exist, baseline documented.

---

## 3. Phase 1 — Strip to single-user & rebrand

- Remove/short-circuit any multi-user, team, SaaS, and billing code paths (`src/saas`, feature flags gating team features). Keep a single local user. Auth can stay (NextAuth) but default to one account; do not build invites, orgs, roles, seats.
- Rebrand: app name → **"teenx planner"** (keep it configurable via one constant `APP_NAME`). Replace visible "FluidCalendar" strings in UI/emails with `APP_NAME`. Do not touch the LICENSE or upstream attribution in README.
- Ensure the CalDAV integration is exposed in Settings clearly labeled **"Apple / iCloud Calendar"** with instructions to use an app-specific password (`caldav.icloud.com`). Under the hood this is the existing CalDAV provider — just wire the Apple preset (server URL, principal discovery) and label it.

**Acceptance:** single-user app, no team UI, Apple/iCloud connect flow works end-to-end with a test iCloud account (human supplies app-specific password).

---

## 4. Phase 2 — Data model for smart scheduling

Extend the Prisma schema (new migration) to support ADHD + energy-aware scheduling. Add fields/tables as needed:

**Task** (extend existing):
- `energyRequired`: enum `LOW | MEDIUM | HIGH` (default MEDIUM) — how much focus the task needs.
- `estimatedMinutes`: int (already may exist — reuse).
- `minChunkMinutes` / `maxChunkMinutes`: for splitting big tasks into sessions.
- `deadline`: datetime (nullable).
- `priority`: enum `LOW | MEDIUM | HIGH | URGENT`.
- `contextTag`: string (e.g. "deep work", "admin", "errand") — for batching similar tasks.
- `isFrozen`: bool — user manually pinned this time block; scheduler must not move it.
- `dependsOn`: self-relation (task blocks task).
- `autoScheduled`: bool — was this placed by the engine vs. manually.

**EnergyProfile** (new): per-user daily energy curve.
- Ordered list of windows: `{ dayOfWeek, startTime, endTime, energyLevel: LOW|MEDIUM|HIGH }`.
- Seed a sensible default (e.g. HIGH 09:00–12:00, LOW 13:00–14:30, MEDIUM 15:00–18:00) that the user edits in Settings.

**SchedulingPreferences** (new or extend existing settings):
- `workHours` per weekday, `bufferMinutes` between blocks, `maxDeepWorkPerDay`, `minBreakMinutes`, `autoRescheduleOnMiss` (bool).
- ADHD options: `enableBodyDoubling` (bool, cosmetic/reminder), `enableTaskBatching` (bool), `hardStopTime` (don't schedule work past X), `bufferMultiplier` (ADHD time-blindness: inflate estimates by e.g. 1.3×).

**Acceptance:** migration applies cleanly, settings UI can read/write EnergyProfile and SchedulingPreferences.

---

## 5. Phase 3 — The scheduling engine (default, deterministic)

Create `src/services/scheduling/` as a pure, framework-agnostic module. It must **not** import React or Next request objects.

**Core function:**
```
scheduleTasks(input: {
  tasks: SchedulableTask[],
  busyBlocks: CalendarBusyBlock[],   // merged from Google/Outlook/Apple
  energyProfile: EnergyProfile,
  prefs: SchedulingPreferences,
  now: Date,
}): ScheduleResult
```

**Algorithm (deterministic, documented in code):**
1. Filter tasks that are done/frozen (frozen keep their slot).
2. Sort by a priority score: `f(priority, deadline proximity, dependencies, age)`. Urgent+near-deadline first; respect `dependsOn` (a task can't be placed before its blockers finish).
3. Apply `bufferMultiplier` to estimates (time-blindness compensation).
4. Split tasks over `estimatedMinutes` into chunks between `minChunk` and `maxChunk`.
5. Walk the calendar from `now` forward within work hours, skipping busy blocks and honoring `bufferMinutes`, `minBreakMinutes`, `hardStopTime`, `maxDeepWorkPerDay`.
6. **Energy match:** place `HIGH` energy tasks only in `HIGH` energy windows when possible; fall back gracefully. Batch same-`contextTag` tasks adjacently when `enableTaskBatching`.
7. Return placed blocks + a list of tasks that couldn't fit (with reason) so the UI can warn about overcommitment (Sunsama/Reclaim-style).

**Rescheduling:** `rescheduleFromNow()` — when a task is missed/overruns and `autoRescheduleOnMiss` is on, re-run the engine for future tasks only, never touching past or frozen blocks.

**Tests:** unit tests in `src/services/scheduling/__tests__/` covering: deadline ordering, dependency ordering, energy matching, busy-block avoidance, chunk splitting, overcommitment overflow, frozen blocks untouched.

**Acceptance:** engine is pure + tested, wired to replace/augment the existing `TaskSchedulingService`, and produces a visible auto-scheduled calendar in the UI.

---

## 6. Phase 4 — Pluggable AI layer

Design an interface so the scheduler can optionally consult an AI, without hard-coupling to any provider.

**Interface** (`src/services/ai/SchedulerAI.ts`):
```ts
interface SchedulerAI {
  name: string;
  // Given the same input as the deterministic engine, propose adjustments
  // (reorder, re-estimate, suggest energy tags, natural-language task parsing).
  suggestSchedule(input: SchedulingContext): Promise<AISuggestion>;
  // Parse a natural-language brain-dump into structured tasks.
  parseTasks(text: string): Promise<ParsedTask[]>;
}
```

**Providers to implement:**
1. `AnthropicProvider` — bring-your-own **API key** (from Settings, stored encrypted at rest) OR OAuth if the human later configures it. Use the Anthropic Messages API. Model configurable, default `claude-sonnet-4-6`. Prompt returns **strict JSON only** (no prose), parsed safely.
2. `OpenAIProvider` — same shape, BYO key, for Codex/GPT users.
3. `CustomProvider` (**stub**) — hits a configurable HTTP endpoint (`AI_CUSTOM_URL`) with the `SchedulingContext` and expects the same `AISuggestion` JSON back. This is the seam for the human's own future AI. Ship it working against a mock endpoint + document the request/response contract in `docs/custom-ai-contract.md`.

**Wiring:**
- Settings has an "AI Assistant" section: choose provider (`None` = deterministic only, default), enter key/endpoint, pick model, toggle what AI is allowed to do (parse tasks / reorder / suggest energy tags / full auto).
- The deterministic engine always runs first; the AI **augments** it (never a silent black box). Show the user a diff: "AI moved X from 3pm→10am because it's high-focus." User accepts or rejects (Morgen-style consent, not Motion-style silent reshuffle).
- Fail safe: if the AI call errors/times out, fall back to the deterministic result. Never block scheduling on the AI.

**Acceptance:** with `None` selected everything works offline; with a valid Anthropic/OpenAI key, natural-language brain-dump → parsed tasks, and AI suggestions appear as an accept/reject diff; `CustomProvider` round-trips against the mock.

---

## 7. Phase 5 — ADHD & Reclaim-style features (UX)

- **Brain-dump box:** paste messy text → AI (or a simple parser fallback) turns it into tasks with estimates/tags.
- **Energy timeline view:** visualize the EnergyProfile behind the day; auto-scheduled hard tasks sit in peak windows.
- **Overcommitment warning:** when tasks don't fit, surface a clear banner + the overflow list ("you're 2h over capacity today").
- **Time-blindness buffers:** show the inflated estimate vs. raw estimate.
- **Focus / body-doubling mode:** a full-screen "now / next" view showing the current block, a timer, and the next task. Minimal, distraction-free.
- **Quick reschedule:** drag a block; frozen blocks are visually locked; everything else reflows on demand (not silently).
- **Daily shutdown ritual (Sunsama-style):** end-of-day review — what got done, roll unfinished to tomorrow.

**Acceptance:** all views reachable, keyboard shortcuts for the common actions (new task, schedule, focus mode, complete).

---

## 8. Phase 6 — UI polish (Motion-like)

- Dark, dense, fast. Match Motion's information density and calm palette. Keep it tasteful — do not clone pixel-for-pixel, take the layout language: left rail (projects/tasks), center calendar, right detail panel.
- Keyboard-first: command palette (`Cmd+K`) for create/search/schedule/jump.
- Smooth drag-drop on FullCalendar, snappy transitions, no layout jank.
- Respect `prefers-color-scheme` but default dark.

**Acceptance:** the app feels like a focused single-user Motion; no team clutter; command palette works.

---

## 9. Phase 7 — Connector interface (let other apps talk to the planner)

Expose a small, documented local API so external tools (the human's own bots, n8n, scripts) can integrate — **without** building a public multi-tenant platform.

- **Inbound:** authenticated REST endpoints (bearer token from Settings): `POST /api/connect/tasks` (create tasks), `GET /api/connect/schedule` (read the current schedule), `POST /api/connect/reschedule`. Token is a single personal access token generated in Settings.
- **Outbound webhooks (optional):** on schedule change / task completion, POST to a configurable URL.
- Document everything in `docs/connector-api.md` with curl examples.
- Do **not** implement Telegram/n8n integrations here — just the clean API surface the human will plug those into later.

**Acceptance:** a curl call with the token creates a task that appears on the calendar and gets auto-scheduled; `docs/connector-api.md` is complete.

---

## 10. Phase 8 — Wrap up

- Full pass: `npm run build` clean, tests green, no console errors on the main flows.
- Update `README` (project-specific section, keep upstream attribution): what this fork adds, how to run, how to configure AI + connectors + Apple.
- `DECISIONS.md` and `ARCHITECTURE.md` current.
- Tag `v0.1.0`.

---

## Non-goals (do NOT build now)
- Team/collaboration, seats, roles, org management.
- Billing, Stripe, subscriptions, SaaS hosting.
- Public sign-up / multi-tenant auth.
- Mobile native app (web responsive is enough for now).
- The human's own AI model (only the `CustomProvider` seam + contract).

## Definition of done
A single-user, dark, Motion-like planner that: syncs Google/Outlook/Apple calendars, auto-schedules tasks with a tested deterministic engine that respects energy windows and ADHD buffers, optionally consults a pluggable AI (Anthropic/OpenAI/custom-stub) with accept-reject diffs, and exposes a documented local connector API — running locally via Docker + `npm run dev`.
