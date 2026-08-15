# Needt — тёмная база + градиентная глубина — промт для Codex — 2026-07-19

Часть Design Pass (foundation). Ветка `codex/calendar-today-space-polish`. Скопируй блок «CODEX PROMPT».
Решение заказчика: текущий фон `#1A1D1E` слишком светлый и холодный → сделать **темнее и теплее**;
плюс добавить тонкую **градиентную глубину** (как у Motion в Create Task).

---

## CODEX PROMPT

```
Rework the app's dark base color and add a subtle "gradient depth" convention. This is a design-system /
tokens change — apply it through CSS variables/tokens so it propagates everywhere and works in BOTH themes.
Follow CLAUDE.md conventions. No blur/glow. Update CHANGELOG.md under [unreleased].

PROBLEM: current dark background is rgb(26,29,30) / #1A1D1E — too light and slightly cool, reads "aggressive".
Make it darker and warmer, and give surfaces subtle depth without glow.

NEW DARK PALETTE (NEUTRAL near-black; wire into the existing dark-theme tokens — do NOT hardcode per component):
- page background:      #0E0E10
- surface-1 (cards/panels):   #151517
- surface-2 (modals/popovers): #1A1A1E
- surface-3 (raised):   #212126
- border (hairline):    #26262A
- border-strong:        #303036
- text primary:         #ECECEE
- text secondary:       #9C9CA2
- text muted:           #6E6E75
Keep elevation steps close (3–6% lightness apart) + thin borders — that closeness is the "softening"
(NOT pure black #000, which is harsh and kills borders/banding). Keep accents as-is unless they clash.

GRADIENT DEPTH CONVENTION — apply to REGULAR backgrounds too, not only overlays. Keep clean (avoid banding via
large gradients / slight dithering), but the client wants it noticeable, so make it perceptible, not whisper-only.
Light comes FROM THE TOP everywhere.
1. App page background is NOT flat: a top-anchored gradient, lighter at top → base at bottom, e.g.
   `radial-gradient(140% 95% at 50% 0%, #17171A 0%, #0E0E10 55%)` (or vertical `linear-gradient(180deg,#141417,#0E0E10)`).
   Define as a token/util and use it on the main app shell background.
2. Panels / cards / modals / sheets: same top ambient highlight via radial, e.g.
   `radial-gradient(120% 90% at 50% 0%, <surface +5% L> 0%, <surface> 60%)`. Reusable surface variant; apply to
   Task modal, date picker, command palette, board card panel, AI chat panel, sidebar, Today/Focus surfaces.
3. Overlay/scrim (modal & sheet dim): VERTICAL gradient, light at top → darker at bottom, MORE PRONOUNCED than a
   whisper — use `linear-gradient(180deg, rgba(0,0,0,0.26), rgba(0,0,0,0.82))` (top clearly lighter, bottom clearly
   darker). Define as `--scrim` token so every modal/sheet uses it. This is the Motion "Create task" depth, stronger.
Rule: top-lit, tasteful, no visible banding; never blur/glow.

BOTH THEMES: define the equivalents for the light theme too (light surfaces, inverted scrim/ambient that still
read as depth). Every surface must use tokens so switching Appearance Dark/Light stays correct.

APPLY & VERIFY: route ALL backgrounds/scrims/panels through the tokens above (grep for hardcoded #1A1D1E,
rgb(26,29,30), flat rgba black scrims, and replace). Verify main screens (Calendar, Today, Task modal, date
picker, Settings, Boards, Focus, Mail, AI, command palette) in BOTH dark and light — no hardcoded colors,
no banding, no glow.

ACCEPTANCE: lint (0 warnings), type-check, build, build:worker, docker build green; both themes verified;
no remaining hardcoded old-background values; commit as its own block in the design pass.
```

---

## Заметки
- Выбор заказчика: **нейтральный `#0E0E10`** (не тёплый). Градиентная глубина — И на обычных фонах (страница, панели), не только на затемнении. Затемнение модалок — свет сверху и **посильнее** (см. п.3).
- Если позже захочет тёплый — заменить палитру на `#0E0D0C / #151311 / #1A1815 / #262320` и текст `#F5EEE6/#A89F97`.
- Это foundation-блок — делать ПЕРВЫМ в дизайн-пассе (до экранов), тогда всё сразу на новой базе.
- Термины: scrim = затемнение-подложка модалки; linear-gradient = верх светлее/низ темнее; radial = свет из точки сверху; vignette = тёмные края.
