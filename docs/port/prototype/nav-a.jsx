/* PHONE MENU · A — "Card" (08.10.26).
 *
 * At rest: a pill at the bottom, the one object on the screen in the
 * opposite colour (black on light, white on dark), holding your three places
 * and a dot grid that opens the rest. Tap the dots or swipe up and the pill
 * grows into a big card: the three places as tiles on top, then every other
 * place as one large word with what is waiting there underneath. Rows below
 * the fourth melt into fog — a gradient, a blur and the sky's halftone — so
 * the card says it scrolls without a scrollbar.
 *
 * Stops, bottom to top: tucked away to a handle · pill · card (about four
 * rows, the rest in fog) · full (nearly the whole screen, just under the
 * status bar — the whole list fits, so the fog goes). Three springs draw it:
 * p (-1 handle, 0 pill, 1 card), t (card height → full height) and u (the
 * list → settings, which always open at full height). A finger moves p and t
 * as one track — the pill-to-card stretch, then the card-to-full stretch —
 * and letting go projects the finger's velocity onto that track and snaps to
 * the nearest stop, so a flick can skip one. Past full the card stretches
 * against a rubber band; below the pill it resists harder, so tucking the
 * menu away takes a deliberate pull (a hint says when letting go will tuck
 * it). In the open card an upward drag grows it to full before the list
 * scrolls; a downward drag scrolls the list back to its top first and then
 * moves the card. Hold the pill to capture (the composer). Settings and the
 * profile open inside the card from the card or from full, and go back to
 * where they were opened from.
 *
 * The three tiles sit on a small band of the brand sky (scenes.jsx PxSky,
 * the app theme's mood by time of day — phone-kit.jsx pkSkyMood), as frosted
 * glass. The sky is parked (no frames) unless the card is open and still.
 *
 * Wave 3 (09.10.26): the pill is frosted glass (a see-through ground over a
 * backdrop blur sized to the pill, .nva-glass); a glass create button sits
 * beside it (onCompose — the same as holding the pill); while the composer
 * is up it grows out of the pill (phone-kit.jsx PkSheet from=pkPillRect) and
 * the menu steps out (morph prop) until the sheet has gone back into it.
 * The card's fog dots answer the list's scroll (phone-kit.jsx pkFogDrift).
 * Settings: the full phone Settings place (window.PkPlaces.settings,
 * phone-settings.jsx) when it is loaded — the in-card list is the fallback.
 * Default top three: Home · Docs · Ask Needt (mobile-nav.jsx mnTiles).
 *
 * Nothing moves at rest; reduced motion jumps between states.
 */
const NvaNS = window.NeedtDesignSystem_25d3c8;
const { Icon: NvaIcon } = NvaNS;

const NVA_WORD = { home: "Home", calendar: "Calendar", tasks: "Tasks", docs: "Docs", mail: "Mailbox", ask: "Ask Needt", habits: "Habits", moodboards: "Boards", projects: "Projects",
  templates: "Templates", shared: "Shared", trash: "Trash", connections: "Connections", settings: "Settings" };
/* Every place on the phone, plus Ask Needt (it opens the Ask sheet, not a
   place) and Settings (inside the card). The legacy More screen is not one. */
const NVA_ORDER = ["home", "calendar", "tasks", "docs", "mail", "ask", "habits", "moodboards", "projects", "templates", "shared", "trash", "connections", "settings"];
/* The phone's ids → the desktop's place glyph ids (Sidebar.jsx PlaceGlyph). */
const NVA_GLYPH = { home: "today", calendar: "calendar", tasks: "tasks", docs: "docs", mail: "mail", habits: "habits", moodboards: "moodboards", projects: "projects" };

const nvaClamp = (v, a, b) => Math.max(a, Math.min(b, v));
const nvaLerp = (a, b, k) => a + (b - a) * k;
const nvaUnit = (v) => nvaClamp(v, 0, 1);
const nvaReduced = () => typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Two places the desktop has no glyph for, drawn the PlaceGlyph way: flat
   duotone in the token hues, 24-unit box. */
function NvaOwnGlyph({ id }) {
  const tint = (c, n) => "color-mix(in oklch, " + c + " " + n + "%, transparent)";
  const A = "var(--text-primary)", W = "var(--surface-raised)", R = "var(--border)";
  if (id === "templates") {
    /* a page with a dashed copy behind it */
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="8" y="2.8" width="13" height="15.4" rx="2" fill="none" stroke={tint("var(--accent)", 70)} strokeWidth="1.4" strokeDasharray="2.4 2" />
        <rect x="3" y="6" width="13" height="15.4" rx="2" fill={W} stroke={R} strokeWidth="1" />
        <rect x="5.6" y="9.6" width="7.8" height="1.9" rx=".95" fill="var(--accent)" />
        <rect x="5.6" y="13.2" width="5.4" height="1.9" rx=".95" fill={tint(A, 30)} />
        <rect x="5.6" y="16.8" width="6.6" height="1.9" rx=".95" fill={tint(A, 30)} />
      </svg>
    );
  }
  if (id === "shared") {
    /* two people */
    const I = "var(--info)", S = "var(--success)";
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="16" cy="8" r="3.4" fill={tint(S, 55)} />
        <path d="M10.6 20.5a5.4 5.4 0 0 1 10.8 0z" fill={tint(S, 45)} />
        <circle cx="9" cy="8.6" r="3.8" fill={I} />
        <path d="M2.6 20.5a6.4 6.4 0 0 1 12.8 0z" fill={I} />
      </svg>
    );
  }
  if (id === "trash") {
    const D = "var(--destructive)";
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5.4 7.5h13.2l-1.1 12.3a1.6 1.6 0 0 1-1.6 1.5H8.1a1.6 1.6 0 0 1-1.6-1.5z" fill={tint(D, 22)} />
        <rect x="3.6" y="4.6" width="16.8" height="2.6" rx="1.3" fill={D} />
        <rect x="9.6" y="2.6" width="4.8" height="2.6" rx="1.1" fill={D} />
        <rect x="9.2" y="10.4" width="1.8" height="7.6" rx=".9" fill={D} />
        <rect x="13" y="10.4" width="1.8" height="7.6" rx=".9" fill={D} />
      </svg>
    );
  }
  if (id === "connections") {
    const I = "var(--info)", S = "var(--success)";
    return (
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
        <rect x="2.5" y="6.5" width="11" height="11" rx="5.5" fill={tint(I, 35)} />
        <rect x="10.5" y="6.5" width="11" height="11" rx="5.5" fill={tint(S, 45)} />
        <circle cx="8" cy="12" r="3" fill={I} />
        <circle cx="16" cy="12" r="3" fill={S} />
      </svg>
    );
  }
  /* settings: three sliders */
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
      {[[6, 9], [12, 15], [18, 7]].map(([x, k], i) => (
        <g key={i}>
          <rect x={x - 1.1} y="3" width="2.2" height="18" rx="1.1" fill={tint(A, 22)} />
          <rect x={x - 3.2} y={k - 2.2} width="6.4" height="4.4" rx="2.2" fill={i === 1 ? "var(--accent)" : A} />
        </g>
      ))}
    </svg>
  );
}
function NvaGlyph({ id }) {
  const g = NVA_GLYPH[id];
  return (
    <span className="nva-glyph" aria-hidden="true">
      {/* Sidebar.jsx PlaceGlyph where the page loads it (mobile-nav.html);
          the phone sheet only has MobileAuth.jsx's mirror of the same drawings. */}
      {id === "ask" && window.AiOrb ? <window.AiOrb size={24} /> : g && window.PlaceGlyph ? <window.PlaceGlyph id={g} /> : g && window.MaPlaceGlyph ? <window.MaPlaceGlyph id={g} /> : <NvaOwnGlyph id={id} />}
    </span>
  );
}

