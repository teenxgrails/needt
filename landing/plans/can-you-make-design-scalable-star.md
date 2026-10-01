# Port the Needt landing page into React + polish the design

## Context
The full "Needt" marketing landing page already exists — but only as a self-contained
static file at `src/imports/index.html` (inline `<style>` + `<script>`). The actual React
app at `src/App.tsx` renders an empty `<div>`, so the Figma Make preview is blank. Nothing
the user built is reachable.

The user wants two things: (1) bring the page into the real React/Tailwind app so it renders
live, and (2) improve the visual craft — they specifically called out **positions, buttons,
shadows, and etc.** The existing design is already strong and opinionated (a token system
transcribed from "Dia"), so this is a faithful port plus targeted polish, **not** a redesign.

## Approach

Keep the existing token-driven design system intact and port it into the project's real
files. Because the styling is heavily custom and cohesive, the design system lives in
`src/index.css` (allowed by `AGENTS.md` for global CSS), while the markup becomes JSX in
`src/App.tsx` and the vanilla JS becomes React effects. Apply the polish while porting.

### 1. `src/index.css` — styles + fonts
- Keep `@import 'tailwindcss';` first, then the Google Fonts `@import` (CSS2 URL from the
  import's `<link>`: Playfair Display, Inter, Inter Tight, JetBrains Mono) **before** any
  other statement.
- Move the `:root` token block and all component CSS from the import's `<style>` into
  `index.css`, unchanged in structure so the design reads identically.
- **Do not** add the import's unlayered `* { margin:0; padding:0; box-sizing }` reset — it
  would override Tailwind's layered base. Rely on Tailwind's preflight; set `box-sizing`,
  `margin`, and `body` defaults inside an `@layer base` block instead.

### 2. `src/App.tsx` — markup as JSX (default export)
- Port `<header>`, `<main>`, sticky CTA, and `<footer>` verbatim in structure, converting
  `class`→`className`, `for`→`htmlFor`, inline `style="..."`→style objects, and self-closing
  tags. Keep all section ids (`#how`, `#agent`, `#inside`, `#pricing`, `#faq`, `#who`) so the
  nav anchors keep working.
- Preserve the schedule/steps/FAQ interactivity by moving the IIFE into a single `useEffect`
  (empty deps) that queries the rendered DOM via refs/ids and sets up the IntersectionObservers,
  the schedule animation timeline, the step scroll-spy, the sticky-CTA toggle, and the
  one-FAQ-open-at-a-time logic. Respect `prefers-reduced-motion` exactly as the original does.
  Clean up observers/timers in the effect's return.

### 3. Polish (the "make it better" pass) — applied in `src/index.css`
Targeted, low-risk refinements to the areas the user named:
- **Buttons:** add `:active` press feedback (subtle `translateY(1px)`) and a
  `:focus-visible` ring on `.btn`, `.replay`, `.navlinks a`, and `.qa summary` for
  keyboard/accessibility; soften `--sh-cta` from the harsh single `rgba(0,0,0,.6)` drop into a
  two-layer ambient+key shadow so `.btn-lg` reads lifted, not stamped; ensure ghost/solid
  hover transitions include the new states.
- **Shadows:** re-layer `--sh-nav`, card, and mock shadows into consistent ambient + key-light
  pairs (tighter close shadow + softer far shadow) so nav, `.window`, `.mk`, and `.card`
  share one elevation language.
- **Positions:** verify/tune the schedule `--now` line offset and event top/height math, the
  `.step-visual` sticky `top`, hero top padding, and nav vertical centering so nothing sits a
  pixel off; confirm the mock "bleed" clip still works after the port.
- Keep all changes within the existing token vocabulary — no new colors or fonts.

### 4. Cleanup
- Leave `src/imports/index.html` in place as the source reference (do not delete).
- `src/main.tsx` already imports `src/index.css` and mounts `App` — no change needed.

## Critical files
- `src/App.tsx` — replace empty component with the ported page + interaction effect.
- `src/index.css` — fonts, tokens, full component CSS, polish edits.
- `src/imports/index.html` — read-only source of truth for markup/CSS/JS.

## Verification
- The Vite dev server is already running on `$PORT`; open the preview and confirm the full
  page renders (hero, schedule window, steps, agent grid, inside cards, pricing table,
  FAQ, founder, footer with spectrum bloom).
- Scroll from top to bottom: reveal-on-scroll fires once per element; the schedule animation
  plays when it enters view and the "Replay"/"See it move" buttons re-run it; steps 01/02/03
  light one at a time with the panel switching; FAQ opens one at a time; on a narrow viewport
  the sticky mobile CTA appears after the hero scrolls away.
- Tab through the page to confirm the new `:focus-visible` rings show on buttons, nav links,
  and FAQ summaries.
- Toggle OS "reduce motion" and confirm the schedule jumps to its final state and reveals are
  instant.
