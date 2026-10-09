/* Block designs — the object every time surface draws.
 *
 * Settled: a TASK is the white block with a rail and a circle you can close
 * on the grid; an EVENT is tinted in its calendar's colour; a task that came
 * from Apple or Google stays white but takes its source calendar's rail.
 * Height is duration with a floor of one line — a 15-minute block is 26px and
 * overlaps the slot below rather than lying about its length.
 *
 * Open: what the rail MEANS. The system says movability and nothing else.
 * Maksym wants urgency. Both are implemented here as `railBy` so the two can
 * be judged on the same grid — see the note in blocks.html.
 */
const { Icon } = window.NeedtDesignSystem_25d3c8;

const CALENDARS = window.NEEDT.calendars;
const PROJECTS = {};
window.NEEDT.projects.forEach((p) => { PROJECTS[p.id] = p.color; });

/* Duration → height at 46px an hour, with the one-line floor. */
const BLOCK_MIN_H = 32;
function blockHeight(hours, hourH) {
  return Math.max(hours * (hourH || 46) - 4, BLOCK_MIN_H);
}

/* THE RAIL, both readings in one place.
   movability — grey fixed, project colour placed by the scheduler, red overdue.
   urgency    — red overdue, amber due today, accent due this week, grey beyond. */
function railColor(b, railBy) {
  if (railBy === "urgency") {
    if (b.overdue) return "var(--destructive)";
    if (b.dueIn === 0) return "var(--info)";
    if (b.dueIn != null && b.dueIn <= 7) return "var(--accent)";
    return "var(--text-muted)";
  }
  if (b.overdue) return "var(--destructive)";
  if (b.source) return CALENDARS[b.calendar] ? CALENDARS[b.calendar].color : "var(--text-muted)";
  return b.movable ? (b.color || PROJECTS[b.project] || "var(--accent)") : "var(--text-muted)";
}
function railWidth(b, railBy) {
  return railBy === "movability" && b.priority === "high" ? 6 : 3;
}

/* The circle: a task can be closed where it is read. Round, 16px, inset ring
   at rest; checked is the accent at 24% with the accent glyph — the checkbox
   rules, in the shape the calendar needs. */
function Circle({ done, onToggle }) {
  return (
    <span className={"docs-bd-circle-1 docs-bd-circle-s1" + (done ? " is-on" : "")} role="checkbox" aria-checked={!!done} onClick={(e) => { e.stopPropagation(); onToggle && onToggle(); }}>
      <Icon name="check" size={11} strokeWidth={2.25} />
    </span>
  );
}

/* Where a block came from, when it did not come from here. A 6px mark, not a
   logo: the source is a fact about the block, not a brand on it. */
function SourceMark({ source }) {
  if (!source) return null;
  return (
    <span className={"docs-bd-source-mark-1 docs-bd-source-mark-s1" + (source === "apple" ? " is-on" : "")} title={source === "apple" ? "Apple Calendar" : "Google Calendar"} />
  );
}

/* THE DIVIDED RAIL — a task with parts splits its rail into that many
   segments, closed ones solid and open ones at a quarter. Progress rides the
   stroke that already says who may move the block, so no new colour enters the
   grid. Below 40px there is no room to divide anything, and the counter in the
   meta row carries it instead. */
function Rail({ b, railBy, divided }) {
  const w = railWidth(b, railBy);
  const c = railColor(b, railBy);
  const total = b.parts && b.parts.total;
  if (!divided || !total) return <span className="docs-bd-rail-1" aria-hidden="true" style={{ width: w, background: c }} />;
  const seg = [];
  for (let i = 0; i < total; i++) seg.push(i);
  return (
    <span className="docs-bd-rail-2" aria-hidden="true" title={b.parts.closed + " of " + total + " parts closed"}
      style={{ width: w }}>
      {seg.map((i) => (
        <span className="docs-bd-rail-3" key={i} style={{ background: c, opacity: i < b.parts.closed ? 1 : 0.25 }} />
      ))}
    </span>
  );
}

/* THE CREST — a continuous run of tongues, not a scattering of marks. The
   count comes from the measured width (one tongue per 11px) and they sit
   edge to edge with a slight overlap, so the crest reads as one moving edge.
   `inward` keeps the tongues inside the object's own top edge, which is what a
   list row needs: an overhang there would paint over the row above. */
/* THE ENTRY — the two-minute step a task opens with, written as its first
   part. A block tall enough to hold a third line shows it, because the point
   of an entry is to be readable at the moment you look at the day. */
