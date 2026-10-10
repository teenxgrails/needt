/* THE BLOCK, JUDGED — every weight, both grounds, on a real day.
 *
 * The point of this page is the density answer: the block happening now and
 * the one happening next are open, the rest are one line, and the day still
 * fits at 56px to the hour. If that does not read from a still, the answer is
 * wrong. */
const { ToggleGroup: RbToggle, Button: RbButton } = window.NeedtDesignSystem_25d3c8;

const RB_DAY = [
  { id: 1, title: "Team meeting", from: "10:00", to: "11:40", start: 10, end: 11.667,
    project: "ops", movable: false, source: "google", place: "Pelican 21",
    lat: 52.5233, lon: 13.4127, travel: 18 },
  { id: 2, title: "Marketing course", from: "10:50", to: "12:30", start: 11.833, end: 12.5,
    project: "ds", movable: true, place: "St Andrews Ln", where: "Design system / Learning",
    reason: "The only 100 minutes free before the module closes on Thursday",
    entry: "Open the first module" },
  { id: 3, title: "Anna's birthday — get the gift", from: "12:35", to: "13:40", start: 12.583, end: 13.667,
    project: "life", movable: true, place: "Cedar", where: "Life / Gifts", parts: "1/3",
    reason: "Moved up: the shop shuts at six and the party is tomorrow",
    note: "She mentioned the ceramic set twice." },
  { id: 9, title: "Sign the factory quote", from: "14:00", to: "14:45", start: 14, end: 14.75,
    project: "ops", movable: true, priority: "now", where: "Operations / Launch",
    risk: "The line is held until six today",
    reason: "Ahead of everything else: the whole batch waits on it" },
  { id: 4, title: "Upgrade Slack & create the workspace", from: "15:00", to: "16:40", start: 15, end: 16.667,
    project: "ops", movable: true, source: "slack", link: "app.slack.com/plans", where: "Operations / Tooling",
    reason: "Your longest quiet stretch today",
    og: { site: "slack.com", mark: "slack", title: "Slack brings the team together" },
    entry: "Open the billing page" },
  { id: 5, title: "Declined", from: "16:25", to: "17:00", start: 16.75, end: 17.25, declined: true },
  { id: 6, title: "Hubstaff broadcast", from: "17:30", to: "18:40", start: 17.5, end: 18.667,
    project: "ds", movable: true, source: "linear", attachment: "Q3-roadmap.pdf", where: "Design system / Roadmap",
    reason: "After the calls, so nothing interrupts it" },
  /* A group: three tasks of one category holding one stretch. Its end is
     derived from the sum of what is still open, so closing a task shortens the
     block and hands the time back to the day. */
  { id: 8, title: "Resale", from: "20:15", to: "22:25", start: 20.25, project: "resale", movable: true, where: "Resale / September batch",
    group: [
      { title: "Photograph the shell", est: 40, done: true },
      { title: "List the boots", est: 45, done: false },
      { title: "Ship the camera body", est: 45, done: false },
      { title: "Measure the Margiela coat", est: 20, done: false },
      { title: "Reply to the Berlin buyer", est: 15, done: false },
      { title: "Print two labels", est: 10, done: false },
      { title: "Drop the parcels at the post office", est: 30, done: false }
    ] },
  { id: 7, title: "German — B2 unit 4", from: "19:00", to: "20:00", start: 19, end: 20,
    project: "german", movable: false, parts: "0/4" }
];

/* A group's end is its start plus what is left to do in it — the block is not
   a fixed pair of clocks, it is a quantity of work with a beginning. */
function rbEnd(b, done) {
  if (!b.group) return b.end;
  const mins = b.group.reduce((s, t, i) => s + ((done && done[b.id + ":" + i] != null ? done[b.id + ":" + i] : t.done) ? 0 : t.est), 0);
  return b.start + mins / 60;
}
function rbGroup(b, done) {
  if (!b.group) return null;
  return b.group.map((t, i) => Object.assign({}, t, { done: done && done[b.id + ":" + i] != null ? done[b.id + ":" + i] : t.done }));
}

const RB_HOUR = 56;
const RB_FROM = 9.5;
const RB_TO = 23;
const RB_NOW = 13.2;

/* Which blocks open: the one happening now, and the one after it. Everything
   else is a line. That is the whole density policy, in one function. */
function weightOf(b, now) {
  if (b.declined) return "declined";
  if (b.start <= now && now < b.end) return "open";
  const next = RB_DAY.filter((x) => !x.declined && x.start > now).sort((a, c) => a.start - c.start)[0];
  return next && next.id === b.id ? "open" : "compressed";
}

function rbSpan(b, done) {
  const end = rbEnd(b, done);
  const fmt = (v) => String(Math.floor(v)).padStart(2, "0") + ":" + String(Math.round((v % 1) * 60)).padStart(2, "0");
  return { from: fmt(b.start), to: fmt(end), end: end };
}

