/* THE CALENDAR — the week as a working surface.
 *
 * Height is duration at 46px an hour, floored at one line, so a quarter hour
 * overlaps the slot below rather than lying about its length. The grid opens
 * on the working hours and expands to the whole day on request — the night is
 * a fold, not a deletion.
 *
 * The blocks are the product's blocks: BlockDesigns.jsx owns what a task and
 * an event look like, this file owns where they go. Rail language, the fire
 * skin, parts and entries all come from there unchanged.
 */
const CAL_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const WEEK_VISIBLE = 5;
const CAL_GUTTER_W = 68;

const WEEK_GRID = { start: 9, end: 18, hourH: 56 };
const FULL_GRID = { start: 0, end: 24 };

const WEEK_DAYS = [
  { weekday: "MON", date: 31, month: "Aug", items: [
    { kind: "task", title: "Walk before work", time: "08:15–08:45", start: 8.25, end: 8.75, habit: true },
    { kind: "event", title: "Standup", time: "09:30–09:45", start: 9.5, end: 9.75, calendar: "work", source: "slack" },
    { kind: "task", title: "Weekly planning", time: "10:00–11:00", start: 10, end: 11, project: "ops", dueIn: 0, parts: { closed: 2, total: 2 } },
    { kind: "event", title: "Design review", time: "14:00–15:00", start: 14, end: 15, calendar: "work", source: "google" },
    { kind: "task", title: "Invoices", time: "16:30–17:15", start: 16.5, end: 17.25, movable: true, project: "ops", dueIn: 2 }
  ] },
  { weekday: "TUE", date: 1, month: "Sep", today: true, items: [
    { kind: "task", title: "Walk before work", time: "08:15–08:45", start: 8.25, end: 8.75, habit: true },
    { kind: "event", title: "Factory call", time: "12:00–12:30", start: 12, end: 12.5, calendar: "work", source: "google" },
    { kind: "task", title: "Photograph the shell", time: "13:00–13:40", start: 13, end: 13.667, movable: true, project: "resale",
      parts: { closed: 1, total: 3 } },
    { kind: "task", title: "Draft the launch brief", time: "09:30–11:00", start: 9.5, end: 11, movable: true, project: "ops", priority: "high",
      dueIn: 3, parts: { closed: 1, total: 3 }, entry: "Pull last month's numbers", heat: 0.7 },
    { kind: "task", title: "Reply to counsel", time: "11:00–11:30", start: 11, end: 11.5, movable: true, overdue: true, project: "ops" },
    { kind: "event", title: "1:1 Anna", time: "15:00–15:45", start: 15, end: 15.75, calendar: "work", source: "google" },
    { kind: "task", title: "Book the dentist", time: "17:00–17:15", start: 17, end: 17.25, movable: true, dueIn: 6 }
  ] },
  { weekday: "WED", date: 2, month: "Sep", items: [
    { kind: "task", title: "Reply to counsel", time: "08:30–09:00", start: 8.5, end: 9, movable: true, overdue: true, project: "ops" },
    { kind: "task", title: "Deep work", time: "09:00–11:00", start: 9, end: 11, movable: true, project: "ds", dueIn: 1, parts: { closed: 2, total: 2 }, heat: 0.5 },
    { kind: "event", title: "Factory call", time: "13:00–14:00", start: 13, end: 14, calendar: "work", source: "google" },
    { kind: "task", title: "Print files to the factory", time: "14:00–15:30", start: 14, end: 15.5, movable: true, project: "ops",
      dueIn: 6, parts: { closed: 0, total: 4 }, entry: "Open the courier's portal", heat: 0.7 }
  ] },
  { weekday: "THU", date: 3, month: "Sep", items: [
    { kind: "task", title: "Walk before work", time: "08:15–08:45", start: 8.25, end: 8.75, habit: true },
    { kind: "event", title: "1:1 Anna", time: "11:00–11:45", start: 11, end: 11.75, calendar: "work", source: "google" },
    { kind: "task", title: "Sign the factory quote", time: "12:00–12:45", start: 12, end: 12.75, movable: true, project: "ops",
      priority: "high", entry: "Open the quote PDF" },
    { kind: "task", title: "Landing page copy", time: "14:00–16:00", start: 14, end: 16, movable: true, project: "ds", dueIn: 4,
      parts: { closed: 0, total: 3 }, entry: "Write the first sentence" },
    { kind: "task", title: "Ship the camera body", time: "16:15–16:45", start: 16.25, end: 16.75, movable: true, project: "resale", source: "linear" }
  ] },
  { weekday: "FRI", date: 4, month: "Sep", items: [
    { kind: "task", title: "Print files to the factory", time: "10:00–11:30", start: 10, end: 11.5, movable: true, project: "ops",
      parts: { closed: 2, total: 4 }, entry: "Open the courier's portal", source: "slack" },
    { kind: "event", title: "Lunch with Anna", time: "13:00–14:00", start: 13, end: 14, calendar: "personal" },
    { kind: "task", title: "German", time: "18:00–19:00", start: 18, end: 19, project: "de", habit: true },
    { kind: "task", title: "Walk before work", time: "08:15–08:45", start: 8.25, end: 8.75, habit: true }
  ] },
  { weekday: "SAT", date: 5, month: "Sep", items: [] },
  { weekday: "SUN", date: 6, month: "Sep", items: [] }
];