/* What is waiting in a place, in one grey line. alert = it needs you. */
function nvaStatus(id, c) {
  c = c || {};
  switch (id) {
    case "home": return c.overdue ? { text: c.overdue + " overdue · " + (c.today || 0) + " left today", alert: true } : { text: (c.today || 0) + " left today" };
    case "calendar": return c.nextEvent ? { text: "Next · " + c.nextEvent.title + " at " + c.nextEvent.at } : { text: "Nothing else today" };
    case "tasks": return { text: (c.open || 0) + " open" + (c.unplaced ? " · " + c.unplaced + " not placed" : "") };
    case "docs": return { text: (c.docs ? c.docs + " pages · " : "") + "edited " + (c.docsEdited || "today") };
    case "mail": return c.outlookDown ? { text: (c.mail ? c.mail + " unread · " : "") + "Outlook needs you", alert: true } : { text: c.mail ? c.mail + " unread" : "All read" };
    case "habits": return { text: (c.habitsDone || 0) + " of " + (c.habits || 0) + " kept today" };
    case "moodboards": return { text: (c.boards || 0) + " boards" };
    case "projects": return { text: (c.projects || 0) + " projects" };
    case "ask": return { text: "Plans with your calendar and tasks" };
    case "templates": return { text: "Pages you start from" };
    case "shared": return { text: "Pages others shared with you" };
    case "trash": return { text: (c.trash ? c.trash + " in Trash · " : "") + "kept for 30 days" };
    case "connections": return c.outlookDown ? { text: "Outlook needs reconnecting", alert: true } : { text: "Synced " + (c.synced || "just now") };
    case "settings": return { text: "Theme, hours, notifications" };
    default: return { text: "" };
  }
}
/* The small mark on a top tile. */
function nvaBadge(id, c) {
  c = c || {};
  if (id === "mail" && c.mail) return { text: String(c.mail) };
  if (id === "home" && c.overdue) return { text: String(c.overdue), alert: true };
  if (id === "tasks" && c.overdue) return { text: String(c.overdue), alert: true };
  if (id === "calendar" && c.nextEvent && c.nextEvent.inMin != null && c.nextEvent.inMin < 60) return { text: c.nextEvent.inMin + "m" };
  return null;
}

/* ── Geometry. Everything is laid out in the box's coordinates; the shape is a
   rect + radius cut out of one full-height layer with clip-path, so the morph
   never re-lays-out the content. ── */
function nvaGeom(fw, fh) {
  const M = 10, W = fw - 2 * M;
  const fullH = fh - 58 - M;
  const cardH = Math.min(fullH, 478);
  const PW = 236, PH = 64, PB = 28, HW = 64, HH = 22, HB = 18;
  const tileW = (W - 28 - 16) / 3;
  return { fw, fh, M, W, fullH, cardH, PW, PH, PB, HW, HH, HB, tileW, range: cardH - PH };
}
function nvaShape(g, p, t) {
  let w, h, b, r;
  if (p >= 0) {
    const pc = Math.min(p, 1), over = Math.max(0, p - 1);
    const ew = 1 - Math.pow(1 - pc, 1.7); /* the width leads … */
    const eh = Math.pow(pc, 1.12);        /* … the height follows */
    const ch = nvaLerp(g.cardH, g.fullH, t);
    w = nvaLerp(g.PW, g.W, ew);
    h = nvaLerp(g.PH, ch, eh) + over * 140;
    b = nvaLerp(g.PB - g.M, 0, eh);
    r = nvaLerp(g.PH / 2, 38, Math.min(1, pc * 1.4)) - t * 6;
  } else {
    const q = Math.min(-p, 1), under = Math.max(0, -p - 1);
    w = nvaLerp(g.PW, g.HW, q);
    h = nvaLerp(g.PH, g.HH, q);
    b = nvaLerp(g.PB - g.M, g.HB - g.M, q) - under * 14;
    r = h / 2;
  }
  const x = (g.W - w) / 2, y = g.fullH - b - h;
  return { x, y, w, h, r };
}
/* Where icon i sits: in the pill, in the card's tile row, at the handle. */
function nvaPillSlot(g, i) { return { x: (g.W - g.PW) / 2 + 34 + i * 54, y: g.fullH - (g.PB - g.M) - g.PH / 2 }; }
function nvaTileSlot(g, i) { return { x: 14 + g.tileW / 2 + i * (g.tileW + 8), dy: 22 + 32 }; }

