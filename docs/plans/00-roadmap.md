# 00 — Roadmap

The one map. Every other plan in this folder is a chapter of it; this file says
what is true today, what is left, and in what order.

**Written:** 2026-08-27, against verified state — `origin/main` at `72eeef6`,
production at `e93d61a`, five open pull requests.

---

## 1. Where things actually stand

### Production

| Service                       | State                                                           |
| ----------------------------- | --------------------------------------------------------------- |
| `use.needt.app` web           | live, `e93d61a` — **three code commits behind main**            |
| worker                        | live, same SHA                                                  |
| `collaboration.use.needt.app` | live since 2026-08-24 (was down eleven days on a port mismatch) |
| `needt.app` landing           | live, static nginx, no build step                               |
| `www.needt.app`               | 301 to apex, query string preserved                             |
| database backups              | daily + weekly to R2, both succeeding — **never restored**      |
| Creem payments                | configured, checkout enabled, **zero transactions to date**     |

The gap between `main` and production matters: `/admin/system` — the only place
Google and Azure credentials can be entered — exists in `main` and not in
production. Until that deploy happens, no new user can connect a calendar, which
is the product.

### Merged since 2026-08-24

Visual baselines made authoritative and the `exit 1` gate restored (#21, #22).
Stale handoffs closed (#25). Billing lifecycle hardened after four audit rounds
(#27). The admin credentials route, which had no page rendering it at all (#26).

### Open pull requests

| PR                           | What                                                   | State                                                                   |
| ---------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------- |
| #24 `push-config-visibility` | surface missing push configuration                     | **audited, fails** — destroys the saved preference it exists to protect |
| #29 `design-reference-set`   | 17 prototypes + 6 reference docs, previously untracked | ready                                                                   |
| #30 `t4-decisions`           | the three T-4 answers                                  | ready                                                                   |
| #31 `d7-design-concepts`     | four accepted design concepts                          | ready                                                                   |
| #32 `landing-react`          | React port, dark hero, routes, product menu            | in progress                                                             |

---

## 2. Blocking the first paying user

Detail lives in [`12-remaining-work.md`](12-remaining-work.md). Order here is by
what stops a real person, not by phase number.

**Deploy `main` to production.** Everything below waits behind it. Owner action.

**Enter the Google and Azure client secrets** at `/admin/system`, then connect a
real calendar and watch events land in `CalendarEvent`. Owner action; the
registration is already done (Azure client `f6215617-475b-4943-bc38-d2c9a09e0668`).

**Account deletion and data export** — P0.4, not started. `src/app/api/export/`
holds `tasks` and nothing else; there is no deletion route anywhere in `src/`,
while `/privacy` is published on a live domain making promises. For a
Swiss-resident seller with EU users this is the one gap that is legal exposure
rather than a product gap.

**Fix the push branch** — PR #24. The API masks `webPushEnabled`, the store
writes the mask back, so toggling any unrelated switch silently erases the
user's saved preference. The test named "without clearing the saved preference"
locks the bug in place instead of catching it.

**First run on a clean database** — P1.2. Sign up, verify, land, connect a
calendar, see a task scheduled. Every dead end on that path, and a purposeful
empty state on each primary route. Blocked on the credentials above.

**Restore drill** — P1.4. Backups run and succeed; a backup nobody has restored
is a hypothesis, not a backup.

**Legal copy** — P1.5. Owner-approved, after deletion and export exist so the
page can describe real behaviour. Two facts already established: hosting is
Hetzner Helsinki, not Switzerland, and the subprocessor list runs Hetzner,
Cloudflare, R2, Resend, Sentry, Creem, Google, Microsoft, the AI provider.

**The subscription model** — P0.5. Four audit rounds each closed one webhook
ordering sequence and opened the adjacent one, because `Subscription` holds a
single `creemSubscriptionId` per user and a user can legitimately have two
subscriptions in flight. Stop patching `webhook-processor.ts`; model each Creem
subscription as its own row and derive entitlement from the set. Also:
`refund.created` and `dispute.created` are enabled on the Creem endpoint and
handled nowhere, so a refunded customer keeps PRO.

Then: alerting, a funnel signal, a rollback rehearsal, Sentry verification.

---

## 3. Design

### What exists now

A design system extracted from the Figma Make source and installed as the
`needt-design` skill: 106 tokens across light and dark, 17 components, 17
guideline pages. Border-first, no brand accent, no press states, colour only in
status dots, tag pills and the avatar gradient. Full kit at
`design-refs/needt-design-system/`.

Seventeen HTML prototypes at `design-refs/prototypes/`, including four Today
iterations. `14-today-target.html` carries the warm palette — `#17150F` canvas,
`#EDE7DA` text, `#C96442` clay accent, `#D8734F` now-line.

Ten product screens generated in Figma Make: Calendar in three views, Tasks
board, Today in six states including focus, empty, unscheduled, rescheduling and
reduced motion.

### The unresolved choice, and it is the important one

**The system is neutral grey. The Today prototypes are warm.**
`docs/plans/10-design.md:143-152` recommends warm charcoal with a clay accent
and states plainly that the violet accent goes and the neutral ramp must move
off pure grey — because cold black plus violet is the Motion and Linear
signature, and warm neutrals are unoccupied in this category.

The system that arrived is exactly cold neutral grey. Picking one is not a
preference, it decides whether the product reads as another Motion clone.

### Tokens are still glued

`--surface-panel` and `--surface-raised` in `globals.css` are both aliased to
`--surface-canvas` — a leftover from the retired flat-canvas rule. While they
are glued, every card dissolves into its background. This is the single edit
that unblocks the whole card-based direction.

### Accepted concepts — D7

Recorded in [`10-design.md`](10-design.md), each built on a mechanism from
outside product design:

- **Margin marks after a reschedule.** From letterpress proof correction: the
  change is a persistent mark in the margin, not a re-animated block, so the day
  is readable by scanning rather than re-reading.
- **Three states of slack, with "you will make it" drawn.** From hydrographic
  charts, which give safe water its own symbol and encode steepness through
  contour spacing. This is the one that changes a decision the user makes today.
- **A Marey chart for the day.** From the 1878 graphical train schedule, where
  slope is speed: falling behind reads as an angle rather than a number.
- **A calendar mode without a clock axis.** From heijunka production levelling.
  Owner decision: ships as a switchable second mode, sidebar changing with it,
  not as a replacement — which is what makes it testable.

Considered without a verdict: **workspace staves**, each workspace holding a
fixed vertical position and staying visible when empty, like a silent instrument
in an orchestral score.

### Calendar screens — real defects

Data is data; these are layout rules that will carry into code:

- A block's position does not match the time written on it — `1-2 PM` renders on
  the 11 AM row.
- Half width is applied to blocks that do not overlap. Half width is the
  language of intersection.
- Empty columns lose their height.
- No current-time line on the week view, though the day view has one and it is
  correct.
- An extra half-hour mark breaks the day scale.

### Landing

React port in the repository at `landing/`, PR #32. Dark first screen ending in
a breathing haze, seamless bloom, shadows cut to the functional ones, section
headings on the hero serif inflating as they arrive, Lenis easing the native
scroll. Four routes with View Transitions; the product menu opens a two-column
panel with descriptions.

Production still serves the static page and stays that way until the build moves
to GitHub Actions — a Vite build on the production host is the failure mode that
took everything down on 2026-08-23.

Left: the live calendar with a crawling time line, and looking at the dark hero
with human eyes.

---

## 4. Your ideas, accepted

**T-4 — value-bearing task groups.** A category holding tasks that share one
outcome — sell these things — carrying a headline number. No planner in the
reference set does this: Motion, Todoist, Amie and Micro all treat a task as
effort, none treats it as money not yet in your account.

Three questions answered 2026-08-26:

The headline commits to **money actually received**, not forecast. A resale
listing price is an opening bid, so a still-to-earn number is systematically
high rather than merely noisy, and a number wrong in one direction teaches
distrust fastest. An item therefore carries two amounts, asking and settled —
which also yields realised margin per item, the number that decides what to buy
next.

A group holds **two kinds of task**: value-bearing ones carrying an amount, and
work tasks carrying none. A work task renders no money slot at all.

The animation bans are **reopened narrowly**: one transient animation fired by a
real sale, on one surface, honouring reduced motion. Ambient flame on a group at
rest stays banned, as do points, badges, leaderboards and streaks. Money received
is not a game score — that distinction is what makes the exception defensible.

Gated on: real users whose resale behaviour can be observed, and T-1 shipping
first so groups reuse its progress model.

**T-1 — progress counter and part-cut.** Accepted into backlog, not blocked.
`targetCount` and `completedCount`, named parts reusing the existing subtask
relation, no `taskType` enum and no picker at creation.

---

## 5. Your ideas, still open

**T-2 — mini-entry**, the two-minute rule. Gated on T-1 plus a prompt-quality
check: export twenty tasks rescheduled two or more times, run the prompt by
hand, and if fewer than twelve produce a first action you would actually
perform, it does not ship. An hour of work standing in front of two weeks of
implementation.

**T-3 — streaks.** Parked on one blocking question: in a planner the user
authors the tasks, so the user owns the definition of success, and one trivial
task closes the day. No streak until there is a definition of a closed day that
cannot be farmed.

**Workspace staves** — see D7 above.

**Refund and dispute handling** — folded into P0.5.

---

## 6. What only you can do

Deploy `main` to production. Enter the Google and Azure client secrets once the
deploy lands. Approve the legal copy. Decide warm versus neutral for the design
base. Record the demo video for Google OAuth verification — not a launch
blocker, polling sync is the supported fallback. Confirm the Swiss-seller
tax fields in the Creem dashboard.

---

## 7. Order

**This week, and everything waits on it:** deploy, enter credentials, verify a
real calendar syncs.

**Then, in parallel:** fix PR #24 and merge the four ready documentation PRs;
un-glue the three surface tokens and settle warm versus neutral; fix the two
calendar layout rules — position matching its label, and half width meaning
overlap.

**Then, sequentially:** account deletion and export with its spec; first run on
a clean database; the restore drill; legal copy.

**After production has been stable for a week:** the subscription model rework
with refunds and disputes, T-1, and the D7 concepts one prototype at a time.

**Not authorized, unchanged:** a new AI scheduler, seat billing, cross-workspace
views, third-party document storage, physical deletion of user content, read
receipts, team snippets, Notion-style automation, portfolio management, audio
transcription, new integrations.
