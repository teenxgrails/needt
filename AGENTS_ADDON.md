# AGENTS_ADDON.md — Mina: Phase 9–12 (productivity engine, focus timer, PWA, deploy)

> Append this to the existing AGENTS.md build. Same rules: work autonomously through all phases,
> commit per phase (`feat(phase-N): ...`), log choices in DECISIONS.md, fall back to sensible
> defaults on ambiguity. Everything below is single-user, local-first.

---

## Phase 9 — Time tracking & self-calibrating estimates

**Goal:** kill the planning-fallacy / time-blindness problem with *data*, not guesses. Base the
design on **reference-class forecasting** (Kahneman/Tversky) + **three-point estimates**, not a
flat multiplier.

### 9.1 Track actual vs estimate
- On every task: store `estimatedMinutes` (three-point: `estOptimistic`, `estLikely`, `estPessimistic`; the engine uses `estLikely` by default).
- Add a lightweight timer on the task detail + focus view: `start / pause / stop` → writes `TimeEntry` records `{ taskId, startedAt, endedAt, source: 'timer' | 'manual' }`.
- On completion, compute `actualMinutes` (sum of entries) and store the delta vs each estimate.

### 9.2 Personal calibration database (the important part)
- Group historical tasks by `contextTag` (e.g. "beats", "resale-photos", "admin", "deep-work", "german-study").
- For each tag with ≥ 5 completed tasks, compute a **personal correction factor** = `median(actual / estLikely)`.
- Surface it: when the user estimates a new task in a known category, show a ghost hint:
  *"You usually run 1.6× over on 'beats' — suggest 80 min instead of 50."* One-tap accept.
- The **scheduling engine** must use `estLikely × personalFactor(contextTag)` for auto-placement (replaces the crude global `bufferMultiplier` from Phase 2 — keep `bufferMultiplier` only as the fallback when a category has too few data points).
- After 20–30 data points overall, show a **Calibration report**: per-category over/under %, trend over time, "your estimates are getting more accurate" line.

### 9.3 Feed the AI layer
- Expose `getCalibrationContext()` so the pluggable AI (Phase 4) can read the user's real over/under patterns and adjust its suggestions. This is the seam where a future custom model learns *this specific user's* time behavior.

**Acceptance:** timer records real durations; after seeding sample data, per-category factors compute and visibly bias new estimates + the schedule; calibration report renders.

---

## Phase 10 — Focus timer (Opal-inspired) + motivation loop

Build a full-screen, beautiful focus mode. Take Opal's *ideas*, not its code. Framer design language.

### 10.1 Timer core
- Modes: **Pomodoro** (configurable work/break, default 25/5, long break every 4), **Flow** (open-ended count-up), **Deep Focus** (fixed duration, **cannot be cancelled early** — the commitment is the point).
- A focus session is tied to a task when started from one → its time counts into that task's `TimeEntry` (links Phase 9 automatically).
- Live "now / next" panel: current block, elapsed/remaining ring, the next scheduled task. Minimal, distraction-free, dark.
- Optional ambient sound / soundscape hook (stub an audio player, ship 2–3 royalty-free loops or leave a config slot — no paid assets).

### 10.2 Motivation system (research-backed gamification)
- **Focus Score:** rolling score from completed vs abandoned sessions + estimate accuracy. Show trend on the home dashboard.
- **Streak:** consecutive days with ≥ 1 completed focus session OR all scheduled deep-work done. Warn before a streak breaks ("finish one session to keep your 12-day streak"). Store `currentStreak`, `longestStreak`.
- **Focus Hours:** lifetime cumulative deep-work hours, framed as progress toward mastery (10/100/1000/10000h milestones). Milestone unlocks = small visual reward (badge/gem), no dark patterns.
- **Weekly report:** focus hours, sessions completed, best day, estimate accuracy, streak status. This is also the SaaS hook later — keep it self-contained.

