# Plan 11 — Task shape and starting friction

**Status:** Backlog. Owner ideas captured 2026-08-23. Not implementation
authorization — nothing here starts before L6 is stable (see `09-launch.md`).

## Origin

The owner asked whether to port the logic of _Atomic Habits_ (James Clear) into
Needt. A critic pass on 2026-08-23 rejected porting the book as a system:
its mechanics are the default in every competing planner, so copying them buys
parity, not differentiation, and its most visible mechanic (streaks) conflicts
with both the deterministic scheduler and the Focus UI convention.

What survived the pass: two mechanics with the lowest implementation cost and
the most defensible behaviour, plus one parked on an unanswered design question.

**Decisions taken 2026-08-23**

- Habits as a first-class entity — **not now**. The deferred L7 item "flexible
  habits and weekly focus targets" is unchanged and still deferred.
- Streaks — **parked** behind the blocking question in T-3.
- Progress counter and mini-entry — **accepted into backlog**, sequenced below.

---

## T-1 — Progress counter and part-cut

The owner's three proposed task types collapse to one model:

| Proposed                                                  | Actually         |
| --------------------------------------------------------- | ---------------- |
| Regular                                                   | a task           |
| Part-cut (split into several parts worked one by one)     | named subtasks   |
| Part-updative (one task with `0/3`, incremented by click) | unnamed subtasks |

`0/3` is three unnamed subtasks. There is no third shape.

**Decision: no `taskType` enum and no type picker at creation.** Task creation
is the hottest and most frequent input in the product; three radio buttons there
cost every task to serve the ~10% that need parts. A task gains subtasks or a
target count **after** it exists, when the need is actually known.

Schema sketch, additive only:

- `Task.targetCount Int?` — null means "not a counter"
- `Task.completedCount Int @default(0)`
- named parts reuse the existing subtask relation; no new table

Scheduler contract: a counter does **not** change `isAutoScheduled` semantics.
One task, one block. Do not schedule per increment and do not let a counter
produce N candidate slots.

Open question, blocked on T-3: does incrementing a counter count as "touched"
for any future definition of a closed day?

---

## T-2 — Mini-entry (the two-minute rule)

**Trigger:** a task rescheduled two or more times, or an explicit "give me a way
in" action by the user.

**Output:** one concrete first action of two minutes or less, written as the
first subtask — so it reuses T-1 and adds no new storage.

**Manual before automatic.** The user must be able to write the mini-entry by
hand first. AI then fills a field the user could have filled themselves, which
keeps the feature useful when generation is poor and makes it testable.

**Gate before any code is written:** export tasks that were rescheduled two or
more times, run the prompt over twenty real ones by hand, and count how many
produced a first action the owner would actually perform. Fewer than twelve out
of twenty — the feature does not ship. This is an hour of work standing in front
of roughly two weeks of implementation.

**Known failure mode:** generic output ("open the project file") destroys trust
on first use, and there is no second use. The feature lives or dies on the
prompt, not on the code.

---

## T-3 — Streaks (parked, one blocking question)

Reference behaviour, 2026: Duolingo spends a streak freeze silently while the
user is away; the user discovers the snowflake retroactively on the next open.
Paid streak repair and event-based revival sit behind it. These forgiveness
mechanics — freezes, grace days, pauses, weekend skips — are now baseline
across habit and productivity apps, so shipping them is parity, not identity.

**Blocker.** Duolingo owns the definition of a completed day: one lesson,
binary, authored by Duolingo. In a planner the user authors the tasks, so the
user owns the definition of success. One trivial task closes the day; a streak
of 300 can mean nothing. The counter then becomes a self-deception metric for
the user and a false signal in our own analytics.

**Do not implement a streak until there is a definition of a closed day that
the user cannot farm.** Candidate directions to evaluate when this is picked
up — none validated:

- closed day = scheduler-planned work completed, not user-declared work
- ratio-based rather than binary, so one task out of twenty does not qualify
- per-project rather than global

Second, unresolved conflict: a streak counter is a metric tile, and the Focus UI
convention forbids cards and metric tiles. Either the convention changes
deliberately or the streak needs a non-tile representation.

Until both are answered, no streak UI ships.

---

## T-4 — Value-bearing task groups (captured 2026-08-24, questions answered 2026-08-26, not yet authorized)