/* A plain spring, integrated in small steps. Slightly under-damped, so a
   flick settles with a hint of overshoot. */
function nvaStep(s, target, dt, k, zeta) {
  const c = 2 * Math.sqrt(k) * zeta;
  let left = dt;
  while (left > 0) {
    const h = Math.min(left, 1 / 240);
    const a = -k * (s.x - target) - c * s.v;
    s.v += a * h; s.x += s.v * h; left -= h;
  }
  return Math.abs(s.x - target) < 0.0006 && Math.abs(s.v) < 0.004;
}
/* Rubber band: x past the edge, eased so it slows but never stops dead. */
const nvaRubber = (x, d) => (1 - 1 / (x * 0.55 / d + 1)) * d;

function NvaToggle({ on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} className={"nva-switch" + (on ? " is-on" : "")} onClick={() => onChange(!on)}>
      <span className="nva-switch-knob" />
    </button>
  );
}

/* The switches live in the one settings object ("needt.settings"), by the
   keys the apps read: week ("mon" | "sun", the desktop's Week starts),
   calHideDone (the phone's and the desktop's Calendar eye) and notify (the
   phone's notifications; no desktop twin). One writer: needtSettings
   (Mobile.jsx's mbPrefStore is a view of it). */
function nvaPref(k, fb) {
  const S = window.needtSettings;
  return S && S.has && S.has(k) ? S.get(k) : fb;
}
function nvaSetPref(k, v) { if (window.needtSettings) window.needtSettings.set(k, v); }
function useNvaPrefs() {
  const [, bump] = React.useState(0);
  React.useEffect(() => (window.needtSettings ? window.needtSettings.store.sub(() => bump((n) => n + 1)) : undefined), []);
  return { monday: nvaPref("week", "mon") !== "sun", hideDone: !!nvaPref("calHideDone", false), notif: nvaPref("notify", true) !== false };
}

function NvaSettings({ theme, onTheme, onBack, plan, planInfo, scrollRef, onScroll, onUpgrade, onSignOut }) {
  const { monday, hideDone, notif } = useNvaPrefs();
  const setMonday = (v) => nvaSetPref("week", v ? "mon" : "sun");
  const setHideDone = (v) => nvaSetPref("calHideDone", !!v);
  const setNotif = (v) => nvaSetPref("notify", !!v);
  return (
    <div className="nva-set">
      <div className="nva-set-head">
        <button type="button" className="nva-round" onClick={onBack} aria-label="Back to the menu" data-nva-back>
          <NvaIcon name="chevron-left" size={20} />
        </button>
        <span className="nva-set-title">Settings</span>
      </div>
      <div className="nva-scroll nva-set-scroll" ref={scrollRef} onScroll={onScroll} data-nva-scroll="settings">
        <div className="nva-me">
          <span className="nva-avatar is-big" aria-hidden="true">M</span>
          <span className="nva-me-text">
            <span className="nva-me-name">Maksym</span>
            <span className="nva-me-mail">maksym@needt.app</span>
          </span>
          <span className={"nva-plan" + (planInfo.pro ? " is-pro" : "")}>{planInfo.badge}</span>
        </div>

        <div className="nva-set-label">Appearance</div>
        <div className="nva-set-row">
          <span className="nva-set-word">Theme</span>
          <span className="nva-seg" role="radiogroup" aria-label="Theme">
            {[["light", "Light"], ["dark", "Dark"]].map(([id, label]) => (
              <button key={id} type="button" role="radio" aria-checked={theme === id} className={"nva-seg-btn" + (theme === id ? " is-on" : "")}
                onClick={() => onTheme && onTheme(id)}>{label}</button>
            ))}
          </span>
        </div>

        <div className="nva-set-label">Your day</div>
        <div className="nva-set-row">
          <span className="nva-set-stack"><span className="nva-set-word">Working hours</span><span className="nva-set-cap">Needt plans inside them</span></span>
          <span className="nva-set-val">09:00 – 18:00</span>
        </div>
        <div className="nva-set-row">
          <span className="nva-set-stack"><span className="nva-set-word">Week starts Monday</span></span>
          <NvaToggle on={monday} onChange={setMonday} label="Week starts Monday" />
        </div>
        <div className="nva-set-row">
          <span className="nva-set-stack"><span className="nva-set-word">Hide done in calendar</span></span>
          <NvaToggle on={hideDone} onChange={setHideDone} label="Hide done in calendar" />
        </div>
        <div className="nva-set-row">
          <span className="nva-set-stack"><span className="nva-set-word">Notifications</span><span className="nva-set-cap">Starts, overdue, mail that needs you</span></span>
          <NvaToggle on={notif} onChange={setNotif} label="Notifications" />
        </div>

        <div className="nva-set-label">Plan</div>
        <div className="nva-set-row is-plan">
          <span className="nva-set-stack"><span className="nva-set-word">{planInfo.name}</span><span className="nva-set-cap">{planInfo.line}</span></span>
        </div>
        {!planInfo.pro ? (
          <button type="button" className="nva-pro" onClick={onUpgrade} data-nva-pro>
            <span>Try Needt Pro</span><span className="nva-pro-cap">14 days, no card</span>
          </button>
        ) : null}
        <button type="button" className="nva-signout" onClick={onSignOut} data-nva-signout>Sign out</button>
        <div className="nva-tail" />
      </div>
    </div>
  );
}

