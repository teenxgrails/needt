/* THE COMPOSER — one line that makes anything.
 *
 * Creating is a hurry and editing is a sit-down, so they are different objects:
 * this is the hurry. You type a sentence, the app shows you what it understood
 * inside the sentence itself, and Enter commits. Nothing here is a form.
 *
 * WHAT IT UNDERSTANDS, and how you see it
 *   Every recognised run of words is underlined in the line where you typed it
 *   and restated as a chip below. Two readings of one thing: the underline says
 *   WHICH WORDS were taken, the chip says WHAT THEY BECAME. A parser that only
 *   showed chips would leave you guessing which part of your sentence it ate.
 *
 * SAID versus ASSUMED
 *   A chip you caused carries its colour. A chip the app supplied — the day,
 *   when you named none — is grey and dimmed. Todoist draws both alike, so its
 *   row mixes what you decided with what it decided; here you can see the
 *   difference without reading.
 *
 * NO SIGILS. #project and @label are a syntax to learn; the vocabulary is
 * already known — the projects have names — so the words are enough.
 *
 * THE TYPE IS INFERRED. "call Anna tomorrow 3pm" is an event, "call Anna" is a
 * task, "notes on the factory" is a document, "every day" is a habit. The type
 * chip states the verdict and can be overruled, which is faster than choosing
 * from a menu you have to read first.
 */
const CoNS = window.NeedtDesignSystem_25d3c8;
const { Icon: CoIcon, IconButton: CoIconButton, Menu: CoMenu, MenuItem: CoMenuItem, MenuLabel: CoMenuLabel, MenuSeparator: CoMenuSep, Tooltip: CoTooltip } = CoNS;

const CO_PROJECTS = ["Operations", "Design system", "German", "Resale", "Life"];
const CO_LABELS = ["errand", "money", "deep work", "admin", "reading"];
const CO_DOW = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

/* Each rule owns one attribute and one vocabulary. Order matters: the longest
   and most specific patterns claim their words first, so "by friday" becomes a
   deadline before "friday" can become a date. */
const CO_RULES = [
  { k: "repeat", tone: "var(--info)", re: /\b(every day|every week|every month|every (?:mon|tues|wednes|thurs|fri|satur|sun)day|daily|weekly|monthly)\b/i,
    read: (m) => m[0].toLowerCase() },
  { k: "deadline", tone: "var(--destructive)", re: /\b(?:by|due) (today|tomorrow|tonight|this weekend|next week|mon|tues|wednes|thurs|fri|satur|sun)(?:day)?\b/i,
    read: (m) => "by " + m[1].toLowerCase() },
  { k: "duration", tone: "var(--text-tertiary)", re: /\bfor (\d+)\s?(m|min|mins|minutes|h|hr|hrs|hours)\b/i,
    read: (m) => (/^h/i.test(m[2]) ? m[1] + " h" : m[1] + " min") },
  { k: "date", tone: "var(--accent)", re: /\b(today|tonight|tomorrow|tom|this weekend|next week|in \d+ days?|mon|tues|wednes|thurs|fri|satur|sun)(?:day)?\b/i,
    read: (m) => {
      const w = m[1].toLowerCase();
      if (w === "tom") return "Tomorrow";
      const dow = CO_DOW.filter((d) => d.indexOf(w) === 0)[0];
      if (dow && w.length >= 3) return dow.charAt(0).toUpperCase() + dow.slice(1);
      return w.charAt(0).toUpperCase() + w.slice(1);
    } },
  { k: "time", tone: "var(--accent)", re: /\b(?:at )?(\d{1,2}(?::\d{2})?\s?(?:am|pm)|\d{1,2}:\d{2}|noon|midnight)\b/i,
    read: (m) => m[1].toLowerCase().replace(/\s+/, "") },
  { k: "priority", tone: "var(--destructive)", re: /\b(urgent|important|asap|whenever|sometime)\b/i,
    read: (m) => ({ urgent: "Urgent", asap: "Urgent", important: "Important", whenever: "Whenever", sometime: "Whenever" })[m[0].toLowerCase()] },
  { k: "project", tone: null, re: new RegExp("\\b(" + CO_PROJECTS.join("|") + ")\\b", "i"),
    read: (m) => CO_PROJECTS.filter((p) => p.toLowerCase() === m[1].toLowerCase())[0] },
  { k: "label", tone: "var(--success)", re: new RegExp("\\b(" + CO_LABELS.join("|") + ")\\b", "i"),
    read: (m) => m[1].toLowerCase() }
];

