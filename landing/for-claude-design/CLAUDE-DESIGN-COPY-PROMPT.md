# Prompt for Claude Design — replace the landing copy

Paste everything below the line into Claude Design, in the project that holds `site/index.html`.

---

Replace the copy on `site/index.html` with the text below. The goal: a normal person understands what Needt does in three seconds. Plain words, no jargon.

## Rules

- Change **text only**. Keep the layout, the scenes, the animations, the highlight spans (`l-em`, `l-hl-*`, `l-num`, `l-pencil`) and every class name. Where a new sentence has fewer or more words, move the highlight onto the word listed in brackets.
- **No new numbers.** The only numbers allowed are the ones written below. Do not add hours saved, user counts, ratings or percentages.
- Remove these words from visible copy everywhere on the page: rail, scheduler, placement, placed, MCP, fortnight, standing shape.
- Keep the `<a>` targets as they are. Only the button labels change.

## Page title and description

```html
<title>Needt: The Smart Planner That Fixes Your Day</title>
<meta name="description" content="Stop rewriting your plan every morning. Needt fits every task into your free time and rebuilds the day when a meeting moves. Free to try.">
```
Use the same title and description for `og:title` and `og:description`.

## Header

- Nav button: `Log in`

## Hero

Wordmark stays. The sentence under it becomes:

> You spend **46.9%** of your day thinking about something else. Give Needt your to-do list, and every task gets **a real hour** in your day.

- Highlights: the number `46.9%` keeps its counter, `a real hour` takes the wash highlight.
- Remove the citation line under it (`Mind-wandering measured at 46.9%… Science, 2010`).
- Buttons: primary `Plan my day`, secondary `See a day`.
- Line under the buttons: `Free plan. No card needed.`

## Scene — the pile of tasks

- Title: **Your day, before Needt.** A pile of tasks and no plan.
- Caption under the scene: *Two things have a slot. Three are just hoping.*
  (The scene shows 3 tasks and 2 events. The old caption said "the other four", which was wrong.)

## The line lit word by word

> Your plan breaks. You fix it. It breaks again. Let Needt do the fixing.

## How it works

- Tag: `How it works`
- Title: **Like an assistant, built in.**
- Sub: It does the planning. You do the work.

Step 1 — **Capture in seconds.**
Just type it the way you'd say it: `call the accountant Friday 10am` · `send the invoice to Anna tomorrow` · `gym 45 min`. Needt reads the day, the time and how long it takes.

Step 2 — **It finds the time.**
Needt fits each task into your free hours.

Step 3 — **Say yes, or change it.**
See the day before it's saved.

## Facts band

Remove all three numbers (`5 h`, `1`, `0`). They have no source. Keep the three cards and their icons, and replace the text:

- Label `Stop replanning by hand` — When the day breaks, Needt rebuilds it. You just check it.
- Label `One button, whole day` — Press "Plan my day" and everything is laid out.
- Label `Nothing gets lost` — Everything you capture stays on screen, with or without a time.

Where the number sat, show the card's icon larger instead, so the card keeps its weight.

## The rest of the week

- Tag: `Your week`
- Title: **Your time shouldn't live in five apps.**
- Lead: Today, this week and what's stuck, in one place.

Tile 1 — **Write down your week.** A simple page for the week's plan. Needt adds what's scheduled as it goes.
Tile 2 — **See clashes before they happen.** Every block is as long as it really takes, so overlaps show up right away.
Tile 3 — **Know what to do first.** The task blocking the most goes to the top.

## Habits and focus

- Tag: `Habits & focus`
- Title: **Build habits that stick.**
- Body: No streaks to lose. Miss a day and nothing breaks. You just see how often you showed up in the last 14 days.
- Second paragraph: **Focus without interruptions.** Start a focus session, and nothing gets scheduled on top of it.

## Agent

- Tag: `AI agent`
- Title: **Planning that shows its work.**
- Body: Ask Needt to plan your day and watch Needt move each task into place. Nothing changes behind your back.
- Buttons: `What it can do` · `What it can't touch`

## Price

- Title: **Less than a coffee a week.**
- Add one line above the three cards: **Lifetime: $149 once, for the first 300 people. Then it closes.**
- Set the three cards to exactly these facts, keeping each card's layout. Remove every other price, currency or duration (no €, no "20 months"):
  - **Free** — $0, forever. Button `Start free`
  - **Pro** — $7/month or $60/year. 14 days free, no card. AI included. Button `Start my trial`
  - **Lifetime** — $149 once, yours forever. First 300 people. AI included. Button `Get Lifetime`
- Never show a number of AI messages, actions or credits anywhere on the site. Write "AI included".

## FAQ

- Title: **Questions? Answers.**

**Does it replace my calendar?**
No. It connects to your Google, Apple or Outlook calendar. Your meetings stay where they are, and Needt never moves them.

**Where does my data live?**
In your Needt account, synced across your devices. The details are on the Security page.

**Is it AI?**
The planning itself is plain math: your free hours, how long things take, deadlines, and what depends on what. AI writes small helpers, like a first step for a task or a week summary, and you see them before they're saved.

**What if my day doesn't fit?**
Needt tells you, and shows what moves. It won't squeeze 8 hours of work into 4.

**Who is it for?**
Anyone who wants one plan for work and personal life, plus freelancers, small businesses and small teams. A team shares a workspace and sees who's on what and what's blocked. Everyone has their own plan; there's no per-seat price.

**Which platforms?**
Needt works in any browser, and you can install it like an app on your computer or phone. Native apps are on the way.

## Closing block

- Title: **Your day, planned. Finally.** (highlight on `planned`)
- Buttons: `Plan my day` · `Start free`

## Phone bar

- Text: `Give every task an hour.`
- Button: `Plan my day`

## Also fix on `site/download.html`

This page makes claims the real product doesn't match yet. The real app is a web app you can install from the browser; there is no signed macOS binary, no Windows installer and no local-files mode today.

- Meta description: `Use Needt in any browser, or install it like an app on your computer or phone.`
- Remove "Desktop first, local data" and "a window that opens in a tenth of a second".
- macOS and Windows cards: say **Install from your browser** and explain it in one line (Chrome or Edge: the install icon in the address bar). Remove "universal binary, signed and notarised" and "Installer and portable build".
- Phone card: keep "In build".
