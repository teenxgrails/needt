# Needt — Design Completion Pass — промт для Codex (продолжение) — 2026-07-19

Для аккаунта друга. Работать в существующей ветке `codex/calendar-today-space-polish` (там незакоммиченный
чекпоинт). Скопируй блок «CODEX PROMPT». Источник правды — `HANDOFF-DESIGN-PASS.md` +
`design-refs/screens/README.md` (+ 6 Motion/Opal и 5 Tiimo скринов в `design-refs/screens/`).

Подтверждённые решения заказчика (вшиты в промт):
- Скоуп: весь P1/P2/P3 разом (десктоп + мобилка).
- Мобильный таб-бар: **Calendar · Today · Tasks · Focus · Me** (круглое фото профиля). AI-чат доступен на мобилке (полноэкранно).
- Полноценная мобильная версия ВСЕХ ключевых экранов: Calendar (день+свайпы), Boards (гориз. скролл), Mail (список+чтение), AI Chat (полноэкран). Space — можно «best on desktop».
- Тема: **тёмная + светлая** (Settings ▸ Appearance переключает; всё на токенах).

---

## CODEX PROMPT

```
Continue the Needt "Design Completion Pass". Work in the existing branch `codex/calendar-today-space-polish`.
FIRST: read HANDOFF-DESIGN-PASS.md and design-refs/screens/README.md end to end — they hold the full scope
(P1/P2/P3), the measured Motion reference values, the Tiimo mobile reference, and the rules/gotchas. Then
commit the current uncommitted working tree as a checkpoint (do NOT commit the user's untracked docs:
NEEDT-*.md, needt-zadacha-*.md, HANDOFF-DESIGN-PASS.md, landing-mockup.html, .claude/), run `npm run type-check`,
and fix any loose ends from the last cut-off edits (/style, Focus).

Follow CLAUDE.md conventions and the house format. Do NOT modify the scheduling engine
(src/services/scheduling/) or the Focus server-session logic. Do NOT create a `/mobile` route tree — mobile is
responsive compositions inside the SAME routes with the same data/API. Use project npm scripts for gates
(`npm run lint|type-check|build|build:worker`), never global pnpm. Update CHANGELOG.md under [unreleased].

DESIGN SYSTEM (foundation first):
- Unify tokens, typography, density, buttons, inputs, statuses. "Softening" (the user's #1 complaint about
  harsh/shimmering edges) = very close surfaces + thin borders + stable typography + integer sizes/positions +
  `antialiased`, NOT blur/glow. Remove any remaining global color-transition and left-icon brightening.
- Rebuild /style into a live catalog of the real tokens/components (the old Liquid Glass version is wrong).
- Motion reference density (measured): base bg rgb(26,29,30), borders rgb(43,47,49), controls 25–30px height /
  6px radius, panels 3–6 brightness levels apart. Apply as Needt tokens.

THEME — support BOTH dark and light:
- Settings ▸ Appearance toggles Dark / Light (dark stays the default). EVERY surface must use CSS tokens/vars,
  no hardcoded colors, so both themes render correctly. Verify each main screen in both themes.

MOBILE LAYER (responsive, same routes; reference = Tiimo, rendered in Needt's dark+light system, NOT Tiimo's look):
- Bottom tab bar (persistent, floating, safe-area aware): **Calendar · Today · Tasks · Focus · Me**. "Me" is a
  round profile-photo avatar → profile/settings/stats. Active tab highlighted.
- AI Chat on mobile = a full-screen surface reachable from a persistent entry (a floating AI pill / top-bar
  button, matching the existing desktop AI pill) — not a 6th bottom tab.
- Every key screen gets a real mobile treatment (NOT a squished desktop):
  * Today — Tiimo-style agenda: big date header, time-section groups (Anytime/Morning/Afternoon) as pills with
    counts, task rows as rounded cards (icon + title + duration + checkbox, subtask progress), empty/overloaded
    day states, floating "+" quick-add (opens quick-create as a bottom sheet).
  * Calendar — day view by default with horizontal swipe between days; week view only in landscape. Configure
    FullCalendar touch, don't rebuild.
  * Tasks — list view; Kanban/Boards as horizontally scrollable columns with snap.
  * Focus — Opal-style layout in Needt system: one large digital timer, duration ±, one clear Start/Pause,
    secondary actions/queue below, leave-early confirmation as a bottom sheet.
  * Mail — list + reading pane stacked (list → tap → message), account/empty states in Needt style
    (toolbar ~65px, rows ~40px per Motion Inbox).
  * Space — a clean "best on desktop" placeholder card is acceptable.
- All modals/panels become bottom sheets on mobile; popovers become full-width sheets; touch targets ≥44px;
  press-feedback on buttons; PWA install prompt on 2nd mobile visit.

MAIN-SCREEN & SYSTEM WORK (P1/P2 from HANDOFF — do all):
- Calendar: readable events in narrow columns; one visual language for events and tasks; clearer selected event;
  polished quick-create + detail popover (quick-create like Motion, more variety); verify Month/Day/Week/Timeline.
- Today (desktop): agenda document ~800px, better vertical rhythm, hover actions, empty/completed/overloaded states.
- Create/Edit Task: unified field grid; explicit Saving…/Saved; unsaved-changes guard on close; better mobile
  bottom sheet; calmer Advanced settings.
- Settings: go through ALL tabs; remove the repeated category name/description; one shared SettingsSection/rows/
  toggles/Connect buttons; copy Motion's blue button style so every blue action button is one consistent style;
  unify Connected / Not configured / Unavailable; make "coming soon" placeholders clearly disabled (quiet grey,
  not clickable); unified date picker (the new src/components/ui/date-picker.tsx) everywhere, Motion-style
  (calendar + quick dates; bottom sheet on mobile).
- Boards: better empty state, columns, drag feedback, card open. Space: calmer top bar, selected task, labels.
- AI Chat: remove leftover separate colors/styles; unify composer, tool-call rendering, loading.

P3 QUALITY:
- Animations 150–250ms, no glow; smooth popover/modal/bottom-sheet enter; skeletons instead of blank loading;
  full keyboard nav; contrast check on secondary grey text; honor prefers-reduced-motion.

ORDER (green blocks, type-check + visual baselines after each): design-system/tokens & /style → mobile shell +
Calendar & floating overlays → Today + Task modal + unified date picker → all Settings → Boards, Focus, Mail,
AI → visual regression for desktop/tablet/mobile and all states (loading/empty/error, dark/light).

ACCEPTANCE: lint (0 warnings), type-check, test:unit, build, build:worker, docker build all green; both themes
verified on every main screen; visual regression baselines updated; commit per block. When done, open ONE PR
from codex/calendar-today-space-polish into main; summarize what changed and any deferred //todo.
```

---

## Заметки
- Это большой промт — Codex будет делать зелёными блоками, не за один заход; лимиты друга могут кончиться → тогда он допишет свежий handoff (как в прошлый раз), продолжим.
- Скрины должны лежать в `design-refs/screens/` (6 Motion/Opal + 5 Tiimo) — иначе Codex работает по текстовым описаниям из README.
- После мержа PR: docker build → push → Coolify redeploy web (миграций тут не будет, чистый UI) → смоук на телефоне (375/768) и в обеих темах.
