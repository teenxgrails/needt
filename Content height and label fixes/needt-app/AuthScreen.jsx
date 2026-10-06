const { Button, Input, Icon, IconButton, Checkbox, Switch, Select, Chip, StatusDot, Avatar, FormRow, FormGroup, RadioGroup, Tooltip } = window.NeedtDesignSystem_25d3c8;
const { ExposureWordmark } = window;

/* AUTH + ONBOARDING — the two screens before the product.
 *
 * Composition is the split from the reference: the decision on the left in one
 * narrow column, and on the right a plate where the product itself is running.
 * The plate is not decoration — it is a miniature day that keeps placing blocks,
 * so the promise on the left is demonstrated rather than illustrated. */

const MINI = [
  { top: 6, h: 34, tone: "var(--info)", w: "78%", delay: 0.0 },
  { top: 44, h: 22, tone: "var(--success)", w: "64%", delay: 0.5, event: true },
  { top: 70, h: 40, tone: "var(--accent)", w: "86%", delay: 1.0 },
  { top: 114, h: 20, tone: "var(--text-muted)", w: "58%", delay: 1.5 },
  { top: 138, h: 30, tone: "var(--info)", w: "72%", delay: 2.0 },
  { top: 172, h: 26, tone: "var(--accent)", w: "66%", delay: 2.5 }
];

/* The plate: a day filling itself. Blocks arrive on their own delays, the
   now-line creeps, and the whole thing loops — it has to look alive for the
   thirty seconds someone spends on this screen, and no longer. */
function LivePlate({ hours, calendars, placed }) {
  return (
    <div style={{ position: "relative", flex: 1, minWidth: 0, borderRadius: "var(--radius-3xl)", overflow: "hidden",
      background: "var(--fill-4)", boxShadow: "var(--shadow-ring)" }}>
      <div className="auth-aurora" aria-hidden="true" />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", padding: 28, gap: 16 }}>
        <span style={{ display: "flex", alignItems: "baseline", gap: 11 }}>
          <span className="display" style={{ fontSize: 34, lineHeight: 1, color: "var(--text-primary)" }}>01.09</span>
          <span style={{ font: "var(--type-meta)", color: "var(--text-quaternary)", letterSpacing: "0.04em", textTransform: "uppercase" }}>Tuesday · week 36</span>
        </span>
        <div style={{ position: "relative", flex: 1, minHeight: 0, borderRadius: "var(--radius-2xl)", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)", overflow: "hidden" }}>
          {hours ? <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: "12%", height: "62%", background: "var(--fill-2)" }} /> : null}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, top: 8 + i * 34, height: 1, background: "var(--border)" }} />
          ))}
          <div style={{ position: "absolute", left: 44, right: 16, top: 10, bottom: 10 }}>
            {MINI.slice(0, placed).map((b, i) => (
              <span key={i} className="mini-block" style={{ position: "absolute", left: 0, top: b.top, width: b.w, height: b.h,
                animationDelay: b.delay + "s", display: "flex", alignItems: "stretch", borderRadius: "var(--radius-md)", overflow: "hidden",
                background: b.event && calendars ? "color-mix(in oklab, " + b.tone + " 14%, var(--surface-raised))" : "var(--surface-raised)",
                boxShadow: b.event && calendars ? "color-mix(in oklab, " + b.tone + " 32%, transparent) 0 0 0 1px" : "var(--shadow-ring)" }}>
                <span style={{ width: 3, background: b.tone }} />
                <span style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 4, padding: "0 8px" }}>
                  <span style={{ height: 3, width: "56%", borderRadius: 2, background: "var(--fill-6)" }} />
                  {b.h > 26 ? <span style={{ height: 3, width: "34%", borderRadius: 2, background: "var(--fill-4)" }} /> : null}
                </span>
              </span>
            ))}
          </div>
          {[8, 9, 10, 11, 12, 13].map((h, i) => (
            <span key={h} style={{ position: "absolute", left: 12, top: 4 + i * 34, fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--text-disabled)" }}>{h}:00</span>
          ))}
          <span className="mini-now" aria-hidden="true" />
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 8, font: "var(--type-meta)", color: "var(--text-muted)" }}>
          <span style={{ width: 3, height: 12, borderRadius: 2, background: "var(--text-muted)" }} />Grey rail: fixed.
          <span style={{ width: 3, height: 12, borderRadius: 2, background: "var(--info)", marginLeft: 8 }} />Coloured: the scheduler placed it and can move it again.
        </span>
      </div>
    </div>
  );
}

