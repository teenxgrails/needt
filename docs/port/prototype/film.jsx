/* THE FILM — the real product, driven by one clock.
 *
 * The first version redrew the interface inside this file, and it was wrong in
 * the way a tracing is wrong: every value was right and the thing still was
 * not the app. So nothing here draws UI. The sidebar is the product's
 * `Sidebar`, the blocks are the product's `Block`, the wordmark is the
 * product's `ExposureWordmark`, the habit rail is the product's `HabitRail`,
 * and they are styled by the product's own `app.css`. What this file owns is
 * the CLOCK and the STAGING: which state the app is in at time T, and how the
 * camera holds it.
 *
 * That is the only arrangement in which "1:1" is a fact rather than an
 * intention — when the app changes, the film changes with it, because there is
 * no second copy to update.
 *
 * WHY THE QUEUE DRAINS FOR REAL. The sidebar computes its unplaced list from
 * the tasks it is handed. So the film does not animate a queue emptying: it
 * hands the sidebar a task list in which each task acquires a `time` as its
 * cue passes, and the real component draws the real consequence.
 *
 * THE STORY. A day with three things already agreed to and four waiting; the
 * scheduler puts the four into the gaps between the three; the first becomes a
 * focus session. That is the product's one claim — it puts work into the hours
 * you actually have — and the piece shows exactly it.
 */
const CompositionStage = window.CompositionStage;
const useComposition = window.useComposition;
const animate = window.animate;
const Easing = window.Easing;

/* Three motion helpers, and only three — the piece is easier to trust when
   every movement in it is one of a named few.
     glide  — a long, even change: the camera, a dimming room.
     enter  — something arriving: fast out of the gate, no overshoot. The
              product's own arrival curve, so a block lands in the film exactly
              as it lands in the app.
     hold   — a value that is simply on or off at a cue, eased just enough not
              to snap. */
const MOTION = {
  glide: (o) => animate(Object.assign({ ease: Easing.easeInOutCubic }, o)),
  enter: (o) => animate(Object.assign({ ease: Easing.easeOutCubic }, o)),
  hold: (o) => animate(Object.assign({ ease: Easing.easeOutQuad }, o))
};

/* The app is shown at its own size and scaled as a whole, so every measurement
   inside it is the product's. Landing-page framing: the window is an object on
   a plate, not a full-bleed screenshot. */
const APP_W = 1440, APP_H = 900;
const STAGE_W = 1920, STAGE_H = 1080;
/* Read once, at module scope: it decides geometry, and geometry read from a
   changing source is a bug waiting for a re-render. */
const BARE = (function () {
  try { return new URLSearchParams(window.location.search).has("bare"); } catch (e) { return false; }
})();
const HOUR_H = 46;
const DAY_FROM = 8.5, DAY_TO = 20;
const GUTTER = 68;

/* Three things already on the day when the film opens — a planner that starts
   from a blank day is a planner nobody uses — and four the scheduler places,
   each into a real gap between them. */
const FIXED = [
  { title: "Stand-up", time: "09:00–09:15", start: 9, end: 9.25, project: "ops", kind: "task", dueIn: 0 },
  { title: "1:1 Anna", time: "11:15–12:00", start: 11.25, end: 12, kind: "event", calendar: "work", source: "google" },
  { title: "Factory call", time: "15:00–16:00", start: 15, end: 16, kind: "event", calendar: "work", source: "google" }
];

const PLACES = [
  { id: 14, at: 0.00, title: "Finish the tank graphic", time: "09:30–11:00", start: 9.5, end: 11,
    project: "ds", kind: "task", movable: true, dueIn: 1, parts: { closed: 0, total: 3 },
    entry: "Open the artwork and pick the print side" },
  { id: 1, at: 0.42, title: "Draft the launch brief", time: "12:15–13:45", start: 12.25, end: 13.75,
    project: "ops", kind: "task", movable: true, dueIn: 3, parts: { closed: 1, total: 3 },
    entry: "Pull last month's numbers" },
  { id: 6, at: 0.84, title: "Collect last quarter's numbers", time: "13:45–14:30", start: 13.75, end: 14.5,
    project: "ops", kind: "task", movable: true, dueIn: 2, entry: "Export the card statement" },
  { id: 4, at: 1.26, title: "Reply to counsel", time: "16:15–16:45", start: 16.25, end: 16.75,
    project: "ops", kind: "task", movable: true, overdue: true, dueIn: 0 }
];

