/* THE MINIATURE — a real screen of the product, drawn small.
 *
 * Every thumbnail in this kit used to be a grey bar diagram: a rail, three
 * dashes, two rounded rectangles. It reads as a wireframe of something, and a
 * person choosing a theme or a default view is not choosing a wireframe.
 *
 * So this draws the actual screen — the rail with its wordmark and nav rows,
 * a header, real task cards with their project tiles and hues, an hour grid
 * with a now-line — at FULL SIZE and then scales it down. Text at 10px scaled
 * to 0.38 is 3.8px: unreadable, but shaped exactly like type, which is what a
 * screenshot looks like at thumbnail size. Grey bars never look like that.
 *
 * One component for every place a miniature appears — themes in Settings, the
 * default view in setup, the brief's three forms — so the three of them cannot
 * drift into three different products.
 *
 *   <Miniature kind="day" theme="dark" width={112} />
 */
const MI_W = 320;
const MI_H = 206;

function miHue(name) {
  const p = window.NEEDT && window.NEEDT.project(name);
  return (p && p.hue) || "var(--text-disabled)";
}

/* A line of type. Real text is drawn where the screen has text — at this
   scale it renders as the grey rhythm of a sentence, which is what the eye
   is actually matching against. */
function MiText({ children, size, weight, ink, width }) {
  return (
    <span style={{ display: "block", maxWidth: width, font: (weight || 400) + " " + (size || 10) + "px/1.35 var(--font-sans)",
      color: ink || "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{children}</span>
  );
}

/* The project tile, at miniature scale: the same squircle with the same one
   step of lift, because it is the single most recognisable object here. */
function MiTile({ hue, size }) {
  const s = size || 14;
  return (
    <span aria-hidden="true" style={{ flex: "none", width: s, height: s, borderRadius: Math.round(s * 0.3),
      background: "linear-gradient(180deg, color-mix(in oklab, " + hue + " 90%, white), color-mix(in oklab, " + hue + " 96%, black))",
      boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.14)" }} />
  );
}

function MiCard({ title, meta, hue, wide }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 7px", borderRadius: 7,
      background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)", minWidth: 0, width: wide }}>
      <MiTile hue={hue} size={13} />
      <span style={{ flex: 1, minWidth: 0 }}><MiText size={9.5} weight={500}>{title}</MiText></span>
      {meta ? <MiText size={9} ink="var(--text-quaternary)">{meta}</MiText> : null}
    </span>
  );
}

/* The rail. Present in every miniature, because it is present in every screen
   and it is the first thing the eye uses to recognise the product. */
function MiRail() {
  const rows = [["Home", true], ["Calendar", false], ["Workspace", false], ["Docs", false]];
  return (
    <span style={{ flex: "none", width: 74, display: "flex", flexDirection: "column", gap: 7, padding: "9px 7px",
      background: "var(--surface-raised)", boxShadow: "var(--border) -1px 0 0 0 inset" }}>
      <span style={{ display: "block", padding: "0 2px 2px" }}>
        <span className="font-display" style={{ font: "600 13px/1 var(--font-sans)", letterSpacing: "-0.02em", color: "var(--text-primary)" }}>Needt</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5, height: 15, padding: "0 5px", borderRadius: 5,
        background: "var(--fill-2)", boxShadow: "var(--shadow-inset-ring)" }}>
        <MiText size={9} ink="var(--text-disabled)">Find</MiText>
      </span>
      {rows.map(([label, on]) => (
        <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, height: 15, padding: "0 5px", borderRadius: 5,
          background: on ? "var(--fill-accent)" : "transparent" }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: on ? "var(--accent)" : "var(--fill-5)" }} />
          <MiText size={9} weight={on ? 500 : 400} ink={on ? "var(--accent)" : "var(--text-tertiary)"}>{label}</MiText>
        </span>
      ))}
      <span style={{ paddingTop: 3 }}><MiText size={8} weight={500} ink="var(--text-quaternary)">PROJECTS</MiText></span>
      {["Operations", "Design system", "Resale"].map((n) => (
        <span key={n} style={{ display: "flex", alignItems: "center", gap: 5, height: 13, padding: "0 5px" }}>
          <span style={{ width: 5, height: 5, borderRadius: 3, background: miHue(n) }} />
          <MiText size={9} ink="var(--text-tertiary)">{n}</MiText>
        </span>
      ))}
    </span>
  );
}

function MiHeader({ title, tabs, on }) {
  return (
    <span style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, padding: "9px 11px 7px" }}>
      <MiText size={13} weight={600}>{title}</MiText>
      {tabs ? (
        <span style={{ marginLeft: "auto", display: "flex", gap: 2, padding: 2, borderRadius: 999, background: "var(--fill-2)" }}>
          {tabs.map((t) => (
            <span key={t} style={{ padding: "2px 6px", borderRadius: 999,
              background: t === on ? "var(--fill-accent)" : "transparent" }}>
              <MiText size={8.5} weight={500} ink={t === on ? "var(--accent)" : "var(--text-muted)"}>{t}</MiText>
            </span>
          ))}
        </span>
      ) : null}
    </span>
  );
}

