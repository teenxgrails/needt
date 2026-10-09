/* THE COLUMNS VIEW — a column per day, and the product's main view.
 *
 * There is no hour scale here, which is the whole reason it can be the main
 * view: nothing can lie about duration, so a card is as tall as what it has to
 * say and a day is as long as its list. The grid stays for the hours you have
 * actually agreed to; this is for the work.
 *
 * THREE THINGS THE REFERENCE GETS RIGHT AND MOST PLANNERS DO NOT
 *   Overdue is a column, pinned first, with one action in its header — the
 *   debt gets a place instead of seeping into every day.
 *   The day's header states its load, so heaviness is read rather than felt.
 *   The ring is the priority: an outline, not a filled dot, so an unstarted
 *   task never looks like a finished one.
 *
 * AND ONE IT MISSES: a count does not say whether the day is survivable. The
 * header carries the SUM of the estimates against the free hours, and goes
 * destructive when the day is oversubscribed. That is the only number here
 * that changes what you do next.
 *
 * SORTING IS THE FEATURE, so the order explains itself: in the AI order each
 * card says why it is where it is. An order nobody can account for is
 * indistinguishable from a random one, and it does not get trusted twice.
 */
const CvNS = window.NeedtDesignSystem_25d3c8;
const { Icon: CvIcon, IconButton: CvIconButton, Button: CvButton, Tooltip: CvTooltip, Select: CvSelect } = CvNS;

/* The ring is the priority. Four steps, and the lowest one still has a ring —
   "no priority" is a state, not a gap. */
const CV_PRIORITY = {
  now:    { ink: "var(--destructive)", name: "Do it now" },
  soon:   { ink: "var(--info)",        name: "Soon" },
  later:  { ink: "var(--accent)",      name: "Later" },
  none:   { ink: "var(--text-muted)",  name: "No priority" }
};

const CV_SORTS = [
  { id: "manual", label: "Manual" },
  { id: "time", label: "Time in the day" },
  { id: "importance", label: "Importance" },
  { id: "deadline", label: "Deadline" },
  { id: "ai", label: "Needt's order" },
  { id: "short", label: "Shortest first" }
];

/* A project owns a colour and an icon — the same map the grid block uses,
   resolved from a projectId or a name by the one registry in Data.js. */
function cvProject(ref) {
  const n = ref && window.NEEDT ? window.NEEDT.project(ref) : null;
  const p = n && window.RB_PROJECTS ? window.RB_PROJECTS[n.id] : null;
  /* The neutral is the block's, not a second one kept in step by hand. */
  return p || window.RB_NEUTRAL || { color: "var(--text-tertiary)", icon: "list-checks" };
}

function cvDur(min) {
  const h = Math.floor(min / 60), m = min % 60;
  if (!min) return "0 min";
  return h ? h + " h" + (m ? " " + m + " min" : "") : m + " min";
}

/* THE CARD. Everything on it is a fact the column cannot state: the priority,
   one line of context, where it lives, what kind of thing it is, and what it
   costs. Nothing decorative, and nothing that repeats the column header. */
function CvCard({ t, sort, dragging, compact, dense, onToggle, onOpen }) {
  const RichBlock = window.RichBlock;
  const el = React.useRef(null);
  const [dark, setDark] = React.useState(true);
  React.useLayoutEffect(() => {
    if (!el.current) return;
    const scope = el.current.closest(".app");
    setDark(!/\bpaper\b|\bwarm\b/.test(scope ? scope.className : ""));
  }, []);

  /* One translation from a task to the block, shared with the grid and the
     Workspace table — see rbShape in RichBlock.jsx. */
  const rich = window.rbShape(t, { layout: "card", dense: dense, reason: sort === "ai" });

  return (
    <article ref={el} onClick={onOpen} style={{ opacity: dragging ? 0.4 : 1 }}>
      {RichBlock ? <RichBlock b={rich} weight="open" fit dark={dark} onToggle={onToggle} /> : null}
    </article>
  );
}

/* THE COLUMN HEADER. The count says how many; the sum says whether the day
   survives them. Over the free hours it goes destructive, because that is the
   moment the plan stops being a plan. */
