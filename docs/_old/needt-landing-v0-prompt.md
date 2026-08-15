# Needt landing — v0 follow-up prompt (paste into the existing Apex/Nexus chat)

Вставь блок ниже как follow-up в тот же v0-чат, где уже собран Apex-темплейт. Он оставляет
структуру и «премиальность», но делает из этого Needt: теплее, с разными акцентами, с твоим контентом.

---

```
Keep the EXACT layout, components, spacing, and premium feel of this page (floating pill nav, the
"Now in Public Beta" badge, the giant two-tone display headline, the logo cloud, the bento feature
cards with stat numbers, and the pricing section with the Monthly/Yearly toggle and 3 cards). Do NOT
restructure — only rebrand, recolor, and swap content as below. Keep Bricolage Grotesque for display
and Instrument Sans for body. Fix the current hydration error (SSR/client text mismatch) — make any
time/date/random content deterministic or client-only.

BRAND: rename "Apex" to "Needt". Logo = a rounded-square mark with the letter "N". Nav links:
Product, Features, Pricing, Changelog. Right side: "Sign in" (ghost) + "Start free" (solid pill).

PALETTE — make it warm dark & premium, not cold black, and use SEVERAL accent colors (not only green),
applied tastefully (one accent per card/section, plenty of negative space):
- Page background: warm near-black #16110E (subtle brown/charcoal undertone), sections #1B1512.
- Text: warm off-white #F5EEE6 primary, #B3A79C muted.
- Cards/borders: white at 4–8% opacity, hairline borders at ~10% white.
- Accents (rotate across cards/sections, don't rainbow-spam): amber #FFB25E, coral #FF7A6B,
  violet #B79CFF, teal #5FE3C4. Primary CTA = warm amber→coral gradient with dark text.
- Add soft warm radial glows behind the hero (amber + violet), low opacity, no harsh neon.

HERO:
- Badge: "AI planner · Boards · Focus".
- Two-tone display headline: line 1 "Your week," in warm off-white, line 2 "planned by AI." in a
  warm amber→violet gradient.
- Subline (muted): "Needt schedules your tasks around your real calendar, keeps your boards in sync,
  and times your focus — for $6, not $34."
- CTAs: "Start free" (solid gradient) + "See it plan" (ghost).

LOGO CLOUD: replace with "Works with your stack" — Google Calendar, Outlook, Apple Calendar, Todoist,
TickTick, Notion (muted monochrome logos/wordmarks).

INTERACTIVE PRODUCT PREVIEW (add below the hero, before features): a single framed product mock with
three toggle tabs — Calendar / Board / Focus — switching client-side (deterministic, no backend):
- Calendar: a Mon–Fri week grid; colored task chips animate into free slots (staggered) with a
  "Plan my week" button that replays the animation.
- Board: three kanban columns (To do / In progress / Done) with colored task cards.
- Focus: a circular focus-timer ring with a task label and a small streak row.
Each tab uses a different accent (Calendar=amber, Board=teal, Focus=violet). Make it feel alive but subtle.

FEATURES ("Everything in one planner"): bento cards, each a different accent:
- AI auto-scheduling — "Brain-dump tasks, Needt lays your week around real events." (amber)
- Boards like Notion — custom columns, drag & drop, saved views. (teal)
- Focus timer with streaks — persistent sessions, stats, streaks. (violet)
- Reschedule preview — "See what moves before it moves. Apply or undo." (coral)
- Command palette (⌘K) — do anything in one keystroke.
- Task from email — turn any email into a scheduled task.

PRICING ("Simple, honest pricing", Monthly/Yearly toggle where Yearly shows "2 months free"):
KEEP the 3-card layout:
- Free — $0: 1 calendar, 15 auto-scheduled tasks / mo, 1 board, focus timer.
- Pro — $6/mo (or $60/yr) — MOST POPULAR (highlighted card): unlimited auto-scheduling, unlimited
  boards + all views, focus stats & streaks, AI agent, up to 3 mailboxes, 14-day trial.
- Lifetime — $79 one-time (early bird, first 100 users): everything in Pro, forever, founding-user badge.

MOBILE: keep it fully responsive; the interactive preview degrades to an auto-playing animation on phones.

CTA FOOTER: "Your week, planned." + "Start free" button + a waitlist email input.
```

---

## Заметки
- Промт — follow-up в СУЩЕСТВУЮЩИЙ Apex-чат (там уже починены шрифты и framer-motion). Не начинай новый.
- Цены/фичи взяты из мастер-плана (Free / Pro $6·$60 / Lifetime $79 early bird). Если Lifetime пока не хочешь — убери 3-ю карточку, оставь Free + Pro по центру.
- Домены: CTA «Start free» → https://use.needt.app/login. Лендинг задеплоишь на needt.app отдельно.
- После генерации — глянь на мобилке (v0 preview → phone), и потом уже перенос/деплой.