function Screen({ T, CUES }) {
  const Sidebar = window.Sidebar;
  const Block = window.Block;
  const HabitRail = window.HabitRail;
  const focusOn = T >= CUES.Focus + 0.3;
  const top = (v) => (v - DAY_FROM) * HOUR_H;

  /* THE STATE AT TIME T. Each task gains a time when its cue passes, so the
     real sidebar draws a real queue draining and the real grid draws real
     placements — nothing here fakes either. */
  const placed = PLACES.filter((b) => T >= CUES.Place + b.at);
  const tasks = (window.NEEDT ? window.NEEDT.tasks : []).map((t) => {
    const hit = PLACES.filter((b) => b.id === t.id)[0];
    if (!hit) return t;
    return Object.assign({}, t, { time: T >= CUES.Place + hit.at ? hit.time.slice(0, 5) : undefined });
  });

  const focus = focusOn
    ? { intention: PLACES[0].title, planned: 50, elapsed: Math.round((T - CUES.Focus - 0.3) * 60) }
    : null;

  const hours = [];
  for (let x = Math.ceil(DAY_FROM); x <= Math.floor(DAY_TO); x++) hours.push(x);

  return (
    <div className="app" style={{ width: APP_W, height: APP_H, display: "flex", overflow: "hidden",
      background: "var(--background)", color: "var(--text-primary)" }}>
      {/* The product's own rail, with the product's own props. */}
      <Sidebar screen="calendar" onScreen={() => {}} theme="light" onTheme={() => {}}
        onOpenPalette={() => {}} onSettings={() => {}} tasks={tasks}
        onCapture={() => {}} onTask={() => {}}
        dragProps={() => ({})} drag={null}
        focus={focus} onStartFocus={() => {}} onStopFocus={() => {}}
        selectedDate={1} onSelectDate={() => {}} />

      <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", padding: "20px 20px 0", gap: 14 }}>
        <header style={{ flex: "none", display: "flex", alignItems: "baseline", gap: 16 }}>
          <span style={{ display: "flex", alignItems: "flex-end", gap: 11 }}>
            <span className="display" style={{ fontSize: 60, lineHeight: 0.84, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>1</span>
            <span style={{ display: "flex", flexDirection: "column", gap: 1, paddingBottom: 4 }}>
              <span className="display" style={{ fontSize: 22, lineHeight: 1, color: "var(--text-tertiary)" }}>September</span>
              <span className="display" style={{ fontSize: 14, lineHeight: 1.2, color: "var(--text-muted)" }}>Tuesday · week 36</span>
            </span>
          </span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {/* The button the piece is about, pressed at its cue. */}
            <span className="btn" data-film-plan
              style={{ display: "inline-flex", alignItems: "center", gap: 7, height: 32, padding: "0 13px",
                borderRadius: "var(--radius-lg)", background: "var(--surface-raised)",
                boxShadow: T > CUES.Press && T < CUES.Press + 0.22 ? "var(--shadow-inset-ring)" : "var(--shadow-raised)",
                font: "var(--type-ui-medium)", color: "var(--text-primary)",
                transform: "scale(" + (T > CUES.Press && T < CUES.Press + 0.22 ? 0.985 : 1) + ")" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }}>
                <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
              </svg>
              Plan my day
            </span>
          </span>
        </header>

        {window.HabitRail ? (
          <div style={{ flex: "none", opacity: MOTION.glide({ from: 1, to: 0.3, start: CUES.Focus, end: CUES.Focus + 0.5 })(T) }}>
            <HabitRail />
          </div>
        ) : null}

        {/* The grid: the product's geometry and the product's block. */}
        <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, right: 0, top: 8, height: (DAY_TO - DAY_FROM) * HOUR_H }}>
            <span className="cal-gutter" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: GUTTER }}>
              {hours.map((x) => (
                <span key={x} style={{ position: "absolute", left: 0, right: 8, top: top(x), transform: "translateY(-8px)",
                  display: "flex", justifyContent: "center" }}>
                  <span style={{ padding: "0 6px", background: "var(--background)", font: "var(--type-meta-medium)",
                    color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>
                    {String(x).padStart(2, "0")}:00
                  </span>
                </span>
              ))}
            </span>

            <div style={{ position: "absolute", left: GUTTER, right: 0, top: 0, bottom: 0 }}>
              {hours.map((x) => (
                <span key={x} aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: top(x),
                  borderTop: "1px solid var(--border)" }} />
              ))}

              {FIXED.concat(placed).map((b) => {
                const isNew = b.at !== undefined;
                const lands = isNew ? CUES.Place + b.at : 0;
                /* One motion for an arrival: the settle the product chose —
                   the thing that changed moves, and nothing else does. */
                const dy = isNew ? MOTION.enter({ from: -22, to: 0, start: lands, end: lands + 0.42 })(T) : 0;
                const op = isNew ? MOTION.enter({ from: 0, to: 1, start: lands, end: lands + 0.3 })(T) : 1;
                const lit = b === PLACES[0] && focusOn;
                const dim = focusOn && !lit
                  ? MOTION.glide({ from: 1, to: 0.26, start: CUES.Focus + 0.3, end: CUES.Focus + 0.9 })(T)
                  : 1;
                const h = window.blockHeight ? window.blockHeight(b.end - b.start, HOUR_H) : (b.end - b.start) * HOUR_H;
                return (
                  <span key={b.title} style={{ position: "absolute", left: 10, right: 18, top: top(b.start), height: h,
                    opacity: op * dim, transform: "translateY(" + dy + "px)", zIndex: lit ? 4 : 2,
                    filter: lit ? "drop-shadow(0 10px 30px rgba(46,109,233,0.22))" : "none" }}>
                    <Block b={b} railBy="movability" compact={(b.end - b.start) <= 0.5}
                      height={h} onToggle={() => {}} onClick={() => {}} />
                  </span>
                );
              })}

              {/* The now-line: accent, and the one solid-accent mark allowed. */}
              <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: top(13.4), height: 0, zIndex: 30 }}>
                <span style={{ position: "absolute", left: 0, right: 0, top: 0, borderTop: "1px solid var(--accent)" }} />
                <span style={{ position: "absolute", left: 4, top: -3, width: 6, height: 6, borderRadius: 3, background: "var(--accent)" }} />
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function Piece() {
  /* The box the app is drawn into, read from the element rather than derived
     from the composition's declared size. */
  const hold = React.useRef(null);
  const [box, setBox] = React.useState(null);
  React.useEffect(() => {
    if (!hold.current || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(function (e) {
      const r = e[0].contentRect;
      setBox({ w: r.width, h: r.height });
    });
    ro.observe(hold.current);
    return () => ro.disconnect();
  }, []);

  const c = useComposition();
  const T = c.T, CUES = c.CUES;

  /* THE CAMERA. A slow push through the whole piece and back out for the loop,
     so the last frame can match the first. Scale only — a pan would crop the
     rail, and the rail is where the queue drains. */
  const z = MOTION.glide({ from: 1, to: 1.018, start: 0, end: CUES.Focus })(T)
    + MOTION.glide({ from: 0, to: 0.012, start: CUES.Focus, end: CUES.Focus + 1.1 })(T)
    - MOTION.glide({ from: 0, to: 0.03, start: CUES.Focus + 2.2, end: c.authoredTotal })(T);

  /* The app is one object on a plate: radius, ring and a floating shadow — the
     product's own elevation language, at the size a landing hero wants. */
  /* Framed: the window sits on a plate with room around it. Bare: it fills
     what it is given, because the embedder is the frame. */
  /* Framed: the window sits on a plate with room around it. Bare: it fills the
     box it was given, whole — never cropped, because the product being legible
     is the only reason the frame exists. */
  const fit = BARE
    ? (box ? Math.min(box.w / APP_W, box.h / APP_H) : 0.95)
    : Math.min((STAGE_W - 260) / APP_W, (STAGE_H - 200) / APP_H);

  return (
    <div ref={hold} style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", overflow: "hidden",
      background: BARE ? "transparent" : "#F4F7FB",
      backgroundImage: BARE ? "none" : "radial-gradient(120% 80% at 50% -10%, #E9F1FA 0%, #F4F7FB 46%, #FBF8F4 100%)" }}>
      {/* The camera zoom is a FRAMED-mode move: there the window is an object
          on a plate, so pulling back reads as a camera. Bare, the window IS
          the box the embedder gave it — a zoom under 1 shrinks it inside its
          own stage and lets the host's ground show through as a breathing
          ring around the app, which is the one thing bare mode exists to
          prevent. */}
      <div style={{ width: APP_W * fit, height: APP_H * fit, transform: BARE ? "none" : "scale(" + z + ")" }}>
        <div style={{ width: APP_W, height: APP_H, transform: "scale(" + fit + ")", transformOrigin: "0 0",
          borderRadius: BARE ? 0 : 20 / fit, overflow: "hidden",
          boxShadow: BARE ? "none"
            : "0 1px 0 0 rgba(26,28,30,0.06) inset, 0 30px 80px -28px rgba(26,28,30,0.34), 0 8px 24px -12px rgba(26,28,30,0.2)" }}>
          <Screen T={T} CUES={CUES} />
        </div>
      </div>

      {/* The focus wash: the product dims the room during a session, so the
          film does too — at the plate, where it reads as light rather than as
          an overlay on a screenshot. */}
      <div aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none",
        opacity: MOTION.glide({ from: 0, to: 1, start: CUES.Focus, end: CUES.Focus + 0.8 })(T)
          * (1 - MOTION.glide({ from: 0, to: 1, start: CUES.Focus + 2.6, end: c.authoredTotal })(T)),
        background: "radial-gradient(44% 40% at 0% 0%, rgba(46,109,233,0.14), transparent 72%), radial-gradient(44% 40% at 100% 100%, rgba(46,109,233,0.14), transparent 72%)" }} />
    </div>
  );
}

function Film() {
  return (
    <CompositionStage
      width={BARE ? APP_W : STAGE_W} height={BARE ? APP_H : STAGE_H}
      bg={BARE ? "transparent" : "#F4F7FB"}
      scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
      <Piece />
    </CompositionStage>
  );
}

/* The app's files assign to window as they evaluate, and the glyph registry is
   a deferred module — so the film waits for both rather than rendering a tree
   of missing components once and never again. */
function boot() {
  const ready = window.Sidebar && window.Block && window.NEEDT && window.CompositionStage;
  if (!ready) return window.setTimeout(boot, 60);
  ReactDOM.createRoot(document.getElementById("root")).render(<Film />);
}
boot();
