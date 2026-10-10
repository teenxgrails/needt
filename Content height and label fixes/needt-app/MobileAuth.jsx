/* SIGN-IN AND SETUP, ON A PHONE.
 *
 * The desktop pairs a form with a live plate of the day, because a 1440px
 * window can afford to show what the product is while you sign into it. A
 * phone cannot: the plate would take the half of the screen the keyboard is
 * about to take. So the persuasion goes to the top as one line and a small
 * mark, and the rest of the screen is the thing you came to do.
 *
 * The same five steps as the desktop, one per screen instead of a column with
 * a rail: a phone has no room for a step list beside the step, so progress is
 * a strip of ticks and a count — you can see how many are left without a
 * second column.
 */
const MaNS = window.NeedtDesignSystem_25d3c8;
const { Icon: MaIcon, Input: MaInput, Switch: MaSwitch } = MaNS;

function MaField({ label, hint, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ font: "var(--type-meta-medium)", color: "var(--text-secondary)" }}>{label}</span>
      {children}
      {hint ? <span style={{ font: "var(--type-meta)", color: "var(--text-quaternary)" }}>{hint}</span> : null}
    </label>
  );
}

/* A 44px control, because every tap target on this shell clears 44. */
function MaButton({ children, tone, onClick, wide }) {
  const accent = tone === "accent";
  return (
    <button type="button" onClick={onClick}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        width: wide === false ? "auto" : "100%", minHeight: 48, padding: "0 16px", border: 0, cursor: "default",
        borderRadius: "var(--radius-xl)", font: "var(--type-ui-medium)",
        background: accent ? "var(--fill-accent)" : "var(--surface-raised)",
        color: accent ? "var(--accent)" : "var(--text-primary)",
        boxShadow: accent ? "none" : "var(--shadow-raised)" }}>
      {children}
    </button>
  );
}

/* The mark and the one sentence that says what this is. Small, because the
   screen's job is the form under it. */
function MaCrest({ line }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: "none", paddingBottom: 4 }}>
      {window.ExposureWordmark ? <window.ExposureWordmark size={40} mode="breathe" /> : null}
      <span style={{ font: "var(--type-body)", color: "var(--text-tertiary)", textWrap: "pretty" }}>{line}</span>
    </div>
  );
}

