# Design decisions — 2026-08-23

Four questions that had been blocking every app screen, answered by the owner.
Recorded here because two of them **deliberately override**
`design-refs/ui-conventions.md`, and an agent reading the conventions alone
would undo them.

---

## 1. Surfaces — AMENDED later the same day. Document floats, everything else is one canvas.

> **Amendment, 2026-08-23, after reviewing the Craft app screens.** The owner
> chose Craft's treatment: the document sits as a **card on a slightly darker
> ground**, with generous margin around it. This reverses part of the original
> answer below, and it is scoped deliberately.
>
> **Where the card applies:** document surfaces only — Pages, and the document
> column of Today. A page of writing behaves like a sheet of paper.
>
> **Where it does not:** the calendar canvas, the day timeline, the sidebar,
> the Week grid. There is nothing paper-like about a time grid, and Craft does
> not do it there either.
>
> **Code consequence, which contradicts what is written below.** A card only
> reads as a card because the ground behind it is a different value. So
> `--surface-raised` must stop resolving to `tokens.canvas` in
> `src/lib/design-tokens.ts:92-112`. Exactly one of the three collapsed
> surfaces has to be un-collapsed — `panel` and `input` can stay collapsed.
> This is a smaller change than the full D3 rework, and it is now required.
>
> `ui-conventions.md` still says "one continuous canvas colour per theme…
> never from separate surface colours". That sentence now has a documented
> exception; it should be edited rather than silently violated.

### Original answer, superseded on the document surface only

Page, sidebar, panel, popover and dialog all resolve to the **same base
colour**. Depth comes from `--ambient-background` (a vertical top light
settling into the base at 40%) plus hairline borders. Never from separate
surface colours, never from glow.

**Consequence:** the collapse in `src/lib/design-tokens.ts:92-112`, where
`--surface-panel`, `--surface-raised` and `--surface-input` all resolve to
`tokens.canvas`, is **correct and stays**. It was previously written up as a
D3 defect; it is not one.

The warm-charcoal palette in `design-refs/prototypes/README.md` lists
`bg #17150F` and `panel #211E17` as separate values. Under this decision the
second is **not** used as a surface fill. Prototypes 2, 6, 9, 12 and 13 predate
this and show the two-surface version; treat them as superseded on this point
only.

## 2. The rail on a calendar block means MOVABILITY. Convention overridden.

- **Grey rail** — fixed. You cannot move it.
- **Project-colour rail** — the scheduler placed it and can move it again.

`ui-conventions.md` codes the rail by *source* instead: external calendar
events get a dashed hairline, tasks a solid one, and the rail carries the
calendar colour. **That source coding is dropped, not stacked.** Two meanings
on one rail are unreadable, and movability is the primary message of the
screen — it is the thing no competitor communicates.

Explanation lives in a legend line under the canvas, not in a border on every
block. Applied in `14-today-target.html`; the deviation is commented in the
CSS so it does not get "fixed" back.

## 3. Typography — REVERSED 2026-08-31. Display serif is allowed in the app.

> **Reversal, 2026-08-31, owner decision.** The rule below is withdrawn. A
> display serif — `Instrument Serif` — is permitted in the application at
> **28px and up only**: the day number on Today, empty states, the sign-in
> screen. Tracking `-0.02em`.
>
> The original argument still holds for everything smaller, and that part
> stands: small headings that repeat all day stay sans. The reversal is scoped
> to display sizes, where a heading is seen once per screen, not forty times.
>
> Two constraints that travel with it. `Instrument Serif` is **Latin-only** —
> 374 glyphs, no Cyrillic — so it must never carry a translatable string.
> And the app sans is the system stack with Inter first: Apple's licence
> forbids shipping SF as a webfont, but `system-ui` resolves to real SF on
> macOS at zero bytes.
>
> Authority for typography now lives in `/DESIGN.md`. Where that file and this
> one disagree, `DESIGN.md` wins.

### Original decision, withdrawn on 2026-08-31

Serif stays on the marketing site (`needt.app`), where copy is read once and
character costs nothing. In the app, headings are small and repeat all day;
serif there reads as fatigue rather than character.

**Consequence:** the centred serif "Thursday" currently on production Today is
out. Replaced by 19px/24px semibold sans, left-aligned, with the date at
12.5px muted beneath it.

## 4. Icons in the application sidebar — icon + label.

Not asked as a question because the evidence is one-directional, but recorded
so it is not relitigated. NN/G: only a handful of icons are near-universally
recognised, and for navigation a visible label is critical — never hover-only.
Measured: "MENU" beat a hamburger by 20% of clicks across 434k mobile visits;
icon-plus-label beat icon-only by 10.37% conversion in a Shopify A/B test.
Apple HIG and Material both require labels.

Practice: 20–24px, one icon set with no mixing of outline and filled weights,
**filled variant for the active item**, icon-only permitted solely in a
collapsed sidebar with tooltips. `react-icons` is already a dependency.

**This is the opposite of the marketing site**, which is text-only like Dia and
Poke. That is deliberate: a landing page has four links and is read once; a
sidebar is used daily and carries recall cost. Do not let the marketing
aesthetic leak into product chrome — that leak is what produced the
"too Claude, no icons" reaction to the first pass of prototype 14.

---

## What is still open

- **Which sans.** Not decided. The system stack is in place and adequate; a
  chosen face is a separate decision with a bundle cost.
- **The header question.** Whether the date and current time move to a vertical
  canvas margin, freeing the top edge entirely — proposed, not decided.