const CO_TYPES = {
  task: { label: "Task", glyph: "circle-check" },
  event: { label: "Event", glyph: "calendar" },
  doc: { label: "Document", glyph: "file-text" },
  habit: { label: "Habit", glyph: "repeat" }
};

/* THE PARSE. One pass per rule over the words not already claimed, so no run of
   text can mean two things at once — the reason the underline can be trusted. */
function coParse(text) {
  const body = text.split("/")[0];
  const parts = text.split("/").slice(1).map((s) => s.trim()).filter(Boolean);
  const taken = [];
  const found = {};
  CO_RULES.forEach((rule) => {
    if (found[rule.k]) return;
    let m = null;
    const re = new RegExp(rule.re.source, "gi");
    let hit;
    while ((hit = re.exec(body))) {
      const a = hit.index, b = a + hit[0].length;
      if (taken.some((t) => a < t[1] && t[0] < b)) continue;
      m = hit; break;
    }
    if (!m) return;
    taken.push([m.index, m.index + m[0].length, rule.k]);
    found[rule.k] = { value: rule.read(m), at: [m.index, m.index + m[0].length] };
  });

  /* The verdict. A recurring thing is a habit whatever else it says; a thing
     with a clock is an event; a thing that is written is a document. */
  let type = "task";
  if (found.repeat) type = "habit";
  else if (found.time || /\b(meeting|call with|lunch|dinner|sync|standup|stand-up|1:1|interview)\b/i.test(body)) type = "event";
  else if (/\b(notes?|draft|write up|write-up|doc|document|brief|memo)\b/i.test(body)) type = "doc";

  const title = body.replace(/\s+/g, " ").trim();
  return { title: title, parts: parts, found: found, taken: taken.sort((x, y) => x[0] - y[0]), type: type };
}

function coHue(p) {
  const proj = window.cvProject ? window.cvProject(p) : null;
  return proj ? proj.hue : "var(--accent)";
}

/* THE UNDERLAY. The input's own text is transparent; this draws the same string
   underneath it with the claimed runs marked. It shares the input's metrics and
   its scroll position, so the marks sit exactly under the letters. */
function CoUnderlay({ text, taken, scroll }) {
  const out = [];
  let at = 0;
  taken.forEach(([a, b, k], i) => {
    if (a > at) out.push(<span key={"p" + i}>{text.slice(at, a)}</span>);
    const rule = CO_RULES.filter((r) => r.k === k)[0];
    const tone = k === "project" ? coHue(text.slice(a, b)) : rule.tone;
    out.push(
      <span key={"m" + i} style={{ borderRadius: 3, padding: "1px 0",
        boxShadow: "inset 0 -2px 0 0 color-mix(in oklab, " + tone + " 55%, transparent)",
        background: "color-mix(in oklab, " + tone + " 12%, transparent)" }}>{text.slice(a, b)}</span>
    );
    at = b;
  });
  const tail = text.slice(at);
  const slash = tail.indexOf("/");
  if (slash >= 0) {
    out.push(<span key="t">{tail.slice(0, slash)}</span>);
    out.push(<span key="parts" style={{ color: "var(--text-tertiary)" }}>{tail.slice(slash)}</span>);
  } else if (tail) out.push(<span key="t">{tail}</span>);
  return (
    <div aria-hidden="true" className="co-mirror" style={{ transform: "translateX(" + -scroll + "px)" }}>{out}</div>
  );
}