function OAuthButton({ icon, children, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 40, border: 0, cursor: "default",
        borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--shadow-raised)",
        font: "var(--type-ui-medium)", color: "var(--text-primary)", transition: "box-shadow var(--transition-hover), background-color var(--transition-hover)" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-floating)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-raised)"; }}>
      <Icon name={icon} size={16} />{children}
    </button>
  );
}

/* ── SIGN UP ─────────────────────────────────────────────────────────────── */
function AuthScreen({ mode, onMode, onDone, seed, embedded }) {
  const signup = mode !== "login";
  const [mail, setMail] = React.useState((seed && seed.mail) || "");
  const [pass, setPass] = React.useState((seed && seed.pass) || "");
  const [show, setShow] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [refused, setRefused] = React.useState((seed && seed.refused) || null);
  const [touched, setTouched] = React.useState(!!(seed && seed.touched));
  const short = pass.length > 0 && pass.length < 8;
  const badMail = touched && mail.length > 0 && mail.indexOf("@") < 1;
  const noMail = touched && mail.length === 0;

  /* Errors name the fix and sit under their field. The refusal is about the
     pair, not the field, so it sits above the button — where the decision is. */
  function submit() {
    if (busy) return;
    setTouched(true);
    if (!mail || mail.indexOf("@") < 1 || pass.length < 8) return;
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      /* One address is taken and one password is wrong, so both refusals are
         reachable in the kit without a server. */
      if (signup && mail.trim().toLowerCase() === "taken@needt.app") { setRefused("taken"); return; }
      if (!signup && pass !== "needt2026") { setRefused("wrong"); return; }
      onDone();
    }, 900);
  }
  const refusal = refused === "taken" ? "That address already has an account. Sign in instead."
    : refused === "wrong" ? "That email and password do not match." : null;

  return (
    <div className="auth-enter" style={embedded
      ? { position: "relative", height: "100%", display: "flex", gap: 0, padding: 20, background: "var(--background)" }
      : { position: "fixed", inset: 0, zIndex: 950, display: "flex", gap: 0, padding: 20, background: "var(--background)" }}>
      <div style={{ flex: "0 0 auto", width: 392, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 40px" }}>
        <ExposureWordmark size={64} mode="breathe+pulse" />
        <h1 style={{ margin: "28px 0 6px", font: "var(--type-page-title)", color: "var(--text-primary)" }}>{signup ? "Create your account" : "Sign in"}</h1>
        <p style={{ margin: "0 0 21px", font: "var(--type-ui)", color: "var(--text-muted)", textWrap: "pretty" }}>
          {signup ? "One planner for your calendar, your tasks and your projects." : "Welcome back. Your day is where you left it."}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <OAuthButton icon="chrome" onClick={onDone}>Continue with Google</OAuthButton>
          <OAuthButton icon="apple" onClick={onDone}>Continue with Apple</OAuthButton>
          <OAuthButton icon="github" onClick={onDone}>Continue with GitHub</OAuthButton>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 11, margin: "21px 0" }}>
          <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
          <span style={{ font: "var(--type-meta)", color: "var(--text-disabled)" }}>or</span>
          <span style={{ flex: 1, height: 1, background: "var(--border)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "var(--type-meta-medium)", color: "var(--text-secondary)" }}>Email</span>
            <Input value={mail} invalid={badMail || noMail || refused === "taken"}
              onChange={(e) => { setRefused(null); setMail(e.target.value ? e.target.value : e); }} placeholder="you@example.com" />
            {noMail ? <span style={{ font: "var(--type-meta)", color: "var(--destructive)" }}>Enter your email.</span>
              : badMail ? <span style={{ font: "var(--type-meta)", color: "var(--destructive)" }}>Include an @ in the address.</span> : null}
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "var(--type-meta-medium)", color: "var(--text-secondary)" }}>Password</span>
            <span style={{ position: "relative", display: "flex" }}>
              <Input type={show ? "text" : "password"} value={pass} invalid={short || refused === "wrong"}
                onChange={(e) => { setRefused(null); setPass(e.target.value ? e.target.value : e); }} placeholder="At least 8 characters" style={{ flex: 1, paddingRight: 36 }} />
              <span style={{ position: "absolute", right: 4, top: 3 }}>
                <IconButton label={show ? "Hide password" : "Show password"} variant="ghost" onClick={() => setShow(!show)}>
                  <Icon name={show ? "eye-off" : "eye"} size={14} />
                </IconButton>
              </span>
            </span>
            <span style={{ font: "var(--type-meta)", color: short ? "var(--destructive)" : "var(--text-muted)" }}>
              {short ? "Use at least 8 characters." : "Must be at least 8 characters."}
            </span>
          </label>
          {refusal ? (
            <span className="refusal" style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "8px 11px", borderRadius: "var(--radius-lg)", background: "var(--fill-destructive)", font: "var(--type-meta)", color: "var(--destructive)", textWrap: "pretty" }}>
              <Icon name="alert-circle" size={13} />{refusal}
            </span>
          ) : null}
          <Button variant="accent" onClick={submit} style={{ height: 40, justifyContent: "center" }}>
            {busy ? "Setting up your day…" : signup ? "Create account" : "Sign in"}
          </Button>
          <p style={{ margin: 0, textAlign: "center", font: "var(--type-meta)", color: "var(--text-muted)" }}>
            {signup ? "Already have an account? " : "New here? "}
            <button type="button" onClick={() => onMode(signup ? "login" : "signup")}
              style={{ border: 0, background: "none", padding: 0, cursor: "default", font: "var(--type-meta-medium)", color: "var(--accent)" }}>
              {signup ? "Sign in" : "Create one"}
            </button>
          </p>
        </div>
      </div>

      <LivePlate hours calendars placed={6} />
    </div>
  );
}