function NeedtNavA({ theme, screen, onScreen, tiles, counts, onCompose, frameEl, onTheme, onUpgrade, onSignOut, away, morph }) {
  const top = (tiles && tiles.length ? tiles : window.MN_DEFAULT_TILES || ["home", "docs", "ask"]).slice(0, 3);
  const rows = NVA_ORDER.filter((id) => top.indexOf(id) < 0);
  const [mode, setMode] = React.useState("pill"); /* hidden | pill | card | full | settings */
  const [hint, setHint] = React.useState(null);  /* null | "more" | "tuck" */
  const [holding, setHolding] = React.useState(false);
  const [plan] = (window.useNeedtPlan || (() => ["free"]))();
  const planInfo = window.needtPlanInfo ? window.needtPlanInfo(plan) : { name: "Free", line: "", badge: "Free", pro: false };

  const rootRef = React.useRef(null);
  const R = React.useRef({}).current; /* refs to every painted node */
  const S = React.useRef({ p: { x: 0, v: 0 }, t: { x: 0, v: 0 }, u: { x: 0, v: 0 }, tp: 0, tt: 0, tu: 0, raf: 0, last: 0, g: null, setFrom: "card" }).current;
  const listRef = React.useRef(null), setRef = React.useRef(null);
  const modeRef = React.useRef(mode); modeRef.current = mode;
  /* The sky behind the three tiles draws frames only while the card sits
     open and still: parked in the pill, while a finger drags the shape and
     while a spring runs (the last frame stays painted), so the open / close
     spring never shares a frame with the sky. */
  const skyEng = React.useRef(null);
  const skySync = () => {
    const live = !S.raf && !S.dragging && S.p.x > 0.98 && S.u.x < 0.02;
    if (live !== !!S.skyLive) { S.skyLive = live; if (skyEng.current) skyEng.current.park(!live); }
  };

  /* ── paint: write every moving value straight to the DOM ── */
  const paint = React.useCallback(() => {
    const g = S.g; if (!g || !R.shape) return;
    const p = S.p.x, t = nvaUnit(S.t.x), u = nvaUnit(S.u.x);
    const s = nvaShape(g, p, t);
    const clip = "inset(" + s.y.toFixed(2) + "px " + (g.W - s.x - s.w).toFixed(2) + "px " + (g.fullH - s.y - s.h).toFixed(2) + "px " + s.x.toFixed(2) + "px round " + s.r.toFixed(2) + "px)";
    R.shape.style.clipPath = clip; R.shape.style.webkitClipPath = clip;

    const open = nvaUnit(p);                      /* 0 pill … 1 card */
    R.shape.style.setProperty("--nva-k", open.toFixed(3));
    const q = nvaUnit(-p);                        /* 0 pill … 1 handle */
    const eIcon = open < 1 ? 1 - Math.pow(1 - open, 2.2) : 1;
    /* The three: pill slot → tile, riding the shape's top edge. */
    for (let i = 0; i < 3; i++) {
      const el = R["icon" + i]; if (!el) continue;
      const ps = nvaPillSlot(g, i), ts = nvaTileSlot(g, i);
      let x = nvaLerp(ps.x, ts.x, eIcon);
      let y = p >= 0 ? s.y + nvaLerp(g.PH / 2, ts.dy, eIcon) : s.y + s.h / 2;
      let sc = nvaLerp(1, 1.36, eIcon), op = 1 - u;
      if (p < 0) { x = nvaLerp(ps.x, g.W / 2 + (i - 1) * 10, q); sc = 1 - 0.55 * q; op = nvaUnit(1 - q * 1.7); }
      el.style.transform = "translate(" + (x - 26).toFixed(2) + "px," + (y - 26).toFixed(2) + "px) scale(" + sc.toFixed(3) + ")";
      el.style.opacity = op.toFixed(3);
      el.style.visibility = op < 0.02 ? "hidden" : "visible";
    }
    /* The pill's own parts: the dot grid and the hairline before it. */
    const pillOp = p >= 0 ? nvaUnit(1 - open * 3.2) : nvaUnit(1 - q * 1.8);
    R.pillbits.style.transform = "translate(" + (s.x + s.w - 60).toFixed(2) + "px," + (s.y + s.h / 2 - 22).toFixed(2) + "px)";
    R.pillbits.style.opacity = pillOp.toFixed(3);
    R.pillbits.style.visibility = pillOp < 0.02 ? "hidden" : "visible";
    R.dots.style.opacity = nvaUnit(1 - (p >= 0 ? 0 : q * 1.4)).toFixed(3);
    /* The pill is frosted glass (wave 3): a backdrop blur cut to the same
       shape, under the ground (which is see-through while it is a pill and
       turns solid as the card opens — --nva-k). Outside .nva-body, whose
       drop-shadow filter would blind a blur inside it. */
    if (R.glass) {
      /* sized to the shape itself (a full-height blur cut down by a clip
         still costs its whole box on every frame of what is under it) */
      const gk = p >= 0 ? nvaUnit(1 - open * 1.4) : 1;
      const gs = R.glass.style;
      gs.transform = "translate(" + (g.M + s.x).toFixed(2) + "px," + (g.fh - g.M - g.fullH + s.y).toFixed(2) + "px)";
      gs.width = s.w.toFixed(2) + "px"; gs.height = s.h.toFixed(2) + "px"; gs.borderRadius = s.r.toFixed(2) + "px";
      gs.opacity = gk.toFixed(3);
      gs.visibility = gk < 0.02 ? "hidden" : "";
    }
    /* The create button: glass, beside the pill; it leaves as the card opens
       or the pill tucks away. */
    if (R.add) {
      const addK = p >= 0 ? nvaUnit(1 - open * 3.2) : nvaUnit(1 - q * 1.8);
      const ax = g.M + s.x + s.w + 10, ay = g.fh - g.M - g.fullH + s.y + (s.h - 52) / 2;
      R.add.style.transform = "translate(" + ax.toFixed(2) + "px," + ay.toFixed(2) + "px) scale(" + nvaLerp(0.6, 1, addK).toFixed(3) + ")";
      R.add.style.opacity = addK.toFixed(3);
      R.add.style.visibility = addK < 0.02 ? "hidden" : "visible";
    }
    /* Under the pill: which of the three is the screen you are on. */
    R.handle.style.transform = "translate(" + (s.x + s.w / 2 - 14).toFixed(2) + "px," + (s.y + s.h / 2 - 1.5).toFixed(2) + "px)";
    R.handle.style.opacity = nvaUnit((q - 0.55) / 0.45).toFixed(3);

    /* Card content rides the shape's top; tiles and rows arrive in a stagger. */
    R.content.style.transform = "translateY(" + s.y.toFixed(2) + "px)";
    const tilesK = nvaUnit((open - 0.35) / 0.55) * (1 - u);
    R.tiles.style.opacity = tilesK.toFixed(3);
    R.tiles.style.transform = "translateY(" + ((1 - tilesK) * 10).toFixed(2) + "px) scale(" + nvaLerp(0.94, 1, tilesK).toFixed(3) + ")";
    R.grab.style.opacity = nvaUnit((open - 0.6) / 0.4).toFixed(3);
    const rowEls = R.rows ? R.rows.children : [];
    for (let i = 0; i < rowEls.length; i++) {
      /* staggered, and every row fully in by the time the card is open (the
         full stop shows them all) */
      const k = nvaUnit((open - 0.35 - Math.min(i, 6) * 0.04) / 0.4) * (1 - u);
      rowEls[i].style.opacity = k.toFixed(3);
      rowEls[i].style.transform = "translateY(" + ((1 - k) * 22).toFixed(2) + "px)";
    }
    /* The list is as tall as the card is, between the card and full. */
    R.rowsBox.style.height = (Math.max(g.cardH, Math.min(s.h, g.fullH)) - 118).toFixed(2) + "px";
    R.rowsBox.style.visibility = open < 0.3 || u > 0.98 ? "hidden" : "visible";
    R.set.style.opacity = nvaUnit((u - 0.3) / 0.7).toFixed(3);
    R.set.style.transform = "translateY(" + ((1 - u) * 26).toFixed(2) + "px)";
    R.set.style.visibility = u < 0.02 ? "hidden" : "visible";

    /* Fog sits on the shape's bottom edge, and only while there is more. */
    const sc = u > 0.5 ? setRef.current : listRef.current;
    const more = sc ? sc.scrollHeight - sc.scrollTop - sc.clientHeight : 0;
    const fogK = nvaUnit((open - 0.55) / 0.45) * nvaUnit(more / 60);
    R.fog.style.transform = "translateY(" + (s.y + s.h - 132).toFixed(2) + "px)";
    R.fog.style.opacity = fogK.toFixed(3);

    /* The ground dims as the card opens. */
    R.scrim.style.opacity = (open * nvaLerp(1, 1.25, t)).toFixed(3);

    /* The tuck hint floats above the shape while you pull below the pill. */
    if (R.hint) {
      R.hint.style.transform = "translate(-50%," + (s.y - 46).toFixed(2) + "px)";
      R.hint.style.opacity = (S.dragging && p < -0.04 ? nvaUnit(q * 4) : 0).toFixed(3);
    }
    skySync();
  }, []);

  /* ── the spring loop: runs only while something is moving ── */
  const run = React.useCallback(() => {
    if (S.raf) return;
    S.last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.034, (now - S.last) / 1000); S.last = now;
      const a = nvaStep(S.p, S.tp, dt, 420, 0.8);
      const b = nvaStep(S.t, S.tt, dt, 360, 0.92);
      const c = nvaStep(S.u, S.tu, dt, 360, 0.92);
      paint();
      if (a && b && c) { S.p.x = S.tp; S.p.v = 0; S.t.x = S.tt; S.t.v = 0; S.u.x = S.tu; S.u.v = 0; S.raf = 0; paint(); return; }
      S.raf = requestAnimationFrame(tick);
    };
    S.raf = requestAnimationFrame(tick);
  }, [paint]);

  /* Go to a state; vp / vt = the finger's velocity in p- / t-units per second. */
  const go = React.useCallback((m, vp, vt) => {
    if (m === "settings" && modeRef.current !== "settings") S.setFrom = modeRef.current === "full" ? "full" : "card";
    const tp = m === "hidden" ? -1 : m === "pill" ? 0 : 1;
    const tt = m === "full" || m === "settings" ? 1 : 0;
    const tu = m === "settings" ? 1 : 0;
    S.tp = tp; S.tt = tt; S.tu = tu;
    if (vp != null) S.p.v = vp;
    if (vt != null) S.t.v = vt;
    setMode(m); modeRef.current = m;
    if ((m === "pill" || m === "hidden") && listRef.current) {
      /* back at the top next time it opens */
      window.setTimeout(() => { if (modeRef.current === "pill" || modeRef.current === "hidden") { if (listRef.current) listRef.current.scrollTop = 0; if (setRef.current) setRef.current.scrollTop = 0; } }, 420);
    }
    if (nvaReduced()) { S.p.x = tp; S.p.v = 0; S.t.x = tt; S.t.v = 0; S.u.x = tu; S.u.v = 0; paint(); return; }
    run();
  }, [paint, run]);

  /* Size: the frame's screen box. */
  React.useLayoutEffect(() => {
    const el = rootRef.current; if (!el) return undefined;
    const measure = () => { const r = el.getBoundingClientRect(); S.g = nvaGeom(el.clientWidth || r.width, el.clientHeight || r.height); el.style.setProperty("--nva-w", S.g.W + "px"); el.style.setProperty("--nva-full", S.g.fullH + "px"); el.style.setProperty("--nva-card", S.g.cardH + "px"); el.style.setProperty("--nva-tile", S.g.tileW + "px"); paint(); };
    measure();
    const ro = typeof ResizeObserver === "function" ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    el.__nva = S; /* tests read the springs here */
    return () => { if (ro) ro.disconnect(); cancelAnimationFrame(S.raf); S.raf = 0; };
  }, [paint]);
  React.useLayoutEffect(() => { paint(); });

  /* A full-screen layer of the app (a board item, the "How to save"
     walkthrough) took the screen: the menu steps down to the pill and slides
     away under the bottom edge until it is gone. */
  React.useEffect(() => { if (away && modeRef.current !== "pill" && modeRef.current !== "hidden") go("pill"); }, [away, go]);

  /* Escape closes, one level at a time. */
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key !== "Escape") return;
      const m = modeRef.current;
      if (m === "settings") go(S.setFrom); else if (m === "full") go("card"); else if (m === "card") go("pill");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go]);

  /* ── gestures ── */
  const G = React.useRef(null);
  const lp = React.useRef(0);
  const hintRef = React.useRef(null);
  const endHold = () => { window.clearTimeout(lp.current); lp.current = 0; setHolding(false); };

  const onPointerDown = (e) => {
    if (e.button != null && e.button > 0) return;
    const m = modeRef.current;
    const scroller = e.target.closest && e.target.closest("[data-nva-scroll]");
    cancelAnimationFrame(S.raf); S.raf = 0; /* catch it mid-flight */
    G.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: S.p.x, t0: S.t.x, m: m, scroller: scroller, s0: scroller ? scroller.scrollTop : 0,
      kind: null, samples: [[performance.now(), e.clientY]], el: e.currentTarget, vs: 0 };
    /* Follow the finger on the window: it may leave the shape (and the
       phone) mid-drag, and pointer capture is not reliable across inputs. */
    const mv = (ev) => moveRef.current(ev), up = (ev) => { window.removeEventListener("pointermove", mv, true); window.removeEventListener("pointerup", up, true); window.removeEventListener("pointercancel", up, true); upRef.current(ev); };
    window.addEventListener("pointermove", mv, true); window.addEventListener("pointerup", up, true); window.addEventListener("pointercancel", up, true);
    if (scroller && scroller.__nvaFling) { cancelAnimationFrame(scroller.__nvaFling); scroller.__nvaFling = 0; }
    if (m === "pill") {
      setHolding(true);
      lp.current = window.setTimeout(() => {
        lp.current = 0; setHolding(false);
        if (G.current && !G.current.kind) { G.current.kind = "held"; S.gestureEnd = performance.now(); if (onCompose) onCompose(); }
      }, 480);
    }
  };
  const onPointerMove = (e) => {
    const d = G.current; if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    const now = performance.now();
    d.samples.push([now, e.clientY]); while (d.samples.length > 2 && now - d.samples[0][0] > 90) d.samples.shift();
    if (!d.kind) {
      if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;
      endHold();
      if (Math.abs(dx) > Math.abs(dy)) { d.kind = "none"; return; }
      /* Down: the list goes back to its top first, then the card follows.
         Up: the card grows to full first; only at full does the list scroll. */
      const sc = d.scroller;
      const canScroll = sc && sc.scrollHeight > sc.clientHeight + 1;
      d.kind = canScroll && ((dy > 0 && sc.scrollTop > 0) || (dy < 0 && S.t.x > 0.98)) ? "scroll" : "drag";
      d.yk = d.y0; d.px0 = nvaTrackOf(S); /* count from the touch-down */
      S.dragging = true;
    }
    if (d.kind === "scroll") {
      const sc = d.scroller;
      const want = d.s0 - dy;
      if (want < 0 && dy > 0) {
        /* scrolled back to the top: the rest of the pull moves the card */
        sc.scrollTop = 0;
        d.kind = "drag"; d.yk = e.clientY; d.px0 = nvaTrackOf(S);
      } else { sc.scrollTop = want; paint(); return; }
    }
    if (d.kind !== "drag") return;
    const fy = e.clientY - d.yk; /* + down */
    if (d.m === "hidden") {
      const raw = -1 - fy / 90;
      if (raw <= 0) { S.p.x = Math.max(-1.15, raw); S.t.x = 0; } else nvaSetTrack(S, raw * 90);
    } else nvaSetTrack(S, d.px0 - fy);
    /* Settings shrink back into the list as the card leaves full. */
    if (d.m === "settings") S.u.x = S.t.x;
    S.t.v = 0; S.p.v = 0; S.u.v = 0;
    const q = -S.p.x;
    const h = q > 0.04 ? (q > 0.55 ? "tuck" : "more") : null;
    if (h !== hintRef.current) { hintRef.current = h; setHint(h); }
    paint();
  };
  const onPointerUp = (e) => {
    const d = G.current;
    if (!d || d.id !== e.pointerId) return;
    G.current = null; endHold(); S.dragging = false;
    if (d.kind) S.gestureEnd = performance.now();
    hintRef.current = null; setHint(null);
    if (!d.kind || d.kind === "none" || d.kind === "held") { if (S.p.x !== S.tp || S.t.x !== S.tt || S.u.x !== S.tu) run(); return; }
    const sm = d.samples, a = sm[0], b = sm[sm.length - 1];
    const vy = b[0] - a[0] > 0 ? (b[1] - a[1]) / (b[0] - a[0]) : 0; /* px/ms, + down */
    if (d.kind === "scroll") { nvaFling(d.scroller, -vy, paint); return; }
    /* Project the finger's speed along the track (-1 handle · 0 pill · 1
       card · 2 full) and take the stop it lands nearest to. The pill opens
       at a short pull, and the card and the handle keep the bias they had
       before full existed (a card closes past 40%, the handle needs a hard
       pull). */
    const g = S.g, tall = g.fullH - g.cardH;
    const vpx = -vy * 1000; /* px/s, + up */
    const zOf = (px) => (px <= g.range ? px / g.range : 1 + (px - g.range) / tall);
    let z, proj;
    if (S.p.x < 0) { z = S.p.x; proj = z + vpx * 0.16 / g.range; }
    else { const px = nvaTrackOf(S); z = zOf(px); proj = zOf(px + vpx * 0.16); }
    S.lastRelease = { p: S.p.x, t: S.t.x, z: z, vy: vy, proj: proj, from: d.m };
    let m;
    if (d.m === "hidden") m = S.p.x > 0.15 && proj > 0.5 ? (proj > 1.5 ? "full" : "card") : proj > -0.6 ? "pill" : "hidden";
    else if (d.m === "pill") m = z < -0.55 || proj < -0.7 ? "hidden" : proj > 1.5 ? "full" : proj > 0.22 ? "card" : "pill";
    else if (d.m === "card") m = proj > 1.5 ? "full" : proj > 0.6 ? "card" : proj > -0.5 ? "pill" : "hidden";
    else m = proj > 1.5 ? d.m : proj > 0.6 ? "card" : proj > -0.5 ? "pill" : "hidden"; /* full | settings */
    go(m, z <= 1 ? nvaClamp(vpx / g.range, -9, 9) : 0, z > 1 ? nvaClamp(vpx / tall, -9, 9) : 0);
  };
  /* A drag or a hold is not a tap: clicks right after one are swallowed. */
  const moveRef = React.useRef(null), upRef = React.useRef(null);
  moveRef.current = onPointerMove; upRef.current = onPointerUp;
  const onClickCapture = (e) => {
    if (performance.now() - (S.gestureEnd || 0) < 400) { e.stopPropagation(); e.preventDefault(); }
  };

  /* Settings: the phone's full Settings place (phone-settings.jsx registers
     window.PkPlaces.settings — the same settings as the desktop) when it is
     loaded; else the short list inside the card. */
  const fullSettings = () => !!(window.PkPlaces && window.PkPlaces.settings);
  const openSettings = () => {
    if (fullSettings() && onScreen) { onScreen("settings"); if (modeRef.current !== "pill") go("pill"); return; }
    go("settings");
  };
  const pick = (id) => {
    if (id === "settings") { openSettings(); return; }
    if (onScreen) onScreen(id);
    if (modeRef.current !== "pill") go("pill");
  };
  const onShapeClick = (e) => {
    /* the pill's ground (not one of the three) opens; the handle comes back */
    if (e.target.closest("button")) return;
    if (modeRef.current === "pill") go("card");
    else if (modeRef.current === "hidden") go("pill");
  };

  const inverse = theme === "dark" ? "paper" : "dark";
  const open = mode === "card" || mode === "full" || mode === "settings";
  const counts2 = counts || {};
  const here = top.indexOf(screen) > -1;
  /* the card's fog dots answer the list's scroll (phone-kit.jsx pkFogDrift) */
  const drift = React.useRef(null);
  if (!drift.current && window.pkFogDrift) {
    const dots = () => (R.fog ? R.fog.querySelectorAll(".nva-fog-dots") : null);
    drift.current = { rows: window.pkFogDrift(dots), settings: window.pkFogDrift(dots) };
  }
  React.useEffect(() => () => { if (drift.current) { drift.current.rows.stop(); drift.current.settings.stop(); } }, []);
  const onScroll = (e) => {
    paint();
    const el = e && e.currentTarget, d = drift.current;
    if (d && el) (el === setRef.current ? d.settings : d.rows).scroll(el.scrollTop);
  };

  return (
    <div ref={rootRef} className={"nva " + (theme === "dark" ? "is-dark" : "is-light") + (away ? " is-away" : "") + (morph ? " is-morph" : "")} data-nva-mode={mode} data-nav-variant="A" aria-hidden={away ? "true" : undefined}>
      <div ref={(n) => (R.scrim = n)} className="nva-scrim" style={{ pointerEvents: open ? "auto" : "none" }} onClick={() => go(mode === "settings" ? S.setFrom : "pill")} aria-hidden="true" />

      <div ref={(n) => (R.glass = n)} className="nva-glass" aria-hidden="true" />
      <div className={"nva-body" + (holding ? " is-holding" : "")}>
        <div ref={(n) => (R.shape = n)} className={"nva-shape " + inverse} role="navigation" aria-label="Menu"
          onPointerDown={onPointerDown}
          onClickCapture={onClickCapture} onClick={onShapeClick}>
          <div className="nva-ground" />

          {/* Card content, positioned from the shape's top edge. */}
          <div ref={(n) => (R.content = n)} className="nva-content" aria-hidden={open ? undefined : "true"}>
            <span ref={(n) => (R.grab = n)} className="nva-grab" />
            <div ref={(n) => (R.tiles = n)} className="nva-tiles" data-px-scope="">
              {window.PxSky ? (
                <div className="nva-sky" aria-hidden="true" data-nva-sky="">
                  <window.PxSky horizon="none" fps={15} radius={32} mood={window.pkSkyMood ? window.pkSkyMood(theme) : null} dark={theme === "dark"} parked engine={skyEng} />
                </div>
              ) : null}
              {top.map((id) => {
                const bd = nvaBadge(id, counts2);
                return (
                  <button key={id} type="button" tabIndex={open && mode !== "settings" ? 0 : -1} className={"nva-tile" + (screen === id ? " is-on" : "")} onClick={() => pick(id)} aria-label={NVA_WORD[id]} data-nva-tile={id}>
                    <span className="nva-tile-label">{NVA_WORD[id]}</span>
                    {bd ? <span className={"nva-tile-badge" + (bd.alert ? " is-alert" : "")}>{bd.text}</span> : null}
                  </button>
                );
              })}
            </div>
            <div ref={(n) => (R.rowsBox = n)} className="nva-rows-box">
              <div className="nva-scroll nva-rows-scroll" ref={listRef} onScroll={onScroll} data-nva-scroll="rows">
                <div ref={(n) => (R.rows = n)} className="nva-rows">
                  {rows.map((id) => {
                    const st = nvaStatus(id, counts2);
                    return (
                      <button key={id} type="button" tabIndex={open ? 0 : -1} className={"nva-row" + (screen === id ? " is-on" : "")} onClick={() => pick(id)} data-nva-row={id}>
                        <span className="nva-row-icon"><NvaGlyph id={id} /></span>
                        <span className="nva-row-text">
                          <span className="nva-row-word">{NVA_WORD[id]}</span>
                          <span className={"nva-row-cap" + (st.alert ? " is-alert" : "")}>{st.alert ? <span className="nva-alert-dot" /> : null}{st.text}</span>
                        </span>
                        {screen === id ? <span className="nva-here" aria-label="You are here" /> : null}
                      </button>
                    );
                  })}
                  <button type="button" tabIndex={open ? 0 : -1} className="nva-row nva-row-me" onClick={openSettings} data-nva-row="profile">
                    <span className="nva-avatar" aria-hidden="true">M</span>
                    <span className="nva-row-text">
                      <span className="nva-me-row-name">Maksym</span>
                      <span className="nva-row-cap">Account, plan and sign out</span>
                    </span>
                    <span className={"nva-plan" + (planInfo.pro ? " is-pro" : "")}>{planInfo.badge}</span>
                  </button>
                </div>
              </div>
            </div>
            <div ref={(n) => (R.set = n)} className="nva-set-box">
              <NvaSettings theme={theme} onTheme={onTheme} onBack={() => go(S.setFrom)} plan={plan} planInfo={planInfo} scrollRef={setRef} onScroll={onScroll}
                onUpgrade={() => { go("pill"); if (onUpgrade) onUpgrade(); }} onSignOut={() => { go("pill"); if (onSignOut) onSignOut(); }} />
            </div>
          </div>

          {/* The fog: rows past the fourth melt into the card. */}
          <div ref={(n) => (R.fog = n)} className="nva-fog" aria-hidden="true">
            <span className="nva-fog-blur is-1" /><span className="nva-fog-blur is-2" /><span className="nva-fog-blur is-3" />
            <span className="nva-fog-wash" />
            <span className="nva-fog-dots is-1" /><span className="nva-fog-dots is-2" /><span className="nva-fog-dots is-3" />
          </div>

          {/* The three, travelling between the pill and the tile row. */}
          {top.map((id, i) => (
            <button key={id} ref={(n) => (R["icon" + i] = n)} type="button" className={"nva-icon" + (screen === id ? " is-on" : "")}
              tabIndex={mode === "pill" ? 0 : -1} aria-label={NVA_WORD[id]} aria-current={screen === id ? "page" : undefined} onClick={() => pick(id)} data-nva-icon={id}>
              <NvaGlyph id={id} />
              <span className="nva-icon-dot" />
            </button>
          ))}

          {/* The pill's own end: a hairline and the dot grid that opens the rest. */}
          <div ref={(n) => (R.pillbits = n)} className="nva-pillbits">
            <span className="nva-hair" />
            <button ref={(n) => (R.dots = n)} type="button" className={"nva-dots" + (!here ? " is-here" : "")} tabIndex={mode === "pill" ? 0 : -1}
              onClick={() => go("card")} aria-label={"Every place" + (!here && NVA_WORD[screen] ? " — you are in " + NVA_WORD[screen] : "")} data-nva-open>
              {[0, 1, 2, 3, 4, 5].map((i) => <span key={i} className="nva-dot" />)}
            </button>
          </div>

          {/* Tucked away: a handle that brings it back. */}
          <span ref={(n) => (R.handle = n)} className="nva-handle" aria-hidden="true" />
          {mode === "hidden" ? <button type="button" className="nva-handle-hit" onClick={() => go("pill")} aria-label="Show the menu" data-nva-handle /> : null}
        </div>
      </div>

      {onCompose ? (
        <button ref={(n) => (R.add = n)} type="button" className="nva-add" tabIndex={mode === "pill" ? 0 : -1} aria-label="New task" data-nva-add=""
          onClick={() => { if (modeRef.current === "pill" && onCompose) onCompose(); }}>
          <NvaIcon name="plus" size={24} />
        </button>
      ) : null}
      <span ref={(n) => (R.hint = n)} className={"nva-hint " + inverse} aria-live="polite">
        {hint === "tuck" ? "Let go to tuck it away" : "Pull further to tuck it away"}
      </span>
    </div>
  );
}

