# AGENTS_DESIGN.md — Mina: Liquid Glass redesign + fix outstanding + finish incomplete

> Append to the existing Mina build (AGENTS.md, AGENTS_ADDON.md already done).
> Execute EVERYTHING below autonomously, in order, WITHOUT stopping between parts.
> Commit after each Part (`feat(design-N): ...` / `fix(...)`). Log every non-obvious choice in
> DECISIONS.md. On ambiguity: pick the best default, note it, keep going. At the very end run the
> mandatory self-QA in Part 6 and fix anything that fails BEFORE declaring done.

---

## Part 0 — Reference & rules

**Visual target:** a dark, premium, "Liquid Glass" aesthetic in the spirit of Apple's iOS 26 design
language, anchored to the reference screenshot the human placed at `design-refs/opal-reference.png`.
Study that image: near-black deep-navy canvas, a soft colored ambient glow behind a hero element,
frosted translucent panels, rounded corners, thin luminous borders, calm spacing, SF-style typography.

Rules:
- This is a **productivity app**, not a screen-time app — take the *look and feel* (glass, glow,
  calm, iconography), never Opal's features/branding/text. Do not copy Opal's logo, gem images, or
  any trademarked asset. Generate/derive our own hero glow instead (CSS gradients, see Part 4).
- Do NOT try to import a Figma file — you cannot. Replicate the Liquid Glass tokens in code using the
  exact values specified in Part 3. The Figma kits are for the human's eyes only.
- Keep everything performant: glass = CSS `backdrop-filter`, not images. Cap heavy blur layers so
  scrolling stays smooth. Respect `prefers-reduced-motion` and `prefers-reduced-transparency`
  (provide a solid-surface fallback when transparency is reduced).
- Dark is the default and the design's home. Light mode must still work but is secondary.

---

## Part 1 — Fix outstanding bugs FIRST (before any styling)

1. **Rename app to Mina.** Set `APP_NAME = "Mina"` (in `src/lib/app-config.ts`). Every visible
   "teenx planner" string → "Mina". Keep upstream attribution/license intact.

2. **Setup fails with "Failed to complete setup".** Diagnose `/api/setup` (`src/app/api/setup/route.ts`)
   and the setup page. Surface the REAL error instead of a generic message (log server-side, return a
   useful message client-side). Most likely causes to check and fix: DB not reachable / migrations not
   applied / a required field or unique constraint / password hashing. Make setup succeed end-to-end on
   a fresh database, and make the error banner show the actual reason on failure. Add a `prisma migrate deploy`
   reminder to `docs/deploy.md` and a clear "database not reachable" message if that's the cause.

3. **Dark theme not global.** On `/auth/*` and `/setup` the page background renders light while only
   the card is dark. Fix the theme so the dark class reaches `<html>`/`<body>` globally via the
   next-themes provider in the root layout — no page should show a light gutter around a dark card.
   Default new users to dark.

4. **PWA runtime TypeError.** In `src/components/pwa/PWARegister.tsx` (~line 29) guard the whole
   `navigator.serviceWorker` access, not just `.controller`:
   ```ts
   if (!offline && typeof navigator !== "undefined" && navigator.serviceWorker) {
     navigator.serviceWorker.controller?.postMessage({ type: "MINA_SYNC_NOW" });
   }
   ```
   Audit the entire file (and any other client file) for unguarded `navigator.serviceWorker.*` or
   other browser-only globals accessed without a `typeof`/existence check, and fix all of them so the
   app never throws on non-secure origins (e.g. LAN IP) or SSR.

**Acceptance Part 1:** fresh DB → `/setup` creates the account and redirects in; no light gutter on
auth/setup; app loads on `http://localhost:PORT` and on a LAN IP with no runtime TypeError; app name reads "Mina".

---

## Part 2 — Finish incomplete work from earlier phases

1. **Task chunks (`ScheduledBlock`).** Earlier the adapter could only persist the first chunk of a
   split task (DECISIONS.md, Phase 3). Add a `ScheduledBlock` model (`{ id, taskId, userId, start,
   end, chunkIndex, isFrozen }`, migration) so a task can own multiple scheduled blocks. Update the
   scheduling adapter to persist ALL chunks, and update the calendar rendering to show every chunk
   (labeled e.g. "Task (1/3)"). Keep backward compatibility with the single scheduled slot fields.

2. **Neon serverless adapter deps.** Add the packages documented-but-not-installed in Phase 12:
   `@prisma/adapter-neon` and `@neondatabase/serverless`. Wire the Prisma client to use the Neon
   driver adapter when `DATABASE_URL` is a Neon pooled URL, falling back to the standard client for
   local Postgres. Verify `pnpm build` and tests still pass.