**Owner's idea, in his words:** a category that holds tasks sharing one outcome —
"sell these things" — where each task is one item to sell. The category carries a
headline number: how much this group is worth. Finishing a task splits the sum
into earned and still-to-earn. The category is visually loud — a flame, a 2D
animation — so it pulls the eye. Later it connects to his own budget tracker
(`budget.needt.app`, live, returns 302) so money from holds shows up there.

**Why it is interesting:** no planner in the reference set does this. Motion,
Todoist, Amie and Micro all treat a task as effort. None treats a task as an
amount of money not yet in your account. For a resale seller that is the actual
motivation, and "task done" is not.

**State of the ground:** `prisma/schema.prisma` has no monetary field on Task or
Project. This is a new entity, not a new field.

### The three questions, answered 2026-08-26

**1. The headline commits to realized money. Forecast is secondary and labelled.**

Owner delegated this one. The decision, and why:

A resale listing price is not a forecast, it is an opening bid. Items sell after
haggling, or at a discount to clear, or not at all. So a "still to earn" headline
is not merely uncertain — it is _systematically_ high, and the error is not
random noise that averages out. A number that is wrong in a consistent direction
teaches distrust faster than one that is merely noisy.

Therefore: **the large number is money actually received.** It only ever goes up,
which is also the direction that motivates. Potential appears beside it, smaller,
explicitly marked as an estimate — `CHF 180 earned · CHF 340 listed`. When an item
sells for less than listed, the group reconciles silently: listed drops, earned
rises, and no cell ever shows a number the user did not receive.

Consequence for the schema: an item carries **two** amounts, asking and settled.
The group sums settled for the headline and asking for the estimate. This also
gives the resale seller something no planner offers — realised margin per item,
which is the number that actually decides what to buy next.

**2. The group holds two kinds of task. Confirmed by owner.**

A resale group is `sell item X` plus photograph, list, answer buyers, pack, ship.
So: **value-bearing tasks** carry an amount and roll into the group total;
**work tasks** carry none and behave like every other Needt task. One group, two
kinds, one visible difference — the amount. A work task must never render an
empty money slot; absence of the field is the design, not a zero.

Open sub-question for implementation, not blocking: whether shipping _this_
item is a subtask of the value-bearing task or a sibling in the group. Decide
against real data, not in advance.

**3. The bans are reopened — deliberately, and narrowly. Owner decision.**

`docs/plans/10-design.md:38-43` bans "any effect that exists only to be seen",
and this plan's Not-authorized list bans gamification surfaces. Both stand, with
one carved exception, stated precisely so it cannot spread:

- **Permitted:** a single transient animation fired by one event — an item
  actually sold and money booked. It plays once, it is short, it is the only
  animated surface in the app, and it is the visual acknowledgement of money
  arriving. That is feedback on a real event, not decoration.
- **Still banned:** any ambient or persistent flame, glow, or motion on the
  group while it merely exists. A category that burns permanently is exactly the
  spectacle plan 10 describes — premium for one session, noise by the third. The
  group at rest earns attention through the size of the number, nothing else.
- **Still banned everywhere else:** points, badges, leaderboards, streak UI. Money
  received is not a game score; it is the thing itself. That distinction is the
  whole reason this exception is defensible.

The animation must honour `MotionRuntime`'s reduced-motion handling like every
other transition in the app.

**Gate:** questions 1-3 are answered. Remaining gate: Needt has users whose
resale behaviour can be observed rather than assumed, and T-1 has shipped —
value-bearing groups reuse its progress model rather than inventing a second one.

---

## Not authorized by this plan

Habit entity, habit tracker screen, streak UI, points, badges, leaderboards,
per-increment scheduling, or any gamification surface beyond the above.

**One exception, 2026-08-26 owner decision:** the sale-completed animation in
T-4. It fires on a real money event, once, transiently, on one surface. Nothing
else in the app gets an animated surface on the strength of this, and the group
at rest stays still. See T-4 question 3 for the exact boundary.

## Sequencing

| Step | Gate to proceed                                              |
| ---- | ------------------------------------------------------------ |
| T-1  | L6 stable, no open P0/P1 — runs as its own release inside L7 |
| T-2  | T-1 shipped **and** the twenty-task prompt gate passed       |
| T-3  | Blocked on a non-farmable definition of a closed day         |
