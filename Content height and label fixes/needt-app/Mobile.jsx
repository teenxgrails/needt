/* NEEDT ON A PHONE.
 *
 * The desktop app is a two-pane instrument: a 268px rail beside a flexible
 * column. A phone has room for one pane, so the rail's four jobs have to go
 * somewhere, and each goes somewhere different rather than into one drawer:
 *
 *   navigation      → a bottom bar, because it is the only thing a thumb
 *                     reaches without regripping
 *   the queue       → a sheet pulled up from the bottom edge, since placing a
 *                     task is a deliberate act, not an ambient one
 *   focus           → the header, where it is visible while you work
 *   the mini month  → the day strip, which is the same information at the size
 *                     a phone can spend on it
 *
 * Everything that draws a task is the desktop's component unchanged — CvCard,
 * RichBlock, the habit chips, the store. One component set, two shells: that
 * is the whole point of having consolidated them.
 *
 * TOUCH: every control is at least 44px. The desktop kit leans on hover for
 * row actions and for the Overdue and Tomorrow walls; a phone has no hover, so
 * those become things you tap or swipe to, never things you reveal.
 */
const MbNS = window.NeedtDesignSystem_25d3c8;
const { Icon: MbIcon, Button: MbButton } = MbNS;

const MB_TABS = [
  ["home", "Home", "home"],
  ["calendar", "Calendar", "calendar-days"],
  ["workspace", "Workspace", "folder-kanban"],
  ["docs", "Docs", "file-text"]
];

function mbDur(min) {
  if (!min) return "";
  return min >= 60 ? Math.floor(min / 60) + " h" + (min % 60 ? " " + (min % 60) + " min" : "") : min + " min";
}

