const { Card, Button, IconButton, Icon, Input, Select, Switch, Checkbox, RadioGroup, SegmentedControl,
  FormRow, FormGroup, Chip, StatusDot, Avatar, Tooltip, NavSection, Menu, MenuItem, MenuSeparator, DropdownMenu,
  Skeleton, SkeletonRows, EmptyState } = window.NeedtDesignSystem_25d3c8;

/* SETTINGS — a full screen, not a dialog. The left rail is the table of
   contents; the right column is one section at a time, so a form row never
   competes with a form row from another subject.
   Every row is FormRow: one 105px label column, one 32px row height. A label
   that does not fit is shortened here, never widened there. */
const SECTIONS = [
  ["appearance", "Appearance", "palette"],
  ["day", "Your day", "clock"],
  ["calendars", "Calendars", "calendar"],
  ["tasks", "Tasks", "list-checks"],
  ["focus", "Focus", "target"],
  ["alerts", "Alerts", "bell"],
  ["keys", "Shortcuts", "command"],
  ["account", "Account", "user"],
  ["data", "Data", "database"]
];

/* Every sized control on this screen measures from one constant, so a Select
   and the Input next to it cannot disagree. */
const CTRL = { width: 220 };

const KEYWORDS = {
  appearance: "theme light dim dark rail movability urgency density font document width",
  day: "working hours week start time zone scheduler auto-schedule protect focus min chunk buffer weekend",
  calendars: "apple google sync declined all-day write back default view connect",
  tasks: "estimate project parts money groups impulse flame",
  focus: "session length break sound corner glow alerts wordmark snap",
  alerts: "daily plan overdue week review channel desktop email",
  keys: "shortcuts keyboard command",
  account: "name email password plan sign out session",
  data: "export csv markdown json clear delete account"
};

/* A theme is chosen by looking at it. Each thumbnail is the real thing at 1/8
   scale — the same tokens, the same rail, inside the theme's own class — so
   the swatch cannot drift from the product.
   SYSTEM is not a theme and does not get a swatch of its own: it is a pair, so
   its thumbnail is split down the middle and shows the two themes it will
   actually use. */
/* The five themes. Paper and Warm are the two light grounds, Dim and Dark the
   two dark ones, and System is not a theme at all — it is a pair, so its
   thumbnail is one screen cut down the middle showing the two it will use. */
const THEMES = [
  ["paper", "Paper"],
  ["warm", "Warm"],
  ["dim", "Dim"],
  ["dark", "Dark"],
  ["system", "System"]
];
const THEME_CLASS = { paper: "paper", warm: "warm", dim: "dim", dark: "dark" };

function ThemeThumb({ id, label, active, onPick, pair }) {
  const p = pair || { light: "paper", dark: "dark" };
  return (
    <button type="button" onClick={() => onPick(id)} aria-pressed={active} className="thumb"
      style={{ display: "flex", flexDirection: "column", gap: 6, padding: 0, border: 0, background: "none", cursor: "default", textAlign: "left" }}>
      <span style={{ display: "block", borderRadius: "var(--radius-lg)", overflow: "hidden",
        boxShadow: active ? "var(--shadow-focus)" : "var(--shadow-ring)", transition: "box-shadow var(--transition-hover)" }}>
        {id === "system"
          ? <window.Miniature kind="day" width={132} half={[THEME_CLASS[p.light], THEME_CLASS[p.dark]]} />
          : <window.Miniature kind="day" width={132} theme={THEME_CLASS[id]} />}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5, font: "var(--type-meta)", color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
        {active ? <Icon name="check" size={13} /> : null}{label}
      </span>
    </button>
  );
}

/* The rail is the product's one piece of colour language, so the setting that
   governs it shows both readings rather than naming them. */
function RailThumb({ id, active, onPick, title, note, colors }) {
  return (
    <button type="button" onClick={() => onPick(id)} aria-pressed={active} className="thumb"
      style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 8, padding: 11, textAlign: "left", cursor: "default",
        border: 0, borderRadius: "var(--radius-2xl)", background: "var(--surface-raised)",
        boxShadow: active ? "var(--shadow-focus)" : "var(--shadow-ring)", transition: "box-shadow var(--transition-hover), transform var(--transition-hover)" }}>
      <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {colors.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 0, height: 18, borderRadius: "var(--radius-sm)", overflow: "hidden", background: "var(--fill-2)" }}>
            <span style={{ width: 3, height: "100%", background: c[0] }} />
            <span style={{ marginLeft: 6, font: "var(--type-meta)", color: "var(--text-quaternary)" }}>{c[1]}</span>
          </span>
        ))}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5, font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>
        {active ? <Icon name="check" size={13} /> : null}{title}
      </span>
      <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>{note}</span>
    </button>
  );
}

