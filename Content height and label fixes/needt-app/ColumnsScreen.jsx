/* COLUMNS, IN THE APP — the adapter between the product's one task list and
 * the columns view.
 *
 * The view itself lives in ColumnsView.jsx and knows nothing about the app; it
 * takes days and tasks. This file is the only place that decides which day a
 * task belongs in, so there is one answer to that question rather than one per
 * screen. Tasks with no rail are deliberately absent: they have no place in a
 * day, and they live on the sidebar's own shelf.
 */
const CA_MONTHS = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
const CA_TODAY = 1;
const CA_LABELS = ["Today", "Tomorrow", "Thursday", "Friday", "Saturday", "Sunday", "Monday"];
const CA_FREE_TODAY = 4;

function caDueDay(t) {
  if (!t.due) return null;
  const n = parseInt(String(t.due).trim(), 10);
  return isNaN(n) ? null : n;
}

/* Priority is not stored on a task yet, so it is derived from the facts that
   do exist — whether it has slipped, how much room is left, and whether the
   day is about to give this one away. When the model gains a real priority
   this is the one function that changes. */
function caPriority(t, dueIn, atRisk) {
  if (t.overdue) return "now";
  if (atRisk) return "now";
  if (dueIn != null && dueIn <= 2) return "soon";
  if (dueIn != null && dueIn <= 5) return "later";
  return "none";
}

/* WHAT LEAVES A DAY THAT DOES NOT FIT.
 *
 * Two candidate sets, and the one that takes LESS time out of the day wins —
 * preferring a single covering task on principle is what once proposed
 * shedding four hours to recover one. A tie goes to the smaller set, because
 * one move is easier to accept than two. Order of sacrifice: the latest
 * deadline first, then the smallest, so the day gives up what it can most
 * afford rather than what is heaviest. */
function caShed(open, room) {
  const load = open.reduce((n, t) => n + (t.est || 0), 0);
  const over = load - room;
  if (room == null || over <= 0) return null;
  const far = (t) => (t.dueIn == null ? 99 : t.dueIn);
  const pool = open.slice().sort((a, b) => (far(b) - far(a)) || ((a.est || 0) - (b.est || 0)));
  const accrued = [];
  let left = over;
  pool.forEach((t) => { if (left > 0) { accrued.push(t); left -= (t.est || 0); } });
  const single = pool.filter((t) => (t.est || 0) >= over)[0];
  const total = (set) => set.reduce((n, t) => n + (t.est || 0), 0);
  const best = single && (total([single]) < total(accrued)
    || (total([single]) === total(accrued) && accrued.length > 1)) ? [single] : accrued;
  return { over: over, moves: best };
}

function caColumns(tasks, free) {
  const days = [];
  const debt = tasks.filter((t) => t.overdue && !t.noSlot);
  const shape = (t, dueIn, atRisk) => Object.assign({}, t, {
    dueIn: dueIn,
    priority: caPriority(t, dueIn, atRisk),
    where: t.project || null,
    tags: t.value ? ["money"] : null,
    score: (t.overdue ? 100 : 0) + (t.parts ? 10 : 0) + (60 - Math.min(dueIn == null ? 60 : dueIn * 8, 60)) + (t.est ? Math.max(0, 20 - t.est / 5) : 0),
    why: t.overdue ? "Overdue, and nothing else moves until it is closed"
      : t.parts && t.parts.some((p) => p.done) ? "Already started: " + t.parts.filter((p) => p.done).length + " of " + t.parts.length + " parts closed"
      : t.est && t.est >= 180 ? "The longest thing here — it needs the day's biggest gap"
      : t.est && t.est <= 20 ? "Short enough to clear before the long work starts"
      : t.value ? "Money waiting on one action"
      : null
  });

  if (debt.length) days.push({ key: "over", label: "Overdue", overdue: true, free: null, tasks: debt.map((t) => shape(t, -1, true)) });

  for (let i = 0; i < 7; i++) {
    const date = CA_TODAY + i;
    const weekend = i === 4 || i === 5;
    const room = (i === 0 ? CA_FREE_TODAY : weekend ? 3 : (free || 6)) * 60;
    const own = tasks.filter((t) => !t.noSlot && !t.overdue && caDueDay(t) === date);
    /* Decide the move first, from tasks that carry only their facts. */
    const plain = own.filter((t) => !t.done).map((t) => Object.assign({}, t, { dueIn: i }));
    const shed = caShed(plain, room);
    const leaving = {};
    if (shed) shed.moves.forEach((t) => { leaving[t.id] = true; });
    /* A deadline today is an alarm only when the day cannot absorb it AND the
       day is not already offering to move it. */
    const shaped = own.map((t) => shape(t, i, !!shed && i <= 0 && !leaving[t.id] && !t.done));
    days.push({
      key: date,
      label: date + " Sep · " + CA_LABELS[i],
      today: i === 0,
      weekend: weekend,
      free: room / 60,
      overflow: shed ? { over: shed.over, moves: shed.moves.map((m) => shaped.filter((t) => t.id === m.id)[0] || m) } : null,
      tasks: shaped
    });
  }

  const undated = tasks.filter((t) => !t.noSlot && !t.overdue && caDueDay(t) === null);
  if (undated.length) days.push({ key: "none", label: "No date", free: null, tasks: undated.map((t) => shape(t, null, false)) });
  return days;
}