/* ── The header: who and when, focus, and the day strip ─────────────────── */
function MbHeader({ date, onDate, focus, onFocus, onQueue, queueCount, onSettings, settingsOn }) {
  const d = window.NEEDT.today;
  const days = [];
  for (let i = -2; i <= 4; i++) {
    const x = new Date(d);
    x.setDate(x.getDate() + i);
    days.push(x);
  }
  return (
    <header style={{ flex: "none", display: "flex", flexDirection: "column", gap: 11, padding: "8px 16px 11px" }}>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
        <span style={{ display: "flex", alignItems: "flex-end", gap: 8, flex: 1, minWidth: 0 }}>
          <span className="display" style={{ fontSize: 40, lineHeight: 0.85, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
            {d.getDate()}
          </span>
          <span className="display" style={{ fontSize: 17, lineHeight: 1.2, color: "var(--text-tertiary)" }}>
            {window.NEEDT.MONTHS[d.getMonth()]}
          </span>
        </span>
        {queueCount ? (
          <button type="button" onClick={onQueue} aria-label={queueCount + " unplaced"}
            style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, height: 44, padding: "0 12px", border: 0, cursor: "default",
              borderRadius: "var(--radius-floating)", background: "var(--surface-raised)", boxShadow: "var(--shadow-raised)",
              color: "var(--text-secondary)" }}>
            <MbIcon name="inbox" size={16} />
            <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>{queueCount}</span>
          </button>
        ) : null}
        <button type="button" onClick={onSettings} aria-label={settingsOn ? "Back" : "Settings"}
          style={{ flex: "none", display: "grid", placeItems: "center", width: 44, height: 44, border: 0, cursor: "default",
            borderRadius: "var(--radius-floating)", color: settingsOn ? "var(--accent)" : "var(--text-secondary)",
            background: settingsOn ? "var(--fill-accent)" : "var(--surface-raised)",
            boxShadow: settingsOn ? "none" : "var(--shadow-raised)" }}>
          <MbIcon name={settingsOn ? "x" : "settings"} size={16} />
        </button>
        {/* Focus lives in the header on a phone: it is the one control that
            must stay visible while the screen underneath changes. */}
        <button type="button" onClick={onFocus}
          style={{ flex: "none", display: "flex", alignItems: "center", gap: 7, height: 44, padding: "0 14px", border: 0, cursor: "default",
            borderRadius: "var(--radius-floating)", background: focus ? "var(--fill-accent)" : "var(--surface-raised)",
            boxShadow: focus ? "none" : "var(--shadow-raised)" }}>
          <MbIcon name="target" size={16} />
          <span style={{ font: "var(--type-ui-medium)", color: focus ? "var(--accent)" : "var(--text-primary)" }}>
            {focus ? "47:56" : "Focus"}
          </span>
        </button>
      </div>

      {/* The day strip replaces the mini month: seven days is what a phone can
          spend, and it is the range a person actually moves between. */}
      <div className="mb-strip" style={{ display: "flex", gap: 6, overflowX: "auto", margin: "0 -16px", padding: "0 16px" }}>
        {days.map((x) => {
          const on = x.getDate() === date;
          const today = x.getDate() === d.getDate() && x.getMonth() === d.getMonth();
          return (
            <button key={x.getDate()} type="button" onClick={() => onDate(x.getDate())}
              style={{ flex: "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                width: 46, height: 52, border: 0, cursor: "default", borderRadius: "var(--radius-lg)",
                background: on ? "var(--fill-accent)" : "transparent",
                boxShadow: on ? "none" : "var(--shadow-inset-ring)" }}>
              <span style={{ font: "var(--type-meta)", color: on ? "var(--accent)" : "var(--text-quaternary)" }}>
                {window.NEEDT.DOW[x.getDay()]}
              </span>
              <span style={{ font: "var(--weight-medium) 15px / 18px var(--font-sans)", fontVariantNumeric: "tabular-nums",
                color: on ? "var(--accent)" : today ? "var(--text-primary)" : "var(--text-secondary)" }}>{x.getDate()}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
}

/* ── Habits: the same chips, scrolled sideways ──────────────────────────── */
function MbHabits() {
  const [state, setState] = React.useState({});
  const live = window.NEEDT.habits.map((h) => {
    const t = state[h.id];
    if (t == null) return h;
    const done = h.done.slice();
    done[done.length - 1] = t ? 1 : 0;
    return Object.assign({}, h, { done: done });
  });
  return (
    <div className="mb-strip" style={{ flex: "none", display: "flex", gap: 6, overflowX: "auto", padding: "0 16px 11px" }}>
      {live.map((h) => {
        const proj = window.cvProject ? window.cvProject(h.project) : { hue: "var(--accent)" };
        const hue = h.project ? proj.hue : "var(--text-tertiary)";
        const on = !!h.done[h.done.length - 1];
        return (
          <button key={h.id} type="button" onClick={() => setState((s) => Object.assign({}, s, { [h.id]: !on }))}
            style={{ flex: "none", display: "flex", alignItems: "center", gap: 7, height: 44, padding: "0 14px 0 11px", border: 0, cursor: "default",
              borderRadius: "var(--radius-pill)", background: on ? "color-mix(in oklab, " + hue + " 16%, var(--surface-raised))" : "var(--surface-raised)",
              boxShadow: "var(--shadow-ring)" }}>
            <span aria-hidden="true" style={{ flex: "none", width: 16, height: 16, borderRadius: 8, display: "grid", placeItems: "center",
              background: on ? hue : "transparent", boxShadow: on ? "none" : "inset 0 0 0 1.5px " + hue, color: "var(--surface-raised)" }}>
              {on ? <MbIcon name="check" size={10} /> : null}
            </span>
            <span style={{ font: "var(--type-ui-medium)", color: on ? "var(--text-primary)" : "var(--text-secondary)", whiteSpace: "nowrap" }}>{h.title}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ── Home ───────────────────────────────────────────────────────────────── */
function MbHome({ tasks, onToggle, onOpen }) {
  const CvCard = window.CvCard;
  const shape = (t, risk) => Object.assign({}, t, { where: t.project, priority: risk ? "now" : "soon" });
  const debt = tasks.filter((t) => t.overdue && !t.done && !t.noSlot).map((t) => shape(t, true));
  const dueDay = (t) => { const n = parseInt(String(t.due || "").trim(), 10); return isNaN(n) ? null : n; };
  const today = window.NEEDT.today.getDate();
  const mine = tasks.filter((t) => !t.overdue && !t.noSlot && !t.done && dueDay(t) === today).map((t) => shape(t, false));
  const [debtOpen, setDebtOpen] = React.useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      {/* Overdue was a wall you reached for; on a phone it is a line you tap.
          It stays at the top because it is the only thing competing with today
          for today's hours. */}
      {debt.length ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button type="button" onClick={() => setDebtOpen(!debtOpen)}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", height: 44, padding: "0 12px", border: 0, cursor: "default",
              borderRadius: "var(--radius-lg)", background: "color-mix(in oklab, var(--destructive) 10%, var(--surface-raised))",
              boxShadow: "var(--shadow-ring)" }}>
            <span aria-hidden="true" style={{ flex: "none", width: 7, height: 7, borderRadius: 4, background: "var(--destructive)" }} />
            <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>Overdue</span>
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{debt.length}</span>
            <span style={{ marginLeft: "auto", display: "flex", color: "var(--text-tertiary)",
              transform: debtOpen ? "rotate(90deg)" : "none", transition: "transform 0.18s ease" }}>
              <MbIcon name="chevron-right" size={16} />
            </span>
          </button>
          {debtOpen ? debt.map((t) => <CvCard key={t.id} t={t} onToggle={() => onToggle(t.id)} onOpen={() => onOpen(t)} />) : null}
        </div>
      ) : null}

      <section style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ font: "var(--type-card-title)", fontSize: 15, color: "var(--accent)" }}>Today</span>
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{mine.length}</span>
          <span style={{ marginLeft: "auto", font: "var(--type-meta)", color: "var(--text-quaternary)" }}>
            {mbDur(mine.reduce((s, t) => s + (t.est || 0), 0))}
          </span>
        </span>
        {window.cvParted ? window.cvParted(mine).map((row) => (row.part ? (
          <span key={row.part} style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: row.first ? 0 : 6 }}>
            <span style={{ flex: "none", font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>{row.part}</span>
            <span aria-hidden="true" style={{ flex: 1, borderTop: "1px solid var(--border)" }} />
          </span>
        ) : (
          <CvCard key={row.t.id} t={row.t} onToggle={() => onToggle(row.t.id)} onOpen={() => onOpen(row.t)} />
        ))) : null}
        {!mine.length ? (
          <span style={{ font: "var(--type-meta)", fontStyle: "italic", color: "var(--text-disabled)" }}>Nothing is due today.</span>
        ) : null}
      </section>
    </div>
  );
}

/* ── Calendar: one day, because seven columns on a phone is seven slivers ── */
function MbCalendar() {
  const HOUR = 52;
  const START = 8;
  const END = 21;
  const items = (window.WEEK_DAYS || []).filter((d) => d.today)[0];
  const blocks = (items && items.items) || [];
  const hours = [];
  for (let h = START; h <= END; h++) hours.push(h);
  const now = 13.4;
  return (
    <div style={{ position: "relative", display: "flex", padding: "0 16px 16px" }}>
      <div style={{ position: "relative", flex: "none", width: 44 }}>
        {hours.map((h) => (
          <span key={h} style={{ position: "absolute", left: 0, top: (h - START) * HOUR, transform: "translateY(-7px)",
            font: "var(--type-meta)", color: "var(--text-disabled)", fontVariantNumeric: "tabular-nums" }}>
            {String(h).padStart(2, "0")}:00
          </span>
        ))}
      </div>
      <div style={{ position: "relative", flex: 1, minWidth: 0, height: (END - START) * HOUR + 12 }}>
        {hours.map((h) => (
          <span key={h} aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: (h - START) * HOUR, borderTop: "1px solid var(--border)" }} />
        ))}
        {blocks.map((b, i) => {
          const h = Math.max((b.end - b.start) * HOUR - 3, 34);
          return (
            <div key={i} style={{ position: "absolute", left: 6, right: 0, top: (b.start - START) * HOUR, height: h }}>
              {window.Block ? <window.Block b={b} railBy="movability" compact={h < 44} onToggle={() => {}} /> : null}
            </div>
          );
        })}
        <span aria-hidden="true" style={{ position: "absolute", left: -6, right: 0, top: (now - START) * HOUR, height: 0, zIndex: 9 }}>
          <span style={{ position: "absolute", left: 6, right: 0, top: 0, borderTop: "1px solid var(--accent)" }} />
          <span style={{ position: "absolute", left: 0, top: -3, width: 7, height: 7, borderRadius: 4, background: "var(--accent)" }} />
        </span>
      </div>
    </div>
  );
}

/* ── Workspace and Docs: lists, which is what they already are ──────────── */
function MbWorkspace({ tasks, onToggle, onOpen }) {
  const CvCard = window.CvCard;
  const groups = {};
  tasks.filter((t) => !t.done).forEach((t) => {
    const k = t.project || "No project";
    (groups[k] = groups[k] || []).push(t);
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 16px 16px" }}>
      {Object.keys(groups).map((name) => {
        const sum = groups[name].reduce((s, t) => s + (t.value || 0), 0);
        return (
          <section key={name} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>{name}</span>
              <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{groups[name].length}</span>
              {sum ? (
                <span style={{ marginLeft: "auto", font: "var(--type-meta-medium)", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                  {window.rbMoney(sum)}
                </span>
              ) : null}
            </span>
            {groups[name].map((t) => (
              <CvCard key={t.id} t={Object.assign({}, t, { where: null, priority: t.overdue ? "now" : "soon" })}
                onToggle={() => onToggle(t.id)} onOpen={() => onOpen(t)} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

function MbDocs() {
  const docs = [["Launch brief", "Operations", "Edited 2 h ago"], ["Factory quote", "Operations", "Edited yesterday"],
    ["Form-row spec", "Design system", "Edited 3 days ago"], ["B2 vocabulary", "German", "Edited last week"]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "0 16px 16px" }}>
      {docs.map(([title, project, when]) => (
        <span key={title} style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 56, padding: "0 12px",
          borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)" }}>
          <span style={{ flex: "none", display: "flex", color: "var(--text-tertiary)" }}><MbIcon name="file-text" size={18} /></span>
          <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
            <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</span>
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>{project} · {when}</span>
          </span>
        </span>
      ))}
    </div>
  );
}

/* ── The sheet: one shape for everything that comes up from the bottom ─── */
function MbSheet({ open, onClose, title, count, meta, children, pad }) {
  return (
    <div aria-hidden={!open} style={{ position: "absolute", inset: 0, zIndex: 60, pointerEvents: open ? "auto" : "none" }}>
      <span onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
        opacity: open ? 1 : 0, transition: "opacity 0.22s ease" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "84%", display: "flex", flexDirection: "column",
        borderRadius: "var(--radius-2xl) var(--radius-2xl) 0 0", background: "var(--background)", boxShadow: "var(--shadow-floating)",
        transform: open ? "none" : "translateY(100%)", transition: "transform 0.28s cubic-bezier(0.2, 0.7, 0.2, 1)" }}>
        <span aria-hidden="true" style={{ display: "block", width: 36, height: 4, borderRadius: 2, background: "var(--fill-6)", margin: "8px auto 4px" }} />
        {title ? (
          <header style={{ display: "flex", alignItems: "baseline", gap: 8, padding: "8px 16px 11px", flex: "none" }}>
            <span style={{ font: "var(--type-card-title)", fontSize: 15, color: "var(--text-primary)" }}>{title}</span>
            {count != null ? <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{count}</span> : null}
            {meta ? <span style={{ marginLeft: "auto", font: "var(--type-meta)", color: "var(--text-quaternary)" }}>{meta}</span> : null}
          </header>
        ) : null}
        <div className="scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 8,
          padding: pad || "0 16px 24px" }}>{children}</div>
      </div>
    </div>
  );
}

/* ── The composer ─────────────────────────────────────────────────────────
 * Same object as the desktop's, in the shape a phone already has: the line
 * stays at the bottom, the plus opens the sheet TALLER — the attributes
 * appear above the line rather than in a menu laid over it — and what the
 * line understood is shown as chips you can clear. */
function MbComposer({ open, onClose, onCreate, shelf }) {
  const [text, setText] = React.useState("");
  const [more, setMore] = React.useState(!!shelf);
  const [note, setNote] = React.useState(null);
  const input = React.useRef(null);
  React.useEffect(() => {
    /* Focus lands as the sheet finishes travelling — focusing mid-transform
       makes the browser scroll to the field while it is still off screen. */
    if (open && input.current) window.setTimeout(() => input.current.focus(), 300);
    if (!open) { setMore(false); setNote(null); }
  }, [open]);
  const p = window.coParse ? window.coParse(text) : { title: text, found: {}, parts: [] };
  const said = [];
  if (p.found) {
    if (p.found.date) said.push(["date", "calendar", "var(--accent)", p.found.date.value]);
    if (p.found.time) said.push(["time", "clock", "var(--accent)", p.found.time.value]);
    if (p.found.duration) said.push(["duration", "hourglass", "var(--text-tertiary)", p.found.duration.value]);
    if (p.found.deadline) said.push(["deadline", "calendar-clock", "var(--destructive)", p.found.deadline.value]);
    if (p.found.project) said.push(["project", null, "var(--accent)", p.found.project.value]);
    if (p.found.label) said.push(["label", "tag", "var(--success)", p.found.label.value]);
  }
  function commit() {
    const line = text.trim();
    if (!line) return;
    const parsed = window.coParse ? window.coParse(line) : { title: line };
    if (note && note.trim()) parsed.note = note.trim();
    onCreate(parsed);
    setText("");
    setNote(null);
    if (input.current) input.current.focus();
  }
  return (
    <div aria-hidden={!open} style={{ position: "absolute", inset: 0, zIndex: 70, pointerEvents: open ? "auto" : "none" }}>
      <span onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)",
        opacity: open ? 1 : 0, transition: "opacity 0.22s ease" }} />
      <div className={text.trim() ? "co-box is-live" : "co-box"}
        style={{ position: "absolute", left: 8, right: 8, bottom: 8, width: "auto", borderRadius: "var(--radius-2xl)",
          transform: open ? "none" : "translateY(calc(100% + 16px))", transition: "transform 0.3s cubic-bezier(0.2, 0.78, 0.22, 1)" }}>
        {/* The shelf: the sheet grows, the line does not move. */}
        <div className={"co-shelf" + (more ? " is-open" : "")}>
          <div className="co-shelf-inner"><div className="co-shelf-body">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 2 }}>
              {(window.CO_MORE || []).map(([label, glyph, does, tone, ins]) => (
                <button key={label} type="button" tabIndex={more ? 0 : -1}
                  onClick={() => {
                    setMore(false);
                    if (does === "note") { setNote((n) => (n == null ? "" : n)); return; }
                    if (does === "file") return;
                    if (ins) setText((t) => (t ? t.replace(/\s+$/, "") + " " + ins : ins));
                    if (input.current) input.current.focus();
                  }}
                  style={{ display: "flex", alignItems: "center", gap: 7, height: 34, padding: "0 8px 0 6px", border: 0, cursor: "default",
                    borderRadius: "var(--radius-md)", background: "transparent", minWidth: 0 }}>
                  <span aria-hidden="true" style={{ flex: "none", display: "grid", placeItems: "center", width: 22, height: 22,
                    borderRadius: "var(--radius-xs)", color: tone, background: "color-mix(in oklab, " + tone + " 12%, transparent)" }}>
                    <MbIcon name={glyph} size={13} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: "left", font: "var(--type-meta-medium)", color: "var(--text-primary)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
                </button>
              ))}
            </div>
          </div></div>
        </div>

        <input ref={input} className="co-input" value={text} spellCheck="false"
          placeholder="Call Anna tomorrow 3pm"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
          style={{ position: "static", width: "100%", height: 38, color: "var(--text-primary)" }} />

        {note != null ? (
          <textarea autoFocus value={note} rows={2} onChange={(e) => setNote(e.target.value)}
            placeholder="What this is about"
            style={{ width: "100%", margin: 0, padding: 0, border: 0, outline: "none", resize: "none", background: "transparent",
              font: "var(--type-body)", color: "var(--text-primary)" }} />
        ) : null}

        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          <button type="button" onClick={() => setMore(!more)}
            style={{ flex: "none", display: "grid", placeItems: "center", width: 32, height: 32, border: 0, cursor: "default",
              borderRadius: "var(--radius-md)", background: more ? "var(--fill-3)" : "var(--fill-2)", color: "var(--text-secondary)" }}>
            <MbIcon name="plus" size={16} />
          </button>
          <span className="scroll-inner" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 5, overflowX: "auto" }}>
            {said.length ? said.map(([k, glyph, tone, value]) => (
              <span key={k} style={{ flex: "none", display: "inline-flex", alignItems: "center", gap: 5, height: 26, padding: "0 9px",
                borderRadius: "var(--radius-pill)", background: "color-mix(in oklab, " + tone + " 13%, var(--surface-raised))",
                boxShadow: "inset 0 0 0 1px color-mix(in oklab, " + tone + " 30%, transparent)", color: tone }}>
                {glyph ? <MbIcon name={glyph} size={12} /> : null}
                <span style={{ font: "var(--type-meta-medium)", whiteSpace: "nowrap" }}>{value}</span>
              </span>
            )) : (
              <span style={{ flex: "none", display: "inline-flex", alignItems: "center", height: 26, padding: "0 9px",
                borderRadius: "var(--radius-pill)", background: "var(--fill-accent)", color: "var(--accent)",
                font: "var(--type-meta-medium)" }}>Today</span>
            )}
          </span>
          <button type="button" onClick={commit} className="co-go" aria-label="Create it" style={{ flex: "none" }}>
            <MbIcon name="arrow-up" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Settings: the desktop's sections, as a phone list ────────────────────
 * A phone cannot hold a two-pane settings screen, so the sections become a
 * list and each one opens in place. The values are the same objects — the
 * theme pick is the same set of miniatures, the rail language the same two
 * words — because a setting that reads differently on the phone is a second
 * setting. */
const MB_SETTINGS = [
  ["appearance", "Appearance", "sun", "Theme, drift, density"],
  ["day", "Your day", "clock", "Working hours, buffers"],
  ["rail", "Rail language", "flag", "What the coloured edge means"],
  ["calendars", "Calendars", "calendar-days", "What already owns your time"],
  ["keys", "Shortcuts", "command", "Every key, on one page"],
  ["account", "Account", "user", "Sign out"]
];

function MbSettings({ theme, onTheme, drift, onDrift, rail, onRail }) {
  const [openId, setOpenId] = React.useState("appearance");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "11px 16px 24px" }}>
      {MB_SETTINGS.map(([id, label, glyph, note]) => {
        const on = openId === id;
        return (
          <section key={id} style={{ borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)", overflow: "hidden" }}>
            <button type="button" onClick={() => setOpenId(on ? null : id)}
              style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", minHeight: 52, padding: "0 13px", border: 0, cursor: "default",
                background: "transparent", textAlign: "left" }}>
              <span aria-hidden="true" style={{ flex: "none", display: "grid", placeItems: "center", width: 28, height: 28,
                borderRadius: "var(--radius-md)", background: "var(--fill-2)", color: "var(--text-secondary)" }}>
                <MbIcon name={glyph} size={15} />
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>{label}</span>
                <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>{note}</span>
              </span>
              <span aria-hidden="true" style={{ flex: "none", color: "var(--text-quaternary)", transform: on ? "rotate(90deg)" : "none",
                transition: "transform 0.2s ease" }}>
                <MbIcon name="chevron-right" size={16} />
              </span>
            </button>
            {on ? (
              <div style={{ padding: "0 13px 13px", display: "flex", flexDirection: "column", gap: 11 }}>
                {id === "appearance" ? (
                  <>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6 }}>
                      {["paper", "warm", "dim", "dark"].map((t) => (
                        <button key={t} type="button" onClick={() => onTheme(t)}
                          style={{ display: "flex", flexDirection: "column", gap: 5, padding: 0, border: 0, background: "transparent", cursor: "default" }}>
                          <span className={"app " + (t === "paper" ? "paper" : t)} aria-hidden="true"
                            style={{ height: 44, borderRadius: "var(--radius-md)", background: "var(--background)",
                              boxShadow: theme === t ? "var(--shadow-focus)" : "var(--shadow-inset-ring)", display: "flex", flexDirection: "column", gap: 3, padding: 6 }}>
                            <span style={{ height: 4, width: "60%", borderRadius: 2, background: "var(--accent)" }} />
                            <span style={{ height: 4, borderRadius: 2, background: "var(--fill-6)" }} />
                            <span style={{ height: 4, width: "80%", borderRadius: 2, background: "var(--fill-4)" }} />
                          </span>
                          <span style={{ font: "var(--type-meta)", color: theme === t ? "var(--accent)" : "var(--text-muted)" }}>{t}</span>
                        </button>
                      ))}
                    </div>
                    <MbToggleRow label="Drift with the day" hint="Ground and contrast follow the sun. The accent never moves."
                      on={drift} onChange={onDrift} />
                  </>
                ) : null}
                {id === "rail" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[["movability", "Movability", "Grey is fixed; the project's colour means the scheduler placed it and can move it again."],
                      ["urgency", "Urgency", "Red is overdue, then amber, then the accent — how much room is left before the deadline."]].map(([id2, label2, note2]) => (
                      <button key={id2} type="button" onClick={() => onRail(id2)}
                        style={{ display: "flex", alignItems: "flex-start", gap: 9, padding: 9, border: 0, cursor: "default", textAlign: "left",
                          borderRadius: "var(--radius-md)", background: rail === id2 ? "var(--fill-accent)" : "var(--fill-2)" }}>
                        <span aria-hidden="true" style={{ flex: "none", width: 3, alignSelf: "stretch", borderRadius: 2,
                          background: rail === id2 ? "var(--accent)" : "var(--text-disabled)" }} />
                        <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                          <span style={{ font: "var(--type-ui-medium)", color: rail === id2 ? "var(--accent)" : "var(--text-primary)" }}>{label2}</span>
                          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>{note2}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
                {id === "day" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <MbValueRow label="Working hours" value="09:00 – 18:00" />
                    <MbValueRow label="Buffer between blocks" value="10 min" />
                    <MbToggleRow label="Protect focus" hint="The scheduler will not place meetings inside a focus block." on />
                  </div>
                ) : null}
                {id === "calendars" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {window.NEEDT.calendars ? Object.keys(window.NEEDT.calendars).map((k) => (
                      <span key={k} style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 36 }}>
                        <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 3, background: window.NEEDT.calendars[k].color }} />
                        <span style={{ flex: 1, font: "var(--type-ui)", color: "var(--text-primary)" }}>{window.NEEDT.calendars[k].name}</span>
                        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>connected</span>
                      </span>
                    )) : null}
                  </div>
                ) : null}
                {id === "keys" ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {[["⌘K", "Open anything"], ["⌘N", "New task"], ["⌘⇧F", "Focus"], ["⌘⇧P", "Plan my day"], ["g then h", "Home"], ["g then c", "Calendar"]].map(([k, l]) => (
                      <span key={k} style={{ display: "flex", alignItems: "center", gap: 9, minHeight: 30 }}>
                        <span style={{ flex: "none", minWidth: 62, fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>{k}</span>
                        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>{l}</span>
                      </span>
                    ))}
                  </div>
                ) : null}
                {id === "account" ? (
                  <MbButton variant="flat" iconLeft={<MbIcon name="log-out" size={15} />}>Sign out</MbButton>
                ) : null}
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

function MbToggleRow({ label, hint, on, onChange }) {
  return (
    <span onClick={() => onChange && onChange(!on)} style={{ display: "flex", alignItems: "flex-start", gap: 11, minHeight: 40 }}>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ font: "var(--type-ui)", color: "var(--text-primary)" }}>{label}</span>
        {hint ? <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>{hint}</span> : null}
      </span>
      <span aria-hidden="true" style={{ flex: "none", width: 40, height: 24, borderRadius: 12, marginTop: 2, position: "relative",
        background: on ? "var(--fill-accent-strong)" : "var(--fill-4)", transition: "background-color var(--transition-hover)" }}>
        <span style={{ position: "absolute", top: 3, left: on ? 19 : 3, width: 18, height: 18, borderRadius: 9,
          background: on ? "var(--accent)" : "var(--surface-raised)", boxShadow: "var(--shadow-raised)",
          transition: "left 0.2s cubic-bezier(0.2, 0.7, 0.2, 1)" }} />
      </span>
    </span>
  );
}

function MbValueRow({ label, value }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 36 }}>
      <span style={{ flex: 1, font: "var(--type-ui)", color: "var(--text-primary)" }}>{label}</span>
      <span style={{ font: "var(--type-meta-medium)", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </span>
  );
}

