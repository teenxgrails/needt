/* THE ACCENT STUDIO
 *
 * The accent is the only colour in a monochrome instrument, and it carries
 * three meanings: category identity, state, and selection. So a candidate is
 * not judged as a swatch — it is judged on the six places the meaning lands,
 * in all three themes, with its contrast as text on its own 12% fill measured
 * rather than guessed.
 *
 * Every candidate overrides the same five tokens and nothing else. If a
 * candidate needs a sixth, it is not a colour change, it is a redesign. */
const { Button: SButton, Chip: SChip, Switch: SSwitch, NavRow: SNav, Icon: SIcon, Input: SInput, ToggleGroup: SToggle, StatusDot: SDot } = window.NeedtDesignSystem_25d3c8;

/* light / dim+dark pairs. Light values are dark enough to be read as text on
   their own 12% fill; dark values are light enough for the same on the dark
   ground. */
const CANDIDATES = [
  { id: "blue", name: "Craft blue", note: "What ships today. The default accent of every planner — Linear, Craft, Notion, Things. Nothing is wrong with it; it is simply invisible from familiarity.",
    light: "#2E6DE9", dark: "#71B2FF", trend: "control" },
  { id: "oxide", name: "Oxide", note: "A warm accent in a cold monochrome instrument. Reads as stamped ink rather than as UI, and no planner uses it. DESIGN.md retired a clay accent — this is that idea with enough depth to hold text.",
    light: "#B0452A", dark: "#E38A6B", trend: "archival warm" },
  { id: "iris", name: "Iris", note: "Far from blue while staying cold, and it holds contrast as text at full strength. The risk is adjacency to the purple every AI product now uses.",
    light: "#5B3FD9", dark: "#A896FF", trend: "current" },
  { id: "petrol", name: "Petrol", note: "Cold like blue but rare: reads engineering, instrument, oscilloscope. The quietest of the coloured candidates and the easiest to live with all day.",
    light: "#0F6E75", dark: "#5FC3CB", trend: "instrument" },
  { id: "mono", name: "Achromatic", note: "The radical one: selection and identity go to the foreground itself, and the ONLY hues left in the product are the ones that mean something — red overdue, green done, blue external. Colour stops being flavour and becomes information.",
    light: "#1A1C1E", dark: "#F9F9F9", trend: "Braun" },
  { id: "project", name: "Project-owned", note: "The chrome is achromatic; each project owns a hue and the accent you see is your own data, not a brand choice. Needs no accent token at all — the swatch shown is one project's.",
    light: "#1A1C1E", dark: "#F9F9F9", trend: "data-as-colour", perProject: true }
];

const PROJECT_HUES = [["Operations", "#B0452A"], ["Design system", "#0F6E75"], ["German", "#7A5AD8"], ["Resale", "#3F7D3A"]];

/* Contrast, computed — the accent is text on its own 12% fill, so that is the
   pair that has to pass, not accent against the page. */
