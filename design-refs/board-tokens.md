# Board design tokens (Codia base)

Extracted 2026-08-26 from the Figma file `SCnzoCdZw8qJ0Gq6Hg9tsr`, frame `App`
(node `2:7`), 1441×1024 dark board screen. This is the new visual base for the
app shell, board, and cards — it supersedes the "no cards / flat canvas" wording
in `ui-conventions.md` (owner decision 2026-08-26).

## Source caveats — read before building

1. **The file is a Codia screenshot-to-Figma conversion.** It contains frames and
   text only: no components, no variables, no auto-layout intent, no states.
   `get_variable_defs` on node `2:7` returns `{}`. Every value below was read out
   of the flattened geometry, not out of a token system.
2. **Hairlines come out as `0.692px`.** That is an anti-aliasing artifact of the
   capture. Everywhere the source says `0.692px`, build **`1px`**.
3. **Card content is clipped at the right edge of each column.** Column pitch
   measures 284px in the capture, but inner rows are authored at 250.6px content
   width, which with 14px padding needs a ≥279px card. The assignee pills are
   visibly cut in the source. Use the content width, not the measured card box.
4. **Only one screen, one state.** No hover, focus, active, disabled, drag,
   empty, loading, or light mode exists in the source. Those are listed as gaps
   at the bottom and must be designed, not derived.

---

## 1. Primitive palette

### Neutral surfaces

| Value     | Where it appears in the source                                  |
| --------- | --------------------------------------------------------------- |
| `#0d0e10` | app canvas behind the board, column gutters                       |
| `#101113` | sidebar background                                                |
| `#191a1c` | task card, tab-bar container, Filter/Sort buttons                 |
| `#1a1b1d` | sidebar search field                                              |
| `#202123` | active nav item, active tab pill, count chip, breadcrumb current, assignee pill, due-date chip |

Five surfaces, ~1.3% lightness apart. They read as one continuous dark ground
with elevation carried by hairlines, not by contrast.

### Text

| Value     | Role                                                              |
| --------- | ----------------------------------------------------------------- |
| `#e6e7e9` | primary — headings, card titles, active nav, button labels         |
| `#c8c9cb` | sidebar section label ("File", "Apps")                             |
| `#8a8b8f` | secondary — the value half of `Client: Stellar`                    |
| `#7a7c80` | muted — meta counts, breadcrumb parent, inactive nav, placeholder  |
| `rgba(255,255,255,0.85)` | avatar initials                                      |

### Borders

| Value                    | Where                                       |
| ------------------------ | ------------------------------------------- |
| `rgba(255,255,255,0.07)` | card, search, tab container, button outlines |
| `rgba(255,255,255,0.06)` | sidebar section divider (top border only)    |
| `#1b1b1d`                | sidebar right edge (opaque, not alpha)      |

Width `1px` (source `0.692px`, see caveat 2).

Verified 2026-08-26: every surface, text, accent and tag value above was found
in the rendered frame. The three tag inset-ring colors and the two avatar
gradient endpoints are the only listed values with no matching pixel — expected,
since the rings are authored at `0px` spread and gradient endpoints interpolate.

### Status accents

| Value     | Column        | Also used for            |
| --------- | ------------- | ------------------------ |
| `#3b82f6` | To Do         | —                        |
| `#f59e0b` | In Progress   | —                        |
| `#8b5cf6` | In Review     | —                        |
| `#22c55e` | Completed     | 100% progress ring       |

Dot size `8px`, fully round.

### Tag pill colors

| Tag      | Background | Foreground | Inset ring (source) |
| -------- | ---------- | ---------- | ------------------- |
| `Web`    | `#152a3a`  | `#4a9fd4`  | `#1d3547`           |
| `Saas`   | `#3a2e14`  | `#d1953f`  | `#4a3a1c`           |
| `Mobile` | `#251f3f`  | `#8a7fd4`  | `#302a52`           |

The inset ring is authored at `0px` spread in the source — it is inert. Either
drop it or promote it to a real `1px` inset border when building the component.

The pattern is consistent: background is the hue at ~12% lightness, foreground
is the same hue at ~60%. New tag colors should be generated the same way.

### Avatar

Linear gradient, 135°, `#3a3d55` → `#252735`. Fully round. Two sizes in the
source: `34px` (team switcher) and `16px` (card assignee). Initials are
`9px/13.5px Inter Semi Bold` in both — that is too small at 34px and should be
scaled when the component is built.

---

## 2. Mapping to Needt semantic tokens

`globals.css` already owns the names. This is the dark-mode assignment; nothing
in the source dictates light mode.

| Needt token         | Value from this design                |
| ------------------- | ------------------------------------- |
| `--surface-canvas`  | `#0d0e10`                             |
| `--surface-sidebar` | `#101113` *(new — sidebar is no longer the same base as the canvas)* |
| `--surface-panel`   | `#191a1c`                             |
| `--surface-raised`  | `#191a1c`                             |
| `--surface-control` | `#202123`                             |
| `--surface-input`   | `#1a1b1d`                             |
| `--surface-hover`   | *(gap — not in source)*               |
| `--border-subtle`   | `rgba(255,255,255,0.06)`              |
| `--border-control`  | `rgba(255,255,255,0.07)`              |
| `--text-primary`    | `#e6e7e9`                             |
| `--text-secondary`  | `#8a8b8f`                             |
| `--text-muted`      | `#7a7c80`                             |
| `--color-accent`    | `#3b82f6` (blue is the To Do dot; the design has no other primary-action accent) |

**Conflict to resolve before implementing:** `ui-conventions.md` states the app
uses one continuous canvas color per theme, with page, sidebar, panel, popover
and dialog all resolving to the same base. This design uses five distinct
surfaces. Adopting it means retiring the single-canvas rule and the
`--ambient-background` top-light that substituted for surface separation.