function CoChip({ tone, glyph, children, said, onClear }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 26, padding: onClear ? "0 4px 0 8px" : "0 9px",
      borderRadius: "var(--radius-pill)", flex: "none",
      /* Said chips carry their colour; assumed ones are grey and dimmed, so the
         row shows at a glance what you decided and what the app did. */
      background: said ? "color-mix(in oklab, " + tone + " 13%, var(--surface-raised))" : "var(--fill-2)",
      boxShadow: said ? "inset 0 0 0 1px color-mix(in oklab, " + tone + " 34%, transparent)" : "var(--shadow-inset-ring)",
      color: said ? tone : "var(--text-muted)", opacity: said ? 1 : 0.82 }}>
      {glyph ? <CoIcon name={glyph} size={12} /> : null}
      <span style={{ font: "var(--type-meta-medium)", whiteSpace: "nowrap" }}>{children}</span>
      {onClear ? (
        <button type="button" onClick={onClear} aria-label="Remove"
          style={{ display: "grid", placeItems: "center", width: 18, height: 18, border: 0, borderRadius: 9, cursor: "default",
            background: "transparent", color: "inherit" }}>
          <CoIcon name="x" size={11} />
        </button>
      ) : null}
    </span>
  );
}

/* Everything the line does not parse lives here, opening upward so the line you
   are typing in never moves. */
const CO_MORE = [
  ["Description", "align-left", "note", "var(--text-tertiary)", ""],
  ["Attachment", "paperclip", "file", "var(--text-tertiary)", ""],
  ["Parts", "list-plus", "insert", "var(--text-tertiary)", "/"],
  ["Duration", "clock", "insert", "var(--text-tertiary)", "for 30 min"],
  ["Priority", "flag", "insert", "var(--destructive)", "urgent"],
  ["Deadline", "calendar-clock", "insert", "var(--destructive)", "by friday"],
  ["Repeat", "repeat", "insert", "var(--accent)", "every day"],
  ["Labels", "tag", "insert", "var(--success)", "errand"]
];