function CvHead({ day, overflow, onShed }) {
  const open = (day.tasks || []).filter((t) => !t.done);
  const load = open.reduce((s, t) => s + (t.estimatedMinutes || 0), 0);
  const over = day.free != null && load > day.free * 60;
  return (
    <header style={{ display: "flex", alignItems: "baseline", gap: 8, height: 34, flex: "none", minWidth: 0 }}>
      <span style={{ flex: "none", font: "var(--type-card-title)", fontSize: 14,
        color: day.today ? "var(--accent)" : day.weekend ? "var(--text-tertiary)" : "var(--text-primary)", whiteSpace: "nowrap" }}>
        {day.label}
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 6, whiteSpace: "nowrap" }}>
        {open.length ? (
          <CvTooltip label={day.free == null ? cvDur(load) + " of work" : cvDur(load) + " of work in " + day.free + " h free"} side="bottom">
            <span style={{ font: "var(--type-meta)", color: over ? "var(--destructive)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{open.length}</span>
          </CvTooltip>
        ) : null}
      </span>
      {/* The one gesture the debt column offers, as a mark rather than a
          sentence — it is an action, and an action does not need a paragraph. */}
      {day.action ? (
        <CvTooltip label="Move everything overdue to today" side="bottom">
          <CvIconButton label="Reschedule everything overdue" variant="ghost" size="sm" onClick={day.onAction}>
            <CvIcon name="rotate-ccw" size={14} />
          </CvIconButton>
        </CvTooltip>
      ) : null}
    </header>
  );
}

/* THE OVERLOAD NOTICE. The day is over its free hours, so it names what would
   leave — by title, in order, before anything moves. A button that silently
   moves three tasks is a button you press once; this one is a promise you can
   read first, and the only thing left to decide is whether to accept it. */
