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
| App/calendar canvas    | `--surface-canvas`        | `#1B1D1E`     |
| Panel/popover          | `--surface-panel`         | `#202425`     |
| Raised surface         | `--surface-raised`        | `#26292B`     |
| Hover/selected row     | `--surface-hover`         | `#2B2F31`     |
| Control/button surface | `--surface-control`       | `#313538`     |
| Control hover          | `--surface-control-hover` | `#383D40`     |
| Inset input            | `--surface-input`         | `#151718`     |
| Grid/subtle divider    | `--border-subtle`         | `#2B2F31`     |
| Control border         | `--border-control`        | `#3A3F42`     |
| Primary text           | `--text-primary`          | `#F2F2F2`     |
| Secondary text/icons   | `--text-secondary`        | `#9BA1A6`     |
| Muted text             | `--text-muted`            | `#737A80`     |
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
- Inputs and pickers use the inset input surface and a neutral focus border.
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
`--surface-canvas`, so legacy aliases and all shared components update together.

## Migration rule

Older aliases (`--app-bg`, `--raised`, `--active`, `--line-strong`,
`--text-hi`, `--accent`, and related variables) remain supported while older
screens are migrated. Do not introduce new usages of those aliases.
