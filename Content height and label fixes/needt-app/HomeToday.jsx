/* HOME — the day, and the standing shape around it.
 *
 * The first screen answers one question: what is today. The habits come first
 * because they are the frame the day is planned inside — a standing row, not a
 * list you work through — and the day's tasks follow, cut into its parts.
 *
 * This is the same card the columns and the sidebar draw, so a task looks the
 * same wherever it is met. What Home adds is the debt beside the day: overdue
 * work is the only thing that competes with today for today's hours, so it is
 * shown next to it rather than a screen away. */
const HdNS = window.NeedtDesignSystem_25d3c8;
const { Icon: HdIcon, Button: HdButton, IconButton: HdIconButton } = HdNS;

function HdWall({ side, title, count, action, children }) {
  return (
    <div className={"hd-wall hd-wall-" + side}>
      <span aria-hidden="true" className="hd-wall-lip" />
      <section className="hd-wall-body">
        <header style={{ display: "flex", alignItems: "baseline", gap: 8, height: 28, flex: "none" }}>
          <span style={{ font: "var(--type-card-title)", fontSize: 14, color: "var(--text-primary)" }}>{title}</span>
          {count ? <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{count}</span> : null}
          <span style={{ marginLeft: "auto" }}>{action}</span>
        </header>
        <div className="scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
          {children}
        </div>
      </section>
    </div>
  );
}

function HdSection({ title, count, action, grow, quiet, style, children }) {
  return (
    <section className={quiet ? "hd-quiet" : undefined}
      style={Object.assign({ flex: (grow || 1) + " 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }, style)}>
      <header style={{ display: "flex", alignItems: "baseline", gap: 8, height: 28, flex: "none" }}>
        <span style={{ font: "var(--type-card-title)", fontSize: 14, color: title === "Today" ? "var(--accent)" : "var(--text-primary)" }}>{title}</span>
        {count ? <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{count}</span> : null}
        <span style={{ marginLeft: "auto" }}>{action}</span>
      </header>
      <div className="scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 8, paddingBottom: 8 }}>
        {children}
      </div>
    </section>
  );
}

function HomeToday({ tasks, onOpen, onToggle, dragProps, drag }) {
  const CvCard = window.CvCard;
  const cvParted = window.cvParted;
  const today = 1;
  const dueDay = (t) => {
    const n = parseInt(String(t.due || "").trim(), 10);
    return isNaN(n) ? null : n;
  };
  const shape = (t, risk) => Object.assign({}, t, {
    where: t.project, priority: risk ? "now" : t.est && t.est <= 20 ? "later" : "soon",
    tags: t.value ? ["money"] : null
  });
  const debt = tasks.filter((t) => t.overdue && !t.done && !t.noSlot).map((t) => shape(t, true));
  const mine = tasks.filter((t) => !t.overdue && !t.noSlot && dueDay(t) === today).map((t) => shape(t, false));
  const next = tasks.filter((t) => !t.overdue && !t.noSlot && dueDay(t) === today + 1).map((t) => shape(t, false));

  return (
    <div className="hd-home" style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 16 }}>
      {window.HabitShelf ? (
        /* The standing shape of the day, across the top: what recurs is the
           frame, and the frame is stated before the contents. */
        <div style={{ flex: "none" }}><window.HabitRail /></div>
      ) : null}
      {/* The walls' containing block clips them. A translate does not take an
          element out of an ancestor's scrollable overflow, so the 248px each
          shelf is parked by was widening the day instead of disappearing off
          it — you could scroll the day sideways and read Tomorrow lying flat
          in the margin, which is the one thing the reach gesture exists to
          prevent. `clip` rather than `hidden`: it removes the overhang without
          turning this box into a scroll container of its own. */}
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", justifyContent: "center", overflow: "clip" }}>
        {debt.length ? (
          <HdWall side="left" title="Overdue" count={debt.length}
            action={<HdIconButton label="Move everything overdue to today" variant="ghost" size="sm"><HdIcon name="rotate-ccw" size={14} /></HdIconButton>}>
            {debt.map((t) => <span key={t.id} {...(dragProps ? dragProps(t, "place") : {})} style={{ display: "block", cursor: dragProps ? "grab" : "default" }}>
            <CvCard t={t} dense onToggle={() => onToggle(t.id)} onOpen={onOpen} />
          </span>)}
          </HdWall>
        ) : null}
        {/* The day, centred and unmoved — the walls slide over it, never
            against it. */}
        <HdSection title="Today" count={mine.length} grow={1.35} style={{ maxWidth: 560 }}>
          {cvParted ? cvParted(mine).map((row) => (row.part ? (
            <span key={row.part} style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: row.first ? 0 : 6 }}>
              <span style={{ flex: "none", font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>{row.part}</span>
              <span aria-hidden="true" style={{ flex: 1, borderTop: "1px solid var(--border)" }} />
            </span>
          ) : (
            <span key={row.t.id} {...(dragProps ? dragProps(row.t, "place") : {})} style={{ display: "block", cursor: dragProps ? "grab" : "default" }}>
              <CvCard t={row.t} onToggle={() => onToggle(row.t.id)} onOpen={onOpen} />
            </span>
          ))) : null}
          {!mine.length ? (
            <span style={{ font: "var(--type-meta)", fontStyle: "italic", color: "var(--text-disabled)" }}>Nothing is due today.</span>
          ) : null}
          <button type="button" onClick={onOpen}
            style={{ display: "flex", alignItems: "center", gap: 7, height: 30, padding: "0 8px", border: 0, cursor: "default",
              borderRadius: "var(--radius-md)", background: "transparent", font: "var(--type-ui)", color: "var(--text-muted)" }}>
            <HdIcon name="plus" size={14} />Add task
          </button>
        </HdSection>
        <HdWall side="right" title="Tomorrow" count={next.length}>
          {next.map((t) => <span key={t.id} {...(dragProps ? dragProps(t, "place") : {})} style={{ display: "block", cursor: dragProps ? "grab" : "default" }}>
            <CvCard t={t} dense onToggle={() => onToggle(t.id)} onOpen={onOpen} />
          </span>)}
          {!next.length ? <span style={{ font: "var(--type-meta)", fontStyle: "italic", color: "var(--text-disabled)" }}>Nothing yet.</span> : null}
        </HdWall>
      </div>
    </div>
  );
}

Object.assign(window, { HomeToday });
