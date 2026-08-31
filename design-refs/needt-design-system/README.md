# Needt Design System

A design system extracted from the Needt product source — a **project-management dashboard** whose one shipped surface is the "Project UI/UX" Kanban board.

## Sources given to me

- **Attached codebase: `New ui /`** (read-only mount). A Figma Make scaffold: React 19 + Vite 8 + Tailwind CSS v4, formatted with oxfmt. Files that mattered:
  - `src/index.css` — the entire colour system: a light/white `:root` theme plus a `.dark` class override, exposed to Tailwind through `@theme inline`. Every token in this design system comes from here.
  - `src/components/{Sidebar,Header,Board,Icon,primitives}.tsx` — the component inventory.
  - `src/App.tsx` — theme state, persisted to `localStorage`, defaulting to light.
  - `plans/make-also-white-thema-streamed-metcalfe.md` — the build plan, which documents that the dark palette came from an imported Figma design and the light palette was authored afterwards and AA-checked.
  - `imports/index.tsx` + `imports/svg-a09s8tiiv4.ts` — the raw Figma Make import (~150 hardcoded dark-only functions). Reference-only in the source; not used here.
- **No Figma link, no slide deck, no brand book, no font binaries, no image assets** were provided.

## Product context

One product, one surface. A team workspace ("David Visuals") with a task board for client projects (Stellar, Taskez). The sidebar names ten more destinations — Home, Docs, Schedule, Chat, Payments, Automations, Customers, User Management, Workflows, plus File and Apps groups — and the header names four board views (Board, List, Timeline, Due Tasks). **None of those are designed in the source.** The UI kit renders them as labelled blanks rather than inventing screens.

There is no marketing site, no mobile app, no docs site, no login, no settings, no modal, and no empty state anywhere in the source.

---

## CONTENT FUNDAMENTALS

**Casing.** Title Case for navigation and tabs ("Due Tasks", "User Management", "Add new" — note that one is sentence case). Sentence case for task titles and descriptive text ("Change top CTA button text", "Redesign analytics dashboard"). ALL-CAPS only for sidebar group eyebrows ("FILE", "APPS"), never for labels or buttons.

**Length.** Extremely terse. Nav labels are one or two words. Buttons are single verbs or nouns: "Filter", "Sort", "Add new". Task titles run 2–6 words. Nothing in the product is a sentence — there is no body copy, no helper text, no tooltips, no onboarding prose.

**Person.** Neither *I* nor *you*. The interface is written in object labels, not addressed speech. The only near-exception is the "Team" eyebrow above the workspace name — a category, not an address.

**Prefixed metadata.** Where a value needs qualifying, the label is prefixed inline with a colon: `Client: Stellar`. This is the product's one copy idiom, and it appears in 11px muted grey above the card title.

**Numbers.** Bare and abbreviated. Attachments and comments are digits with a glyph and no unit (`4`, `2`). Progress carries the sign (`50%`). Due dates are single-character-plus-unit relatives (`4d`), never absolute dates.

**Emoji.** None. Zero emoji appear anywhere in the source and none should be introduced — the icon set covers every glyph need.

**Vibe.** Quiet operator tooling. Neutral, dense, unopinionated. It reads like a product that assumes you already know what you're doing: no encouragement, no exclamation, no personality in the copy. All of the character lives in the restraint of the visual layer.

**Writing new copy for Needt:** name the object, don't describe it. "Add new" not "Create a new task". "Filter" not "Filter tasks". If a string needs a verb and a noun, you are probably over-explaining.

---

## VISUAL FOUNDATIONS

**Two themes, one geometry.** Light (the default) and dark are pure colour swaps — every size, radius, weight, and space is identical between them. Dark is the original Figma design; light was derived from it. Theme lives on a `.dark` class on the root element.

**Colour.** A near-neutral grey ramp does all the structural work: four surface levels (`--bg` → `--surface` → `--surface-2` → `--surface-hover`) and three text levels (`--text` / `--text-2` / `--text-muted`). Colour appears in exactly three places, always semantic and never decorative:
1. **Status dots** — amber/blue/violet/green, one per board lane. These four hexes are *identical in both themes*; they are the only colours that don't flip.
2. **Tag pills** — three fixed bg/fg pairs bound to categories (blue = Web, amber = Saas, purple = Mobile).
3. **The avatar gradient** — a 135° indigo→violet ramp, desaturated to slate in dark mode.