function MbAuth({ mode, onMode, onDone }) {
  const signup = mode !== "login";
  const [mail, setMail] = React.useState("");
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: "8px 20px 20px", gap: 20 }}>
      <MaCrest line={signup
        ? "A planner that puts your work into the hours you actually have."
        : "Welcome back."} />

      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 16, overflow: "auto" }}>
        {/* The two ways in that need no typing come first: on a phone a
            password is the most expensive thing on the screen. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <MaButton onClick={onDone}><MaIcon name="globe" size={16} />Continue with Google</MaButton>
          <MaButton onClick={onDone}><MaIcon name="calendar" size={16} />Continue with Apple</MaButton>
        </div>

        <span style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <span aria-hidden="true" style={{ flex: 1, borderTop: "1px solid var(--border)" }} />
          <span style={{ font: "var(--type-meta)", color: "var(--text-quaternary)" }}>or</span>
          <span aria-hidden="true" style={{ flex: 1, borderTop: "1px solid var(--border)" }} />
        </span>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MaField label="Email">
            <MaInput type="email" value={mail} onChange={(e) => setMail(e.target.value)}
              placeholder="you@needt.app" style={{ minHeight: 48 }} />
          </MaField>
          <MaField label="Password" hint={signup ? "Eight characters or more." : null}>
            <MaInput type="password" defaultValue="" placeholder="••••••••" style={{ minHeight: 48 }} />
          </MaField>
          <MaButton tone="accent" onClick={onDone}>{signup ? "Create the account" : "Sign in"}</MaButton>
        </div>
      </div>

      <button type="button" onClick={() => onMode(signup ? "login" : "signup")}
        style={{ flex: "none", minHeight: 44, border: 0, cursor: "default", background: "transparent",
          font: "var(--type-ui)", color: "var(--text-muted)" }}>
        {signup ? "Already have an account? Sign in" : "No account yet? Create one"}
      </button>
    </div>
  );
}

/* ── SETUP ──────────────────────────────────────────────────────────────── */
const MA_STEPS = [
  ["you", "You", "Name and time zone"],
  ["hours", "Your hours", "When the scheduler may place work"],
  ["view", "How you work", "The shape you want the day in"],
  ["calendars", "Calendars", "What already owns your time"],
  ["first", "First tasks", "Three things, and Needt places them"]
];

const MA_VIEWS = [
  ["today", "Day", "Today's work as a list, with what is overdue beside it."],
  ["columns", "Columns", "Seven days side by side, each a stack of cards."],
  ["grid", "Hours", "The clock, with everything placed on it."]
];

/* Laid across rather than down: a phone reads a row of three thumbnails in
   one glance and a column of three as a list to work through. */
const MA_KIND = { today: "day", columns: "columns", grid: "grid" };

function MaViewThumb({ id, on }) {
  return (
    <span style={{ display: "block", borderRadius: "var(--radius-md)", overflow: "hidden",
      boxShadow: on ? "rgba(var(--accent-rgb), 0.55) 0 0 0 1.5px inset" : "var(--shadow-inset-ring)" }}>
      <window.Miniature kind={MA_KIND[id] || "day"} width={104} />
    </span>
  );
}

function MbSetup({ onDone, step }) {
  const [i, setI] = React.useState(step || 0);
  const [view, setView] = React.useState("today");
  const [cals, setCals] = React.useState({ google: true, apple: false });
  const [first, setFirst] = React.useState(["Draft the launch brief", "", ""]);
  const id = MA_STEPS[i][0];

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, padding: "8px 20px 20px", gap: 16 }}>
      {/* Progress is a strip and a count, not a column: the phone has no room
          for a rail beside the step, and a tick you can see is enough. */}
      <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ display: "flex", gap: 4, flex: 1 }}>
          {MA_STEPS.map((s, n) => (
            <span key={s[0]} style={{ flex: 1, height: 3, borderRadius: 2,
              background: n <= i ? "var(--accent)" : "var(--fill-3)" }} />
          ))}
        </span>
        <span style={{ flex: "none", font: "var(--type-meta)", color: "var(--text-quaternary)", fontVariantNumeric: "tabular-nums" }}>
          {i + 1} of {MA_STEPS.length}
        </span>
      </div>

      <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 2 }}>
        <span className="display" style={{ fontSize: 27, lineHeight: 1.1, color: "var(--text-primary)" }}>{MA_STEPS[i][1]}</span>
        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>{MA_STEPS[i][2]}</span>
      </div>

      <div key={id} className="mb-step scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto",
        display: "flex", flexDirection: "column", gap: 14 }}>
        {id === "you" ? (
          <>
            <MaField label="What should Needt call you?">
              <MaInput defaultValue="Maksym" style={{ minHeight: 48 }} />
            </MaField>
            <MaField label="Time zone" hint="Used for the day's start and the now-line.">
              <MaInput defaultValue="Europe / Berlin" style={{ minHeight: 48 }} />
            </MaField>
          </>
        ) : null}

        {id === "hours" ? (
          <>
            <div style={{ display: "flex", gap: 11 }}>
              <MaField label="Day starts"><MaInput defaultValue="09:00" style={{ minHeight: 48 }} /></MaField>
              <MaField label="Day ends"><MaInput defaultValue="18:00" style={{ minHeight: 48 }} /></MaField>
            </div>
            <span style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 48 }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ font: "var(--type-ui)", color: "var(--text-primary)" }}>Protect focus</span>
                <span style={{ font: "var(--type-meta)", color: "var(--text-quaternary)" }}>No meetings placed into deep work.</span>
              </span>
              <MaSwitch checked onChange={() => {}} />
            </span>
            <span style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 48 }}>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ font: "var(--type-ui)", color: "var(--text-primary)" }}>Weekends</span>
                <span style={{ font: "var(--type-meta)", color: "var(--text-quaternary)" }}>Place work on Saturday and Sunday.</span>
              </span>
              <MaSwitch checked={false} onChange={() => {}} />
            </span>
          </>
        ) : null}

        {id === "view" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {MA_VIEWS.map(([k, label]) => (
                <button key={k} type="button" onClick={() => setView(k)}
                  style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6, padding: 0, border: 0,
                    background: "transparent", cursor: "default" }}>
                  <MaViewThumb id={k} on={view === k} />
                  <span style={{ font: "var(--type-meta-medium)", textAlign: "left",
                    color: view === k ? "var(--accent)" : "var(--text-secondary)" }}>{label}</span>
                </button>
              ))}
            </div>
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>
              {MA_VIEWS.filter((v) => v[0] === view)[0][2]} You can change it any day.
            </span>
          </div>
        ) : null}

        {id === "calendars" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[["google", "Google Calendar", "calendar"], ["apple", "Apple Calendar", "calendar"]].map(([k, label, glyph]) => (
              <button key={k} type="button" onClick={() => setCals((c) => Object.assign({}, c, { [k]: !c[k] }))}
                style={{ display: "flex", alignItems: "center", gap: 11, minHeight: 56, padding: "0 14px", border: 0, cursor: "default",
                  borderRadius: "var(--radius-xl)", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)" }}>
                <MaIcon name={glyph} size={18} />
                <span style={{ flex: 1, minWidth: 0, textAlign: "left", font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>{label}</span>
                <span style={{ flex: "none", display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: 11,
                  background: cals[k] ? "var(--accent)" : "transparent",
                  boxShadow: cals[k] ? "none" : "inset 0 0 0 1.5px var(--text-disabled)", color: "#fff" }}>
                  {cals[k] ? <MaIcon name="check" size={12} /> : null}
                </span>
              </button>
            ))}
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>
              Events you already agreed to are the fixed part of the day. Needt places work around them.
            </span>
          </div>
        ) : null}

        {id === "first" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {first.map((v, n) => (
              <MaInput key={n} value={v} placeholder={n ? "Something else on your mind" : "Something you owe someone"}
                onChange={(e) => setFirst((l) => l.map((x, j) => (j === n ? e.target.value : x)))}
                style={{ minHeight: 48 }} />
            ))}
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>
              Needt places these into your free hours as soon as you finish.
            </span>
          </div>
        ) : null}
      </div>

      <div style={{ flex: "none", display: "flex", gap: 8 }}>
        {i > 0 ? (
          <button type="button" onClick={() => setI(i - 1)}
            style={{ flex: "none", minHeight: 48, padding: "0 18px", border: 0, cursor: "default",
              borderRadius: "var(--radius-xl)", background: "var(--surface-raised)", boxShadow: "var(--shadow-raised)",
              font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>
            Back
          </button>
        ) : null}
        <span style={{ flex: 1 }}>
          <MaButton tone="accent" onClick={() => (i === MA_STEPS.length - 1 ? onDone() : setI(i + 1))}>
            {i === MA_STEPS.length - 1 ? "Open Needt" : "Next"}
            <MaIcon name="arrow-right" size={15} />
          </MaButton>
        </span>
      </div>
    </div>
  );
}

Object.assign(window, { MbAuth, MbSetup, MaViewThumb });