/* THE DAY AS A LIST — no hour scale, so nothing can lie about duration. The
   block is as tall as what it has to say, its time is inside it, and the empty
   stretches between blocks are named by their length, which is the fact the
   grid was being asked to carry pictorially. This is where a rich block
   belongs. */
function DayList({ theme, label, done, onToggle }) {
  const dark = theme === "dim" || theme === "dark";
  const items = RB_DAY.slice().sort((a, b) => a.start - b.start)
    .map((b) => (b.group ? Object.assign({}, b, rbSpan(b, done), { group: rbGroup(b, done) }) : b));
  const out = [];
  items.forEach((b, i) => {
    const prev = items[i - 1];
    const gap = prev ? Math.round((b.start - prev.end) * 60) : 0;
    if (gap >= 15) out.push(
      <span key={"g" + b.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "2px 2px" }}>
        <span style={{ flex: "none", font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
          {gap >= 60 ? Math.floor(gap / 60) + " h" + (gap % 60 ? " " + (gap % 60) + " min" : "") : gap + " min"} free
        </span>
        <span aria-hidden="true" style={{ flex: 1, borderTop: "1px dashed var(--border)" }} />
      </span>
    );
    const w = weightOf(b, RB_NOW);
    /* In the list the block asks for what its content needs, and gets it. */
    const h = w === "declined" ? 38
      /* A group asks for its rows and is capped: past six it scrolls, because
         a block that keeps growing stops being a block. */
      : b.group ? (w === "open" ? Math.min(window.RB_HEADER + b.group.length * 33 + 15, window.RB_HEADER + 6 * 33 + 15) : 44)
      : w === "open" ? null : 44;
    const crosses = b.start <= RB_NOW && RB_NOW < b.end;
    out.push(
      <RichBlock key={b.id} b={b} weight={w} height={h} dark={dark}
        remaining={crosses ? Math.round((b.end - RB_NOW) * 60) : null}
        onToggleTask={(i) => onToggle(b.id + ":" + i)} />
    );
  });
  return (
    <div className={"app " + (theme === "paper" ? "paper" : theme)}
      style={{ display: "flex", flexDirection: "column", gap: 11, padding: 16, minWidth: 0,
        background: "var(--background)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-ring)" }}>
      <span style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
        <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>list · {label}</span>
        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>content-sized · no hour scale to violate</span>
      </span>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{out}</div>
    </div>
  );
}

function Day({ theme, label, done, onToggle }) {
  const dark = theme === "dim" || theme === "dark";
  const top = (v) => (v - RB_FROM) * RB_HOUR;
  const hours = [];
  for (let h = Math.ceil(RB_FROM); h <= RB_TO; h++) hours.push(h);
  return (
    <div className={"app " + (theme === "paper" ? "paper" : theme)}
      style={{ display: "flex", flexDirection: "column", gap: 11, padding: 16, minWidth: 0, overflow: "hidden",
        background: "var(--background)", borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-ring)" }}>
      <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>grid · {label}</span>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-disabled)" }}>{RB_HOUR}px/h · duration-true · 09:30–23:00 in {Math.round((RB_TO - RB_FROM) * RB_HOUR)}px</span>
      </span>
      <div style={{ position: "relative", display: "flex", height: (RB_TO - RB_FROM) * RB_HOUR + 16, paddingTop: 8 }}>
        {/* The gutter: hours named, minutes as a dotted rail, now in accent. */}
        <div style={{ position: "relative", flex: "none", width: 52 }}>
          {hours.map((h) => (
            <span key={h} style={{ position: "absolute", right: 10, top: top(h), transform: "translateY(-7px)",
              font: "var(--type-meta)", fontSize: 11, color: "var(--text-disabled)", fontVariantNumeric: "tabular-nums" }}>
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
          <span style={{ position: "absolute", right: 10, top: top(RB_NOW), transform: "translateY(-7px)",
            font: "var(--type-meta-medium)", fontSize: 11, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>
            {String(Math.floor(RB_NOW)).padStart(2, "0")}:{String(Math.round((RB_NOW % 1) * 60)).padStart(2, "0")}
          </span>
        </div>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          {hours.map((h) => (
            <span key={h} aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: top(h), borderTop: "1px solid var(--border)" }} />
          ))}
          {RB_DAY.map((raw) => {
            const b = raw.group ? Object.assign({}, raw, rbSpan(raw, done), { group: rbGroup(raw, done) }) : raw;
            const w = weightOf(b, RB_NOW);
            /* DURATION-TRUE, without exception. On a surface where the gutter,
               the hour rules and the now-line are all a scale, a block's box
               must be its duration — a box 2.3× its duration reads as an event
               that runs an hour longer than it does. So the block gets exactly
               its slot and spends that height down its own collapse order:
               at 56px an hour, a one-hour block affords a header and one fact.
               The map and the preview live in the list, where there is no
               scale to violate. */
            const h = Math.min(Math.max((b.end - b.start) * RB_HOUR - 3, 20), (RB_TO - b.start) * RB_HOUR - 3);
            const crosses = b.start <= RB_NOW && RB_NOW < b.end;
            const left = Math.round((b.end - RB_NOW) * 60);
            return (
              <div key={b.id} style={{ position: "absolute", left: 2, right: 6, top: top(b.start), height: h, zIndex: w === "open" ? 4 : 2 }}>
                <RichBlock b={b} weight={w} height={h} dark={dark} onToggleTask={(i) => onToggle(b.id + ":" + i)} />
                {crosses ? (
                  <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: (RB_NOW - b.start) * RB_HOUR, height: 0, zIndex: 6 }}>
                    <span style={{ position: "absolute", left: 0, right: 0, top: 0, borderTop: "1px solid " + (window.RB_PROJECTS[b.project] || {}).hue }} />
                    {/* Its own lane on the right edge: the payload is
                        left-aligned, so the label never lands in the content's
                        airspace. */}
                    {/* Same rule as the block's own chip: hue in the plate,
                        ink from the ladder, one text node. */}
                    <span style={{ position: "absolute", right: 6, top: -7, height: 14, display: "flex", alignItems: "center",
                      padding: "0 5px", borderRadius: "var(--radius-xs)",
                      background: "color-mix(in oklab, " + (window.RB_PROJECTS[b.project] || {}).hue + " 34%, var(--surface-raised))",
                      font: "var(--type-meta-medium)", fontSize: 10,
                      color: "var(--text-primary)" }}>{"Left " + left + "m"}</span>
                  </span>
                ) : null}
              </div>
            );
          })}
          {/* The now-line runs the width of the day; where it crosses a block
              the block states its own remainder, in its own hue. */}
          <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: top(RB_NOW), height: 0, zIndex: 3 }}>
            <span style={{ position: "absolute", left: 0, right: 0, top: 0, borderTop: "1px solid var(--accent)", opacity: 0.55 }} />
            <span style={{ position: "absolute", left: 2, top: -3, width: 6, height: 6, borderRadius: 3, background: "var(--accent)" }} />
          </span>
        </div>
      </div>
    </div>
  );
}