There is no brand accent, no primary button colour, and no coloured heading anywhere. `--ring` (blue) exists purely for keyboard focus.

**Type.** Inter only, loaded from Google Fonts at 400/500/600/700. Sizes are declared in **px, not rem**, and the scale is unusually compressed: 11px for all metadata, 13px for essentially every interactive label, 15–16px occasionally, and a single 26px/700 page title with `-0.02em` tracking. Weight is the primary hierarchy tool: 400 body, 500 for active nav rows and metadata emphasis, 600 for card and column titles, 700 for the page title. The only tracked type is the 11px uppercase eyebrow at `0.045em`.

**Spacing.** A 2px-based scale (2, 4, 6, 8, 10, 12, 14, 16, 20, 24, 32) with genuinely odd values in use — cards pad at **14px**, tag pills at **2.5px/9px**, board columns are **288px** wide, the sidebar is **264px**. Do not snap these to a 4/8 grid; the asymmetry is the design.

**Backgrounds.** Flat colour, full stop. No imagery, no illustration, no pattern, no texture, no grain, no gradient mesh, no full-bleed photography. The single gradient in the entire product is the 34px-and-smaller avatar circle. There are no image assets of any kind in the source.

**Borders and elevation.** The system is **border-first**. One hairline (`--border`, ~8% black / 7% white) defines every edge: the sidebar rail, the header underline, the card outline, the card's internal footer divider. Shadows are almost absent — the only one is `0 1px 2px rgba(0,0,0,0.05)` on card hover. There are no inner shadows, no glows, no stacked shadow scales.

**Corner radii.** Five steps, each with a job: **6px** count chips and breadcrumb chips, **8px** buttons and tabs, **10px** sidebar nav rows, **16px** cards, search field, and team switcher, **999px** tag pills, avatars, and dots. Note the 10px — a deliberately in-between value for nav rows, not a rounding of 8 or 12.

**Cards.** 16px radius, 1px `--border`, `--surface` fill, 14px padding, 12px internal gaps, **no resting shadow**. On hover the border promotes to `--border-strong` and the 1px shadow fades in over 150ms. Cards are never coloured, never left-border-accented, never nested.

**Hover states.** Uniform and quiet: background becomes `--surface-hover`, text and glyphs promote one level toward `--text`. Never opacity fades, never colour tints, never scale.

**Press states.** There are none. No active transform, no darkening, no shrink. The design system deliberately has no press feedback — selection state is the feedback.

**Selection / active states.** Always a filled `--surface-2` block plus a bump to weight 500 — used identically for the active nav row (10px radius), the active tab (8px radius), and the breadcrumb's current segment (6px radius). Never an underline, never a left accent bar, never a coloured pill.

**Animation.** Two transitions only. **0.25s ease** on `background-color`, `border-color`, and `color` — this is the theme crossfade, applied via the `.theme-surface` utility. **0.15s ease** on `box-shadow` and `border-color` for card hover. No entrance animations, no stagger, no bounce, no spring, no easing curves beyond plain `ease`. Motion is functional and nearly invisible.

**Transparency and blur.** Borders are the only translucent values in the system (`rgba(0,0,0,0.08)`, `rgba(255,255,255,0.07)`) — chosen so hairlines read correctly against any surface level. Avatar text sits at 90% white. **There is no `backdrop-filter` anywhere**: no frosted glass, no scrim blur, no protection gradient. Overlapping content is separated by surface level and a hairline, never by blur.

**Layout rules.** A fixed two-pane shell: a 264px non-scrolling sidebar rail (hidden below ~1000px in the source) beside a flexible main column. Inside main, the header is fixed-height and the board scrolls — vertically *and* horizontally, since columns are fixed-width and simply overflow. Page padding is 20px, widening to 32px at large sizes. Scrollbars are invisible until you hover the region (`.scroll-thin`), then appear as an 8px `--border-strong` thumb with no track.

**Imagery vibe.** Not applicable — the product ships none. If imagery is ever needed, the neutral, slightly-cool grey palette and the total absence of warmth or grain elsewhere argue for cool, desaturated, high-key photography rather than anything warm or filmic.

---

## ICONOGRAPHY

**The product has its own hand-authored icon set and no icon library dependency.** `src/components/Icon.tsx` defines 27 named glyphs as inline JSX path data. I copied that path data verbatim into `components/icons/Icon.jsx` — it is the same geometry, not a substitution.