function DensityThumb({ id, active, onPick, label, rows }) {
  return (
    <button type="button" onClick={() => onPick(id)} aria-pressed={active} className="thumb"
      style={{ display: "flex", flexDirection: "column", gap: 6, padding: 0, border: 0, background: "none", cursor: "default", textAlign: "left" }}>
      <span style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: id === "compact" ? 3 : 7, width: 96, height: 64, padding: "0 8px",
        borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: active ? "var(--shadow-focus)" : "var(--shadow-ring)", transition: "box-shadow var(--transition-hover), transform var(--transition-hover)" }}>
        {rows.map((w, i) => <span key={i} style={{ height: 3, width: w, borderRadius: 2, background: i === 0 ? "var(--fill-6)" : "var(--fill-3)" }} />)}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 5, font: "var(--type-meta)", color: active ? "var(--text-primary)" : "var(--text-tertiary)" }}>
        {active ? <Icon name="check" size={13} /> : null}{label}
      </span>
    </button>
  );
}

function AccountRow({ name, mail, tone, sync, onSync, colour, onDisconnect }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, height: 44, padding: "0 11px", borderRadius: "var(--radius-xl)", background: "var(--fill-2)" }}>
      <span style={{ width: 26, height: 26, display: "grid", placeItems: "center", borderRadius: "var(--radius-md)", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)" }}>
        <Icon name={tone === "apple" ? "apple" : "chrome"} size={14} />
      </span>
      <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>{name}</span>
        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{mail}</span>
      </span>
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 11 }}>
        <Tooltip label="This calendar's colour fills its events" side="top">
          <span style={{ width: 12, height: 12, borderRadius: 4, background: colour }} />
        </Tooltip>
        <Switch checked={sync} onChange={onSync} />
        <DropdownMenu align="right" trigger={<IconButton label="More" variant="ghost"><Icon name="ellipsis" size={14} /></IconButton>}>
          <MenuItem icon={<Icon name="refresh-cw" size={14} />}>Sync now</MenuItem>
          <MenuItem icon={<Icon name="palette" size={14} />}>Change colour</MenuItem>
          <MenuSeparator />
          <MenuItem variant="destructive" icon={<Icon name="unlink" size={14} />} onClick={onDisconnect}>Disconnect</MenuItem>
        </DropdownMenu>
      </span>
    </div>
  );
}


/* A setting about the time of day cannot be judged in the moment it is
   switched on, so the preview shows the whole day at once: six readings of the
   same paper, taken at the hours the sun actually decides. */
function DriftPreview({ theme, pair }) {
  const now = new Date();
  const t = window.sunTimes(now, 52.52, 13.405);
  const marks = [
    ["dawn", t.dawn], ["sunrise", t.sunrise], ["midday", t.noon],
    ["sunset", t.sunset], ["dusk", t.dusk], ["night", (t.dusk || 21) + 1.5]
  ];
  const base = theme === "system" ? (pair ? pair.light : "paper") : theme;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", paddingTop: 11 }}>
      {marks.map(([label, hour]) => {
        const d = window.driftAt(hour, t);
        const wasLight = base === "paper" || base === "warm";
        const shown = wasLight && d.night > 0.5 ? ((pair && pair.dark) || "dark") : base;
        const p = window.DRIFT_PAPER[shown] || window.DRIFT_PAPER.paper;
        const bg = window.driftMix(p.bg, p.bgWarm, d.warm);
        const raised = window.driftMix(p.raised, p.raisedWarm, d.warm);
        return (
          <span key={label} style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <span style={{ display: "block", position: "relative", width: 76, height: 48, borderRadius: "var(--radius-md)", overflow: "hidden",
              background: bg, boxShadow: "var(--shadow-ring)" }}>
              <span style={{ position: "absolute", left: 5, top: 6, right: 5, height: 13, borderRadius: 3, background: raised }} />
              <span style={{ position: "absolute", left: 5, top: 6, width: 2.5, height: 13, borderRadius: "2px 0 0 2px", background: "var(--accent)" }} />
              <span style={{ position: "absolute", left: 5, top: 24, right: 18, height: 10, borderRadius: 3, background: raised }} />
              <span style={{ position: "absolute", left: 5, top: 38, right: 30, height: 5, borderRadius: 3, background: raised, opacity: 0.7 }} />
            </span>
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ font: "var(--type-meta)", color: "var(--text-tertiary)" }}>{label}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-disabled)" }}>
                {hour == null ? "—" : String(Math.floor(hour % 24)).padStart(2, "0") + ":" + String(Math.round((hour % 1) * 60)).padStart(2, "0")}
              </span>
            </span>
          </span>
        );
      })}
    </div>
  );
}

