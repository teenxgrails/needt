# micro.so — what to steal, what to leave

Read 2026-08-24 from `micro.so`: the landing, `/pricing`, and four posts —
`ai-that-organizes-itself` (2026-02-15), `agent-memory-cognitive-science`
(2026-03-18), `introducing-micro-blocks` (2026-07-25), and the
`2.6.1` changelog (2026-03-24). Visual tokens are separate, in
`design-refs/dia-tokens.md`'s sibling entry on Refero.

Micro is an "everything app" — email, CRM, meetings, tasks, docs, agent — for
founders and investors. Different market from Needt. But it is a **productivity
product with an agent that acts on the user's data**, which is exactly what
Needt is becoming, and it is roughly two years ahead on the parts that are hard.

---

## 1. The memory architecture — the single most valuable thing here

Their post `agent-memory-cognitive-science` describes an agent memory system
modelled on human memory. Five layers, each mapped to a real mechanism. This is
directly portable to Needt's AI companion, and Needt currently has none of it.

| Their layer | Human analogue | What it does |
|---|---|---|
| **Context injection** | working memory | assembles what the agent needs *for this request*, from what page you're on and what you're looking at |
| **Current Priorities document** | selective attention | one living doc naming what you're focused on now; the agent then surfaces related signals it would otherwise ignore |
| **`remember` tool** | amygdala tagging | detects *recurring corrections* and asks "want me to remember this?" — negative feedback is treated as the strongest signal |
| **Prism knowledge graph** | long-term memory | semantic search narrows, then the agent walks actual edges for specifics |
| **Context documents + Skills** | extended mind | ~15 living docs about you (writing style, meeting preferences, process) plus step-by-step procedures for recurring workflows |

Two mechanics inside that are worth lifting on their own:

**Consolidation overnight.** A scheduled job each night reviews the day's
activity and updates the context documents. A second process a few hours later
prepares for the day and week ahead. "Quiet days mean quiet nights" — days with
nothing new produce no writes. Monday morning, the agent already knows what
happened last week without asking.

**Retrieval strengthens with use.** Frequently walked paths get prioritised.
Old information is never deleted, it sinks in the ranking.

**Why this matters for Needt specifically.** Needt already has a BullMQ worker
running scheduled jobs, and it already has the graph — `prisma/schema.prisma`
holds tasks, projects, events, pages, people, workspaces with real relations.
The consolidation pass is a job on infrastructure that already exists. The
correction-detection loop is the cheapest of the five and the one users feel
first: an assistant that stops repeating a mistake reads as intelligent far more
than one that answers well once.

**Their own caveat, worth keeping:** "the first planes were designed to look
like birds… it was better to use birds as scaffolding than to carbon copy them."
Take the architecture, not the biology.

---

## 2. "The AI isn't a chatbot bolted on top. It's woven into the data layer."

From `ai-that-organizes-itself`. Three concrete mechanics:

- **Ingest resolves, not just stores.** A new email doesn't land in a list — it
  resolves the sender to a contact, links the organisation, checks open tasks,
  updates relationship strength. Needt's equivalent: a calendar event arriving
  should attach itself to a project, surface the tasks it blocks, and note who
  it is with — before the user opens anything.
- **Autofill, not data entry.** The agent watches signals and *proposes* field
  values; the user reviews and approves. "You review and approve. The AI does
  the typing." This is the same shape as Needt's reschedule preview, applied to
  every field instead of only to time.
- **The end of tab-switching** as the positioning line, not a feature list.

---

## 3. Pricing — three lessons, one of them a warning

Current Micro pricing, read 2026-08-24: **Standard** and **Pro** (both "per
month", figures rendered client-side), **Enterprise** custom. 14-day free trial,
cancel anytime, **no free tier at all**.

1. **They dropped Standard from $40 to $29 and shipped it as a headline
   changelog item** — "Same product, lower price." A price cut announced as a
   feature. Cheap goodwill, and it tells you their $40 was wrong.
2. **Credits, not seats.** 6,000/mo on Standard, 20,000 on Pro, unlimited on
   Enterprise. Automations auto-pause when credits run out rather than
   surprising the user with a bill. Needt will need exactly this the moment the
   AI companion does real work — the current FREE/PRO/LIFETIME enum in
   `prisma/schema.prisma` has no concept of metered usage.
3. **The warning.** They have no free tier and gate on a trial. Needt's archived
   plan has Free / Pro $6 / Lifetime $79. Micro sells to founders and investors
   at $29; Needt sells to individuals at $6. **Do not copy their structure** —
   copy only the credit ceiling and the auto-pause.

---

## 4. Onboarding — one idea worth stealing outright

From `2.6.1`: "a live network graph that animates while your data syncs, and a
conversational AI setup that configures your workspace for you."

The insight is that the sync wait is the *only* moment a new user will happily
stare at the screen, and most products waste it on a spinner. Needt's first-run
imports a calendar — that is tens of seconds of dead time. Filling it with the
week visibly assembling itself is the same move as the landing hero, at the exact
moment it is most persuasive.

Also: **"Import your memories from ChatGPT, Claude, Gemini, or Grok"** so the
agent has context from day one. Low effort, disproportionate first impression.

---

## 5. Micro Blocks — read it, do not build it

They extracted their backend (typed objects, relationship graph, enrichment,
query layer, permissions, MCP) and sell it as a platform. Their argument:
"Email was already the super app… all of that structure is already sitting in
there, trapped in a format that only renders one way."

**For Needt this is a trap, not an opportunity.** A solo founder shipping a
planner does not also ship a platform. Its value here is one framing:
*a calendar is a rendering of an object graph, not a data model*. Needt already
stores tasks, events, projects and pages as related objects; the calendar, the
board and Today are three renderings of the same graph. That framing is free and
already true, and it is the honest version of "everything in one place."

---

## What to do about it, in order

1. **Correction memory.** Detect a repeated user correction, ask once, persist
   it, include it in every future agent request. Smallest of the five layers,
   largest felt effect.
2. **Nightly consolidation.** A worker job that updates a per-user context
   document from the day's activity. No writes on quiet days.
3. **Current Priorities.** One user-editable document naming the current focus;
   the scheduler and the companion both read it.
4. **Credit ceiling with auto-pause** before the AI companion is behind a paid
   plan.
5. **Animated sync during onboarding**, reusing the landing's reflow animation.

Items 1–3 are agent work and belong in a new plan file, not in `09-launch`.
Item 4 is a billing decision and needs the owner. Item 5 is the cheapest and can
ride along with the landing.

## Sources

- <https://www.micro.so/blog/agent-memory-cognitive-science> — 2026-03-18
- <https://www.micro.so/blog/ai-that-organizes-itself> — 2026-02-15
- <https://www.micro.so/blog/introducing-micro-blocks> — 2026-07-25
- <https://www.micro.so/blog/changelog-2-6-1-better-onboarding-lower-price> — 2026-03-24
- <https://www.micro.so/pricing> — read 2026-08-24
- <https://styles.refero.design/style/cc43cfe3-195b-4081-b586-c42db054a466> — extracted visual system