3. **Connector docs sanity.** Ensure `docs/connector-api.md` reflects the final `/api/connect/*`
   surface and the personal token flow (this is what the human will later plug Telegram/n8n into).

**Acceptance Part 2:** a task with a 90-min estimate and 30-min max chunk shows 3 blocks on the
calendar; Neon adapter present and build green; connector docs accurate.

---

## Part 3 — Liquid Glass design system (tokens + primitives)

Create a single source of truth for the aesthetic. Add CSS custom properties (in the global stylesheet
/ Tailwind theme) and a small set of reusable primitives. Use THESE concrete values (tuned to the
reference), then adapt as needed:

**Palette (dark, default):**
```
--bg-0:   #07070d;   /* deepest canvas */
--bg-1:   #0c0d16;   /* base surface */
--bg-2:   #12131f;   /* raised surface */
--text-hi:#f4f5fb;   /* primary text */
--text-lo:#9aa0b4;   /* secondary text */
/* opal accent spectrum (from the reference glow) */
--acc-blue:   #4a7bff;
--acc-violet: #8b5cf6;
--acc-magenta:#e64bd0;
--acc-teal:   #2dd4bf;
--acc-gold:   #f5c451;
```

**Glass surface (the core primitive) — `.glass`:**
```
background: rgba(255,255,255,0.055);
backdrop-filter: blur(28px) saturate(160%);
-webkit-backdrop-filter: blur(28px) saturate(160%);
border: 1px solid rgba(255,255,255,0.10);
border-radius: 24px;
box-shadow:
  0 1px 0 0 rgba(255,255,255,0.14) inset,      /* top specular edge */
  0 8px 40px -12px rgba(0,0,0,0.55),            /* depth */
  0 0 0 0.5px rgba(255,255,255,0.04);
```
Add a `.glass--strong` (blur 40px, bg .08) for nav/modals and `.glass--subtle` (blur 16px) for list rows.
Provide a `::before` specular-highlight layer (soft top-left white radial at ~6% opacity) to sell the
"liquid" refraction. When `prefers-reduced-transparency: reduce` → swap to solid `--bg-2` with the
same border/radius (no blur).

**Glow — `.glow-<color>`:** ambient colored bloom used sparingly behind hero elements and active
controls:
```
box-shadow: 0 0 60px -10px color-mix(in srgb, var(--acc-violet) 60%, transparent);
```
Provide blue/violet/magenta/teal variants. Also a full-bleed page-level ambient: a fixed, blurred
radial-gradient blob (blue→violet→magenta) low-opacity behind content, echoing the reference halo.

**Typography:** system font stack leading with SF Pro / -apple-system (`-apple-system, "SF Pro Text",
"SF Pro Display", system-ui, ...`). Tight, confident headings; generous line-height on body. Numeric
stats (timers, percentages) use a large, light weight like the reference's "77%" / "2h 58m".

**Radius/spacing scale:** radii 12/16/20/24/28; an 8px spacing grid; roomy padding on cards.

**Motion:** springy but quick (150–220ms), ease-out; subtle scale/opacity on press; shimmer sweep on
primary CTA. All gated by `prefers-reduced-motion`.

**Iconography:** Apple-style line icons. Use `lucide-react` (already installed) as the base — it has the
clean, rounded, SF-adjacent look — with consistent stroke width (1.75). Do NOT ship Apple's proprietary
SF Symbols font. If a specific glyph is missing, draw a minimal inline SVG in the same style. Document
the icon choices in DECISIONS.md.

Deliver these as documented, reusable primitives (`GlassCard`, `GlassPanel`, `GlowRing`, `StatBlock`,
`AmbientBackdrop`, `PrimaryButton`) so every screen composes from the same kit.

**Acceptance Part 3:** a `/style` (or Storybook-free demo route, dev-only) shows the primitives; glass
+ glow render correctly in dark, degrade gracefully with reduced-transparency, and don't tank scroll perf.

---

## Part 4 — Apply the aesthetic across the app

Restyle every primary surface using the Part 3 kit. Keep all existing functionality — this is a skin +
layout polish pass, not a logic change.

- **Ambient backdrop:** mount `AmbientBackdrop` app-wide — the deep-navy canvas with the low-opacity
  blue→violet→magenta halo, like the reference. Content floats above it on glass.
- **Auth / setup:** full-screen ambient background (no light gutter), a single centered `.glass--strong`
  card, glowing primary button. This is the first impression — make it clean and premium.
- **Top nav / command bar:** `.glass--strong` bar, Mina wordmark, Cmd+K search, theme toggle. Floating,
  slightly translucent, thin luminous bottom border.