function CvOverflow({ over, onShed }) {
  const names = over.moves.map((t) => t.title).join(", ");
  return (
    <button type="button" onClick={onShed} title={"Move to the next day: " + names}
      style={{ flex: "none", display: "flex", alignItems: "center", gap: 7, width: "100%", minWidth: 0, height: 26, padding: "0 8px",
        border: 0, cursor: "default", borderRadius: "var(--radius-md)", background: "transparent", textAlign: "left",
        transition: "background-color var(--transition-hover)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-destructive)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      <span aria-hidden="true" style={{ flex: "none", width: 6, height: 6, borderRadius: 3, background: "var(--destructive)" }} />
      <span style={{ flex: 1, minWidth: 0, font: "var(--type-meta)", color: "var(--text-secondary)",
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {cvDur(over.over)} over — move {over.moves.length === 1 ? names : over.moves.length + " tasks"}
      </span>
    </button>
  );
}

function CvColumn({ day, sort, onToggle, onOpen, onAdd, overflow, onShed }) {
  return (
    <section style={{ flex: "0 0 auto", width: 268, minWidth: 0, display: "flex", flexDirection: "column", gap: 8,
      scrollSnapAlign: "start", opacity: day.weekend ? 0.82 : 1 }}>
      <CvHead day={day} />
      {overflow ? <CvOverflow over={overflow} onShed={() => onShed(day, overflow.moves)} /> : null}
      <div className="scroll-inner" data-col-scroll="1" style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
        {cvParted(day.tasks || []).map((row) => (row.part ? (
          <span key={row.part} style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: row.first ? 0 : 6 }}>
            <span style={{ flex: "none", font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>{row.part}</span>
            <span aria-hidden="true" style={{ flex: 1, borderTop: "1px solid var(--border)" }} />
          </span>
        ) : (
          <CvCard key={row.t.id} t={row.t} sort={sort} onToggle={() => onToggle(row.t.id)} onOpen={onOpen} />
        )))}
        {!(day.tasks || []).length ? (
          <span style={{ font: "var(--type-meta)", fontStyle: "italic", color: "var(--text-disabled)", padding: "2px 2px 6px" }}>
            {day.weekend ? "Left alone — the scheduler does not fill weekends." : "Nothing here yet."}
          </span>
        ) : null}
        <button type="button" onClick={onAdd}
          style={{ display: "flex", alignItems: "center", gap: 7, height: 30, padding: "0 8px", border: 0, cursor: "default",
            borderRadius: "var(--radius-md)", background: "transparent", font: "var(--type-ui)", color: "var(--text-muted)",
            transition: "background-color var(--transition-hover)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-2)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
          <CvIcon name="plus" size={14} />Add task
        </button>
      </div>
    </section>
  );
}

/* The sort applied. Manual is the stored order and is never re-sorted, which
   is what makes it worth having. */
/* The parts of a day, in the order they happen. A task with an hour belongs to
   the part that contains it; a task without one belongs to no part, so it sits
   under "Any time" rather than being invented into a slot. */
function cvParted(tasks) {
  const atOf = (t) => window.NEEDT.at(t);
  const partOf = (t) => (atOf(t) == null ? "Any time" : atOf(t) < 12 ? "Morning" : atOf(t) < 17 ? "Afternoon" : "Evening");
  const order = ["Morning", "Afternoon", "Evening", "Any time"];
  const out = [];
  let seen = null;
  tasks.slice().sort((a, b) => order.indexOf(partOf(a)) - order.indexOf(partOf(b))).forEach((t) => {
    const p = partOf(t);
    if (p !== seen) { out.push({ part: p, first: !out.length }); seen = p; }
    out.push({ t: t });
  });
  return out;
}

function cvSort(tasks, sort) {
  const list = tasks.slice();
  const rank = { now: 0, soon: 1, later: 2, none: 3 };
  if (sort === "importance") list.sort((a, b) => rank[a.priority || "none"] - rank[b.priority || "none"]);
  if (sort === "deadline") list.sort((a, b) => (a.dueIn == null ? 99 : a.dueIn) - (b.dueIn == null ? 99 : b.dueIn));
  if (sort === "short") list.sort((a, b) => (a.estimatedMinutes || 999) - (b.estimatedMinutes || 999));
  if (sort === "time") list.sort((a, b) => (atOf(a) == null ? 99 : atOf(a)) - (atOf(b) == null ? 99 : atOf(b)));
  if (sort === "ai") list.sort((a, b) => (b.score || 0) - (a.score || 0));
  return list;
}

function ColumnsView({ days, sort, onSort, onToggle, onOpen, onAdd, onReschedule, onShed, overflowOf, rescheduled, onUndo }) {
  const strip = React.useRef(null);
  const nudge = (dir) => { if (strip.current) strip.current.scrollBy({ left: dir * 288, behavior: "smooth" }); };
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
        <CvSelect value={sort} onChange={onSort} style={{ width: 168 }}
          options={CV_SORTS.map((s) => ({ value: s.id, label: s.label }))} />
        <span style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          <CvIconButton label="Earlier days" variant="ghost" onClick={() => nudge(-1)}><CvIcon name="chevron-left" size={16} /></CvIconButton>
          <CvIconButton label="Later days" variant="ghost" onClick={() => nudge(1)}><CvIcon name="chevron-right" size={16} /></CvIconButton>
        </span>
        {/* A button that silently moves three tasks is a button you press
            once. It says what it did, and it can be taken back. */}
        {rescheduled ? (
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ font: "var(--type-meta)", color: "var(--text-tertiary)" }}>{rescheduled}</span>
            <CvButton size="sm" variant="ghost" onClick={onUndo}>Undo</CvButton>
          </span>
        ) : null}
      </div>
      <div className="scroll-inner cv-strip" ref={strip}
        onWheel={(e) => {
          /* A vertical wheel on a horizontal surface should move the surface,
             not nothing — unless the pointer is inside a column that has its
             own overflow to spend. */
          const col = e.target.closest ? e.target.closest("[data-col-scroll]") : null;
          if (col && col.scrollHeight > col.clientHeight + 1) return;
          if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
          e.currentTarget.scrollLeft += e.deltaY;
        }}
        onPointerDown={(e) => {
          if (e.target.closest && e.target.closest("article, button, input, [role=checkbox]")) return;
          const el = e.currentTarget;
          const x0 = e.clientX, l0 = el.scrollLeft;
          el.setPointerCapture(e.pointerId);
          const move = (m) => { el.scrollLeft = l0 - (m.clientX - x0); };
          const up = () => { el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); };
          el.addEventListener("pointermove", move);
          el.addEventListener("pointerup", up);
        }}
        style={{ flex: 1, minHeight: 0, display: "flex", gap: 20, overflowX: "auto", overflowY: "hidden",
          scrollSnapType: "x proximity", overscrollBehaviorX: "contain" }}>
        {days.map((d) => (
          <CvColumn key={d.key} day={Object.assign({}, d, { tasks: cvSort(d.tasks || [], d.overdue ? "importance" : sort) })}
            sort={sort} onToggle={onToggle} onOpen={onOpen} onAdd={() => onAdd(d.key)}
            overflow={overflowOf ? overflowOf(d) : null} onShed={onShed || (() => {})} />
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ColumnsView, CvCard, cvParted, CvColumn, CvHead, CvOverflow, cvSort, cvDur, cvProject, CV_SORTS, CV_PRIORITY });
