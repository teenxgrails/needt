# Comparison sheet — the shell

Taken from the live application, not the prototype: the committed CI
baselines `today-light-desktop-linux.png` and
`workspace-light-desktop-linux.png`, both 1440×1000, light ground, 6 October 2026.

No changes are proposed here and none have been made. This is the list the
owner decides from.

---

## 1. The sidebar takes 36% of the window and never changes

It ends at x≈525 of 1440. The two screenshots are of two different screens
and the sidebar is **pixel-identical on both** — it is not contextual, so it
costs a third of every screen whatever you are doing.

What it holds, top to bottom: **eight blocks**, not seven.

| #   | Block           | On Today  | On Workspace |
| --- | --------------- | --------- | ------------ |
| 1   | Wordmark        | identical | identical    |
| 2   | Search          | identical | identical    |
| 3   | Month           | identical | identical    |
| 4   | Unplaced        | identical | identical    |
| 5   | Needs attention | identical | identical    |
| 6   | Pinned          | identical | identical    |
| 7   | Focus           | identical | identical    |
| 8   | Account         | identical | identical    |

Below Pinned there are roughly 300px of empty sidebar on both screens.

Meanwhile the content column is ~870px and the content inside it stops at
x≈1265, leaving ~155px of dead space on the right of Today. So the screen is
a third chrome, a sixth empty, and half content.

## 2. One task, three times, on one screen

On Today, **Plan the launch** appears in Unplaced, in Needs attention, and in
Any time. All four tasks appear at least twice — once under Needs attention
and once in their slot.

On Workspace each task appears once. The duplication belongs to Today, not to
the task object.

## 3. Five counters over rows that are already visible

| Where             | Reads                                | Rows actually shown |
| ----------------- | ------------------------------------ | ------------------- |
| Today header      | `Today 4`                            | 4                   |
| Sidebar           | `UNPLACED 1`                         | 1                   |
| Sidebar           | `NEEDS ATTENTION 4`                  | 4                   |
| Workspace filters | `All 4 · Today 4 · Later 0 · Done 0` | 4                   |
| Workspace group   | `NO PROJECT 4`                       | 4                   |

PORT.md's own list of rejected ideas includes "a count above rows that are
already visible — a tally of what you can see is noise." Five of them ship.

## 4. Three text defects, all of them glued words

- `Find anything⌘K` — no space between the label and the shortcut.
- `Plan the launchlate`, `Morning deep worklate`, `Review calendar synclate`,
  `Evening shutdownlate` — the "late" badge is glued to the title, four times
  on both screens.
- The four **Needs attention** rows are **centre-aligned**, while every other
  list on either screen is left-aligned.

## 5. The same object drawn two ways

On Today a task is a bordered box ~560px wide with a grey glyph tile. On
Workspace the same four tasks are rows in a table.

PORT.md §4 does say one task component with three layouts, so two
presentations are legal. What is worth deciding is the border: rule 6 says
the canvas is the ground and objects are raised, and a raised body **plus** a
1px box is the same statement made twice.

## 6. Clipped at the right edge

On Today a single letter — `T` — is cut off at x≈1395. The Tomorrow wall is
reaching into the viewport and being clipped rather than parked at its lip.

## 7. Empty states say nothing and offer nothing

`Nothing pinned yet.` under Pinned, with no way to pin anything from there.
The lower half of both screens is empty at 1440 and nothing uses it.

---

## What this does not cover

- Documents, which is the third screen in the agreed order.
- Dark ground. Both shots are light, as asked.
- The phone and tablet, where the sidebar is hidden entirely and the
  arithmetic in §1 does not apply.