/* ── The five grounds ──────────────────────────────────────────────────── */

function MiDay() {
  return (
    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 7, padding: "0 11px 11px" }}>
      {/* The habit rail: the first thing on Home. */}
      <span style={{ display: "flex", gap: 4 }}>
        {[["German", true], ["Walk", true], ["Gym", false]].map(([n, on]) => (
          <span key={n} style={{ display: "flex", alignItems: "center", gap: 4, height: 17, padding: "0 7px 0 5px", borderRadius: 999,
            background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)" }}>
            <span style={{ width: 7, height: 7, borderRadius: 4, background: on ? "var(--accent)" : "transparent",
              boxShadow: on ? "none" : "inset 0 0 0 1px var(--text-disabled)" }} />
            <MiText size={9}>{n}</MiText>
          </span>
        ))}
      </span>
      <span style={{ flex: 1, minHeight: 0, display: "flex", gap: 9 }}>
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          <MiText size={9} weight={500} ink="var(--accent)">Today</MiText>
          <MiCard title="Draft the launch brief" meta="90m" hue={miHue("Operations")} />
          <MiCard title="Review the spec" meta="60m" hue={miHue("Design system")} />
          <MiCard title="German — unit 4" meta="60m" hue={miHue("German")} />
          <MiCard title="Ship the camera body" meta="45m" hue={miHue("Resale")} />
        </span>
      </span>
    </span>
  );
}

function MiColumns() {
  const cols = [
    ["Today", [["Draft the launch brief", "Operations"], ["Reply to the buyer", "Resale"]]],
    ["Tomorrow", [["Sign the quote", "Operations"], ["Landing copy", "Design system"], ["Archive August", "Life"]]],
    ["Thursday", [["German — unit 5", "German"]]]
  ];
  return (
    <span style={{ flex: 1, minWidth: 0, display: "flex", gap: 7, padding: "0 11px 11px", overflow: "hidden" }}>
      {cols.map(([day, items]) => (
        <span key={day} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 5 }}>
          <MiText size={9} weight={500} ink={day === "Today" ? "var(--accent)" : "var(--text-quaternary)"}>{day}</MiText>
          {items.map(([t, p]) => <MiCard key={t} title={t} hue={miHue(p)} />)}
        </span>
      ))}
    </span>
  );
}

function MiGrid() {
  const hours = [9, 10, 11, 12, 13];
  const blocks = [
    { at: 0.2, h: 26, title: "Draft the brief", p: "Operations" },
    { at: 1.6, h: 16, title: "1:1 Anna", p: "Design system", event: true },
    { at: 2.6, h: 30, title: "Print files", p: "Resale" }
  ];
  const row = 26;
  return (
    <span style={{ position: "relative", flex: 1, minWidth: 0, display: "block", padding: "0 11px 11px", overflow: "hidden" }}>
      {hours.map((h, i) => (
        <span key={h} style={{ position: "absolute", left: 11, right: 11, top: i * row, borderTop: "1px solid var(--border)" }}>
          <span style={{ position: "absolute", left: 0, top: -5 }}><MiText size={8} ink="var(--text-disabled)">{h}:00</MiText></span>
        </span>
      ))}
      {blocks.map((b) => (
        <span key={b.title} style={{ position: "absolute", left: 36, right: 14, top: b.at * row + 2, height: b.h,
          display: "flex", alignItems: "center", gap: 5, padding: "0 6px", borderRadius: 6,
          background: b.event ? "color-mix(in oklab, " + miHue(b.p) + " 15%, var(--surface-raised))" : "var(--surface-raised)",
          boxShadow: "inset 0 0 0 1px color-mix(in oklab, " + miHue(b.p) + " 40%, transparent), var(--shadow-ring)" }}>
          <MiTile hue={miHue(b.p)} size={11} />
          <MiText size={9} weight={500}>{b.title}</MiText>
        </span>
      ))}
      {/* The now-line: the one mark that says this is a live day. */}
      <span style={{ position: "absolute", left: 30, right: 11, top: 2.15 * row, borderTop: "1px solid var(--accent)" }}>
        <span style={{ position: "absolute", left: -2, top: -2.5, width: 5, height: 5, borderRadius: 3, background: "var(--accent)" }} />
      </span>
    </span>
  );
}

