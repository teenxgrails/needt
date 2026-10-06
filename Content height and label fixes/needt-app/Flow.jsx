/* FLOW — what is stuck, and what unsticks the most.
 *
 * List, Kanban and Gantt all answer "what is there". None of them answers the
 * question that costs a project a week: WHAT CANNOT MOVE, AND WHY. A blocked
 * task looks exactly like a task nobody has started, in all three.
 *
 * So this view draws the one thing the others cannot: the chain. Stages run
 * left to right, and a task that is waiting is joined by a line to the thing
 * it is waiting on — another task, or a person. The line is the content; the
 * columns are only where the line has to go.
 *
 * And it ranks. Every project view treats its items as equal; this one puts
 * the task that unblocks the most work at the top of the screen and names it,
 * because "what do I do first" has an answer and it is almost never the most
 * urgent thing.
 */
const FlNS = window.NeedtDesignSystem_25d3c8;
const { Icon: FlIcon, Button: FlButton } = FlNS;

function flHue(t) {
  const p = window.NEEDT.project(t.project);
  return (p && p.hue) || "var(--text-disabled)";
}

/* One card. Compressed on purpose: this view is read across, not down, and a
   rich card here would make the chain the second thing you see. */
function FlCard({ t, blocker, lead, onOpen, nodeRef }) {
  const hue = flHue(t);
  const stuck = !!blocker;
  return (
    <article ref={nodeRef} onClick={() => onOpen && onOpen(t)}
      style={{ position: "relative", display: "flex", flexDirection: "column", gap: 5, padding: "8px 10px",
        borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", cursor: "default",
        boxShadow: lead
          ? "inset 0 0 0 1.5px color-mix(in oklab, " + hue + " 62%, transparent), var(--shadow-raised)"
          : "var(--shadow-ring)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        <span aria-hidden="true" style={{ flex: "none", width: 6, height: 6, borderRadius: 3, background: hue }} />
        <span style={{ flex: 1, minWidth: 0, font: "var(--type-meta-medium)", color: "var(--text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
        {window.WsFace ? <window.WsFace who={t.holder || "you"} size={18} /> : null}
      </span>

      {/* Why it cannot move, in words, on the card — not in a panel. */}
      {stuck ? (
        <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          <FlIcon name="clock" size={11} />
          <span style={{ minWidth: 0, font: "var(--type-meta)", color: "var(--text-tertiary)",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {blocker.kind === "task"
              ? "After " + blocker.task.title
              : window.NEEDT.person(blocker.on).name + " — " + blocker.for}
          </span>
        </span>
      ) : null}
    </article>
  );
}

function flPath(l) {
  const r = Math.min(10, Math.abs(l.lane - l.x1), Math.abs(l.x2 - l.lane), Math.abs(l.y2 - l.y1) / 2);
  const dx1 = l.lane >= l.x1 ? 1 : -1;
  const dx2 = l.x2 >= l.lane ? 1 : -1;
  const dy = l.y2 >= l.y1 ? 1 : -1;
  return [
    "M", l.x1, l.y1,
    "L", l.lane - dx1 * r, l.y1,
    "Q", l.lane, l.y1, l.lane, l.y1 + dy * r,
    "L", l.lane, l.y2 - dy * r,
    "Q", l.lane, l.y2, l.lane + dx2 * r, l.y2,
    "L", l.x2, l.y2
  ].join(" ");
}

function FlowView({ tasks, onOpen }) {
  const open = tasks.filter((t) => !t.done);
  const wrap = React.useRef(null);
  const nodes = React.useRef({});
  const [lines, setLines] = React.useState([]);

  const stuck = open.filter((t) => window.NEEDT.blockerOf(t, tasks));
  /* Free, and holding up the most. That is the answer to "what first", and it
     is almost never the most urgent thing on the board. */
  const ranked = open
    .filter((t) => !window.NEEDT.blockerOf(t, tasks))
    .map((t) => ({ t: t, n: window.NEEDT.unblocks(t, tasks) }))
    .sort((a, b) => b.n - a.n);
  const lead = ranked[0] && ranked[0].n > 0 ? ranked[0] : null;

  /* Who is holding the most of it — stated as a sentence, because a count
     beside a name is a score and a sentence is a fact about your week. */
  const byPerson = {};
  stuck.forEach((t) => {
    const b = window.NEEDT.blockerOf(t, tasks);
    const who = b.kind === "person" ? b.on : (b.task.holder || "you");
    byPerson[who] = (byPerson[who] || 0) + 1;
  });
  const worst = Object.keys(byPerson).sort((a, b) => byPerson[b] - byPerson[a])[0];

  /* The connectors are measured, not guessed: the line has to land on the card
     wherever the column put it, and columns move when the window does. */
  React.useEffect(() => {
    function draw() {
      if (!wrap.current) return;
      const box = wrap.current.getBoundingClientRect();
      const out = [];
      stuck.forEach((t) => {
        const b = window.NEEDT.blockerOf(t, tasks);
        if (!b || b.kind !== "task") return;
        const from = nodes.current[b.task.id];
        const to = nodes.current[t.id];
        if (!from || !to) return;
        const fr = from.getBoundingClientRect();
        const gr = to.getBoundingClientRect();
        const y1 = fr.top + fr.height / 2 - box.top;
        const y2 = gr.top + gr.height / 2 - box.top;
        const fl = fr.left - box.left, frr = fr.right - box.left;
        const gl = gr.left - box.left, grr = gr.right - box.left;

        /* Which sides face each other, and where the lane runs between them.
           Cards in one column share a side and the lane sits just outside it. */
        let x1, x2, lane;
        if (gl - frr >= 12) { x1 = frr; x2 = gl - 4; lane = (frr + gl) / 2; }
        else if (fl - grr >= 12) { x1 = fl; x2 = grr + 4; lane = (fl + grr) / 2; }
        else { x1 = Math.min(fl, gl); x2 = x1; lane = x1 - 18; }

        out.push({ id: t.id, x1: x1, y1: y1, x2: x2, y2: y2, lane: lane, hue: flHue(t) });
      });
      setLines(out);
    }
    draw();
    /* 0.46s entry + 26ms per card of stagger; 700ms clears both. */
    const settle = window.setTimeout(draw, 700);
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(draw) : null;
    if (ro && wrap.current) ro.observe(wrap.current);
    window.addEventListener("resize", draw);
    return () => {
      window.clearTimeout(settle);
      if (ro) ro.disconnect();
      window.removeEventListener("resize", draw);
    };
  }, [tasks]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 14 }}>
      {/* The verdict, before the board. */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        padding: "11px 14px", borderRadius: "var(--radius-xl)", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="display" style={{ fontSize: 27, lineHeight: 1, color: stuck.length ? "var(--destructive)" : "var(--text-primary)" }}>
            {stuck.length}
          </span>
          <span style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>
              {stuck.length === 1 ? "thing cannot move" : "things cannot move"}
            </span>
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>
              {worst ? window.NEEDT.person(worst).name + " holds " + byPerson[worst] + " of them." : "Nothing is waiting on anyone."}
            </span>
          </span>
        </span>

        {lead ? (
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
            <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 0 }}>
              <span style={{ font: "var(--type-meta)", color: "var(--text-quaternary)" }}>Do this first — it frees {lead.n}</span>
              <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {lead.t.title}
              </span>
            </span>
            <FlButton variant="flat" iconLeft={<FlIcon name="arrow-right" size={15} />} onClick={() => onOpen && onOpen(lead.t)}>Open</FlButton>
          </span>
        ) : null}
      </div>

      <div ref={wrap} className="scroll-inner" style={{ position: "relative", flex: 1, minHeight: 0, overflow: "auto",
        display: "flex", gap: 16, alignItems: "flex-start", paddingBottom: 16 }}>
        {/* The chain, drawn under the cards: a curve from what must close to
            what is waiting on it, in the waiting task's own hue. */}
        <svg aria-hidden="true" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1, overflow: "visible" }}>
          {lines.map((l) => (
            <g key={l.id}>
              <path d={flPath(l)}
                fill="none" stroke={l.hue} strokeWidth="1.5" strokeOpacity="0.55" strokeLinecap="round" />
              <circle cx={l.x2} cy={l.y2} r="3" fill={l.hue} />
            </g>
          ))}
        </svg>

        {window.NEEDT.stages.map((s) => {
          const items = open.filter((t) => (t.stage || "todo") === s.id);
          const held = items.filter((t) => window.NEEDT.blockerOf(t, tasks)).length;
          return (
            <section key={s.id} style={{ position: "relative", zIndex: 2, flex: "0 0 auto", width: 252, minWidth: 0,
              display: "flex", flexDirection: "column", gap: 8 }}>
              {/* The header states what is STUCK in the stage, not how many
                  items are in it — a count of items is the one number every
                  board already shows and nobody acts on. */}
              <header style={{ display: "flex", alignItems: "baseline", gap: 8, height: 26 }}>
                <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>{s.name}</span>
                <span style={{ font: "var(--type-meta)", color: "var(--text-disabled)", fontVariantNumeric: "tabular-nums" }}>{items.length}</span>
                {held ? (
                  <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 4, height: 18, padding: "0 6px 0 5px",
                    borderRadius: "var(--radius-xs)", background: "var(--fill-destructive)", color: "var(--destructive)" }}>
                    <FlIcon name="clock" size={10} />
                    <span style={{ font: "var(--type-meta-medium)" }}>{held} stuck</span>
                  </span>
                ) : null}
              </header>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {items.map((t) => (
                  <FlCard key={t.id} t={t} blocker={window.NEEDT.blockerOf(t, tasks)}
                    lead={lead && lead.t.id === t.id} onOpen={onOpen}
                    nodeRef={(el) => { if (el) nodes.current[t.id] = el; else delete nodes.current[t.id]; }} />
                ))}
                {!items.length ? (
                  <span style={{ font: "var(--type-meta)", fontStyle: "italic", color: "var(--text-disabled)", padding: "0 2px" }}>
                    Nothing here.
                  </span>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { FlowView, FlCard });
