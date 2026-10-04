# How design work flows after the port

Decided 2026-09-11, after the first port revealed that the prototype and the
code had already diverged.

## The division

**Claude Design is for what does not exist yet** — a new screen, a large rework,
an idea that needs to be seen before it is argued about.

**A screen that has shipped is edited in code.** Re-exporting a whole screen to
move four pixels costs more than moving them, and the export carries back
everything else that has since been fixed.

## Why, concretely

The prototype is not a clean source. Porting it surfaced defects that exist only
there:

- seventeen motion rules that never fired, because the styles and the components
  used different class families;
- ten theme rules written as descendant selectors that could not match;
- money grouped with a thin space, so an amount broke across two lines;
- dead state in the composer: a chip declared switchable whose setter is never
  called, a clear button that reads a field the parser never fills.

All of these are fixed in `src/`. Re-importing the prototype over a ported screen
puts them back.

## The loop that works

1. Design in Claude Design.
2. Download the bundle over `Content height and label fixes/`.
3. **Commit the download.** Tracked, a design change is a diff; untracked, every
   export is an opaque blob and the only way to see what moved is to look.
4. Port the diff, not the screen.

Exception: the trial `.woff2` stays out of git. `.gitignore` already excludes
every `.woff2` under the bundle.

## Tokens travel the other way

Screens move down, from the design into the code. **Tokens move up.** After a
token lands in `src/`, push it back to the design-system project
`Needt Design System Main` (`25d3c8e5-a812-464d-881f-e887b9adef4b`) with
DesignSync, so the next sketch in Claude Design is built on what actually
shipped rather than on what was true in September.

Tokens are a few small files, which is what makes that direction cheap. Screens
are not, which is what makes the other direction one-way.

## Fixing the prototype

When the port finds a defect in the design itself, fix it in Claude Design too,
the same day. Two of the ones listed above are still open there. A defect that
lives in only one of the two copies is how the two copies stop being one design.

## While a port is in flight

The screen being ported is frozen in Claude Design. Any other screen is free.
When real data proves the prototype wrong, the code wins and the prototype is
corrected to match.