function CoShelf({ open, onPick }) {
  return (
    <div className={"co-shelf" + (open ? " is-open" : "")} aria-hidden={open ? undefined : "true"}>
      <div className="co-shelf-inner"><div className="co-shelf-body">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 2 }}>
          {CO_MORE.map(([label, glyph, does, tone, ins]) => (
            <button key={label} type="button" tabIndex={open ? 0 : -1}
              onMouseDown={(e) => e.stopPropagation()} onClick={() => onPick(does, ins)}
              style={{ display: "flex", alignItems: "center", gap: 7, height: 30, padding: "0 8px 0 6px", border: 0, cursor: "default",
                borderRadius: "var(--radius-md)", background: "transparent", minWidth: 0,
                transition: "background-color var(--transition-hover)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              {/* The glyph carries the facet's colour on a fill of the same
                  hue, which is how every other mark in this product is set. */}
              <span aria-hidden="true" style={{ flex: "none", display: "grid", placeItems: "center", width: 20, height: 20,
                borderRadius: "var(--radius-xs)", color: tone,
                background: "color-mix(in oklab, " + tone + " 12%, transparent)" }}>
                <CoIcon name={glyph} size={13} />
              </span>
              <span style={{ flex: 1, minWidth: 0, textAlign: "left", font: "var(--type-meta-medium)", color: "var(--text-primary)",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
            </button>
          ))}
        </div>
      </div></div>
    </div>
  );
}

/* Dictation makes several things at once, so it does not commit several things
   at once: the drafts stack above the line, you strike out the wrong ones, and
   one button accepts what is left. Undoing five things across five screens is
   the alternative, and it is much worse. */
const CO_HEARD = [
  "Finish the Q3 budget tomorrow urgent Operations",
  "Schedule the team sync friday at 10am",
  "Buy milk after work today errand"
];

function CoDrafts({ drafts, onDrop, onAccept, onCancel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingBottom: 4 }}>
      {drafts.map((d, i) => {
        const p = coParse(d);
        return (
          <span key={i} className="co-draft" style={{ display: "flex", alignItems: "center", gap: 8, height: 38, padding: "0 6px 0 11px",
            borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)" }}>
            <CoIcon name={CO_TYPES[p.type].glyph} size={14} />
            <span style={{ flex: 1, minWidth: 0, font: "var(--type-ui)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</span>
            {p.found.date ? <CoChip tone="var(--accent)" said>{p.found.date.value}</CoChip> : null}
            {p.found.project ? <CoChip tone={coHue(p.found.project.value)} said>{p.found.project.value}</CoChip> : null}
            <CoIconButton label="Drop it" variant="ghost" size="sm" onClick={() => onDrop(i)}><CoIcon name="x" size={13} /></CoIconButton>
          </span>
        );
      })}
      <span style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 2 }}>
        <button type="button" onClick={onAccept} className="rb-entry"
          style={{ display: "flex", alignItems: "center", gap: 7, height: 30, padding: "0 12px", border: 0, cursor: "default",
            borderRadius: "var(--radius-lg)", "--rb-ink": "var(--accent)" }}>
          <span className="rb-rest" style={{ font: "var(--type-ui-medium)" }}>Add {drafts.length}</span>
        </button>
        <button type="button" onClick={onCancel}
          style={{ height: 30, padding: "0 10px", border: 0, cursor: "default", borderRadius: "var(--radius-lg)",
            background: "transparent", font: "var(--type-ui)", color: "var(--text-muted)" }}>Cancel</button>
      </span>
    </div>
  );
}