function Entry({ b }) {
  if (!b.entry) return null;
  return (
    <span className="docs-bd-entry-1">
      <Icon name="arrow-right" size={11} />
      <span className="docs-bd-entry-2">{b.entry}</span>
      <span className="docs-bd-entry-3">2 min</span>
    </span>
  );
}

function TimeText({ children, ink }) {
  return (
    <span className="docs-bd-time-text-1" style={{ color: ink || "var(--text-quaternary)" }}>{children}</span>
  );
}

/* The parts counter, block-sized. Same mark as the list row so a task reads
   the same wherever it is drawn. */
function PartCount({ b }) {
  if (!b.parts || !b.parts.total) return null;
  const complete = b.parts.closed === b.parts.total;
  return (
    <span className={"docs-bd-part-count-1 docs-bd-part-count-s1" + (complete ? " is-on" : "")} title={b.parts.closed + " of " + b.parts.total + " parts closed"}>{b.parts.closed}/{b.parts.total}</span>
  );
}

/* ── TASK — white, rail, circle. Two lines when the duration gives room for
   them, one when it does not. ───────────────────────────────────────────── */
/* The grid's item vocabulary, mapped onto the block's.
   project: the grid uses short keys, the block uses the project set.
   event:   an event has no project, so its calendar owns the hue and its
            source owns the tile — the same two slots, different owners. */
/* The seeds spell a project several ways; Data.js owns the aliases, so this
   is a resolution rather than a second table. */
function gridProject(ref) { const p = window.NEEDT.project(ref); return p ? p.id : null; }

/* The grid speaks in a time span and a calendar; everything else about a task
   is shaped by rbShape, so a fact added to the block appears here too. */
function toRich(b) {
  const t = String(b.time || "").split(/[–-]/);
  return Object.assign(window.rbShape(b, { layout: "block" }), {
    from: (t[0] || "").trim() || null,
    to: (t[1] || "").trim() || null,
    hue: b.kind === "event" ? (CALENDARS[b.calendar] || CALENDARS.work).color : (b.color || null),
    event: b.kind === "event",
    parts: b.parts ? b.parts.closed + "/" + b.parts.total : null,
    est: null
  });
}

/* A slot with nothing in it: recessed, never raised. */
function EmptyBlock() {
  return (
    <span className="docs-bd-empty-block-1" aria-hidden="true" />
  );
}

/* THE BLOCK MEASURES ITS OWN SLOT.
 *
 * Every caller already sizes the wrapper it puts a block in — the grid from
 * the duration, the day from the same — but none of them passes that number
 * down, so a block asked for its height got the component's fallback and drew
 * 168px inside a 31px slot. The block therefore reads its own box instead of
 * being told: one place to be right, and every existing call site keeps
 * working untouched.
 *
 * RichBlock needs a NUMBER, not a percentage — it gates the open layout on
 * h >= 56 and spends h down the collapse order — so the measurement is taken
 * in a layout effect, before paint, and kept current by an observer.
 *
 * The theme is read the same way, from the nearest .app ancestor, because
 * asking the document produces the wrong answer on a page that shows several
 * themes at once. */
function Block({ b, railBy, compact, onToggle, onClick, height }) {
  const el = React.useRef(null);
  const [box, setBox] = React.useState({ h: height || 0, dark: true });
  React.useLayoutEffect(() => {
    if (!el.current) return undefined;
    const scope = el.current.closest(".app");
    const cls = scope ? scope.className : "";
    const dark = !/\bpaper\b|\bwarm\b/.test(cls);
    const read = () => {
      const n = height || Math.round(el.current.getBoundingClientRect().height);
      setBox((s) => (s.h === n && s.dark === dark ? s : { h: n, dark: dark }));
    };
    read();
    if (height || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(read);
    ro.observe(el.current);
    return () => ro.disconnect();
  }, [height]);

  const RichBlock = window.RichBlock;
  return (
    <span className="docs-bd-block-1" ref={el} onClick={onClick}>
      {/* Until it is measured — and until the block script has evaluated — the
          slot holds its own shape rather than collapsing. */}
      {RichBlock && box.h ? (
        <RichBlock b={toRich(b)} weight={compact ? "compressed" : "open"} height={box.h} dark={box.dark} />
      ) : (
        <span className="docs-bd-block-2" aria-hidden="true" />
      )}
    </span>
  );
}


Object.assign(window, { Block, EmptyBlock, toRich, BLOCK_MIN_H, Circle, SourceMark, Rail, Entry, TimeText, PartCount,
  CALENDARS, PROJECTS, railColor, railWidth, blockHeight });