**Guardrails (do NOT copy Opal's dark side):** no app-blocking/VPN, no shame mechanics, no paywalled core, no manipulative "you'll lose everything" pressure beyond a single gentle streak reminder. Motivation, not coercion. Note this in DECISIONS.md.

**Acceptance:** all three timer modes work; a completed session updates Focus Score, Streak, Focus Hours, and logs time to the linked task; weekly report renders.

---

## Phase 11 — PWA / installable + offline

- Make Mina an installable PWA: web manifest (name "Mina", icons, dark theme color), `next-pwa` or a hand-rolled service worker.
- **Offline:** cache the app shell + today's + this week's schedule and open tasks (IndexedDB). User can view schedule, start/stop the focus timer, check off tasks, and create tasks **offline**; queue mutations and **sync on reconnect** (last-write-wins, matching the existing calendar-sync conflict model).
- Add-to-home-screen prompt, standalone display mode, splash screen.
- Push notifications (web push) for: focus session end, upcoming scheduled task, streak-at-risk reminder. Behind a user toggle, default off.

**Acceptance:** installs to iOS/Android home screen; core loop (view schedule, run timer, complete tasks) works airplane-mode; queued changes sync back.

---

## Phase 12 — Deploy pipeline (Vercel + Neon serverless)

> Target: **Vercel** (Next.js host) + **Neon** (serverless PostgreSQL). Free tier, single-user.
> Do NOT deploy to the teenx VPS. Keep everything serverless-compatible.

### 12.1 Make the app serverless-ready
- **Prisma for serverless:** use Neon's pooled connection string (`DATABASE_URL` = pooled, `-pooler` host) for the app, and the direct (non-pooled) URL as `DIRECT_URL` for `prisma migrate`. Configure `datasource db { url = env("DATABASE_URL") directUrl = env("DIRECT_URL") }`. Enable Prisma's driver adapter for Neon (`@prisma/adapter-neon` + `@neondatabase/serverless`) so connections don't exhaust on cold starts.
- Audit any long-lived processes / in-memory timers / background workers — none can rely on a persistent server. Move recurring work to Vercel Cron (below).
- Ensure calendar sync + reschedule logic run as API routes / cron handlers, not a daemon.

### 12.2 Vercel Cron (replaces the background scheduler daemon)
- Add `vercel.json` cron entries (free tier allows 2): e.g. `/api/cron/sync-calendars` (every 15 min) and `/api/cron/reschedule` (every 30 min or hourly). Protect cron routes with a `CRON_SECRET` header check.
- These re-run the deterministic scheduling engine (Phase 3) for future/unfrozen tasks and pull calendar deltas.

### 12.3 Config & secrets
- `.env.example` documenting: `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_URL` (= the Vercel prod URL / custom domain), `NEXTAUTH_SECRET`, Google/Outlook OAuth client IDs+secrets, `CRON_SECRET`, optional AI keys. Apple/CalDAV creds are per-user at runtime (never in env).
- All secrets go in **Vercel Project → Environment Variables**, never committed.

### 12.4 Domain + OAuth
- Custom domain `app.minacalendar.com` → add in Vercel, point DNS (CNAME to Vercel). Vercel issues HTTPS automatically.
- Register exact OAuth redirect URIs for the prod domain in Google Cloud Console + Azure (Outlook). Document them in `docs/deploy.md`.

### 12.5 Deploy flow
- Deploy = `git push` to `main` (Vercel auto-builds) OR `vercel --prod` from CLI. No Docker, no nginx, no certbot.
- `prisma migrate deploy` runs in the Vercel build step (add to build command) against `DIRECT_URL`.
- Health route `/api/health` returns DB connectivity + build SHA.
- `docs/deploy.md`: full walkthrough — create Neon project, copy both connection strings, set Vercel env vars, connect the GitHub repo, add domain, register OAuth URIs, verify cron fires.

**Multi-tenant note:** stay single-user, but keep the seam — every user-scoped table already has a `userId`; do NOT hardcode a single user ID into queries. When you later flip to SaaS, the same Vercel+Neon deploy scales by upgrading plans (Vercel Pro, Neon Scale) with **no architecture change**. Note this in DECISIONS.md.

**Acceptance:** pushing to `main` deploys Mina to Vercel on `app.minacalendar.com` behind HTTPS, Neon migrations applied in the build, both cron jobs fire and re-run the scheduler, `/api/health` green, teenx VPS untouched.

---

## Notes for the human (Maksym)
- Timer + calibration are wired together on purpose: every focus session silently feeds your
  personal time-estimate database. After ~2–3 weeks of real use, the scheduler starts placing
  tasks using *your* actual pace, not optimistic guesses.
- Deploy is Vercel + Neon, both free tier. teenx VPS and the DigitalOcean $200 credit stay in
  reserve — only needed if you later self-host for privacy or run heavy SaaS traffic.
- Streak/Focus-Score data model is deliberately self-contained so it becomes a clean per-user
  table if you later flip to multi-user SaaS.