/* ── ONBOARDING ──────────────────────────────────────────────────────────── */
const STEPS = [
  ["you", "You", "Name and time zone"],
  ["hours", "Your hours", "When the scheduler may place work"],
  ["view", "How you work", "The shape you want the day in"],
  ["calendars", "Calendars", "What already owns your time"],
  ["first", "First tasks", "Three things, and Needt places them"]
];

/* Three grounds, drawn small. Each is the real arrangement in miniature — a
   list of cards, a run of day columns, an hour grid — so the choice is made by
   recognising a layout rather than by reading its name. */
const VIEWS = [
  ["today", "Day", "Today's work as a list, with what is overdue beside it."],
  ["columns", "Columns", "Seven days side by side, each a stack of cards."],
  ["grid", "Hours", "The clock, with everything placed on it."]
];

/* The three grounds, each drawn as the screen it actually is. */
const VIEW_KIND = { today: "day", columns: "columns", grid: "grid" };

function ViewThumb({ id, on, width }) {
  return <window.Miniature kind={VIEW_KIND[id] || "day"} width={width || 96} />;
}

function OnboardingScreen({ onDone, theme, onTheme, embedded, seed, pair, drift, onDrift }) {
  const [i, setI] = React.useState((seed && seed.step) || 0);
  const [dir, setDir] = React.useState(1);
  const [name, setName] = React.useState("Maksym");
  const [apple, setApple] = React.useState(true);
  const [google, setGoogle] = React.useState(false);
  const [caught, setCaught] = React.useState(["Draft the launch brief", "Send invoices for August", ""]);
  const [view, setView] = React.useState("today");
  const [planning, setPlanning] = React.useState(false);
  const step = STEPS[i];

  function go(n) { setDir(n > i ? 1 : -1); setI(Math.max(0, Math.min(STEPS.length - 1, n))); }
  function finish() {
    setPlanning(true);
    window.setTimeout(() => onDone(view), 1100);
  }

  const filled = caught.filter((t) => t.trim()).length;

  return (
    <div className="auth-enter" style={embedded
      ? { position: "relative", height: "100%", display: "flex", gap: 20, padding: 20, background: "var(--background)" }
      : { position: "fixed", inset: 0, zIndex: 950, display: "flex", gap: 20, padding: 20, background: "var(--background)" }}>
      <div style={{ flex: "0 0 auto", width: 392, display: "flex", flexDirection: "column", padding: "0 40px" }}>
        <ExposureWordmark size={54} mode="breathe" style={{ marginTop: 8 }} />

        {/* The rail is the progress: four marks, the passed ones filled, the
            current one wide. No percentages — four is countable. */}
        <div style={{ display: "flex", gap: 6, padding: "28px 0 21px" }}>
          {STEPS.map((s, n) => (
            <span key={s[0]} style={{ height: 3, flex: n === i ? "2 1 0" : "1 1 0", borderRadius: 2,
              background: n <= i ? "var(--accent)" : "var(--fill-4)", transition: "flex 0.32s ease, background-color 0.32s ease" }} />
          ))}
        </div>

        <div key={step[0]} className={"scroll-inner " + (dir > 0 ? "step-enter" : "step-enter-back")}
          style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", paddingRight: 2 }}>
          <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>Step {i + 1} of {STEPS.length}</span>
          <h1 style={{ margin: "6px 0 6px", font: "var(--type-page-title)", color: "var(--text-primary)" }}>{step[1]}</h1>
          <p style={{ margin: "0 0 21px", font: "var(--type-ui)", color: "var(--text-muted)", textWrap: "pretty" }}>{step[2]}</p>

          {i === 0 ? (
            <FormGroup title="About you">
              <FormRow label="Name"><Input value={name} onChange={(e) => setName(e.target.value ? e.target.value : e)} style={{ maxWidth: 220 }} /></FormRow>
              <FormRow label="Time zone"><Select value="cet" options={[{ value: "cet", label: "CET — Berlin" }, { value: "utc", label: "UTC" }, { value: "est", label: "EST — New York" }]} /></FormRow>
              {/* Five miniatures of a real day rather than five words, System
                  first because agreeing with the machine is the right default
                  and the rest are a preference. */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 5 }}>
                <span style={{ font: "var(--type-meta-medium)", color: "var(--text-secondary)" }}>Theme</span>
                <div style={{ display: "flex", gap: 11, flexWrap: "wrap" }}>
                  {window.THEMES.map(([id, l]) => (
                    <window.ThemeThumb key={id} id={id} label={l} active={theme === id} onPick={onTheme} pair={pair} />
                  ))}
                </div>
                <FormRow label="Follow the day" hint="Paper warms toward sunset; after dusk the dark side takes over.">
                  <Switch checked={drift} onChange={onDrift} />
                </FormRow>
              </div>
            </FormGroup>
          ) : null}

          {i === 1 ? (
            <FormGroup title="Working hours">
              <FormRow label="Day starts"><Input type="time" defaultValue="09:00" style={{ width: 120 }} /></FormRow>
              <FormRow label="Day ends"><Input type="time" defaultValue="18:00" style={{ width: 120 }} /></FormRow>
              <FormRow label="Week starts"><Select value="mon" options={[{ value: "mon", label: "Monday" }, { value: "sun", label: "Sunday" }]} /></FormRow>
              <FormRow label="Weekends" hint="The scheduler leaves them alone unless you say otherwise."><Switch checked={false} onChange={() => {}} /></FormRow>
            </FormGroup>
          ) : null}

          {i === 2 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {VIEWS.map(([id, label, note]) => (
                <button key={id} type="button" onClick={() => setView(id)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, border: 0, cursor: "default", textAlign: "left",
                    borderRadius: "var(--radius-lg)", background: view === id ? "var(--fill-accent)" : "var(--fill-2)",
                    transition: "background-color var(--transition-hover)" }}>
                  <span style={{ flex: "0 0 auto", display: "flex", borderRadius: "var(--radius-md)", overflow: "hidden",
                    boxShadow: view === id ? "var(--shadow-focus)" : "var(--shadow-ring)" }}>
                    <ViewThumb id={id} on={view === id} width={112} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                    <span style={{ font: "var(--type-ui-medium)", color: view === id ? "var(--accent)" : "var(--text-primary)" }}>{label}</span>
                    <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>{note}</span>
                  </span>
                </button>
              ))}
              <p style={{ margin: 0, font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>
                This is what Needt opens on. All three stay available — Settings changes which one is first.
              </p>
            </div>
          ) : null}

          {i === 3 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[["Apple Calendar", "maksym@icloud.com", "apple", apple, setApple, "var(--success)"],
                ["Google Calendar", "maksym@needt.app", "chrome", google, setGoogle, "var(--info)"]].map(([n, m, ic, on, set, c]) => (
                <button key={n} type="button" onClick={() => set(!on)}
                  style={{ display: "flex", alignItems: "center", gap: 11, height: 52, padding: "0 11px", border: 0, cursor: "default", textAlign: "left",
                    borderRadius: "var(--radius-xl)", background: on ? "var(--fill-accent)" : "var(--fill-2)", transition: "background-color var(--transition-hover)" }}>
                  <span style={{ width: 28, height: 28, display: "grid", placeItems: "center", borderRadius: "var(--radius-md)", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)" }}>
                    <Icon name={ic} size={15} />
                  </span>
                  <span style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>{n}</span>
                    <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>{m}</span>
                  </span>
                  <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
                    <span style={{ font: "var(--type-meta-medium)", color: on ? "var(--accent)" : "var(--text-muted)" }}>{on ? "Connected" : "Connect"}</span>
                  </span>
                </button>
              ))}
              <p style={{ margin: "6px 0 0", font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>
                Events keep their calendar's colour. Tasks stay white and take a rail.
              </p>
            </div>
          ) : null}

          {i === 4 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {caught.map((t, n) => (
                <span key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-disabled)", width: 14 }}>{n + 1}</span>
                  <Input value={t} placeholder={n === 2 ? "One more thing on your mind" : "Something you owe someone"}
                    onChange={(e) => { const v = e.target.value ? e.target.value : e; setCaught(caught.map((x, k) => (k === n ? v : x))); }} style={{ flex: 1 }} />
                </span>
              ))}
              <p style={{ margin: "6px 0 0", font: "var(--type-meta)", color: "var(--text-muted)" }}>
                {filled} of 3 captured. Needt places them into your free hours — you can move any of them after.
              </p>
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 16 }}>
          {i > 0 ? <Button variant="flat" iconLeft={<Icon name="arrow-left" size={16} />} onClick={() => go(i - 1)}>Back</Button> : null}
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <Button variant="ghost" onClick={() => onDone(view)}>Skip</Button>
            {i < STEPS.length - 1
              ? <Button variant="accent" iconRight={<Icon name="arrow-right" size={16} />} onClick={() => go(i + 1)}>Next</Button>
              : <Button variant="accent" iconRight={<Icon name={planning ? "loader" : "sparkles"} size={16} />} onClick={finish}>{planning ? "Placing…" : "Plan my day"}</Button>}
          </span>
        </div>
      </div>

      {/* The plate answers each step: hours shade in, calendars tint their
          events, captured tasks arrive as blocks. */}
      <LivePlate hours={i >= 1} calendars={i >= 3 && (apple || google)} placed={[2, 3, 4, 5, 6][i]} />
    </div>
  );
}

Object.assign(window, { AuthScreen, OnboardingScreen, LivePlate, ViewThumb, VIEWS });
