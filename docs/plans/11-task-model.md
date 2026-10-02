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

## T-4 — Value-bearing task groups (captured 2026-08-24, not authorized)

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

### The three things that must be answered before this can be a plan

1. **Forecast vs. realized.** A price on an unsold item is a hope, not a number.
   If the headline shows "CHF 340 left to earn" and the week produces CHF 180,
   the number teaches the user to distrust it — and a distrusted headline is
   worse than no headline. **Decide which number the product commits to** before
   deciding how it looks.
2. **Tasks that carry no money.** A resale group is not only "sell item X". It is
   photograph, list, answer buyers, pack, ship. Most of its tasks carry zero
   value. Either the group holds two kinds of task, or the money lives on the
   item and not on the task at all.
3. **The flame contradicts two written decisions.** Line 114 of this plan bans
   gamification surfaces. `docs/plans/10-design.md` bans decorative animation
   outright and states that spectacle "read[s] as premium for one session and as
   noise by the third". Either that track is reopened deliberately, with a
   reason, or the emphasis has to come from typography and number size rather
   than from a glow.

**Gate:** blocked until 1 and 2 are answered, and until Needt has users whose
resale behaviour can be observed rather than assumed.

---

## Not authorized by this plan

Habit entity, habit tracker screen, streak UI, points, badges, leaderboards,
per-increment scheduling, or any gamification surface beyond the above.

## Sequencing

| Step | Gate to proceed                                              |
| ---- | ------------------------------------------------------------ |
| T-1  | L6 stable, no open P0/P1 — runs as its own release inside L7 |
| T-2  | T-1 shipped **and** the twenty-task prompt gate passed       |
| T-3  | Blocked on a non-farmable definition of a closed day         |