function srgb(c) { return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = srgb(((n >> 16) & 255) / 255), g = srgb(((n >> 8) & 255) / 255), b = srgb((n & 255) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function mix(hex, over, a) {
  const A = parseInt(hex.slice(1), 16), B = parseInt(over.slice(1), 16);
  const f = (s) => Math.round((((A >> s) & 255) * a) + (((B >> s) & 255) * (1 - a)));
  return "#" + [16, 8, 0].map((s) => f(s).toString(16).padStart(2, "0")).join("");
}
function ratio(fg, bg) {
  const a = lum(fg), b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function rgbOf(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(", ");
}

/* One candidate, one theme: the six places the accent's meaning lands. */
function Panel({ c, theme }) {
  const hex = theme === "light" ? c.light : c.dark;
  const ground = theme === "light" ? "#FFFFFF" : theme === "dim" ? "#1E2022" : "#141517";
  const fill = mix(hex, ground, 0.12);
  const r = ratio(hex, fill);
  const vars = {
    "--accent": hex,
    "--accent-rgb": rgbOf(hex),
    "--fill-accent": "rgba(" + rgbOf(hex) + ", 0.12)",
    "--fill-accent-strong": "rgba(" + rgbOf(hex) + ", 0.24)",
    "--ring-accent": "rgba(" + rgbOf(hex) + ", 0.4)",
    "--shadow-focus": "rgba(" + rgbOf(hex) + ", 0.4) 0 0 0 2px inset"
  };
  return (
    <div className={"app " + (theme === "light" ? "" : theme)} style={Object.assign({
      display: "flex", flexDirection: "column", gap: 11, padding: 14, minWidth: 0,
      background: "var(--background)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-ring)" }, vars)}>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 12, height: 12, borderRadius: 4, background: "var(--accent)", flex: "none" }} />
        <span style={{ font: "var(--type-meta-medium)", color: "var(--text-secondary)" }}>{theme}</span>
        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", fontSize: 11, color: r >= 4.5 ? "var(--text-muted)" : "var(--destructive)" }}>
          {r.toFixed(2)}:1 {r >= 4.5 ? "" : "· fails"}
        </span>
      </span>

      {/* Identity: the rail on a task block. */}
      <span style={{ display: "flex", alignItems: "stretch", height: 42, borderRadius: "var(--radius-md)", overflow: "hidden",
        background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)" }}>
        <span style={{ flex: "none", width: 3, background: c.perProject ? PROJECT_HUES[0][1] : "var(--accent)" }} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 1, padding: "0 8px" }}>
          <span style={{ font: "var(--type-meta-medium)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Draft the launch brief</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-quaternary)" }}>09:30–11:00</span>
        </span>
      </span>

      {/* Selection: the active nav row, and state: a chip. */}
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <SNav active icon={<SIcon name="calendar" size={20} />}>Today</SNav>
        <SNav icon={<SIcon name="list-checks" size={20} />}>Tasks</SNav>
      </span>

      <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <SChip tone="accent">Auto-scheduled</SChip>
        <SChip tone="destructive">Overdue</SChip>
        <SSwitch checked onChange={() => {}} />
        <SDot tone="accent" />
      </span>

      {/* The now-line: the one place solid accent is correct, because a line is
          a mark and not a surface. */}
      <span style={{ position: "relative", height: 26, borderRadius: "var(--radius-sm)", background: "var(--fill-2)" }}>
        <span style={{ position: "absolute", left: 0, right: 0, top: 13, borderTop: "1px solid var(--accent)" }} />
        <span style={{ position: "absolute", left: 4, top: 10, width: 6, height: 6, borderRadius: 3, background: "var(--accent)" }} />
      </span>

      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <SButton size="sm">New task</SButton>
        <SButton size="sm" variant="flat">Plan my day</SButton>
      </span>
      <SInput defaultValue="Focus ring" style={{ boxShadow: "var(--shadow-focus)" }} />

      {c.perProject ? (
        <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {PROJECT_HUES.map(([n, h]) => (
            <span key={n} style={{ display: "flex", alignItems: "center", gap: 8, height: 24 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: h, flex: "none" }} />
              <span style={{ font: "var(--type-meta)", color: "var(--text-secondary)" }}>{n}</span>
            </span>
          ))}
        </span>
      ) : null}
    </div>
  );
}

/* CRAFT BLUE, FOUR DEPLOYMENTS
 *
 * The hue is not the problem. What makes a single accent read as plain is that
 * it exists at ONE value, ghosted to 12% everywhere, with no saturated moment
 * anywhere on the screen. These four rungs keep #2E6DE9 exactly and change
 * only how much of it you are allowed to see.
 *
 * Rung 3 breaks a written rule — "the accent is never a solid fill on a button
 * or a surface" — for exactly one object per screen. That is a deliberate
 * amendment, not an oversight: the rule exists to stop accent-coloured
 * furniture, and one designated primary action is not furniture. Adopting rung
 * 3 or 4 means editing that rule in DESIGN.md. */
const BLUE = {
  light: { deep: "#1B4CB8", base: "#2E6DE9", lift: "#5B8FF0", tint: "#EAF1FD", ground: "#FFFFFF" },
  dim: { deep: "#3E8BE0", base: "#71B2FF", lift: "#9BCBFF", tint: "#1B2733", ground: "#1E2022" },
  dark: { deep: "#3E8BE0", base: "#71B2FF", lift: "#9BCBFF", tint: "#17222E", ground: "#141517" }
};

const RUNGS = [
  { n: 1, name: "As it ships", note: "One value at three alphas. Every accent mark is the same blue washed toward the ground, so the colour is never actually seen." },
  { n: 2, name: "A ladder, not a value", note: "The same hue at three depths: deep for weight, base for marks, a lifted tone for hover and hairlines. A chip and a rail stop being the same blue. Nothing else changes and no rule is broken." },
  { n: 3, name: "One saturated moment", note: "The ladder, plus exactly ONE object per screen carrying the accent at full strength — the primary action. One saturated moment is what separates an instrument from a wireframe. Requires amending the no-solid-accent rule for that one object." },
  { n: 4, name: "Blue that stands off the page", note: "Rung 3, plus the accent marks sculpted: the now-line, the knob and the dot cast a shade under a fixed light, the way the wordmark does. Blue sitting above the surface rather than printed flat on it." }
];

