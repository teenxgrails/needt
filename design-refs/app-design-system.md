# Needt app design system

The finished Calendar UI is the visual source of truth for every Needt screen.
This document records its palette, control geometry, and theme contract so new
tabs do not recreate styles locally.

## Source of truth

- Tokens live in `src/app/globals.css`.
- Shared controls live in `src/components/ui/*`.
- Feature screens consume semantic or component tokens. They must not hardcode
  Calendar palette hex values.
- `data-app-theme="needt"` on the root element selects the app theme. The
  existing `data-theme` attribute remains reserved for light/dark mode.

## Live component laboratory

`/style` renders the actual shared controls and composition patterns rather
than screenshots or one-off imitations. Every preview group has a stable
reference such as `Button / variants`, `Form / text-date`, or
`Overlay / popover-dialog-sheet`; use that reference in design requests and
visual-regression discussions.

The Theme editor previews semantic tokens on `/style`, including Radix portals.
Applying a valid token object saves it to the authenticated user&apos;s
customization settings and the runtime uses it across product screens. It can
also copy a CSS selector for a future `data-app-theme` preset. New themes must
continue to reuse the same shared components.

The built-in Light, Graphite, and Dark previews use the same resolved theme
classes as the product. A custom draft starts from one of those modes and then
overrides semantic tokens only; malformed saved drafts are ignored.

## Design direction (2026-08-16 update)

The app-wide "no glow / no backdrop blur" rule is retired — see
`ui-conventions.md` for the current wording. Screens keep their existing look
until they're actually redesigned against a Figma reference; don't
retrofit glow onto untouched screens speculatively.

## Token architecture

Tokens have three layers:

1. **Primitive** — raw palette values such as `--primitive-neutral-900`.
2. **Semantic** — purpose-based values such as `--surface-canvas`,
   `--border-control`, and `--text-secondary`.
3. **Component** — control contracts such as `--button-secondary-bg`,
   `--menu-bg`, `--dialog-border`, and `--calendar-grid-line`.

Feature code should normally use component tokens for controls and semantic
tokens for layout. Primitive tokens are only for defining a theme.

## Calendar reference palette (dark)

| Purpose                | Token                     | Current value |
| ---------------------- | ------------------------- | ------------- |
| App/calendar canvas    | `--surface-canvas`        | `#0E0E10`     |
| Panel/card surface     | `--surface-panel`         | canvas        |
| Popover/dialog surface | `--dialog-bg`             | canvas        |
| Raised surface         | `--surface-raised`        | canvas        |
| Hover/selected row     | `--surface-hover`         | `#202024`     |
| Control/button surface | `--surface-control`       | `#1B1B1E`     |
| Control hover          | `--surface-control-hover` | `#232327`     |
| Inset input            | `--surface-input`         | canvas        |
| Grid/subtle divider    | `--border-subtle`         | `#242428`     |
| Control border         | `--border-control`        | `#303036`     |
| Primary text           | `--text-primary`          | `#ECECEE`     |
| Secondary text/icons   | `--text-secondary`        | `#9AA0A6`     |
| Muted text             | `--text-muted`            | `#6E6E75`     |
| Configurable accent    | `--color-accent`          | `#6366F1`     |

Status, priority, deadline, event, and calendar-account colors remain
meaningful colors. Do not flatten them to the accent or to gray.

## Shared control contract

- Default control height: `--control-height` (`36px`).
- Compact control height: `--control-height-sm` (`32px`).
- Radius: `--control-radius`; the user customization setting updates it.
- Toolbar controls: `25px` high, `13px` text, neutral control surface.
- Calendar options picker: `30px` high; options panel: `322px` wide.
- Menus/popovers/dialogs use their `--menu-*`, `--popover-*`, and
  `--dialog-*` tokens, with no glow or backdrop blur.
- Pages use `--page-background`; cards and panels use the reusable
  `--panel-background`, `--raised-surface-background`, or
  `--overlay-surface-background` top-lit depth tokens. Modal and sheet
  overlays use the shared vertical `--scrim` token.
- Inputs and pickers use the inset input surface and a neutral focus border.
- Desktop selection menus use `8px` outer radii, `1px` borders, `32px` rows,
  `14px/18px` labels, and `6px` item radii. The canonical date picker is
  `443×317px` with `261px` calendar and `180px` shortcut columns.
- Floating controls use the shared two-layer `--menu-shadow` for separation
  from the canvas. This neutral depth shadow is required under opened pickers;
  colored/accent glows remain forbidden.
- Calendar tasks and events use the `Calendar / task-event` recipe in `/style`:
  neutral fill, `4px` radius/color rail, solid task border, dashed external
  event border, 15% hover wash, and no lift or shadow.
- Switches use `--switch-*`; buttons use `--button-*`.
- Spatial animations stay at or below 250ms and must respect
  `prefers-reduced-motion`.

Always reuse `@/components/ui/button`, `input`, `textarea`, `select`,
`dropdown-menu`, `popover`, `dialog`, `switch`, `checkbox`, and `tooltip`.
Feature-level classes may change dimensions for a specific layout, but should
not replace their color or interaction contract.

## Adding a future theme

Create one root selector and override semantic tokens only:

```css
:root[data-app-theme="example"] {
  --surface-canvas: ...;
  --surface-panel: ...;
  --surface-control: ...;
  --border-subtle: ...;
  --border-control: ...;
  --text-primary: ...;
  --text-secondary: ...;
  --color-accent: ...;
}
```

Then a theme picker only needs to set:

```ts
document.documentElement.dataset.appTheme = "example";
```

No component or page should need theme-specific conditionals. User-selected
accent and background customization write to `--color-accent` and
`--surface-canvas`, so all shared components update together.

## Migration rule

Legacy aliases have been removed. Product code and global integration CSS must
use semantic or component tokens directly; `check:ui-contracts` rejects the
retired names.