/* The anatomy, taken apart, so each decision can be checked on its own. */
function Anatomy({ theme }) {
  const dark = theme === "dim" || theme === "dark";
  const cases = [
    ["Open · now", { id: "a", title: "Anna's birthday — get the gift", from: "12:35", to: "13:40", project: "life", movable: true, place: "Cedar", parts: "1/3", reason: "Moved up: the shop shuts at six and the party is tomorrow", note: "She mentioned the ceramic set twice." }, "open", null],
    ["Open · with a link preview", { id: "b", title: "Upgrade Slack", from: "15:00", to: "16:40", project: "ops", movable: true, source: "slack", link: "app.slack.com/plans", og: { site: "slack.com", mark: "slack", title: "Slack brings the team together" }, entry: "Open the billing page" }, "open", null],
    ["Open · the scheduler's reason, in words", { id: "j", title: "Marketing course", from: "10:50", to: "12:30", project: "ds", movable: true, place: "St Andrews Ln", where: "Design system / Learning", reason: "The only 100 minutes free before the module closes on Thursday", entry: "Open the first module" }, "open", null],
    ["Open · you placed it, so it states its reserve instead", { id: "k", title: "German — B2 unit 4", from: "19:00", to: "20:00", project: "german", movable: false, parts: "0/4", where: "German / B2 course", reserve: { state: "tight", text: "2 h 30 min of slack before Friday" } }, "open", null],
    ["Open · fixed, so it wears an edge", { id: "c", title: "Team meeting", from: "10:00", to: "11:40", project: "ops", movable: false, source: "google", place: "Pelican 21", reserve: { state: "ok", text: "You put this here" } }, "open", null],
    ["Compressed", { id: "d", title: "Hubstaff broadcast", from: "17:30", to: "18:40", project: "ds", movable: true, source: "linear" }, "compressed", 44],
    ["Compressed · fixed", { id: "e", title: "German — B2 unit 4", from: "19:00", to: "20:00", project: "german", movable: false, parts: "0/4" }, "compressed", 44],
    ["Declined — it keeps the slot and says nothing", { id: "f", from: "16:25", to: "17:00", declined: true }, "declined", 44],
    ["Overdue — red, and the line says it is late", { id: "g", title: "Reply to counsel", from: "11:00", to: "11:30", project: "ops", movable: true, overdue: true, where: "Operations / Legal", risk: "Three days late" }, "open", null],
    ["Urgent — the same red, before the fact instead of after", { id: "u", title: "Sign the factory quote", from: "14:00", to: "14:45", project: "ops", movable: true, priority: "now", where: "Operations / Launch", risk: "The line is held until six today", reason: "Ahead of everything else: the whole batch waits on it" }, "open", null],
    ["A group — three tasks holding one stretch. Closing one shortens the block.", { id: "h", title: "Resale", from: "20:15", to: "22:15", project: "resale", movable: true, where: "Resale / September batch", group: [{ title: "Photograph the shell", est: 40, done: true }, { title: "List the boots", est: 45, done: false }, { title: "Ship the camera body", est: 45, done: false }, { title: "Measure the Margiela coat", est: 20, done: false }, { title: "Reply to the Berlin buyer", est: 15, done: false }, { title: "Print two labels", est: 10, done: false }, { title: "Drop the parcels at the post office", est: 30, done: false }] }, "open", 43 + 6 * 33 + 15],
    ["A group, compressed — it names the task you would do next", { id: "i", title: "Resale", from: "20:15", to: "22:15", project: "resale", movable: true, group: [{ title: "Photograph the shell", est: 40, done: true }, { title: "List the boots", est: 45, done: false }, { title: "Ship the camera body", est: 45, done: false }] }, "compressed", 44]
  ];
  return (
    <div className={"app " + (theme === "paper" ? "paper" : theme)}
      style={{ display: "flex", flexDirection: "column", gap: 14, padding: 16, background: "var(--background)",
        borderRadius: "var(--radius-2xl)", boxShadow: "var(--shadow-ring)" }}>
      <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>anatomy · {theme}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, alignItems: "start" }}>
        {cases.map(([label, b, w, h]) => (
          <span key={b.id} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <RichBlock b={b} weight={w} height={h} dark={dark} />
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>{label}</span>
          </span>
        ))}
      </div>
      {/* The tile on its own, at both sizes and for every source. */}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, flexWrap: "wrap", paddingTop: 4 }}>
        {Object.keys(window.RB_PROJECTS).map((k) => (
          <span key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <RbTile hue={window.RB_PROJECTS[k].hue} glyph={window.RB_PROJECTS[k].glyph} size={40} />
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>{window.RB_PROJECTS[k].name}</span>
          </span>
        ))}
        {Object.keys(window.RB_SOURCES).map((k) => (
          <span key={k} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
            <RbTile hue={window.RB_SOURCES[k].hue} mark={window.RB_SOURCES[k].mark} size={40} />
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>{window.RB_SOURCES[k].name}</span>
          </span>
        ))}
        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <RbTile hue={window.RB_PROJECTS.ops.hue} glyph="briefcase" size={40} locked />
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>fixed</span>
        </span>
      </div>
    </div>
  );
}