function Rung({ rung, theme }) {
  const b = BLUE[theme];
  const lad = rung.n >= 2;
  const solid = rung.n >= 3;
  const cast = rung.n >= 4;
  const shade = theme === "light" ? "rgba(27, 76, 184, 0.34)" : "rgba(0, 0, 0, 0.55)";
  const marks = cast ? { boxShadow: "0 1px 2px " + shade } : null;
  return (
    <div className={"app " + (theme === "light" ? "" : theme)}
      style={{ display: "flex", flexDirection: "column", gap: 11, padding: 14, minWidth: 0,
        background: "var(--background)", borderRadius: "var(--radius-xl)", boxShadow: "var(--shadow-ring)" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {(lad ? [b.deep, b.base, b.lift] : [b.base, b.base, b.base]).map((h, i) => (
          <span key={i} style={{ width: 12, height: 12, borderRadius: 4, background: h, flex: "none",
            opacity: lad ? 1 : i === 0 ? 1 : 0.34 }} />
        ))}
        <span style={{ marginLeft: "auto", font: "var(--type-meta-medium)", color: "var(--text-secondary)" }}>{theme}</span>
      </span>

      {/* The rail: identity. On the ladder it takes the deep tone, so it reads
          as a decision rather than as a highlight. */}
      <span style={{ display: "flex", alignItems: "stretch", height: 44, borderRadius: "var(--radius-md)", overflow: "hidden",
        background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)" }}>
        <span style={{ flex: "none", width: 3, background: lad ? b.deep : b.base }} />
        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", justifyContent: "center", gap: 1, padding: "0 8px" }}>
          <span style={{ font: "var(--type-meta-medium)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Draft the launch brief</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-quaternary)" }}>09:30–11:00</span>
        </span>
      </span>

      {/* Selection: the active row. The ladder gives it a tint ground and the
          deep tone as ink, instead of one washed blue doing both jobs. */}
      <span style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 8px", borderRadius: "var(--radius-md)",
        background: lad ? b.tint : "rgba(46, 109, 233, 0.12)", color: lad ? b.deep : b.base }}>
        <SIcon name="calendar" size={20} />
        <span style={{ font: "var(--type-ui-medium)" }}>Today</span>
      </span>

      {/* State: a chip, on the lifted tone so it is not the rail's blue. */}
      <span style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ display: "inline-flex", alignItems: "center", height: 22, padding: "0 8px", borderRadius: "var(--radius-xs)",
          background: lad ? b.tint : "rgba(46, 109, 233, 0.12)", color: lad ? b.deep : b.base, font: "var(--type-meta-medium)" }}>Auto-scheduled</span>
        <span aria-hidden="true" style={Object.assign({ display: "inline-flex", width: 34, height: 20, borderRadius: 999, padding: 2,
          background: b.base, justifyContent: "flex-end" }, marks)}>
          <span style={{ width: 16, height: 16, borderRadius: 999, background: "#FFFFFF" }} />
        </span>
        <span aria-hidden="true" style={Object.assign({ width: 6, height: 6, borderRadius: 3, background: b.base }, marks)} />
      </span>

      {/* The now-line: a mark, so solid accent is already correct here. */}
      <span style={{ position: "relative", height: 28, borderRadius: "var(--radius-sm)", background: "var(--fill-2)" }}>
        <span style={Object.assign({ position: "absolute", left: 0, right: 0, top: 14, borderTop: "1px solid " + b.base }, marks)} />
        <span style={Object.assign({ position: "absolute", left: 4, top: 11, width: 6, height: 6, borderRadius: 3, background: b.base }, marks)} />
      </span>

      {/* The one saturated moment. */}
      <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button type="button" style={Object.assign({
          display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px", border: 0, cursor: "default",
          borderRadius: "var(--radius-lg)", font: "var(--type-ui-medium)",
          background: solid ? b.base : "var(--surface-raised)",
          color: solid ? "#FFFFFF" : "var(--text-primary)",
          boxShadow: solid
            ? (cast ? "0 1px 1px " + shade + ", 0 3px 8px " + shade : "none")
            : "var(--shadow-raised)" }, {})}>
          <SIcon name="wand-sparkles" size={16} />
          Plan my day
        </button>
        <button type="button" style={{ display: "inline-flex", alignItems: "center", height: 32, padding: "0 12px", border: 0, cursor: "default",
          borderRadius: "var(--radius-lg)", font: "var(--type-ui-medium)", background: "var(--fill-3)", color: "var(--text-secondary)" }}>New task</button>
      </span>
    </div>
  );
}