const ALL_DAY = [
  { title: "Berlin trip", calendar: "personal", from: 0, to: 2 },
  { title: "Invoice due", calendar: "work", from: 4, to: 4 }
];

/* The head is centred, and it is a place to act on the day rather than only to
   read it: hovering reveals the same day menu the mini month carries. */
function DayHead({ d, selected, onSelect }) {
  const on = d.today;
  const [hot, setHot] = React.useState(false);
  const [menu, setMenu] = React.useState(null);
  const head = React.useRef(null);
  function openMenu() {
    const r = head.current.getBoundingClientRect();
    setMenu({ x: Math.max(8, Math.min(r.left, window.innerWidth - 276)), y: r.bottom + 4, date: d.date });
  }
  return (
    <div ref={head} style={{ position: "relative" }} onMouseEnter={() => setHot(true)} onMouseLeave={() => setHot(false)}>
      <button type="button" onClick={() => onSelect(d.date)}
        style={{ display: "flex", alignItems: "baseline", gap: 7, width: "100%", height: 34, padding: "0 8px", border: 0, cursor: "default",
          background: "transparent", textAlign: "left" }}>
        <span style={{ font: "var(--weight-medium) 15px / 18px var(--font-sans)", fontVariantNumeric: "tabular-nums",
          color: on ? "var(--accent)" : "var(--text-secondary)" }}>{d.date}</span>
        <span style={{ font: "var(--type-meta)", letterSpacing: "0.04em", textTransform: "uppercase",
          color: on ? "var(--accent)" : "var(--text-quaternary)" }}>{d.weekday}</span>
      </button>
      {hot || menu ? (
        <span style={{ position: "absolute", right: 4, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
          <IconButton label={"Actions for " + d.date + " " + d.month} variant="ghost" size="sm" onClick={openMenu}>
            <Icon name="ellipsis" size={14} />
          </IconButton>
        </span>
      ) : null}
      {menu ? <DayMenu at={menu} onClose={() => setMenu(null)} /> : null}
    </div>
  );
}

/* Side by side only where the times actually intersect. */
function lanesOf(items) {
  const sorted = items.slice().sort((a, b) => a.start - b.start);
  const out = [];
  sorted.forEach((b) => {
    const clash = out.filter((p) => b.start < p.b.end && p.b.start < b.end);
    const lane = clash.length;
    out.push({ b: b, lane: lane, of: lane + 1 });
    clash.forEach((p) => { p.of = Math.max(p.of, lane + 1); });
  });
  return out;
}

function clockOf(h, h24) {
  if (h24) return hhmmOf(h);
  const n = Math.floor(h) % 24;
  const m = Math.round((h - Math.floor(h)) * 60);
  const s = n % 12 === 0 ? 12 : n % 12;
  return s + (m ? ":" + String(m).padStart(2, "0") : "") + (n < 12 ? " am" : " pm");
}

function WeekGrid({ days, railBy, onOpen, drag, dragProps, dropRequest, opts, lead }) {
  const o = opts || { h24: true, shade: true, weekStart: "mon" };
  const g = { start: FULL_GRID.start, end: FULL_GRID.end, hourH: WEEK_GRID.hourH };
  const [aim, setAim] = React.useState(null);
  const gridBox = React.useRef(null);
  const [edit, setEdit] = React.useState(null);
  const scroller = React.useRef(null);
  const now = 13.4;
  const top = (v) => (v - g.start) * g.hourH;
  const bodyH = (g.end - g.start) * g.hourH;
  const hours = [];
  for (let h = g.start; h <= g.end; h++) hours.push(h);


  /* THE COLUMN AND THE LANDING, measured from the element itself.
   *
   * Both used to hang off a render pass, and both kept losing the race: the
   * assignment ran against a layout that had not committed the column, and the
   * retry died when a re-render cancelled its frame with the ref detached. The
   * observer is the right owner — it holds the element in its own closure and
   * fires whenever the box changes, which is exactly the signal that was
   * missing. It assigns, reads back, and stops only when the scroller agrees. */
  const [colW, setColW] = React.useState(0);
  const inView = Math.min(days.length, WEEK_VISIBLE);
  React.useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    let landed = false;
    let landedAt = 0;
    const wantTop = (WEEK_GRID.start - FULL_GRID.start) * WEEK_GRID.hourH - 8;
    function sync() {
      const w = (el.clientWidth - CAL_GUTTER_W) / inView;
      if (w > 0) setColW(w);
      /* A landing computed at a stale width is not a landing. */
      if (Math.abs(w - landedAt) > 0.5) landed = false;
      if (landed || !lead || w <= 0) return;
      landedAt = w;
      const wantLeft = lead * w;
      if (el.scrollWidth <= el.clientWidth) return;
      el.scrollTop = wantTop;
      el.scrollLeft = wantLeft;
      if (Math.abs(el.scrollLeft - wantLeft) < 2) landed = true;
    }
    sync();
    /* Until it takes, keep asking every frame — a detached moment or an
       uncommitted column costs one frame, never the landing. */
    let n = 0;
    let id = window.requestAnimationFrame(function tick() {
      sync();
      if (!landed && ++n < 40) id = window.requestAnimationFrame(tick);
    });
    let ro = null;
    if (typeof ResizeObserver !== "undefined") { ro = new ResizeObserver(sync); ro.observe(el); }
    return () => { window.cancelAnimationFrame(id); if (ro) ro.disconnect(); };
  }, [lead, inView]);

  const cols = CAL_GUTTER_W + "px repeat(" + days.length + ", " + (colW || 180) + "px)";
  return (
    <div ref={scroller} className="scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
      <div style={{ width: CAL_GUTTER_W + days.length * (colW || 180), minWidth: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 60, background: "var(--background)" }}>
      <div style={{ display: "grid", gridTemplateColumns: cols }}>
        <span className="cal-stick" />
        {days.map((d, i) => <DayHead key={i} d={d} selected={-1} onSelect={() => {}} />)}
      </div>

      {/* All-day: one row, spanning the days it covers. */}
      <div style={{ display: "grid", gridTemplateColumns: cols, gridAutoRows: 28, minHeight: 28,
        boxShadow: "var(--border) 0 -1px 0 0 inset" }}>
        <span className="cal-stick" style={{ gridRow: 1, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 11, font: "var(--type-meta)", color: "var(--text-disabled)", whiteSpace: "nowrap" }}>all-day</span>
        {ALL_DAY.reduce((out, a) => {
          /* Which rendered columns does this cover, and in how many stretches?
             An entry absent from the run contributes nothing. */
          const hit = days.map((d, i) => (d.wi >= a.from && d.wi <= a.to ? i : -1)).filter((i) => i >= 0);
          const runs = [];
          hit.forEach((i) => {
            const last = runs[runs.length - 1];
            if (last && i === last[last.length - 1] + 1) last.push(i); else runs.push([i]);
          });
          return out.concat(runs.map((r) => ({ a: a, at: r[0], span: r.length })));
        }, []).map(({ a, at, span }) => {
          const c = (CALENDARS[a.calendar] || CALENDARS.work).color;
          return (
            <span key={a.title + at} style={{ gridRow: 1, gridColumn: (2 + at) + " / span " + span,
              margin: "3px 2px", display: "flex", alignItems: "center", padding: "0 8px", borderRadius: "var(--radius-sm)",
              background: "color-mix(in oklab, " + c + " 12%, var(--surface-raised))",
              boxShadow: "color-mix(in oklab, " + c + " 32%, transparent) 0 0 0 1px",
              font: "var(--type-meta)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</span>
          );
        })}
      </div>

      </div>

        {/* The first hour label sits half a line above its own hour, so the
            scrolled grid owes it that half line. */}
        <div style={{ position: "relative", display: "grid", gridTemplateColumns: cols, height: bodyH + 16, paddingTop: 16 }}
          onPointerEnter={(e) => { gridBox.current = e.currentTarget.getBoundingClientRect(); }}
          onPointerMove={(e) => {
            const r = gridBox.current || (gridBox.current = e.currentTarget.getBoundingClientRect());
            const t = g.start + (e.clientY - r.top) / g.hourH;
            /* setState with an equal value is a no-op in React, so the grid
               re-renders only when the snapped quarter-hour actually turns. */
            setAim(Math.max(g.start, Math.min(g.end, Math.round(t / SNAP) * SNAP)));
          }}
          onPointerLeave={() => { gridBox.current = null; setAim(null); }}
          onScrollCapture={() => { gridBox.current = null; }}>
          <div className="cal-stick cal-rail" style={{ position: "sticky", left: 0, zIndex: 50 }}>
            {hours.filter((h) => h < g.end).map((h) => (
              <span key={h} style={{ position: "absolute", left: 0, right: 8, top: top(h), transform: "translateY(-8px)",
                display: "flex", justifyContent: "center" }}>
                <span style={{ padding: "0 6px", background: "var(--background)",
                  font: "var(--type-meta-medium)", color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{clockOf(h, o.h24)}</span>
              </span>
            ))}
          </div>
          {days.map((d, di) => {
            const placed = lanesOf(d.items || []);
            const gaps = window.mnGaps ? window.mnGaps(d.items, WEEK_GRID.start, WEEK_GRID.end, g.hourH) : [];
            return (
              <div key={di} data-drop="timeline" data-date={d.date} style={{ position: "relative", minWidth: 0 }}>
                {(o.shade ? [[g.start, WEEK_GRID.start], [WEEK_GRID.end, g.end]] : []).map(([from, to], i) => (
                  to > from ? <span key={"off" + i} className="cal-off" aria-hidden="true"
                    style={{ position: "absolute", left: 0, right: 0, top: top(from), height: (to - from) * g.hourH }} /> : null
                ))}
                {/* Every offcut of the day, offering what fits in it. */}
                {window.MinuteBox ? gaps.map((gp, i) => (
                  <window.MinuteBox key={"gap" + i} gap={gp} tasks={window.NEEDT.tasks} hourH={g.hourH} top={top}
                    onPick={(t) => onOpen && onOpen(t)} />
                )) : null}
                {/* No rules across the day: the hour is stated once, in the
                    margin, and the block is the only thing drawn on the
                    column. */}
                {placed.map((p, i) => (
                  <div key={p.b.title + i} {...(dragProps ? dragProps(p.b, "move") : {})}
                    style={{ position: "absolute", top: top(p.b.start), height: blockHeight(p.b.end - p.b.start, g.hourH),
                      left: "calc(" + (p.lane / p.of * 100) + "% + 8px)",
                      width: "calc(" + (100 / p.of) + "% - 14px)",
                      opacity: drag && isDragged(drag, p.b) ? 0.35 : 1, zIndex: 1 + p.lane }}>
                    <Block b={p.b} railBy={railBy} compact={(p.b.end - p.b.start) <= 0.5}
                      onToggle={() => {}} onClick={() => onOpen && onOpen(p.b)} />
                  </div>
                ))}
                {/* Where the drop would land, drawn before the drop happens. */}
                {drag && drag.over && drag.over.kind === "timeline" && drag.over.date === d.date ? (() => {
                  const start = snapTime(drag.over.time);
                  const dur = (drag.item.est || 30) / 60;
                  const no = blockedLanding(d.items || [], start, start + dur, d.today ? now : null);
                  return (
                    <div className={"drop-preview" + (no ? " drop-preview-no" : "")}
                      style={{ position: "absolute", left: 2, right: 2, top: top(start), height: blockHeight(dur, g.hourH), zIndex: 20 }}>
                      <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>{hhmmOf(start)}</span>
                      <span style={{ font: "var(--type-meta)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{no || drag.item.title}</span>
                    </div>
                  );
                })() : null}
                {d.today ? (
                  <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: top(now), height: 0, zIndex: 30 }}>
                    <span style={{ position: "absolute", left: 0, right: 0, top: 0, borderTop: "1px solid var(--accent)" }} />
                    <span style={{ position: "absolute", left: 0, top: -3, width: 6, height: 6, borderRadius: 3, background: "var(--accent)" }} />
                  </span>
                ) : null}
              </div>
            );
          })}
          {aim !== null && !drag && !edit ? (
            <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: top(aim), height: 0, zIndex: 3, pointerEvents: "none" }}>
              <span style={{ position: "absolute", left: 56, right: 0, top: 0, height: 0, borderTop: "1px dashed var(--text-secondary)" }} />
              <span className="cal-aim-time" style={{ position: "sticky", left: 0, float: "left", width: 56, marginTop: -7, zIndex: 51, paddingRight: 11, textAlign: "right",
                font: "var(--type-meta-medium)", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{clockOf(aim, o.h24)}</span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* MONTH is density and pattern: which days are heavy, where the free space is. */
function MonthView({ selected, onSelect, onOpen, days }) {
  const cells = [];
  /* The lead-in comes from the week the screen already declares — 1 Sep is the
     TUE entry, so it sits at index 1 — never from a literal, which is how the
     month came to disagree with the week about what day it is. */
  const lead = Math.max(WEEK_DAYS.map((d) => d.month === "Sep" && d.date === 1).indexOf(true), 0);
  for (let i = 0; i < 42; i++) {
    const date = i - lead + 1;
    const other = date < 1 || date > 30;
    const day = WEEK_DAYS.filter((d) => d.date === date && d.month === "Sep")[0];
    cells.push({ date: other ? (date < 1 ? 31 + date : date - 30) : date, other: other, today: date === 1,
      items: other ? [] : day ? day.items : WEEK_DAYS[date % 5].items.slice(0, (date * 2) % 4) });
  }
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0,1fr))", flex: "none" }}>
        {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((d) => (
          <span key={d} style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 28, font: "var(--type-meta-medium)", color: "var(--text-quaternary)" }}>{d}</span>
        ))}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateRows: "repeat(6, minmax(0,1fr))", gridTemplateColumns: "repeat(7, minmax(0,1fr))",
        borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-ring)" }}>
        {cells.map((cell, i) => (
          <div key={i} onClick={() => onSelect && onSelect(cell.date)}
            style={{ minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column", gap: 2, padding: 5,
              background: cell.other ? "var(--fill-2)" : "var(--surface-raised)", boxShadow: "var(--border) -1px -1px 0 0 inset" }}>
            <span style={{ display: "grid", placeItems: "center", minWidth: 20, height: 20, borderRadius: "var(--radius-sm)",
              boxShadow: cell.today ? "var(--accent) 0 0 0 1.5px inset" : "none",
              font: "var(--type-meta-medium)", color: cell.today ? "var(--accent)" : cell.other ? "var(--text-disabled)" : "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>{cell.date}</span>
            {(cell.items || []).slice(0, 3).map((b, j) => {
              const task = b.kind !== "event";
              const c = (CALENDARS[b.calendar] || CALENDARS.work).color;
              return (
                <span key={j} onClick={() => onOpen && onOpen(b)}
                  style={{ display: "flex", alignItems: "center", gap: 5, height: 18, padding: task ? "0 5px 0 0" : "0 5px", borderRadius: "var(--radius-xs)", overflow: "hidden",
                    background: task ? "var(--surface-raised)" : "color-mix(in oklab, " + c + " 12%, var(--surface-raised))",
                    boxShadow: task ? "var(--shadow-ring)" : "none" }}>
                  {task ? <span aria-hidden="true" style={{ flex: "none", width: 3, alignSelf: "stretch", background: railColor(b, "movability") }} /> : null}
                  <span style={{ flex: 1, minWidth: 0, font: "var(--type-meta)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{b.title}</span>
                </span>
              );
            })}
            {(cell.items || []).length > 3 ? (
              <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", paddingLeft: 2 }}>+{cell.items.length - 3} more</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function CalendarScreen({ tasks, onOpen, hourHeight, drag, dragProps, dropRequest, view, opts }) {
  const [selected, setSelected] = React.useState(1);
  const o = opts || { h24: true, shade: true, weekStart: "mon" };
  const week = o.weekStart === "sun" ? WEEK_DAYS.slice(-1).concat(WEEK_DAYS.slice(0, -1)) : WEEK_DAYS;
  /* The grid is a continuous run of days, seven of them in view: the week
     before and the week after are scrolled to, not switched to. Their loads
     differ, so density reads as real rather than repeated. */
  /* Dates come from a real calendar, not from arithmetic on a day number: a
     single modulus assumes one month length, and this week already spans two —
     31 August plus seven gave 8 September, the same day Tuesday produces, so
     the run lost the 7th and advertised two columns as the 8th. The anchor is
     the day the data itself calls 1 September. */
  const ANCHOR = new Date(2026, 8, 1);
  const anchorAt = Math.max(week.map((d) => d.date === 1 && d.month === "Sep").indexOf(true), 0);
  const runs = [-1, 0, 1].map((k) => week.map((d, i) => {
    if (k === 0) return Object.assign({}, d, { wi: i });
    const day = new Date(ANCHOR);
    day.setDate(ANCHOR.getDate() + (i - anchorAt) + k * 7);
    return Object.assign({}, d, {
      wi: i, date: day.getDate(), month: CAL_MONTHS[day.getMonth()], today: false,
      items: (d.items || []).slice(0, k < 0 ? (i % 2) + 1 : (i + 1) % 3)
    });
  }));
  const days = view === "day" ? runs[1].filter((d) => d.today) : runs[0].concat(runs[1], runs[2]);
  return (
    <div key={view + o.weekStart} className="screen-enter" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <div className="cal-sheet" style={{ display: "flex", flexDirection: "column", gap: 11, flex: 1, minHeight: 0,
        padding: "4px 0 0" }}>
        {view === "columns" ? (
        /* A column per day and no hour scale — the day is as long as its list,
           so nothing here can lie about duration. */
        <ColumnsScreen tasks={tasks || []} onOpen={onOpen} />
      ) : view === "month" ? (
          <MonthView selected={selected} onSelect={setSelected} onOpen={onOpen} days={WEEK_DAYS} drag={drag} />
        ) : (
          <>
            <WeekGrid days={days} railBy="movability" opts={o} lead={view === "day" ? 0 : 7}
              onOpen={onOpen} drag={drag} dragProps={dragProps} dropRequest={dropRequest} />
          </>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { CalendarScreen, WeekGrid, MonthView, DayHead, WEEK_DAYS, WEEK_GRID });