function MiProse() {
  return (
    <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6, padding: "0 22px 11px" }}>
      <MiText size={14} weight={600}>Week 36 — the September batch</MiText>
      <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <MiText size={9.5} ink="var(--text-secondary)">Legal sign-off is the only thing between us</MiText>
        <MiText size={9.5} ink="var(--text-secondary)">and the factory. Everything else is placed.</MiText>
        <MiText size={9.5} ink="var(--accent)">Three tasks are unplaced and 18 hours are open.</MiText>
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 4, paddingTop: 2 }}>
        {[["Ask counsel for a date", true], ["Send the print files", false]].map(([t, done]) => (
          <span key={t} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 4, background: done ? "var(--accent)" : "transparent",
              boxShadow: done ? "none" : "inset 0 0 0 1px var(--text-disabled)" }} />
            <MiText size={9.5} ink={done ? "var(--text-muted)" : "var(--text-primary)"}>{t}</MiText>
          </span>
        ))}
      </span>
    </span>
  );
}

function MiCanvas() {
  return (
    <span style={{ position: "relative", flex: 1, minWidth: 0, display: "block", padding: "0 11px 11px" }}>
      <span style={{ position: "absolute", left: 14, top: 2 }}><MiText size={13} weight={600}>Week 36</MiText></span>
      <span style={{ position: "absolute", left: 14, top: 22, width: 96 }}>
        <MiCard title="Print files" hue={miHue("Operations")} />
      </span>
      <span style={{ position: "absolute", left: 14, top: 46, width: 110 }}>
        <MiText size={9.5} ink="var(--text-secondary)">Legal sign-off is the only thing</MiText>
      </span>
      <span style={{ position: "absolute", right: 16, top: 10, width: 62, height: 44, borderRadius: 6,
        background: "var(--fill-3)", boxShadow: "var(--shadow-ring)" }} />
      <span style={{ position: "absolute", right: 22, top: 62, display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <span className="font-display" style={{ font: "400 22px/1 var(--font-display, var(--font-sans))", color: "var(--text-primary)" }}>18 h</span>
        <MiText size={8.5} ink="var(--text-muted)">free this week</MiText>
      </span>
      <svg style={{ position: "absolute", left: 18, top: 66 }} width="70" height="26" viewBox="0 0 260 130" fill="none">
        <path d="M20 100 C 60 24, 120 118, 168 60 S 230 20, 250 48" stroke="var(--text-quaternary)" strokeWidth="9" strokeLinecap="round" />
      </svg>
    </span>
  );
}

const MI_KINDS = { day: MiDay, columns: MiColumns, grid: MiGrid, prose: MiProse, canvas: MiCanvas };
const MI_TITLES = { day: "Home", columns: "Calendar", grid: "Calendar", prose: "Home", canvas: "Home" };
const MI_TABS = {
  day: [["Today", "Prose", "Canvas"], "Today"],
  prose: [["Today", "Prose", "Canvas"], "Prose"],
  canvas: [["Today", "Prose", "Canvas"], "Canvas"],
  columns: [["Columns", "Week", "Month"], "Columns"],
  grid: [["Columns", "Week", "Month"], "Week"]
};

/* The screen at full size, then scaled to whatever the thumbnail is. The
   scale is the whole trick: everything inside is authored at the real sizes
   the product uses, so what shrinks is a screen rather than a diagram. */
function Miniature({ kind, theme, width, height, half }) {
  const Body = MI_KINDS[kind] || MiDay;
  const w = width || 112;
  const h = height || Math.round(w * (MI_H / MI_W));
  const tabs = MI_TABS[kind];
  const screen = (
    <span style={{ position: "absolute", left: 0, top: 0, width: MI_W, height: MI_H, display: "flex",
      transform: "scale(" + (w / MI_W) + ")", transformOrigin: "0 0",
      background: "var(--background)", backgroundImage: "var(--canvas-image, none)" }}>
      <MiRail />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <MiHeader title={MI_TITLES[kind] || "Home"} tabs={tabs && tabs[0]} on={tabs && tabs[1]} />
        <Body />
      </span>
    </span>
  );
  /* A pair of themes in one frame: the same screen, cut down the middle, so
     the rail and the blocks continue across the cut. */
  if (half) {
    return (
      <span style={{ position: "relative", display: "block", width: w, height: h, overflow: "hidden", borderRadius: "var(--radius-lg)" }}>
        {[half[0], half[1]].map((t, i) => (
          <span key={i} className={"app " + (t === "light" ? "" : t)}
            style={{ position: "absolute", inset: 0, background: "var(--background)",
              clipPath: i === 0 ? "inset(0 50% 0 0)" : "inset(0 0 0 50%)" }}>{screen}</span>
        ))}
      </span>
    );
  }
  return (
    <span className={theme ? "app " + (theme === "light" ? "" : theme) : undefined}
      style={{ position: "relative", display: "block", width: w, height: h, overflow: "hidden",
        borderRadius: "var(--radius-lg)", background: "var(--background)" }}>
      {screen}
    </span>
  );
}

Object.assign(window, { Miniature, MiTile, MI_W, MI_H });