function App() {
  /* Closing a task in a group shortens its block on both surfaces at once,
     which is the point of the group being one object. */
  const [done, setDone] = React.useState({});
  const toggle = (k) => setDone((s) => Object.assign({}, s, { [k]: !s[k] }));
  return (
    <div className="app" style={{ minHeight: "100%", background: "var(--background)", padding: "20px 20px 60px", display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <h1 style={{ margin: 0, font: "var(--type-page-title)", color: "var(--text-primary)" }}>The block</h1>
        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", maxWidth: 820, textWrap: "pretty" }}>
          The project owns the hue, so the colour is the person&apos;s own data. The edge carries movability, which had to move
          somewhere when colour took the body. The tile says where the block came from. Every fact has a height and a rank,
          and the block spends the height it has down that order — so a fact is shown whole or not shown, never clipped.
          On the GRID height is duration and nothing else, which at 56px an hour affords a header and one fact. In the LIST
          there is no hour scale to violate, so the block is as tall as what it has to say. The line that matters most there
          is why the block is at this hour: every auto-placed block has a reason and no planner shows one, which is why
          people re-do the scheduler&apos;s work by hand. A block you placed yourself has no reason — you are the reason — so
          it states its reserve instead, in three states, and &ldquo;you&apos;ll make it&rdquo; gets a sign of its own.
        </span>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(330px, 1fr))", gap: 16, alignItems: "start" }}>
        <DayList theme="dark" label="dark" done={done} onToggle={toggle} />
        <DayList theme="paper" label="paper" done={done} onToggle={toggle} />
        <Day theme="dark" label="dark" done={done} onToggle={toggle} />
        <Day theme="paper" label="paper" done={done} onToggle={toggle} />
      </div>
      <Anatomy theme="dark" />
      <Anatomy theme="paper" />
    </div>
  );
}

const __root = document.getElementById("root");
if (__root) ReactDOM.createRoot(__root).render(<App />);