function MbAttr({ glyph, label, value, tone }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 44, boxShadow: "var(--border) 0 -1px 0 0 inset" }}>
      <span aria-hidden="true" style={{ flex: "none", display: "grid", placeItems: "center", width: 26, height: 26,
        borderRadius: "var(--radius-sm)", color: tone || "var(--text-tertiary)",
        background: tone ? "color-mix(in oklab, " + tone + " 12%, transparent)" : "var(--fill-2)" }}>
        <MbIcon name={glyph} size={14} />
      </span>
      <span style={{ flex: 1, minWidth: 0, font: "var(--type-ui)", color: "var(--text-secondary)" }}>{label}</span>
      <span style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, font: "var(--type-ui-medium)",
        color: value ? "var(--text-primary)" : "var(--text-disabled)" }}>
        {value || "Not set"}
        <MbIcon name="chevron-right" size={14} />
      </span>
    </span>
  );
}

function MbTask({ task, open, onClose, onToggle, onTogglePart }) {
  const t = task || {};
  const parts = t.parts || [];
  const closed = parts.filter((p) => p.done).length;
  const proj = window.cvProject ? window.cvProject(t.project) : null;
  const wait = t.waitsOn;
  return (
    <MbSheet open={open} onClose={onClose} title={t.title || "Task"}
      count={parts.length ? closed + "/" + parts.length : null}
      meta={[t.project, mbDur(t.est)].filter(Boolean).join(" · ")}>
      {/* What to do first. The one control on the sheet that starts work, so it
          is the widest thing on it. */}
      {t.entry ? (
        <button type="button" className="rb-entry"
          style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", minHeight: 48, padding: "0 14px 0 11px",
            border: 0, cursor: "default", borderRadius: "var(--radius-xl)",
            "--rb-ink": "color-mix(in oklab, " + ((proj && proj.hue) || "var(--accent)") + " 70%, var(--text-primary))" }}>
          <span aria-hidden="true" className="rb-arrow" style={{ flex: "none", display: "flex" }}><MbIcon name="arrow-right" size={16} /></span>
          <span style={{ flex: 1, minWidth: 0, textAlign: "left", font: "var(--type-ui-medium)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.entry}</span>
          <span className="rb-cost" style={{ flex: "none", font: "var(--type-meta)" }}>2 min</span>
        </button>
      ) : null}

      {wait && window.NEEDT ? (
        <span style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 36, padding: "0 11px",
          borderRadius: "var(--radius-lg)", background: "var(--fill-2)", boxShadow: "var(--shadow-inset-ring)" }}>
          <MbIcon name="clock" size={13} />
          <span style={{ font: "var(--type-meta)", color: "var(--text-tertiary)" }}>
            Waiting on {window.NEEDT.person(wait.on).name} for {wait.for}
          </span>
        </span>
      ) : null}

      {/* The parts, at thumb size — the reason a phone opens a task at all. */}
      {parts.length ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
          {parts.map((p, i) => (
            <button key={p.title + i} type="button" role="checkbox" aria-checked={!!p.done}
              onClick={() => onTogglePart && onTogglePart(t.id, i)}
              style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", minHeight: 44, padding: 0, border: 0,
                cursor: "default", textAlign: "left", background: "transparent", boxShadow: "var(--border) 0 -1px 0 0 inset" }}>
              <span aria-hidden="true" style={{ flex: "none", width: 20, height: 20, borderRadius: 10, display: "grid", placeItems: "center",
                background: p.done ? ((proj && proj.hue) || "var(--accent)") : "transparent",
                boxShadow: p.done ? "none" : "inset 0 0 0 1.5px var(--text-disabled)", color: "#fff" }}>
                {p.done ? <MbIcon name="check" size={11} /> : null}
              </span>
              <span style={{ flex: 1, minWidth: 0, font: "var(--type-ui)", color: p.done ? "var(--text-muted)" : "var(--text-primary)",
                textDecoration: p.done ? "line-through" : "none" }}>{p.title}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column" }}>
        <MbAttr glyph="folder" label="Project" value={t.project} tone={proj ? proj.hue : null} />
        <MbAttr glyph="calendar" label="Day" value={t.due} tone="var(--accent)" />
        <MbAttr glyph="clock" label="Takes" value={mbDur(t.est)} />
        <MbAttr glyph="flag" label="Deadline" value={t.overdue ? "Past due" : t.due} tone={t.overdue ? "var(--destructive)" : null} />
        <MbAttr glyph="tag" label="Labels" value={(t.tags || []).join(", ")} tone="var(--success)" />
      </div>

      <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
        <button type="button" onClick={() => { if (onToggle) onToggle(t.id); onClose(); }}
          style={{ flex: 1, minHeight: 44, border: 0, cursor: "default", borderRadius: "var(--radius-lg)",
            background: "var(--fill-accent)", color: "var(--accent)", font: "var(--type-ui-medium)" }}>
          {t.done ? "Reopen" : "Close it"}
        </button>
        <button type="button" onClick={onClose}
          style={{ flex: "none", minHeight: 44, padding: "0 16px", border: 0, cursor: "default", borderRadius: "var(--radius-lg)",
            background: "var(--fill-destructive)", color: "var(--destructive)", font: "var(--type-ui-medium)" }}>
          Delete
        </button>
      </div>
    </MbSheet>
  );
}