function BlueLadder() {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <span style={{ font: "var(--type-page-title)", color: "var(--text-primary)" }}>Craft blue, four deployments</span>
        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", maxWidth: 760, textWrap: "pretty" }}>
          Same hue in all four — #2E6DE9 light, #71B2FF dim and dark. What escalates is how much of it you are allowed to see:
          a ladder instead of one value, then one saturated object per screen, then those marks standing off the page.
          Rungs 3 and 4 need the no-solid-accent rule amended for one designated object; rung 2 breaks nothing.
        </span>
      </div>
      {RUNGS.map((r) => (
        <div key={r.n} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 11, flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-disabled)" }}>{r.n}</span>
            <span style={{ font: "var(--type-card-title)", color: "var(--text-primary)" }}>{r.name}</span>
          </div>
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", maxWidth: 760, textWrap: "pretty" }}>{r.note}</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(268px, 1fr))", gap: 14 }}>
            {["light", "dim", "dark"].map((t) => <Rung key={t} rung={r} theme={t} />)}
          </div>
        </div>
      ))}
    </section>
  );
}

/* THE SALVAGED TIME-OF-DAY IDEA — the accent never moves; the GROUND warms.
   The ground carries no meaning, so it can drift without costing a signal. */
const HOURS = [
  ["07:00", "#FCFDFE", "morning — the paper is neutral"],
  ["13:00", "#FCFDFE", "midday — unchanged"],
  ["19:00", "#FDFBF7", "evening — a touch of warmth in the paper"],
  ["23:00", "#1E2022", "night — the dim theme takes over"]
];

function GroundDrift() {
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      <span style={{ font: "var(--type-card-title)", color: "var(--text-primary)" }}>The ground can drift; the accent cannot</span>
      <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", maxWidth: 720, textWrap: "pretty" }}>
        The salvaged version of the time-of-day idea. The accent stays fixed, so a coloured rail means the same thing at 11:00
        and at 21:00. What moves is the paper — a degree of warmth toward the evening, then the dim theme at night. Nobody
        notices it happening, which is the point.
      </span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 11 }}>
        {HOURS.map(([t, bg, note], i) => (
          <div key={t} className={i === 3 ? "app dim" : "app"} style={{ display: "flex", flexDirection: "column", gap: 8, padding: 14, borderRadius: "var(--radius-xl)",
            background: i === 3 ? "var(--background)" : bg, boxShadow: "var(--shadow-ring)" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-quaternary)" }}>{t}</span>
            <span style={{ display: "flex", alignItems: "stretch", height: 36, borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)" }}>
              <span style={{ flex: "none", width: 3, background: "var(--accent)" }} />
              <span style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 8px", font: "var(--type-meta-medium)", color: "var(--text-primary)" }}>Deep work</span>
            </span>
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>{note}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function App() {
  const [only, setOnly] = React.useState("all");
  const shown = only === "all" ? CANDIDATES : CANDIDATES.filter((c) => c.id === only);
  return (
    <div className="app" style={{ minHeight: "100%", background: "var(--background)", padding: "20px 20px 60px", display: "flex", flexDirection: "column", gap: 26 }}>
      <header style={{ display: "flex", alignItems: "flex-end", gap: 20, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 320 }}>
          <h1 style={{ margin: 0, font: "var(--type-page-title)", color: "var(--text-primary)" }}>The accent, six ways</h1>
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", maxWidth: 760, textWrap: "pretty" }}>
            Each candidate overrides the same five tokens and nothing else, and is shown on the six places the accent&apos;s
            meaning lands: the rail that says who may move a block, the selected nav row, a state chip, the now-line, a
            control, and the focus ring. The number is the accent read as text on its own 12% fill — the pair that has to
            pass 4.5:1, not the accent against the page.
          </span>
        </div>
      </header>

      <BlueLadder />

      <span style={{ height: 1, background: "var(--border)" }} />
      <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>
        Below: the six hue candidates, kept for reference.
      </span>

      {shown.map((c) => (
        <section key={c.id} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 11, flexWrap: "wrap" }}>
            <span style={{ font: "var(--type-card-title)", color: "var(--text-primary)" }}>{c.name}</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-disabled)" }}>{c.light} · {c.dark} · {c.trend}</span>
          </div>
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", maxWidth: 760, textWrap: "pretty" }}>{c.note}</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(268px, 1fr))", gap: 14 }}>
            {["light", "dim", "dark"].map((t) => <Panel key={t} c={c} theme={t} />)}
          </div>
        </section>
      ))}

      <GroundDrift />
    </div>
  );
}

const __root = document.getElementById("root");
if (__root) ReactDOM.createRoot(__root).render(<App />);