/* The track a finger moves along, in px of travel from the pill: the first
   g.range px open the pill into the card, the next (fullH - cardH) px grow
   the card to full. Past full a short rubber band (24px at most, short of
   the status bar text) stretches the card; below
   the pill the finger meets a stiff band: ~150px of pull reaches the handle. */
function nvaSetTrack(S, px) {
  const g = S.g, tall = g.fullH - g.cardH, top = g.range + tall;
  if (px > top) { S.t.x = 1; S.p.x = 1 + nvaRubber(px - top, 24) / 140; }
  else if (px > g.range) { S.p.x = 1; S.t.x = (px - g.range) / tall; }
  else { S.t.x = 0; S.p.x = px >= 0 ? px / g.range : -1.22 * (1 - Math.exp(px / 150)); }
}
/* Where the springs are now, on the same track (the inverse of the above). */
function nvaTrackOf(S) {
  const g = S.g, p = S.p.x;
  if (p < 0) return 150 * Math.log(1 - Math.min(-p / 1.22, 0.999));
  return Math.min(p, 1) * g.range + nvaUnit(S.t.x) * (g.fullH - g.cardH);
}
/* Momentum for the lists: the finger's speed, decaying. v in px/ms, + = down the list. */
function nvaFling(el, v, onFrame) {
  if (!el) return;
  if (nvaReduced()) return;
  let vel = v * 16;
  const step = () => {
    vel *= 0.95;
    const max = el.scrollHeight - el.clientHeight;
    const next = nvaClamp(el.scrollTop + vel, 0, max);
    el.scrollTop = next;
    if (onFrame) onFrame();
    if (Math.abs(vel) < 0.3 || next <= 0 || next >= max) { el.__nvaFling = 0; return; }
    el.__nvaFling = requestAnimationFrame(step);
  };
  el.__nvaFling = requestAnimationFrame(step);
}

window.NeedtNavA = NeedtNavA;
/* the place glyph drawing, for phone-kit.jsx PkGlyph (the coloured tile) */
window.NvaGlyph = NvaGlyph;