/* THE OVERLOADED DAY. A button that silently moves three tasks is a button you
 * press once, so the day names what would leave BEFORE anything moves: the
 * lowest-ranked open tasks, in order, until the day fits its free hours. The
 * list is the promise; pressing it is the only thing left to decide. */
function caOverflow(day) {
  /* The day worked this out when it was built, at the same moment it decided
     which of its tasks must not slip — asking again here is how the two came
     to disagree. */
  return day.overflow || null;
}

function caOverflowLegacy(day) {
  if (day.free == null) return null;
  const open = (day.tasks || []).filter((t) => !t.done);
  const load = open.reduce((s, t) => s + (t.est || 0), 0);
  const room = day.free * 60;
  if (load <= room) return null;
  const over = load - room;
  const rank = { now: 0, soon: 1, later: 2, none: 3 };
  /* Least important first, and within that the smallest — so a set is built
     out of the cheapest things to give up, not the heaviest. */
  const spare = open.filter((t) => t.priority !== "now");
  const pool = (spare.length ? spare : open).slice()
    .sort((a, b) => (rank[b.priority] - rank[a.priority]) || ((a.est || 0) - (b.est || 0)));
  /* Two candidate sets, and the one that takes LESS time out of the day wins.
     A single covering task is not preferred on principle — preferring it
     unconditionally is what proposed shedding four hours to recover one. The
     measure is the only thing that matters here: how much work leaves the day.
     A tie goes to the smaller set, because one move is easier to accept than
     two. */
  const accrued = [];
  let left = over;
  pool.forEach((t) => { if (left > 0) { accrued.push(t); left -= (t.est || 0); } });
  const single = pool.filter((t) => (t.est || 0) >= over)[0];
  const total = (set) => set.reduce((n, t) => n + (t.est || 0), 0);
  const best = single && (total([single]) < total(accrued)
    || (total([single]) === total(accrued) && accrued.length > 1)) ? [single] : accrued;
  return { over: over, moves: best };
}

function ColumnsScreen({ tasks, onOpen }) {
  const [sort, setSort] = React.useState("ai");
  const [moved, setMoved] = React.useState(null);
  const [pushed, setPushed] = React.useState({});
  const [done, setDone] = React.useState({});

  const live = tasks.map((t) => (done[t.id] != null ? Object.assign({}, t, { done: done[t.id] }) : t))
    .map((t) => (pushed[t.id] ? Object.assign({}, t, { due: pushed[t.id] + " Sep", overdue: false }) : t));
  const days = caColumns(live).map((d) => (d.overdue
    ? Object.assign({}, d, { action: "Reschedule", onAction: () => reschedule(d) })
    : d));

  function toggle(id) { setDone((s) => Object.assign({}, s, { [id]: !live.filter((t) => t.id === id)[0].done })); }
  function reschedule(day) {
    const debt = (day.tasks || []).filter((t) => !t.done);
    if (!debt.length) return;
    const next = {};
    debt.forEach((t) => { next[t.id] = CA_TODAY; });
    setPushed((s) => Object.assign({}, s, next));
    setMoved(debt.length + (debt.length === 1 ? " task moved to today" : " tasks moved to today"));
  }
  /* Moving the overflow out is the same operation as clearing the debt, in the
     other direction: it names what leaves, then puts it on the next day. */
  function shed(day, moves) {
    const next = {};
    moves.forEach((t) => { next[t.id] = (typeof day.key === "number" ? day.key : CA_TODAY) + 1; });
    setPushed((s) => Object.assign({}, s, next));
    setMoved(moves.length + (moves.length === 1 ? " task moved to the next day" : " tasks moved to the next day"));
  }

  return (
    <ColumnsView days={days} sort={sort} onSort={setSort} onToggle={toggle} onOpen={onOpen}
      onAdd={() => {}} onReschedule={reschedule} onShed={shed} overflowOf={caOverflow}
      rescheduled={moved} onUndo={() => { setPushed({}); setMoved(null); }} />
  );
}

Object.assign(window, { ColumnsScreen, caColumns, caOverflow, caPriority });
