# needt.app — marketing site references

For the **public marketing site** at `needt.app`, not the application at
`use.needt.app`. The app follows `design-refs/ui-conventions.md`; this file is
a separate track and does not override it.

Owner picks, 2026-08-23. Both examined live on that date.

---

## Dia — <https://www.diabrowser.com>

**What is actually being copied, in mechanics rather than mood:**

- **Text-only navigation as a floating pill.** Rounded capsule centred at the
  top, semi-transparent, three items plus a mark — `What's New`, `Security`,
  `Introducing Reports`. It floats above the content and stays put on scroll.
  The one filled CTA (`Download Dia`) sits far right, detached from the pill.
- **Numbered feature list, one item lit at a time.** `01`, `02`, `03` in small
  grey caps above serif headings. **Only the active item is at full opacity and
  carries a body paragraph; the others are greyed to roughly 40% and reduced to
  the heading alone.** A hairline vertical rule marks the active item. Scrolling
  advances which one is lit — the copy does not all shout at once.
- **Editorial serif for headings, sans for body.** Headings are a
  transitional serif at modest size, not a display face. Body is small,
  quiet, and grey.
- **Near-white ground.** `#f8f8f8`, never pure white as the canvas. Separation
  between sections comes from 80px gaps, not from rules.
- **Product screenshots as artefacts, not chrome.** Each shot is a real page
  with its own editorial layout (rotated date and time set vertically in the
  margins, a full-bleed image, a serif masthead). The screenshot is styled like
  a printed page rather than a UI capture.

**The move worth stealing:** progressive disclosure by opacity. Three
propositions are present at once, but only one is readable — the reader is never
asked to choose what to read.

**Correction, 2026-08-23, after reading the extracted token set** (see
`design-refs/dia-tokens.md`): the observations above came from scrolling the
light part of the page and missed the opening. Dia is **not** an all-light page.
It opens on a full-bleed `#020204` stage with a photograph of a screaming man,
then releases into the broadsheet. The page reads dark theatre → editorial
paper → feature galleries → dark footer. Two consequences:

1. The off-white ground is the *second* act, not the whole page.
2. Card edges are `1px` solid borders, not shadows. Shadows are reserved for
   things that genuinely float — the nav bar and the product-screenshot window.
   That is the opposite of what "no borders, separation from spacing alone"
   claimed above.

## Poke — <https://poke.com>

- **Photographic hero, product floating over it.** A wide coastal photo runs
  full bleed; an iPhone frame with a live chat sits centred on top. The photo is
  warm and slightly hazy, and the page ground fades into it — no hard edge
  between hero and page.
- **The product demo is the copy.** The hero shows an actual message thread —
  "enjoy your sunny day by the coast" / "yeah i'm melting" / "100°F! don't forget
  your sunscreen" — including a typing indicator. It sells by letting you read a
  real exchange, not by describing the feature.
- **Two-weight headline in serif.** `Poke fits into your life⁽¹⁾, not the other
  way around` — first line in near-black, second in grey, with a footnote
  marker. Same trick as Dia: emphasis by weight and colour inside one sentence.
- **Paper texture on the ground.** A faint grain over the off-white, which keeps
  a very empty page from reading as unfinished.
- **Conventional top bar.** Logo left, `Product` / `Resources` / `Pricing` /
  `Company` centre with dropdown chevrons, `Log in` plus one filled dark
  `Get Started` right. Unlike Dia, no floating pill.

**The move worth stealing:** the hero is a transcript. For Needt the equivalent
is not a feature list but a real day — a schedule that visibly reflows.

---

## refero.design — <https://styles.refero.design>

Owner's find, 2026-08-23. Extracts a real design system from a live site and
returns colour tokens, the full type scale with line-heights and tracking, radii,
shadows, layout metrics, component specs, and explicit do/don't rules — as
`DESIGN.md`, Tailwind v4 `@theme`, or plain CSS custom properties. Free to read.

The Dia page is transcribed in **`design-refs/dia-tokens.md`**, and it corrected
two things this file had wrong (the page is not all-light, and card edges are
borders rather than spacing alone).

Use it before hand-guessing any reference. Sibling pages in the same register:
Speakeasy, Midday, Planhat, Chronicle, Browserbase.

---

## motionsites.ai — <https://motionsites.ai>

Not a design reference like the two above — a **tool**. Owner's find,
2026-08-23. Library of prompts for generating animated websites. Relevant when
the marketing page moves from static layout to motion: the schedule that
visibly reflows in the hero is exactly the kind of thing worth prompting for
rather than hand-animating from zero.

Use it for the *marketing site only*. The application has its own motion rules
(`design-refs/prototypes/README.md` §5 — 90ms down, 340ms back with overshoot);
generated animation must not leak into product chrome.

---

## What the two have in common

The two references are Dia and Poke; refero and motionsites above are tools.

1. **Serif headings, sans body.** Both. This is the single loudest shared trait
   and the fastest way to stop looking like every other SaaS page.
2. **Off-white ground, never pure white.** Dia's canvas is `#f8f8f8`; Poke adds
   grain. (Dia's *hero* is `#020204` — the off-white is the second act.)
3. **Exactly one filled button on screen.** Same rule the app already follows
   (`design-refs/prototypes/README.md` §9).
4. **No icons in navigation at all.** Both are text-only.
5. **Colour comes from content, not chrome.** Dia from product screenshots,
   Poke from the photograph. The interface itself is monochrome.

## The tension to resolve before building

Point 4 conflicts with the research done on 2026-08-23 for the **application**
sidebar: icon + label measurably beats either alone (NN/G; +20% on
"MENU" versus a hamburger over 434k mobile visits; +10.37% conversion in a
Shopify A/B test on icon-only versus icon-plus-label).

There is no contradiction once the two surfaces are kept apart. A marketing page
has four links and is read once; an application sidebar is used daily and
carries recall cost. **Text-only for `needt.app`. Icon + label for
`use.needt.app`.** Do not let the marketing aesthetic leak into the product
chrome — that leak is exactly what produced the "too Claude, no icons" reaction
to prototype 14.