function Composer({ open, onClose, onCreate, from }) {
  const [text, setText] = React.useState("");
  const [scroll, setScroll] = React.useState(0);
  const [more, setMore] = React.useState(false);
  const [note, setNote] = React.useState(null);
  const [files, setFiles] = React.useState([]);
  const [listening, setListening] = React.useState(false);
  const [drafts, setDrafts] = React.useState(null);
  const [type, setType] = React.useState(null);
  const [flight, setFlight] = React.useState(null);
  const [sending, setSending] = React.useState(0);
  const [arc, setArc] = React.useState(null);
  const [landed, setLanded] = React.useState(false);
  const input = React.useRef(null);
  const box = React.useRef(null);

  const p = coParse(text);
  const kind = type || p.type;

  React.useEffect(() => {
    if (!open) { setText(""); setDrafts(null); setType(null); setMore(false); setListening(false); return; }
    window.setTimeout(() => { if (input.current) input.current.focus(); }, 60);
  }, [open]);

  /* THE ARC. The chat pill does not vanish and a panel appear — one object
     travels. It is read from where the pill actually is, thrown along a curve
     that overshoots upward, and unfolds into the line at the end. Two objects
     appearing and disappearing would be two events to follow; this is one. */
  React.useEffect(() => {
    if (!open || landed) return undefined;
    const id = window.setTimeout(() => setLanded(true), 520);
    return () => window.clearTimeout(id);
  }, [open, landed]);

  React.useLayoutEffect(() => {
    if (!open) { setArc(null); setLanded(false); return; }
    if (!box.current || !from) { setArc({}); return; }
    const to = box.current.getBoundingClientRect();
    setArc({
      "--co-dx": ((from.left + from.width / 2) - (to.left + to.width / 2)) + "px",
      "--co-dy": ((from.top + from.height / 2) - (to.top + to.height / 2)) + "px",
      "--co-sx": from.width / to.width,
      "--co-sy": from.height / to.height
    });
  }, [open]);

  function insert(snippet) {
    setMore(false);
    if (!snippet) return;
    setText((t) => (t ? t.replace(/\s+$/, "") + " " + snippet : snippet));
    window.setTimeout(() => { if (input.current) input.current.focus(); }, 20);
  }

  function commit(str) {
    const line = (str == null ? text : str).trim();
    if (!line) return;
    const parsed = coParse(line);
    if (note && note.trim()) parsed.note = note.trim();
    if (files.length) parsed.files = files.slice();
    onCreate(parsed);
    setNote(null);
    setFiles([]);
    /* What was made leaves the line and goes to where it will live: a card
       lifts off the composer and fades upward. The line stays, because nobody
       captures exactly one thing. */
    setFlight(parsed.title);
    window.setTimeout(() => setFlight(null), 460);
    /* Keyed on a counter, so a second create restarts the discharge rather
       than being swallowed by the first one still playing. */
    setSending((n) => n + 1);
    setText("");
    setType(null);
    if (input.current) input.current.focus();
  }

  function hear() {
    setListening(true);
    window.setTimeout(() => { setListening(false); setDrafts(CO_HEARD.slice()); }, 1700);
  }

  if (!open) return null;

  const said = [];
  if (p.found.date) said.push(["date", "calendar", "var(--accent)", p.found.date.value]);
  if (p.found.time) said.push(["time", "clock", "var(--accent)", p.found.time.value]);
  if (p.found.duration) said.push(["duration", "hourglass", "var(--text-tertiary)", p.found.duration.value]);
  if (p.found.deadline) said.push(["deadline", "calendar-clock", "var(--destructive)", p.found.deadline.value]);
  if (p.found.repeat) said.push(["repeat", "repeat", "var(--info)", p.found.repeat.value]);
  if (p.found.priority) said.push(["priority", "flag", "var(--destructive)", p.found.priority.value]);
  if (p.found.project) said.push(["project", null, coHue(p.found.project.value), p.found.project.value]);
  if (p.found.label) said.push(["label", "tag", "var(--success)", p.found.label.value]);
  if (p.parts.length) said.push(["parts", "list-plus", "var(--text-tertiary)", "0/" + p.parts.length]);

  return (
    <div className="co-scrim" onMouseDown={onClose}>
      <div ref={box}
        className={"co-box" + (arc && !landed ? " co-arrive" : "") + (text.trim() || listening ? " is-live" : "")}
        style={Object.assign({ visibility: arc ? "visible" : "hidden" }, arc || {})}
        onMouseDown={(e) => e.stopPropagation()}>
        {sending ? <span key={sending} className="co-discharge" aria-hidden="true" /> : null}
        {flight ? <span className="co-flight">{flight}</span> : null}
        {drafts ? (
          <CoDrafts drafts={drafts}
            onDrop={(i) => setDrafts((d) => d.filter((_, j) => j !== i))}
            onAccept={() => { drafts.forEach((d) => onCreate(coParse(d))); setDrafts(null); }}
            onCancel={() => setDrafts(null)} />
        ) : null}

        <CoShelf open={more} onPick={(does, ins) => {
          setMore(false);
          if (does === "note") { setNote((n) => (n == null ? "" : n)); return; }
          if (does === "file") { setFiles((f) => f.concat(["Q3-roadmap.pdf"])); return; }
          insert(ins);
        }} />

        {/* The description: a second line, under the one you are typing, in the
            document body size — it is prose, not an attribute. */}
        {note != null ? (
          <div className="co-note" style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <span aria-hidden="true" style={{ flex: "none", display: "grid", placeItems: "center", width: 20, height: 22, color: "var(--text-quaternary)" }}>
              <CoIcon name="align-left" size={13} />
            </span>
            <textarea autoFocus value={note} rows={2} spellCheck="false"
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape" && !note.trim()) { e.stopPropagation(); setNote(null); } }}
              placeholder="What this is about"
              style={{ flex: 1, minWidth: 0, margin: 0, padding: 0, border: 0, outline: "none", resize: "none", background: "transparent",
                font: "var(--type-body)", color: "var(--text-primary)" }} />
            <CoIconButton label="Drop the description" variant="ghost" size="sm" onClick={() => setNote(null)}>
              <CoIcon name="x" size={13} />
            </CoIconButton>
          </div>
        ) : null}

        {listening ? (
          <div style={{ display: "flex", alignItems: "center", gap: 11, height: 44 }}>
            <span className="co-bars" aria-hidden="true">{[0, 1, 2, 3, 4, 5, 6].map((i) => <i key={i} style={{ animationDelay: (i * 0.09) + "s" }} />)}</span>
            <span style={{ font: "var(--type-ui)", color: "var(--text-secondary)" }}>Listening — say everything you need to get done.</span>
            <span style={{ marginLeft: "auto" }}>
              <CoIconButton label="Stop" variant="ghost" onClick={() => setListening(false)}><CoIcon name="x" size={15} /></CoIconButton>
            </span>
          </div>
        ) : (
          <div className="co-line">
            <CoUnderlay text={text} taken={p.taken} scroll={scroll} />
            <input ref={input} className="co-input" value={text} spellCheck="false"
              placeholder="Call Anna tomorrow 3pm — or say it"
              onChange={(e) => { setText(e.target.value); setScroll(e.target.scrollLeft); }}
              onScroll={(e) => setScroll(e.target.scrollLeft)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); commit(); }

              }} />
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, position: "relative" }}>
          <CoTooltip label="Everything the line does not say" side="top">
            <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => setMore(!more)}
              style={{ flex: "none", display: "grid", placeItems: "center", width: 30, height: 30, border: 0, cursor: "default",
                borderRadius: "var(--radius-md)", background: more ? "var(--fill-3)" : "var(--fill-2)", color: "var(--text-secondary)" }}>
              <CoIcon name="plus" size={15} />
            </button>
          </CoTooltip>

          <span className="scroll-inner" style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 5, overflowX: "auto", padding: "1px 0" }}>
            {/* The verdict first: what is about to be made. */}
            <CoChip tone="var(--text-secondary)" glyph={CO_TYPES[kind].glyph} said={!!type}>
              {CO_TYPES[kind].label}
            </CoChip>
            {said.map(([k, glyph, tone, value]) => (
              <CoChip key={k} tone={tone} glyph={glyph} said
                onClear={() => { const f = p.found[k]; if (f) setText(text.slice(0, f.at[0]) + text.slice(f.at[1])); }}>{value}</CoChip>
            ))}
            {/* Nothing said a day, so the app supplies one — and says so by
                being grey rather than coloured. */}
            {!p.found.date && !p.found.repeat ? <CoChip tone="var(--accent)" glyph="calendar">Today</CoChip> : null}
            {!p.found.project ? <CoChip tone="var(--text-tertiary)">No project</CoChip> : null}
            {files.map((f, i) => (
              <CoChip key={f + i} tone="var(--text-tertiary)" glyph="paperclip" said
                onClear={() => setFiles((all) => all.filter((_, j) => j !== i))}>{f}</CoChip>
            ))}
          </span>

          <span style={{ flex: "none", display: "flex", alignItems: "center", gap: 4 }}>
            <CoIconButton label="Close" variant="ghost" onClick={onClose}><CoIcon name="x" size={16} /></CoIconButton>
            {text.trim() ? (
              <CoTooltip label="Create it" side="top">
                <button type="button" onClick={() => commit()} className="co-go" aria-label="Create it">
                  <CoIcon name="arrow-up" size={16} />
                </button>
              </CoTooltip>
            ) : (
              <CoTooltip label="Say several at once" side="top">
                <button type="button" onClick={hear} className="co-go" aria-label="Dictate">
                  <CoIcon name="audio-lines" size={16} />
                </button>
              </CoTooltip>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Composer, CO_MORE, coParse, CO_PROJECTS, CO_LABELS });