- **Calendar:** wrap FullCalendar in a glass panel; restyle the grid (subtle lines, glass event chips
  with faint colored glow by priority/energy; frozen blocks get a locked visual). Today/now indicator
  as a thin glowing line.
- **Tasks:** glass list rows (`.glass--subtle`), priority/energy as small colored glow dots, smooth
  hover/press. Task dialog on `.glass--strong`.
- **Focus timer:** the showcase screen. Big central progress ring with a colored glow that intensifies
  with focus; large light-weight numerals (echo the reference "77%"); glass "now / next" panel;
  Pomodoro/Flow/Deep-Focus segmented control in glass. Streak/Focus-Score/Focus-Hours as glowing
  `StatBlock`s. Milestone gem = a CSS/gradient bloom, not a copied Opal image.
- **Smart planning sidebar / dashboard:** brain-dump, energy timeline, overcommitment, calibration
  report — all on glass, with the energy timeline using the accent spectrum.
- **Settings:** glass sections; AI, connectors, Apple/iCloud, energy profile all consistently styled.

Ensure responsive: works as an installed PWA on iPhone width and on desktop.

**Acceptance Part 4:** every route uses the glass kit and ambient backdrop; no leftover flat gray
FluidCalendar default screens; light mode still legible; nothing overlaps/clips on mobile width.

---

## Part 5 — Hero polish & identity

- **App icon / favicon / PWA icons + splash:** generate an original Mina mark — an abstract glowing
  glass shard/orb using CSS/SVG gradients in the accent spectrum (NOT Opal's gem). Wire it into the
  manifest and `<head>`.
- **Empty states & loading:** glass skeletons with a soft shimmer; friendly, minimal copy.
- **Micro-interactions:** press feedback, streak-increment celebration (tasteful, no confetti spam),
  focus-session-complete bloom.

**Acceptance Part 5:** installable PWA shows the Mina icon + themed splash; empty/loading states are
styled, not blank.

---

## Part 6 — MANDATORY self-QA (do this before declaring done)

Run this checklist yourself, fix every failure, then re-run. Record the results in a new `QA_REPORT.md`.

**Build/type/test**
- [ ] `pnpm prisma validate` clean; new migrations apply on a fresh DB.
- [ ] `tsc --noEmit` clean.
- [ ] Full Jest suite green (report pass/skip counts).
- [ ] `pnpm build` succeeds.

**Runtime smoke (boot the app and actually exercise these)**
- [ ] Fresh DB → `/setup` creates account, redirects in, no error banner.
- [ ] No light gutter on `/auth/*` or `/setup`; dark is global.
- [ ] Loads on `localhost` AND on a LAN IP with zero console runtime errors (PWA guard holds).
- [ ] Create a task with energy/priority/deadline/estimate → it saves and appears.
- [ ] Auto-schedule places tasks; a chunked task shows multiple blocks on the calendar.
- [ ] Start a focus session (Pomodoro) → timer runs; completing it updates Focus Score, Streak,
      Focus Hours, and logs a TimeEntry to the linked task.
- [ ] Calibration report renders after seeding a few completed tasks.
- [ ] Connector: a curl to `/api/connect/tasks` with the token creates a task.
- [ ] App installs as a PWA (manifest valid, icon + splash present); core loop works offline; queued
      changes sync on reconnect.

**Design**
- [ ] Every primary route uses the glass kit + ambient backdrop; no flat default screens remain.
- [ ] Glass degrades to solid under `prefers-reduced-transparency`; motion respects
      `prefers-reduced-motion`.
- [ ] Mobile width (≈390px) has no clipping/overlap; desktop looks intentional.
- [ ] App name is "Mina" everywhere; original Mina icon in place (no Opal assets used).

**Housekeeping**
- [ ] DECISIONS.md updated with all new choices (icon set, glass tokens, any compromises).
- [ ] QA_REPORT.md lists every checklist item with pass/fail and notes.
- [ ] Leave the human's untracked files (AGENTS*.md, .agents/, lockfiles) alone; commit only project code.

**If any box fails, fix it and re-run the whole Part 6 before finishing.** Then tag `v0.2.0`.

---

## Notes for the human (Maksym)
- Save the Opal screenshot as `design-refs/opal-reference.png` in the repo before running, so the agent
  can see the target.
- The Figma Liquid Glass kits are for YOUR eyes (sanity-check the vibe) — the code reproduces the look
  from the CSS tokens in Part 3, so you don't need to import anything.
- Optional next step (not in this file): an MCP wrapper over `/api/connect/*` so you can drive Mina
  from Claude/your teenx bot. Say the word and I'll write it as its own phase.
