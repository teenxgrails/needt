# Dia Browser — extracted design system

Source: <https://styles.refero.design/style/b458ca1a-70f0-4f85-b745-f879a4d08457>
Retrieved 2026-08-23. Refero extracts these tokens from the live site, so they
are measured values, not someone's impression.

**Scope: `needt.app` marketing site only.** This is a competitor's system
recorded for study. Nothing here overrides `design-refs/ui-conventions.md`, and
several values below are *forbidden* in the application — see the last section.

---

## The one-line summary

Blackroom gallery meets editorial broadsheet. 96% achromatic. Hierarchy is built
by size and spacing, never by weight — the display face runs at **300**, not 700.

## Colours

| Token | Value | Role |
|---|---|---|
| Void Black | `#020204` | hero stage, dark sections |
| Pure Black | `#000000` | primary text, button text, 1px borders |
| Soft Graphite | `#575757` | dark button fill on light ground |
| Carbon | `#636363` | secondary text, muted nav, helper labels |
| Slate | `#888888` | tertiary text, inactive nav |
| Silver | `#c6c6c6` | placeholders, faint dividers |
| Linen | `#efefef` | button fills, pill backgrounds |
| Bone | `#f8f8f8` | **page canvas** |
| Paper White | `#ffffff` | cards, screenshot windows |
| Lime Wash | `#f2fcb3` | editorial highlight band |
| Saffron | `#ffdc5c` | secondary warm band |

Brand gradient, used **once per page maximum**, as a 2–4px divider or hero
accent — never as a fill:

```css
linear-gradient(270deg, #FD02F5, #FA3D1D 15.94%, #FFB005 42.76%,
                #E1E1FE 72.48%, #0358F7 100.02%, #340B05 150.75%)
```

Note what is absent: **there is no CTA colour.** The primary button is white on
black or black on white. Refero's own summary says it outright — "primary
action: no distinct CTA colour."

## Type

Dia's faces are licensed and not ours to use. The substitutes are Refero's, and
all four are free:

| Dia face | Substitute | Where |
|---|---|---|
| Exposure Variable | **Playfair Display** 400, tight tracking | 112px display |
| Exposure VAR | **Inter Tight** | 24px / 48px section headings |
| ABC Oracle | **Inter** | body, labels, 54px secondary display |
| ABC Favorit Mono | **JetBrains Mono** | eyebrows, step numbers `01 02 03` |

Scale — minor third (1.2) from an 18px base:

| Role | Size | Line height | Tracking |
|---|---|---|---|
| caption | 10px | 1.5 | — |
| eyebrow | 13px | 1.23 | `+1.3px`, uppercase |
| body-sm | 16px | **2.19** | — |
| body | 18px | 1.5 | `-0.36px` |
| body-lg | 20px | 1.5 | — |
| subheading | 22px | 1.36 | — |
| heading-sm | 24px | 1.25 | `-0.72px` |
| heading | 48px | 1.17 | `-2.4px` |
| heading-lg | 54px | 1.11 | `-2.16px` |
| display | 112px | **0.85** | `-3.36px` |

Two numbers carry the whole personality:

- **0.85 line-height at 112px.** Letters compress vertically and read as carved.
  Refero warns explicitly not to copy this with a system font — Exposure is
  drawn for tight vertical fit and Playfair is not. Start at 0.95 and tighten by
  eye.
- **2.19 line-height on 16px body.** More than double. This is where the
  "editorial calm" actually comes from, and it costs nothing to adopt.

## Spacing and shape

```
page max-width  1200px
section gap     80px
card padding    20px
element gap     16px
```

Radii are a closed set — `12` cards · `16` nav · `20` pills and primary buttons ·
`24` panels · `9999` secondary pill controls. Refero flags improvised values as
the fastest way to break coherence.

Shadows, only three, and only two of them on interface:

```css
--shadow-sm: rgba(0,0,0,.06) 0 2px 8px, rgba(0,0,0,.04) 0 0 2px;  /* nav */
--shadow-xl: rgba(0,0,0,.6) 0 8px 30px -8px;                      /* hero CTA */
/* screenshot window only — 3 layers */
drop-shadow(rgba(0,0,0,.1) 0 2px 4px)
drop-shadow(rgba(0,0,0,.12) 0 18px 24px)
drop-shadow(rgba(0,0,0,.18) 0 40px 64px)
```

Everything else uses a **1px solid border** (28 occurrences on the live site).

## Motion

One rule: `0.2s ease` applied simultaneously to `background-color`,
`border-color`, `color`, `fill`, `stroke`. **State changes are colour changes,
never position changes.** No spring, no bounce, no hover scale or translate. The
spectrum marquee is the only continuous motion on the page.

Refero calls the personality "quiet intelligence — things change colour, not
position."

## Layout

Full-bleed dark hero → 1200px centred content. Feature sections are 2-column and
**asymmetric**: numbered steps at ~40% on the left, product screenshot card at
~55% on the right, a thin vertical rule marking the active step. Feature grids
are 2-up, never 3 or 4 — each card is close to half the viewport. Section bands
alternate `#f8f8f8` canvas with lime or saffron wash, 80px apart.

## What we take, and what stays out of the app

**Take for `needt.app`:**

- the 2.19 body line-height and 80px section gaps — free, and they do most of
  the work
- eyebrow treatment: 13px mono, uppercase, `+0.1em` tracking, above the heading
- hierarchy through size and spacing rather than weight
- one filled button per screen, and no dedicated CTA colour
- borders as the depth cue; shadows only on things that genuinely float

**Do not carry into `use.needt.app`:**

| Dia | Needt app rule |
|---|---|
| backdrop blur 12–24px on nav | `CLAUDE.md`: no backdrop blur |
| 5 named surfaces | `ui-conventions.md`: one continuous canvas per theme; depth from `--ambient-background` |
| 12 / 16 / 20 / 24px radii | 4px card radius |
| text-only navigation | icon + label — the 2026-08-23 research is one-directional |
| 112px display type | a planner is read daily; monumental type is for a page read once |

Dia is a page you see once and remember. Needt is a surface someone opens forty
times a day. Borrowing its restraint is right; borrowing its theatre is not.

---

## Refero itself

`refero.design` extracts this from any site and hands back `DESIGN.md`,
Tailwind v4 `@theme`, CSS custom properties, and a component-prompt guide. This
page was free to read.

Sibling pages worth opening when the landing gets built — all in the same
editorial register: **Speakeasy**, **Midday**, **Planhat**, **Chronicle**,
**Browserbase**. Refero also groups Dia with Linear, Stripe, Vercel and
Nothing.tech as sharing the same DNA.

They also sell an MCP (`refero.design/mcp`) that lets a coding agent search real
product screens before building. Compare against motionsites.ai before paying
for either — this single free page was already more useful than that entire
catalogue.