- **Format:** inline `<svg>`, `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `strokeWidth={1.6}`, round caps and joins. Stroke-only — no filled glyphs, no duotone, no two-weight pairs.
- **No icon font, no sprite sheet, no PNG icons, no CDN icon library.** Nothing to link; the set ships as component code.
- **No SVG files on disk.** The source keeps everything as path strings, so there is nothing to copy into `assets/`.
- **Sizes in use:** 13px in card meta rows and breadcrumb chevrons, 14px on section-header affordances, 15px in buttons and the breadcrumb home glyph, 16px in the theme toggle, 18px in sidebar nav rows.
- **Colour:** always inherited. `--text-muted` at rest, promoting to `--text` when the row is active or hovered. Glyphs are never brand-coloured.
- **Emoji:** never used, in UI or copy.
- **Unicode characters as icons:** never. Chevrons, ellipses, and plus signs are all drawn glyphs (`chevron-right`, `more`, `plus`), not `›` / `…` / `+` characters.
- **Coverage:** the 27 glyphs cover the whole product. If you need one that isn't in the set, draw it on the same 24×24 grid at 1.6 stroke with round caps rather than importing Lucide or Heroicons — mixing sets is immediately visible at this stroke weight.

## Brand assets

**There is no logo in the source and none has been created.** No wordmark file, no icon mark, no favicon, no illustration, no photography — the product identifies itself only by the workspace name in the sidebar switcher. Where a mark would go, the name **Needt** is set in Inter Bold at `-0.03em` tracking (see the Wordmark card). The `assets/` directory is intentionally absent because there was nothing to copy.

**Font files:** none were provided. The source loads **Inter from Google Fonts** (`@import url(...family=Inter:wght@400;500;600;700)`), so this design system does the same — this is the real font, not a substitution.

## Intentional additions

The source defines its inventory as three exported primitives (`TagPill`, `Avatar`, `ProgressRing`), the `Icon` set, and three composite screens whose sub-parts are inline markup. I extracted the repeated inline patterns into named components rather than inventing new ones — each has a direct counterpart in the source:

| Component | Where it comes from |
|---|---|
| `Button`, `IconButton` | Filter/Sort buttons, theme toggle, "Add new", the +/⋯ affordances |
| `SearchInput` | the sidebar search field |
| `NavItem`, `SectionHeader` | sidebar nav rows and the FILE/APPS group headings |
| `Tabs`, `Breadcrumb`, `TeamSwitcher` | header tabs, header breadcrumb, sidebar team switcher |
| `Card`, `TaskCard`, `ColumnHeader` | the board's card shell, task card, and column heading |
| `StatusDot`, `CountBadge` | the column dot and the column count chip |

Nothing else was added. There is deliberately no Toast, Dialog, Tooltip, Select, Checkbox, Radio, Switch, or Table — the source defines none of them, and guessing at them would put values in front of designers that no Needt screen supports.

---

## Index

| Path | What it is |
|---|---|
| `styles.css` | global entry point — `@import` lines only |
| `tokens/colors.css` | light `:root` + `.dark` palette, semantic aliases |
| `tokens/typography.css` | Inter stack, px size scale, weights, tracking |
| `tokens/spacing.css` | 2px scale + layout constants (sidebar, column, gutters) |
| `tokens/radii.css` | the five radius steps |
| `tokens/elevation.css` | hairline definitions + the one hover shadow |
| `tokens/motion.css` | the two transitions |
| `tokens/base.css` | resets, link colours, `.theme-surface`, `.scroll-thin` |
| `guidelines/*.html` | 16 foundation specimen cards (Colors, Type, Spacing, Brand) |
| `components/icons/` | `Icon` — the 27-glyph set |
| `components/data-display/` | `TagPill`, `Avatar`, `ProgressRing`, `StatusDot`, `CountBadge` |
| `components/forms/` | `Button`, `IconButton`, `SearchInput` |
| `components/navigation/` | `NavItem`, `Tabs`, `Breadcrumb`, `TeamSwitcher`, `SectionHeader` |
| `components/surfaces/` | `Card`, `TaskCard`, `ColumnHeader` |
| `templates/task-dashboard/` | starting-point template consuming projects can copy — the dashboard shell composed from this system's components |
| `ui_kits/dashboard/` | interactive recreation of the Kanban dashboard — see its README |
| `thumbnail.html` | homepage tile |
| `SKILL.md` | Agent Skills entry point |

Each component directory holds `<Name>.jsx`, `<Name>.d.ts`, `<Name>.prompt.md`, and one `@dsCard` HTML.