function SettingsScreen({ theme, onTheme, onBack, onSignOut, aura, onAura, drift, onDrift, pair, onPair }) {
  const [section, setSection] = React.useState("appearance");
  const [saved, setSaved] = React.useState(0);
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const [snapSound, setSnapSound] = React.useState(false);
  const [connected, setConnected] = React.useState(["apple", "google"]);
  const navRef = React.useRef(null);
  const [rail, setRail] = React.useState("movability");
  const [density, setDensity] = React.useState("standard");
  const [font, setFont] = React.useState("inter");
  const [auto, setAuto] = React.useState(true);
  const [protect, setProtect] = React.useState(true);
  const [apple, setApple] = React.useState(true);
  const [google, setGoogle] = React.useState(true);
  const [declined, setDeclined] = React.useState(false);
  const [parts, setParts] = React.useState(true);
  const [plan, setPlan] = React.useState(true);
  const [nudge, setNudge] = React.useState(false);
  const [review, setReview] = React.useState(true);

  /* Nothing is saved with a button. A change writes itself and says so once,
     then the mark leaves — the receipt is the animation, not a banner. */
  function mark(setter) { return (v) => { setter(v); setSaved(Date.now()); }; }
  React.useEffect(() => {
    if (!saved) return undefined;
    const id = window.setTimeout(() => setSaved(0), 1700);
    return () => window.clearTimeout(id);
  }, [saved]);

  function open(id) {
    if (id === section) return;
    setSection(id);
    setLoading(true);
    window.setTimeout(() => setLoading(false), 340);
  }
  /* Leaving with an edited field asks once. Switches write themselves, so this
     is only ever about text someone typed and did not commit. */
  function leave() { if (dirty) { setLeaving(true); return; } onBack(); }
  /* The nav is one tab stop with a roving selection: arrows move, Enter drops
     focus into the panel, Escape leaves the screen. */
  function navKeys(e) {
    const at = SECTIONS.findIndex((x) => x[0] === section);
    if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); open(SECTIONS[Math.min(at + 1, SECTIONS.length - 1)][0]); }
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); open(SECTIONS[Math.max(at - 1, 0)][0]); }
    if (e.key === "Home") { e.preventDefault(); open(SECTIONS[0][0]); }
    if (e.key === "End") { e.preventDefault(); open(SECTIONS[SECTIONS.length - 1][0]); }
    if (e.key === "Enter") { const f = document.querySelector("#settings-panel input, #settings-panel button"); if (f) f.focus(); }
    if (e.key === "Escape") { e.preventDefault(); leave(); }
  }
  const hits = SECTIONS.filter((x) => !query.trim() || (x[1] + " " + KEYWORDS[x[0]]).toLowerCase().indexOf(query.trim().toLowerCase()) > -1);
  const label = (SECTIONS.filter((s) => s[0] === section)[0] || SECTIONS[0])[1];

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", alignItems: "center", gap: 16, height: 52, flex: "none" }}>
        <Button variant="flat" iconLeft={<Icon name="arrow-left" size={16} />} onClick={leave}>Back</Button>
        <h1 style={{ margin: 0, font: "var(--type-page-title)", color: "var(--text-primary)" }}>Settings</h1>
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 11 }}>
          {saved ? (
            <span key={saved} className="saved-pop" style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 24, padding: "0 8px", borderRadius: "var(--radius-lg)", background: "var(--fill-accent)", color: "var(--accent)", font: "var(--type-meta-medium)" }}>
              <Icon name="check" size={13} />Saved
            </span>
          ) : null}
          <Input placeholder="Find a setting" iconLeft={<Icon name="search" size={14} />} value={query} onChange={(e) => setQuery(e.target.value ? e.target.value : e)} style={{ width: 210 }} />
        </span>
      </header>

      {leaving ? (
        <div className="saved-pop" style={{ display: "flex", alignItems: "center", gap: 11, flex: "none", height: 40, margin: "0 0 11px", padding: "0 11px", borderRadius: "var(--radius-xl)", background: "var(--fill-destructive)" }}>
          <Icon name="alert-circle" size={14} />
          <span style={{ font: "var(--type-ui)", color: "var(--text-primary)" }}>Your name and email are edited and not written yet.</span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
            <Button variant="flat" size="sm" onClick={() => { setDirty(false); setLeaving(false); onBack(); }}>Discard</Button>
            <Button variant="accent" size="sm" onClick={() => { setDirty(false); setLeaving(false); setSaved(Date.now()); }}>Keep editing</Button>
          </span>
        </div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, display: "flex", gap: 20, paddingBottom: 20 }}>
        <nav ref={navRef} tabIndex={0} onKeyDown={navKeys} aria-label="Settings sections"
          style={{ flex: "none", width: 176, display: "flex", flexDirection: "column", gap: 2, borderRadius: "var(--radius-lg)" }}>
          {hits.length === 0 ? (
            <p style={{ margin: "8px 6px", font: "var(--type-meta)", fontStyle: "italic", color: "var(--text-muted)", textWrap: "pretty" }}>
              Nothing matches “{query}”. Try a word from the setting itself, like “rail” or “buffer”.
            </p>
          ) : null}
          {hits.map(([id, name, icon]) => {
            const on = section === id;
            return (
              <button key={id} type="button" onClick={() => open(id)} aria-current={on ? "true" : undefined}
                style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 8px", border: 0, borderRadius: "var(--radius-md)", cursor: "default", textAlign: "left",
                  background: on ? "var(--fill-4)" : "transparent", color: on ? "var(--text-primary)" : "var(--text-tertiary)",
                  font: on ? "var(--type-ui-medium)" : "var(--type-ui)", transition: "background-color var(--transition-hover)" }}
                onMouseEnter={(e) => { if (!on) e.currentTarget.style.background = "var(--fill-3)"; }}
                onMouseLeave={(e) => { if (!on) e.currentTarget.style.background = "transparent"; }}>
                <Icon name={icon} size={16} />{name}
              </button>
            );
          })}
        </nav>

        <div style={{ flex: 1, minWidth: 0, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          <div id="settings-panel" key={section} className="settings-enter scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "0 4px 0 0" }}>
            <h2 style={{ margin: "0 0 16px", font: "var(--type-card-title)", color: "var(--text-primary)" }}>{label}</h2>
            {loading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                <SkeletonRows count={5} />
                <div style={{ display: "flex", gap: 11 }}>
                  {[0, 1, 2].map((i) => <Skeleton key={i} style={{ width: 112, height: 72, borderRadius: "var(--radius-lg)" }} />)}
                </div>
                <SkeletonRows count={3} />
              </div>
            ) : null}

            {!loading && section === "appearance" ? (
              <>
                <FormGroup title="Theme">
                  <div style={{ display: "flex", gap: 11, flexWrap: "wrap" }}>
                    {THEMES.map(([id, l]) =>
                      <ThemeThumb key={id} id={id} label={l} active={theme === id} onPick={mark(onTheme)} pair={pair} />)}
                  </div>
                  {/* System is a pair, so the person says which of the five
                      each side of the switch uses. */}
                  {theme === "system" ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, paddingTop: 11 }}>
                      <FormRow label="When light" hint="Which theme the OS's light mode uses.">
                        <Select value={pair.light} onChange={(v) => onPair("light", v)} style={{ maxWidth: 180 }}
                          options={[{ value: "paper", label: "Paper" }, { value: "warm", label: "Warm" }]} />
                      </FormRow>
                      <FormRow label="When dark" hint="And its dark mode.">
                        <Select value={pair.dark} onChange={(v) => onPair("dark", v)} style={{ maxWidth: 180 }}
                          options={[{ value: "dim", label: "Dim" }, { value: "dark", label: "Dark" }]} />
                      </FormRow>
                    </div>
                  ) : null}
                </FormGroup>

                <FormGroup title="Follow the day" style={{ marginTop: 21 }}>
                  <FormRow label="Follow the day" hint="The paper warms toward sunset and the dark side takes over after dusk. The accent never moves — a coloured rail means the same thing at 11:00 and at 21:00.">
                    <Switch checked={drift} onChange={mark(onDrift)} />
                  </FormRow>
                  {drift ? <DriftPreview theme={theme} pair={pair} /> : null}
                </FormGroup>
                <FormGroup title="Rail language" style={{ marginTop: 21 }}>
                  <div style={{ display: "flex", gap: 11 }}>
                    <RailThumb id="movability" active={rail === "movability"} onPick={mark(setRail)}
                      title="Movability" note="Grey is fixed. Coloured means the scheduler placed it and can move it again."
                      colors={[["var(--text-muted)", "Fixed"], ["var(--info)", "Placed by the scheduler"], ["var(--destructive)", "Overdue"]]} />
                    <RailThumb id="urgency" active={rail === "urgency"} onPick={mark(setRail)}
                      title="Urgency" note="Red is overdue, blue is due today, grey is later. Movability moves to the block's weight."
                      colors={[["var(--destructive)", "Overdue"], ["var(--info)", "Due today"], ["var(--text-muted)", "Later"]]} />
                  </div>
                </FormGroup>
                <FormGroup title="Density" style={{ marginTop: 21 }}>
                  <div style={{ display: "flex", gap: 11 }}>
                    <DensityThumb id="compact" active={density === "compact"} onPick={mark(setDensity)} label="Compact" rows={[54, 66, 44, 62, 50, 58]} />
                    <DensityThumb id="standard" active={density === "standard"} onPick={mark(setDensity)} label="Standard" rows={[54, 66, 44, 62]} />
                  </div>
                </FormGroup>
                <FormGroup title="Type" style={{ marginTop: 21 }}>
                  <FormRow label="Interface font">
                    <Select value={font} onChange={mark(setFont)} options={[{ value: "inter", label: "Inter" }, { value: "system", label: "System" }]} style={CTRL} />
                  </FormRow>
                  <FormRow label="Document width"><Input suffix="px" defaultValue="844" style={{ width: 120 }} /></FormRow>
                </FormGroup>
              </>
            ) : null}

            {!loading && section === "day" ? (
              <>
                <FormGroup title="Working hours">
                  <FormRow label="Day starts"><Input type="time" defaultValue="09:00" style={{ width: 120 }} /></FormRow>
                  <FormRow label="Day ends"><Input type="time" defaultValue="18:00" style={{ width: 120 }} /></FormRow>
                  <FormRow label="Week starts"><Select value="mon" options={[{ value: "mon", label: "Monday" }, { value: "sun", label: "Sunday" }]} style={CTRL} /></FormRow>
                  <FormRow label="Time zone"><Select value="cet" options={[{ value: "cet", label: "CET — Berlin" }, { value: "utc", label: "UTC" }, { value: "est", label: "EST — New York" }]} style={CTRL} /></FormRow>
                </FormGroup>
                <FormGroup title="Scheduler" style={{ marginTop: 21 }}>
                  <FormRow label="Auto-schedule" hint="Unplaced tasks are placed into real free hours."><Switch checked={auto} onChange={mark(setAuto)} /></FormRow>
                  <FormRow label="Protect focus" hint="The scheduler will not place anything inside a focus block."><Switch checked={protect} onChange={mark(setProtect)} /></FormRow>
                  <FormRow label="Min chunk"><Input suffix="min" defaultValue="30" style={{ width: 120 }} /></FormRow>
                  <FormRow label="Buffer"><Input suffix="min" defaultValue="10" style={{ width: 120 }} /></FormRow>
                  <FormRow label="Fill weekends"><Switch checked={false} onChange={() => setSaved(Date.now())} /></FormRow>
                </FormGroup>
              </>
            ) : null}

            {!loading && section === "calendars" ? (
              <>
                <FormGroup title="Connected">
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {connected.length === 0 ? (
                      <EmptyState icon={<Icon name="calendar-off" size={24} />}
                        text="No calendar is connected. Events you already agreed to will not appear on the grid until one is."
                        action={<Button size="sm" variant="flat" iconLeft={<Icon name="plus" size={13} />} onClick={() => { setConnected(["apple", "google"]); setSaved(Date.now()); }}>Connect a calendar</Button>} />
                    ) : null}
                    {connected.indexOf("apple") > -1 ? <AccountRow name="Apple Calendar" mail="maksym@icloud.com" tone="apple" colour="var(--success)" sync={apple} onSync={mark(setApple)}
                      onDisconnect={() => { setConnected(connected.filter((c) => c !== "apple")); setSaved(Date.now()); }} /> : null}
                    {connected.indexOf("google") > -1 ? <AccountRow name="Google Calendar" mail="maksym@needt.app" tone="google" colour="var(--info)" sync={google} onSync={mark(setGoogle)}
                      onDisconnect={() => { setConnected(connected.filter((c) => c !== "google")); setSaved(Date.now()); }} /> : null}
                    {connected.length ? <Button variant="flat" iconLeft={<Icon name="plus" size={16} />} style={{ alignSelf: "flex-start" }}>Connect a calendar</Button> : null}
                  </div>
                </FormGroup>
                <FormGroup title="What lands on the grid" style={{ marginTop: 21 }}>
                  <FormRow label="Declined"><Switch checked={declined} onChange={mark(setDeclined)} /></FormRow>
                  <FormRow label="All-day"><Switch checked onChange={() => setSaved(Date.now())} /></FormRow>
                  <FormRow label="Write back" hint="Closing an imported task closes it in its source."><Switch checked onChange={() => setSaved(Date.now())} /></FormRow>
                  <FormRow label="Default view"><Select value="week" options={[{ value: "week", label: "Week" }, { value: "month", label: "Month" }]} style={CTRL} /></FormRow>
                </FormGroup>
              </>
            ) : null}

            {!loading && section === "tasks" ? (
              <>
                <FormGroup title="New tasks">
                  <FormRow label="Estimate"><Input suffix="min" defaultValue="45" style={{ width: 120 }} /></FormRow>
                  <FormRow label="Project"><Select value="none" options={[{ value: "none", label: "No project" }, { value: "ops", label: "Operations" }, { value: "ds", label: "Design system" }]} style={CTRL} /></FormRow>
                  <FormRow label="Show parts" hint="Parts stay visible as nested rows instead of a disclosure."><Switch checked={parts} onChange={mark(setParts)} /></FormRow>
                  <FormRow label="Money groups" hint="A group of tasks states what it is worth when all of them close."><Switch checked onChange={() => setSaved(Date.now())} /></FormRow>
                </FormGroup>
                <FormGroup title="Impulse" style={{ marginTop: 21 }}>
                  <FormRow label="Flame">
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span className="flame" aria-hidden="true" style={{ height: 16 }}><i /><i /><i /></span>
                      <span style={{ font: "var(--type-ui)", color: "var(--text-tertiary)", textWrap: "pretty" }}>Height is parts and tasks closed lately. A cold category has no flame, so there is nothing to switch off.</span>
                    </span>
                  </FormRow>
                </FormGroup>
              </>
            ) : null}

            {!loading && section === "focus" ? (
              <>
                <FormGroup title="Session">
                  <FormRow label="Length"><Input suffix="min" defaultValue="50" style={{ width: 120 }} /></FormRow>
                  <FormRow label="Break"><Input suffix="min" defaultValue="10" style={{ width: 120 }} /></FormRow>
                  <FormRow label="Start sound"><Select value="none" options={[{ value: "none", label: "Silent" }, { value: "tick", label: "Tick" }, { value: "chime", label: "Chime" }]} style={CTRL} /></FormRow>
                </FormGroup>
                <FormGroup title="While a session runs" style={{ marginTop: 21 }}>
                  <FormRow label="Corner glow" hint="The screen edges breathe in the accent for the length of the session.">
                    <Switch checked={aura} onChange={mark(onAura)} />
                  </FormRow>
                  <FormRow label="Hide alerts"><Switch checked onChange={() => setSaved(Date.now())} /></FormRow>
                  <FormRow label="Snap click" hint="A short click when a dragged task snaps to the quarter hour. Silent in this kit.">
                    <Switch checked={snapSound} onChange={mark(setSnapSound)} />
                  </FormRow>
                  <FormRow label="Stop the mark" hint="The wordmark holds still until the session ends."><Switch checked onChange={() => setSaved(Date.now())} /></FormRow>
                </FormGroup>
              </>
            ) : null}

            {!loading && section === "alerts" ? (
              <FormGroup title="When Needt speaks">
                <FormRow label="Daily plan"><span style={{ display: "flex", alignItems: "center", gap: 8 }}><Switch checked={plan} onChange={mark(setPlan)} /><Input type="time" defaultValue="08:30" style={{ width: 108 }} /></span></FormRow>
                <FormRow label="Overdue"><Switch checked={nudge} onChange={mark(setNudge)} /></FormRow>
                <FormRow label="Week review" hint="Friday, once the last block closes."><Switch checked={review} onChange={mark(setReview)} /></FormRow>
                <FormRow label="Channel"><RadioGroup horizontal name="channel" value="desktop" items={[{ value: "desktop", label: "Desktop" }, { value: "mail", label: "Email" }, { value: "off", label: "None" }]} /></FormRow>
              </FormGroup>
            ) : null}

            {!loading && section === "keys" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {(window.NEEDT_KEYS || []).map(([group, rows]) => (
                  <div key={group} style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)", height: 24, display: "flex", alignItems: "center" }}>{group}</span>
                    {rows.map((r, i) => (
                      <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 16, height: 34, boxShadow: i ? "var(--border) 0 -1px 0 0 inset" : "none" }}>
                        <span style={{ flex: "none", width: 96, display: "flex", gap: 3 }}>
                          {r.keys.map((k, j) => (
                            <span key={j} style={{ display: "grid", placeItems: "center", minWidth: 20, height: 20, padding: "0 5px", borderRadius: "var(--radius-xs)",
                              background: "var(--fill-3)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-secondary)" }}>{k}</span>
                          ))}
                        </span>
                        <span style={{ font: "var(--type-ui)", color: "var(--text-tertiary)" }}>{r.label}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : null}

            {!loading && section === "account" ? (
              <>
                <FormGroup title="You">
                  <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 16 }}>
                    <Avatar initials="MK" size={44} />
                    <span style={{ display: "flex", flexDirection: "column" }}>
                      <span style={{ font: "var(--type-card-title)", color: "var(--text-primary)" }}>Maksym K.</span>
                      <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>maksym@needt.app</span>
                    </span>
                    <Chip tone="accent" style={{ marginLeft: 8 }}>Pro</Chip>
                    <Button variant="flat" size="sm" style={{ marginLeft: "auto" }}>Replace photo</Button>
                  </div>
                  <FormRow label="Name"><Input defaultValue="Maksym K." onChange={() => setDirty(true)} style={{ maxWidth: 260 }} /></FormRow>
                  <FormRow label="Email"><Input defaultValue="maksym@needt.app" onChange={() => setDirty(true)} style={{ maxWidth: 260 }} /></FormRow>
                  <FormRow label="Password"><Button variant="flat" size="sm">Change password</Button></FormRow>
                </FormGroup>
                <FormGroup title="Session" style={{ marginTop: 21 }}>
                  <FormRow label="Signed in"><span style={{ font: "var(--type-ui)", color: "var(--text-tertiary)" }}>This Mac · since 12 August</span></FormRow>
                  <FormRow label="Sign out"><Button variant="flat" size="sm" iconLeft={<Icon name="log-out" size={14} />} onClick={onSignOut}>Sign out</Button></FormRow>
                </FormGroup>
              </>
            ) : null}

            {!loading && section === "data" ? (
              <>
                <FormGroup title="Export">
                  <FormRow label="Tasks"><Button variant="flat" size="sm" iconLeft={<Icon name="download" size={14} />}>Download CSV</Button></FormRow>
                  <FormRow label="Documents"><Button variant="flat" size="sm" iconLeft={<Icon name="download" size={14} />}>Download Markdown</Button></FormRow>
                  <FormRow label="Everything"><Button variant="flat" size="sm" iconLeft={<Icon name="download" size={14} />}>Download JSON</Button></FormRow>
                </FormGroup>
                <FormGroup title="Danger" style={{ marginTop: 21 }}>
                  <FormRow label="Clear tasks" hint="Documents and calendars stay."><Button variant="flat" size="sm">Clear</Button></FormRow>
                  <FormRow label="Delete account" hint="Everything goes at once. There is no undo.">
                    <Button variant="destructive" size="sm" iconLeft={<Icon name="trash-2" size={14} />}>Delete</Button>
                  </FormRow>
                </FormGroup>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen, ThemeThumb, THEMES });
