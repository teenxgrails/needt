---
id: 20260911-claude-needt-shell-port
owner: claude
branch: codex/design-completion
status: complete
updated: 2026-09-14T22:54:42Z
objective: Port the new design's shell — rail, tab rail, screen switch, keyboard table — into src/components/needt/shell/ and compose it on /design-preview
---

## Scope

- Governing plan/spec: `docs/handoff/PORT.md` (§0, §5, §6, §8 are binding) and
  `docs/handoff/design-reconciliation-2026-09-11.md`.
- In scope: `src/components/needt/shell/**` and
  `src/components/needt/preview/DesignPreview.tsx`.
- Out of scope: `src/lib/needt/**`, `RichBlock.tsx`, `rb-shape.ts`,
  `rb-layout.ts`, `src/styles/needt-*.css`, `scripts/*design-tokens*`,
  `src/lib/theme*.ts`, `src/app/layout.tsx`, and
  `src/components/needt/corner/**` — a concurrent agent owns the corner.

## Completed

- `shell/screens.ts`, `keys.ts`, `useNeedtKeys.ts`, `chrome.tsx`,
  `Wordmark.tsx`, `MiniMonth.tsx`, `FocusControl.tsx`, `Sidebar.tsx`,
  `TabRail.tsx`, `ScreenFrame.tsx`, `KeySheet.tsx`, `AppShell.tsx`, `index.ts`,
  `__tests__/keys.test.ts`.
- `DesignPreview.tsx` composes the shell on the fixture behind the theme picker.

## Working state

- Files dirty: the above, all new except `DesignPreview.tsx`.
- Foreign changes that must remain untouched: `src/components/needt/corner/**`
  and its tests; the design-refs churn already on this branch.

## Verification

- Passed: `npm run type-check`, `npm run lint`, `npm run tokens:check`,
  `npx jest src/components/needt` (95 tests), and a live measurement pass on
  `http://localhost:3000/design-preview`.
- Not run: `npm run test:e2e`, `npm run build`.

## Decisions and constraints

- THE TWO CLASS FAMILIES. `needt-ds-tokens.css` styles `.nav-row`, `.card`,
  `.chip`, `.nt-dot`, `.btn-icon`; `needt-motion.css` animates `.nt-nav-row`,
  `.nt-card`, `.nt-chip`, `.nt-status-dot`, `.nt-icon-button`. They are the
  same five components under two names. Every element must carry BOTH or it is
  either unstyled or dead still. Both sheets are generated and must not be
  hand-edited, so the reconciliation lives in `shell/chrome.tsx`.
- THE CAPS ARE THE BINDING. `NEEDT_KEYS` rows carry only printed caps; the
  matcher parses them into the chord. There is no second description of a
  binding anywhere, so the sheet and the handler cannot drift.
- The wordmark is the `.needt-mark` SVG variant, not `ExposureWordmark`. The
  Exposure trial font is not vendored; the motion sheet drives `.needt-mark`
  fully with no font beyond `--font-display`. **Superseded 2026-09-14:**
  `public/fonts/ExposureVAR.woff2` is installed with the owner's licence note,
  and `ExposureWordmark` exists under `src/components/needt/wordmark/`.
- Slots, not stubs: the corner, the agent cursor, the composer, the palette,
  the drag layer and the task editor are props. Nothing pretends to work.

## Blockers

- `None`.

## Next action

- None for Claude. The workstream belongs to Codex: follow
  `docs/handoff/CODEX-NEXT.md`. Still true for whoever fills the frames:
  `ScreenFrame` takes `children`; render `<article>` elements inside
  `.screen-enter` so the entry stagger lands on them.

## Ownership transfer — 2026-09-14

Claude hands the whole design-port workstream to **Codex**, at the owner's
request. Claude stops writing to this checkout from this point.

- Transferred: every uncommitted path on `codex/design-completion` at HEAD
  `608e40f` (172 porcelain lines), including `src/components/needt/**`,
  `src/lib/needt/**`, `src/styles/needt-*.css`, `scripts/*design-tokens*.mjs`,
  `src/app/design-preview/**`, `public/fonts/ExposureVAR.woff2`, the theme files,
  `prisma/schema.prisma` and the migration `20260912000000_needt_design_data_layer`.
- Gates at transfer: `type-check` 0, `lint` 0, `tokens:check` 0, unit tests
  1159 passed / 1 skipped.
- Instructions for the new owner: `docs/handoff/CODEX-NEXT.md`, in order.
- **Hazard:** `.env` and `.env.local` point `DATABASE_URL` at Neon with live
  data. The migration must go to the local container only.
- Codex opens its own handoff for the workstream from here; this file stays as
  history.
