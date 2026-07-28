# Needt UI conventions

The finished Calendar is the canonical style for popups, pickers, toggles, and
modals in this app. Reuse these patterns and the shared controls. The complete
token and theme contract is in `design-refs/app-design-system.md`.

## Color tokens (never hardcode hex)

Use semantic/component CSS variables from `globals.css`, which flip for
light/dark:

| Token               | Use                                      |
| ------------------- | ---------------------------------------- |
| `--surface-canvas`  | shared page / sidebar / surface base     |
| `--surface-panel`   | popovers, menus, and dialogs (same base) |
| `--surface-raised`  | cards and secondary surfaces (same base) |
| `--surface-control` | neutral buttons and control chrome       |
| `--surface-input`   | inset inputs and picker triggers         |
| `--surface-hover`   | hover / selected row highlight           |
| `--border-subtle`   | grid lines and dividers                  |
| `--border-control`  | control and popup borders                |
| `--text-primary`    | primary text                             |
| `--text-secondary`  | secondary text and icons                 |
| `--text-muted`      | low-emphasis and placeholder text        |
| `--color-accent`    | configurable accent                      |

**No glows.** Don't add `box-shadow` glows or bright accent focus borders
rings to pickers/toggles. Focus is handled with `focus:outline-none` + a subtle
border only.

The app uses one continuous canvas color per theme. Page, sidebar, panel,
popover, and dialog surface tokens resolve to that same base. Depth comes from
the shared `--ambient-background`: a subtle vertical top light that settles
into the base at 40% of the surface, plus hairline borders — never from separate
surface colors or glow.

## Popup / options panel (e.g. Calendar options — screen 3/4)

Radix **Popover** (`@/components/ui/popover`), not DropdownMenu, when the panel
has rich content (selects, toggles, links):

- `PopoverContent` → `className="w-72 bg-[var(--popover-bg)] p-4 text-[var(--text-primary)]"`
- Bold section heading: `text-[15px] font-semibold`, `mb-3`.
- Each option is a row: `flex items-center justify-between gap-3`, label in
  `text-[13px] text-[var(--text-secondary)]`, control on the right.
- Divider between groups: `<div className="my-3 h-px bg-[var(--border-subtle)]" />`.
- Footer links are centered rows with a trailing settings gear:
  `flex items-center justify-center gap-2 rounded-md py-1.5 text-[13px]
text-[var(--text-secondary)] hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]`.

Reference implementation: the Calendar options panel in
`src/components/calendar/Calendar.tsx`.

`NeedtPicker` is the canonical settings/task picker:

- desktop width `300–340px`, opaque surface, hairline border, inset top
  highlight, neutral shadow;
- sticky search/header, `36–40px` option rows;
- selected option uses full monochrome inversion;
- category icons may retain semantic color;
- mobile uses a bottom sheet, safe-area padding, and at least `44px` targets;
- no backdrop blur or colored glow.

Sonner notifications are top-center and must go through the typed
`src/lib/notifications.ts` facade. Actionable nudges include one concise deep
link action.

The AI companion is a movable 88px desktop / 64px phone affordance. Position
updates use a transform in `requestAnimationFrame`, persist normalized viewport
coordinates, and stay clear of the desktop sidebar, mobile dock, safe areas,
and controls marked with `data-assistant-avoid`. Arrow keys move it by 8px;
Shift+Arrow uses 24px. It remains below dialogs, sheets, and notifications.

## Picker / dropdown

Use `@/components/ui/needt-picker` for plain, searchable, and creatable product
choices. Do not introduce another picker, ad-hoc `<select>`, or direct
DropdownMenu implementation. Date fields use `@/components/ui/date-picker`.
On desktop, picker menus use an `8px` panel radius, `1px` hairline border,
`36–40px` option rows, `14px/18px` labels, and `7px` row radii. The date picker
is a `443×317px` two-column panel
(`261px` calendar + `180px` shortcuts) with a fixed six-week grid.

Every floating menu, date picker, popover, dialog, and bottom sheet must apply
the shared `needt-overlay-shadow`/`--menu-shadow`. This is a neutral two-layer
drop shadow for visual separation, not a colored glow. Mobile variants become
bottom sheets with at least `44px` touch targets.

Calendar task/event cards share one compact recipe: `4px` radius, a calm
neutral surface, `12px/16px` type, a solid `4px` calendar-color rail, and no
card shadow or hover lift. External calendar events use a dashed hairline;
tasks use a solid hairline. Hover adds only a 15% color wash and selection uses
an inset neutral outline.

Desktop calendar period navigation supports horizontal trackpad gestures,
`Shift + wheel`, `Alt + Left/Right`, and `Space + left drag` on empty grid
space. Right-button drag is intentionally unsupported. Day/Week ranges
containing today position the current-time line at 30% of the vertical
viewport; other ranges open at the Work Schedule start. Manual vertical scroll
is retained until the visible date range changes.

On desktop, Today is a fixed-height split view: the document and day timeline
are sibling scroll containers with `min-height: 0`, contained overscroll, and a
non-scrolling route root. The timeline header stays fixed. On tablet and phone
the document returns to normal page scrolling and the timeline lives in a
bottom sheet whose 24-hour grid is the only scrolling child.

Focus uses one flat canvas across idle, active, paused, break, exit-delay, and
completion states. Task, mode, streak, timer, scrubber/progress, activity,
score, and weekly metrics stay in one geometry separated by hairline dividers.
Do not wrap those sections in cards, metric tiles, rounded panels, or decorative
glows. Activity visualization may use color; selection and primary actions use
the standard monochrome inversion. When analytics are empty, render one compact
status line instead of empty tiles.

## Toggle (Switch)

Shared `@/components/ui/switch`. Flat white thumb (`shadow-sm`, **no glow**),
`--switch-on-bg` when checked, no focus ring. Use for boolean options.

## Modal / dialog (screen 5)

Shared `@/components/ui/dialog`:

- Overlay is `bg-black/55` with **no backdrop blur**.
- Content animates in with **fade + subtle slide-up** (`slide-in-from-bottom-2`),
  never a zoom.
- Header pattern: title (`text-base`/`text-lg`), optional description in
  `--text-secondary`, optional bottom-bordered header (`border-b border-[var(--border-subtle)]`).
- Footer actions: `Cancel` = `variant="outline"`, primary = default (accent).

## Status toast

For "working…" status (e.g. Refresh all tasks), use a sonner `toast.loading`
with `className: "recalc-toast"` — an inverse-of-theme pill (white on dark,
dark on light). See `.recalc-toast` in `globals.css`.