---

## 3. Typography

Inter throughout. No other family appears in the source.

| Role                    | Size | Line height | Weight    | Tracking |
| ----------------------- | ---- | ----------- | --------- | -------- |
| Page title (H1)         | 26px | 39px        | Bold      | -0.65px  |
| Card title              | 13px | 17.875px    | Semi Bold | 0        |
| Section / column title  | 13px | 19.5px      | Semi Bold | 0        |
| Nav item, tab, button   | 13px | 19.5px      | Medium    | 0        |
| Breadcrumb, search      | 13px | 19.5px      | Regular   | 0        |
| Meta, client, assignee  | 11px | 16.5px      | Regular   | 0        |
| Tag label               | 11px | 11px        | Medium    | 0        |
| Avatar initials         | 9px  | 13.5px      | Semi Bold | 0        |

Three sizes carry the whole screen: 26 / 13 / 11, with 9 reserved for avatars.
Line height is a flat 1.5× except the card title (1.375×) and the tag (1.0×).

---

## 4. Radius

| Value  | Applied to                                                    |
| ------ | ------------------------------------------------------------- |
| `14px` | task card, tab-bar container, Filter/Sort button, search field, team switcher |
| `10px` | sidebar nav item, active tab pill                              |
| `8px`  | count chip, breadcrumb current, due-date chip, icon button      |
| full   | tag pill, avatar, status dot, assignee pill                     |

The source encodes "full" as `23216000px`; use `9999px`.

Rule of thumb in this system: outer container `14`, item inside it `10`, small
chip `8`, anything containing a person or a label `full`.

---

## 5. Spacing and sizing

### Sidebar — 259px box + 1px right hairline (260px occupied)

- outer padding `12px`; content width `235px`
- right edge is a `1px` vertical hairline, `#1b1b1d` — the only place in the
  design where a border is a solid neutral rather than a white alpha
- team switcher: padding `8px`, gap `10px`, avatar `34px`, trailing icon `16px`
- search block: `padding-bottom 8px`, `padding-x 12px`; field `padding 12px/8px`, gap `8px`, icon `16px`
- nav item: `padding 12px/8px`, gap `12px`, icon `18px`, height `35.5px`, `2px` between items
- section header ("File", "Apps"): `padding-top 18px`, `padding-bottom 6px`, `padding-x 8px`, leading icon `16px`, trailing icons `14px` with `4px` gap
- section divider: `1px` top border in `rgba(255,255,255,0.06)`

### Page header

- `padding-top 24px`, `padding-x 32px`
- breadcrumb row: gap `8px`, home icon `16px`, chevrons `14px`, current item is a `#202123` chip at `8px/2px`, radius `8px`
- H1 block: `padding-top 16px`, height `55px`
- toolbar row: `padding-top 16px`, gap `12px`
- tab bar: container `padding 4px`, gap `4px`; tab `padding 12px/6px`
- Filter / Sort button: `padding 12px/8px`, gap `8px`, icon `16px`

### Board

- column pitch `284px` (see caveat 3)
- column header: `padding-bottom 12px`, `padding-x 2px`, gap `8px`; dot `8px`; count chip `6px/2px`; trailing icon buttons `4px` padding, `14px` icon, `4px` gap

### Task card

- padding `14px`, radius `14px`, background `#191a1c`, `1px` border `rgba(255,255,255,0.07)`
- client line at top, then title with `padding-top 6px`
- tag row: `padding-top 12px`, gap `6px`, row height `33px`; tag pill `8px/2px`
- assignee pill: `padding-left 8px`, `padding-right 10px`, `padding-y 2px`, gap `6px`, avatar `16px`, background `#202123`, radius full
- footer: `padding-top 14px`, then a `1px` top divider, then `padding-top 10px`, gap `12px`
- footer meta item: gap `4px`; attachment icon `14px`, progress ring `16px`, comment icon `14px`
- due chip: `padding 8px/2px`, radius `8px`, background `#202123`, icon `12px`

### Progress ring

`16px` outer. Track is the card surface; the arc is `#7a7c80` while incomplete
and `#22c55e` at 100%. Stroke reads ~1.5px in the capture — pick `1.5px` and
confirm against the rebuilt component.

---

## 6. Gaps — must be designed, not extracted

Nothing below exists anywhere in the source file.

- **Interaction states:** hover, focus-visible, active/pressed, disabled for nav
  items, tabs, buttons, chips, and cards. `--surface-hover` has no value yet.
- **Drag and drop:** card lift, drop placeholder, column highlight — the whole
  point of a kanban and entirely absent.
- **Light mode.** The design is dark-only. Every surface above needs a light
  counterpart before it can go into `globals.css`.
- **Empty, loading, error, and overflow states** for columns and cards.
- **Mobile and tablet.** One 1441px viewport only; no breakpoint information.
- **Shadows.** No drop shadow appears on any element. `needt-overlay-shadow`
  therefore has no reference here and keeps its current definition.
- **Focus rings.** No focus treatment in the source; keyboard accessibility has
  to be authored from scratch.
- **Contrast check.** `#7a7c80` on `#191a1c` is roughly 4.0:1 — below WCAG AA
  for body text at 11px. Meta text, placeholders, and inactive nav labels all
  use it. Either lift the muted value or accept the exception knowingly.

---

## 7. Related files

- `design-refs/ui-conventions.md` — current component rules; the Focus UI
  "no cards" paragraph is superseded by this file
- `design-refs/app-design-system.md` — token and theme contract in `globals.css`
- `design-refs/prototypes/` and `design-refs/screens/` — earlier captures, kept
  as-is (owner decision 2026-08-26); this design is applied over them screen by
  screen, not retrofitted in bulk