/* ── The queue, as a sheet ──────────────────────────────────────────────── */
function MbQueue({ tasks, open, onClose, onOpen }) {
  const CvCard = window.CvCard;
  const queue = tasks.filter((t) => !t.done && !t.time && !t.noSlot);
  const mins = queue.reduce((s, t) => s + (t.est || 0), 0);
  return (
    <MbSheet open={open} onClose={onClose} title="Unplaced" count={queue.length} meta={mbDur(mins) + " waiting"}>
      {queue.map((t) => (
        <CvCard key={t.id} t={Object.assign({}, t, { where: t.project })} onToggle={() => {}} onOpen={() => onOpen(t)} />
      ))}
    </MbSheet>
  );
}

/* ── The shell ──────────────────────────────────────────────────────────── */
function MobileApp({ theme, start }) {
  const [tab, setTab] = React.useState(start === "queue" || start === "composer" ? "home" : (start || "home"));
  const [date, setDate] = React.useState(window.NEEDT.today.getDate());
  const [queue, setQueue] = React.useState(start === "queue");
  const [task, setTask] = React.useState(null);
  const [composer, setComposer] = React.useState(start === "composer");
  const [focus, setFocus] = React.useState(false);
  const [tasks, setTasks] = React.useState(window.NEEDT.tasks);
  const [look, setLook] = React.useState({ theme: theme, drift: false, rail: "movability" });
  const [stage, setStage] = React.useState(start === "auth" || start === "signup" ? "auth" : start === "setup" ? "setup" : "app");
  const [authMode, setAuthMode] = React.useState(start === "signup" ? "signup" : "login");
  function toggle(id) { setTasks((l) => l.map((t) => (t.id === id ? Object.assign({}, t, { done: !t.done }) : t))); }
  function create(parsed) {
    setTasks((l) => [{ id: Date.now(), title: parsed.title, project: null, est: 30, done: false, due: "1 Sep" }].concat(l));
  }

  /* Still open for today: overdue, or dated today. The dot goes quiet when
     the day is clear — a dot that is always lit is not a signal. */
  const dueToday = tasks.filter((t) => !t.done && !t.noSlot && (t.overdue || String(t.due || "").trim().indexOf("1 Sep") === 0)).length;

  const body = tab === "home" ? <MbHome tasks={tasks} onToggle={toggle} onOpen={(t) => setTask(t)} />
    : tab === "calendar" ? <MbCalendar />
    : tab === "workspace" ? <MbWorkspace tasks={tasks} onToggle={toggle} onOpen={(t) => setTask(t)} />
    : tab === "settings" ? <MbSettings theme={look.theme} onTheme={(t) => setLook((s) => Object.assign({}, s, { theme: t }))}
        drift={look.drift} onDrift={(v) => setLook((s) => Object.assign({}, s, { drift: v }))}
        rail={look.rail} onRail={(v) => setLook((s) => Object.assign({}, s, { rail: v }))} />
    : <MbDocs />;

  if (stage !== "app") {
    return (
      <div className={"app " + (look.theme === "paper" ? "paper" : look.theme)}
        style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
          color: "var(--text-primary)", background: "var(--background)", backgroundImage: "var(--canvas-image, none)" }}>
        <div style={{ flex: "none", height: 52 }} />
        {stage === "setup"
          ? <window.MbSetup step={start === "setup" ? 2 : 0} onDone={() => setStage("app")} />
          : <window.MbAuth mode={authMode} onMode={setAuthMode} onDone={() => setStage("setup")} />}
      </div>
    );
  }

  return (
    <div className={"app " + (look.theme === "paper" ? "paper" : look.theme)}
      style={{ position: "relative", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden",
        color: "var(--text-primary)", background: "var(--background)", backgroundImage: "var(--canvas-image, none)" }}>
      <div style={{ flex: "none", height: 52 }} />
      <MbHeader date={date} onDate={setDate} focus={focus} onFocus={() => setFocus(!focus)}
        onQueue={() => setQueue(true)} queueCount={tasks.filter((t) => !t.done && !t.time && !t.noSlot).length}
        onSettings={() => setTab(tab === "settings" ? "home" : "settings")} settingsOn={tab === "settings"} />
      {tab === "home" ? <MbHabits /> : null}
      <div className="scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>{body}</div>

      {/* The queue sheet, and the one button that opens it. A phone has no
          rail to park the queue in, and placing a task is deliberate — so it
          is a reach, not something permanently on screen. */}
      <button type="button" onClick={() => setComposer(true)} aria-label="Capture"
        style={{ position: "absolute", right: 16, bottom: 96, zIndex: 40, display: "grid", placeItems: "center",
          opacity: composer ? 0 : 1, pointerEvents: composer ? "none" : "auto", transition: "opacity 0.2s ease",
          width: 56, height: 56, border: 0, cursor: "default", borderRadius: "var(--radius-floating)",
          background: "var(--fill-accent-strong)", color: "var(--accent)", boxShadow: "var(--shadow-floating)" }}>
        <MbIcon name="plus" size={22} />
      </button>

      <MbComposer open={composer} shelf={start === "composer"} onClose={() => setComposer(false)}
        onCreate={(p) => { create(p); setComposer(false); }} />

      <MbQueue tasks={tasks} open={queue} onClose={() => setQueue(false)} onOpen={(t) => { setQueue(false); setTask(t); }} />

      <MbTask task={task ? tasks.filter((t) => t.id === task.id)[0] || task : null} open={!!task}
        onClose={() => setTask(null)} onToggle={toggle}
        onTogglePart={(id, i) => setTasks((l) => l.map((x) => (x.id === id && x.parts
          ? Object.assign({}, x, { parts: x.parts.map((p, j) => (j === i ? Object.assign({}, p, { done: !p.done }) : p)) })
          : x)))} />

      {/* The bottom bar. Four destinations and nothing else — the fifth would
          be the one nobody can name. */}
      <nav aria-hidden={composer ? "true" : undefined}
        style={{ flex: "none", display: "flex", alignItems: "stretch", padding: "6px 8px 22px",
          background: "var(--surface-raised)", boxShadow: "var(--border) 0 1px 0 0 inset",
          transform: composer ? "translateY(100%)" : "none", opacity: composer ? 0 : 1,
          pointerEvents: composer ? "none" : "auto",
          transition: "transform 0.28s cubic-bezier(0.2, 0.7, 0.2, 1), opacity 0.2s ease" }}>
        {MB_TABS.map(([id, label, icon]) => {
          const on = tab === id;
          const mark = id === "home" && dueToday > 0;
          return (
            <button key={id} type="button" onClick={() => setTab(id)}
              style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3,
                height: 50, border: 0, cursor: "default", borderRadius: "var(--radius-lg)", background: "transparent" }}>
              <span style={{ position: "relative", display: "flex", color: on ? "var(--accent)" : "var(--text-quaternary)" }}>
                <MbIcon name={icon} size={20} filled={on} />
                {mark ? (
                  <span aria-label={dueToday + " still open today"}
                    style={{ position: "absolute", right: -3, top: -1, width: 7, height: 7, borderRadius: 4,
                      background: "var(--destructive)", boxShadow: "0 0 0 2px var(--background)" }} />
                ) : null}
              </span>
              <span style={{ font: on ? "var(--type-meta-medium)" : "var(--type-meta)", color: on ? "var(--accent)" : "var(--text-quaternary)" }}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

Object.assign(window, { MobileApp, MbHome, MbCalendar, MbWorkspace, MbDocs, MbQueue, MbHeader, MbHabits });
