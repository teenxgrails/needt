/* The seed lives in Data.js, so both shells read one list. */
const TASKS = window.NEEDT.tasks;

/* The product's four places, at the top of the window rather than down the
   left edge. Active is a fill plus the accent as the text — the same pair the
   segmented control and the selected date cell use. */
const TABS = [
["today", "Home", "house"],
["workspace", "Workspace", "folder-kanban"],
["calendar", "Calendar", "calendar-days"],
["docs", "Documents", "file-text"]];

/* One place to make anything, at the head of the row that says where you are.
   The kinds are the product's nouns: a task, an event, a document. */
function NewMenu({ onTask, onDoc }) {
  const { Button, Icon, DropdownMenu, MenuItem, MenuLabel, MenuSeparator } = window.NeedtDesignSystem_25d3c8;
  return (
    <DropdownMenu align="left" trigger={
    <Button iconLeft={<Icon name="plus" size={16} />}>New</Button>
    }>
      <MenuLabel>Create:</MenuLabel>
      <MenuItem icon={<Icon name="circle" size={14} />} shortcut="N" onClick={onTask}>Task</MenuItem>
      <MenuItem icon={<Icon name="calendar" size={14} />} shortcut="E" onClick={onTask}>Event</MenuItem>
      <MenuItem icon={<Icon name="file-text" size={14} />} shortcut="D" onClick={onDoc}>Document</MenuItem>
      <MenuSeparator />
      <MenuItem icon={<Icon name="folder-kanban" size={14} />}>Project</MenuItem>
      <MenuItem icon={<Icon name="target" size={14} />} shortcut="⌘⇧F">Focus session</MenuItem>
    </DropdownMenu>);

}

function TabBar({ screen, onScreen, right, onTask, onDoc }) {
  const { Icon } = window.NeedtDesignSystem_25d3c8;
  return (
    <nav className="tab-bar" style={{ flex: "none", display: "flex", alignItems: "center", gap: 2, height: 52, minWidth: 0 }}>
      <span style={{ display: "flex", alignItems: "center", paddingRight: 11, marginRight: 5, boxShadow: "var(--border) -1px 0 0 0 inset" }}>
        <NewMenu onTask={onTask} onDoc={onDoc} />
      </span>
      {TABS.map(([id, label, icon]) => {
        const on = screen === id || screen === "doc" && id === "docs";
        return (
          <button key={id} type="button" onClick={() => onScreen(id)}
          style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 11px", border: 0, cursor: "default",
            borderRadius: "var(--radius-lg)", background: on ? "var(--fill-accent)" : "transparent",
            color: on ? "var(--accent)" : "var(--text-secondary)",
            font: on ? "var(--type-ui-medium)" : "var(--type-ui)",
            transition: "background-color var(--transition-hover), color var(--transition-hover)" }}
          onMouseEnter={(e) => {if (!on) e.currentTarget.style.background = "var(--fill-3)";}}
          onMouseLeave={(e) => {if (!on) e.currentTarget.style.background = "transparent";}}>
            <Icon name={icon} size={16} />
            <span className={on ? undefined : "tab-label"}>{label}</span>
          </button>);

      })}
      {right ? <span style={{ marginLeft: "auto", flex: "none", display: "flex", alignItems: "center", gap: 8 }}>{right}</span> : null}
    </nav>);

}

function PlanSettings({ form, onForm, brief, onBrief }) {
  const { Menu, MenuLabel, MenuSeparator, Switch, FormRow, Select } = window.NeedtDesignSystem_25d3c8;
  const [respect, setRespect] = React.useState(true);
  const [buffer, setBuffer] = React.useState(true);
  const [order, setOrder] = React.useState("deadline");
  const MiniProse = window.MiniProse;
  const MiniCanvas = window.MiniCanvas;
  return (
    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: "var(--z-dropdown)", width: 296 }}>
      <Menu width={296}>
        <MenuLabel>Form</MenuLabel>
        <div style={{ display: "flex", gap: 8, padding: "2px 8px 8px" }}>
          {[["today", "Today", window.MiniToday], ["prose", "Prose", MiniProse], ["canvas", "Canvas", MiniCanvas]].map(([k, label, Mini]) =>
          <button key={k} type="button" onClick={() => onForm(k)}
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5, padding: 0, border: 0, background: "transparent", cursor: "default" }}>
              {Mini ? <Mini on={form === k} /> : null}
              <span style={{ font: "var(--type-meta-medium)", color: form === k ? "var(--accent)" : "var(--text-secondary)", textAlign: "left" }}>{label}</span>
            </button>
          )}
        </div>
        <MenuSeparator />
        <div style={{ padding: "4px 8px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
          <FormRow label="Timeline" hint="The week as it happened.">
            <Switch checked={brief.timeline} onChange={(v) => onBrief("timeline", v)} />
          </FormRow>
          <FormRow label="Author marks" hint="Who wrote each entry.">
            <Switch checked={brief.marks} onChange={(v) => onBrief("marks", v)} />
          </FormRow>
        </div>
        <MenuSeparator />
        <MenuLabel>How Needt plans</MenuLabel>
        <div style={{ padding: "4px 8px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
          <FormRow label="Order by">
            <Select value={order} onChange={setOrder} options={[
            { value: "deadline", label: "Deadline first" },
            { value: "size", label: "Biggest first" },
            { value: "entry", label: "Easiest entry first" }]} />
          </FormRow>
          <FormRow label="Fixed hours" hint="Never move what you placed by hand.">
            <Switch checked={respect} onChange={setRespect} />
          </FormRow>
          <FormRow label="Buffers" hint="Ten minutes between blocks.">
            <Switch checked={buffer} onChange={setBuffer} />
          </FormRow>
        </div>
        <MenuSeparator />
        <div style={{ padding: "2px 10px 8px" }}>
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>
            Needt fills your free hours and leaves fixed blocks where they are.
          </span>
        </div>
      </Menu>
    </div>);

}

function TodayControls({ canPlan, form, onForm, brief, onBrief }) {
  const { Button, IconButton, Icon, Tooltip } = window.NeedtDesignSystem_25d3c8;
  const [open, setOpen] = React.useState(false);
  const wrap = React.useRef(null);
  React.useEffect(() => {
    if (!open) return undefined;
    function away(e) {if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);}
    function esc(e) {if (e.key === "Escape") setOpen(false);}
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {document.removeEventListener("mousedown", away);document.removeEventListener("keydown", esc);};
  }, [open]);
  return (
    <span ref={wrap} style={{ position: "relative", display: "flex", alignItems: "center", gap: 2 }}>
      <Tooltip label="Today settings" side="bottom">
        <IconButton label="Today settings" variant="ghost" onClick={() => setOpen(!open)}>
          <Icon name="settings" size={16} />
        </IconButton>
      </Tooltip>
      <Button data-agent-plan iconLeft={<Icon name="wand-sparkles" size={16} />} disabled={!canPlan}>Plan my day</Button>
      {open ? <PlanSettings form={form} onForm={onForm} brief={brief} onBrief={onBrief} /> : null}
    </span>);

}

/* Three miniatures of the thing itself: columns of cards, a day ruled by
   hours, a month of cells. Naming them costs a word each and shows nothing. */
function ViewMini({ kind, on }) {
  const ink = on ? "var(--accent)" : "var(--text-disabled)";
  const soft = on ? "color-mix(in oklab, var(--accent) 40%, transparent)" : "var(--fill-4)";
  return (
    <span aria-hidden="true" style={{ display: "block", position: "relative", width: "100%", height: 46, padding: 6, borderRadius: "var(--radius-md)",
      background: "var(--background)", boxShadow: on ? "rgba(var(--accent-rgb), 0.55) 0 0 0 1.5px inset" : "var(--shadow-inset-ring)" }}>
      {kind === "columns" ?
      <span style={{ display: "flex", gap: 4, height: "100%" }}>
          {[0, 1, 2].map((i) =>
        <span key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ height: 3, width: "70%", borderRadius: 2, background: i === 0 ? ink : soft }} />
              <span style={{ height: 9, borderRadius: 2, background: soft }} />
              {i !== 2 ? <span style={{ height: 9, borderRadius: 2, background: soft }} /> : null}
            </span>
        )}
        </span> :
      kind === "week" ?
      <span style={{ display: "flex", gap: 4, height: "100%" }}>
          <span style={{ flex: "none", width: 7, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ height: 2, borderRadius: 1, background: ink }} />)}
          </span>
          {[0, 1, 2, 3].map((i) =>
        <span key={i} style={{ flex: 1, position: "relative" }}>
              <span style={{ position: "absolute", left: 0, right: 0, top: i % 2 ? 3 : 12, height: i % 2 ? 12 : 8, borderRadius: 2, background: soft }} />
            </span>
        )}
        </span> :

      <span style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: 2, height: "100%" }}>
          {Array.from({ length: 15 }).map((_, i) =>
        <span key={i} style={{ borderRadius: 1.5, background: i === 6 ? ink : soft, opacity: i % 3 ? 0.7 : 1 }} />
        )}
        </span>
      }
    </span>);

}

function CalendarOptions({ view, onView, opts, onOpt, onSettings }) {
  const { Menu, MenuLabel, MenuItem, MenuSeparator, FormRow, Switch, Select } = window.NeedtDesignSystem_25d3c8;
  return (
    <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: "var(--z-dropdown)", width: 296 }}>
      <Menu width={296}>
        <MenuLabel>View</MenuLabel>
        <div style={{ display: "flex", gap: 6, padding: "2px 8px 8px" }}>
          {[["columns", "Columns"], ["week", "Week"], ["month", "Month"]].map(([k, label]) =>
          <button key={k} type="button" onClick={() => onView(k)}
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, padding: 0, border: 0, background: "transparent", cursor: "default" }}>
              <ViewMini kind={k} on={view === k} />
              <span style={{ font: "var(--type-meta-medium)", color: view === k ? "var(--accent)" : "var(--text-secondary)", textAlign: "left" }}>{label}</span>
            </button>
          )}
        </div>
        <MenuSeparator />
        <MenuLabel>Calendar</MenuLabel>
        <div style={{ padding: "4px 8px 6px", display: "flex", flexDirection: "column", gap: 2 }}>
          <FormRow label="Week starts on">
            <Select value={opts.weekStart} onChange={(v) => onOpt("weekStart", v)}
            options={[{ value: "mon", label: "Monday" }, { value: "sun", label: "Sunday" }]} />
          </FormRow>
          <FormRow label="24-hour time">
            <Switch checked={opts.h24} onChange={(v) => onOpt("h24", v)} />
          </FormRow>
          <FormRow label="Shade off hours" hint="Hatches the hours outside your working day.">
            <Switch checked={opts.shade} onChange={(v) => onOpt("shade", v)} />
          </FormRow>
        </div>
        <MenuSeparator />
        <MenuItem icon={<Icon name="wand-sparkles" size={14} />} onClick={onSettings}>Auto-scheduling</MenuItem>
        <MenuItem icon={<Icon name="settings" size={14} />} onClick={onSettings}>All calendar settings</MenuItem>
      </Menu>
    </div>);

}

function CalendarControls({ view, onView, opts, onOpt, onSettings }) {
  const { Button, IconButton, Icon, ToggleGroup, Tooltip } = window.NeedtDesignSystem_25d3c8;
  const [open, setOpen] = React.useState(false);
  const wrap = React.useRef(null);
  React.useEffect(() => {
    if (!open) return undefined;
    function away(e) {if (wrap.current && !wrap.current.contains(e.target)) setOpen(false);}
    function esc(e) {if (e.key === "Escape") setOpen(false);}
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => {document.removeEventListener("mousedown", away);document.removeEventListener("keydown", esc);};
  }, [open]);
  return (
    <>
      <span style={{ display: "flex", gap: 2 }}>
        <IconButton label="A week back"><Icon name="chevron-left" size={16} /></IconButton>
        <IconButton label="A week on"><Icon name="chevron-right" size={16} /></IconButton>
      </span>
      <Button>Today</Button>
      <Tooltip label="Plan my day" side="bottom">
        <IconButton label="Plan my day" variant="ghost"><Icon name="wand-sparkles" size={16} /></IconButton>
      </Tooltip>
      <span ref={wrap} style={{ position: "relative", display: "flex" }}>
        <Tooltip label="Calendar options" side="bottom">
          <IconButton label="Calendar options" variant="ghost" onClick={() => setOpen(!open)}>
            <Icon name="settings" size={16} />
          </IconButton>
        </Tooltip>
        {open ? <CalendarOptions view={view} onView={onView} opts={opts} onOpt={onOpt} onSettings={() => {setOpen(false);onSettings();}} /> : null}
      </span>
    </>);

}

function App() {
  const [screen, setScreen] = React.useState("today");
  /* System is the default: a planner that is open all day should agree with
     the machine it is open on until told otherwise. */
  const [theme, setTheme] = React.useState("system");
  const [drift, setDrift] = React.useState(true);
  const [pair, setPair] = React.useState({ light: "paper", dark: "dark" });
  const day = useDrift(theme, drift, pair);
  const [tasks, setTasks] = React.useState(TASKS);
  const [taskOpen, setTaskOpen] = React.useState(false);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [calOpts, setCalOpts] = React.useState({ weekStart: "mon", h24: true, shade: true });
  const [briefForm, setBriefForm] = React.useState("today");
  const [brief, setBrief] = React.useState({ timeline: true, marks: true });
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(1);
  const [calView, setCalView] = React.useState("columns");
  const [focus, setFocus] = React.useState(null);
  const [dropReq, setDropReq] = React.useState(null);
  /* Before the product there are two screens: the account, then the setup.
     stage is which of the three the window is showing. */
  const [stage, setStage] = React.useState("app");
  const [authMode, setAuthMode] = React.useState("signup");
  const [aura, setAura] = React.useState(true);
  /* Route change is an event with a duration: the veil comes up, the mark
     travels, the new screen is mounted behind it, the veil leaves. A screen
     that takes time to build is covered rather than caught half-drawn. */
  const [routing, setRouting] = React.useState(null);
  /* The veil is for loading, not for navigation. A screen the window has never
     built yet gets covered while it builds; a screen already warm switches
     instantly, because covering a swap that takes no time only adds delay. */
  const built = React.useRef({ today: true });
  function goScreen(next) {
    if (next === screen) return;
    if (built.current[next]) {setScreen(next);return;}
    built.current[next] = true;
    setRouting(next);
    window.setTimeout(() => setScreen(next), 240);
    window.setTimeout(() => setRouting(null), 560);
  }

  /* One drag layer for the whole product: the sidebar hands over a task, the
     calendar hands over a block, and the drop target decides what it meant. */
  const [drag, dragProps, returning] = useDrag(function (item, over, mode) {
    if (!over) return;
    if (over.kind === "day") {
      setTasks((list) => list.map((t) => t.id === item.id ? Object.assign({}, t, { time: over.date + " Sep", due: over.date + " Sep" }) : t));
      setSelectedDate(parseInt(over.date, 10));
      return;
    }
    if (over.kind === "focus") {
      setFocus({ intention: item.title, planned: item.est || 50, elapsed: 0, taskId: item.id });
      return;
    }
    /* A task dropped on another row takes that row's place — the list keeps
       one order and the drop edits it, rather than a second sort. */
    if (over.kind === "row") {
      setTasks((list) => {
        const from = list.findIndex((t) => String(t.id) === String(item.id));
        const to = list.findIndex((t) => String(t.id) === String(over.id));
        if (from < 0 || to < 0 || from === to) return list;
        const next = list.slice();
        next.splice(to, 0, next.splice(from, 1)[0]);
        return next;
      });
      return;
    }
    if (over.kind === "timeline") setDropReq({ item: item, time: over.time, date: over.date, mode: mode, seq: Date.now() });
  });

  /* A session ticks a minute every second and a half, so the ring and the
     stopped wordmark are visible without waiting out a real fifty minutes. */
  React.useEffect(() => {
    if (!focus) return undefined;
    const id = window.setInterval(() => {
      setFocus((f) => f && f.elapsed < f.planned * 60 ? Object.assign({}, f, { elapsed: f.elapsed + 1 }) : f);
    }, 200);
    return () => window.clearInterval(id);
  }, [!!focus]);

  React.useEffect(() => {
    window.__app = { setScreen: goScreen, setScreenNow: setScreen, setTheme, setDrift, setPair, setTaskOpen, setSettingsOpen, setPaletteOpen, setFocus, setCalView, setStage, setAura, day };
  });

  React.useEffect(() => {
    function key(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {e.preventDefault();setPaletteOpen(true);}
      if (e.key === "Escape") {setPaletteOpen(false);}
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, []);

  function toggle(id) {
    setTasks((list) => list.map((t) => t.id === id ? Object.assign({}, t, { done: !t.done }) : t));
  }
  /* A part is a piece of one task, not a task: it toggles inside its parent
     and never takes a place in the day. When a part outgrows that, it is
     promoted — the one way a second level enters the model. */
  function togglePart(id, i) {
    setTasks((list) => list.map((t) => t.id === id && t.parts ?
    Object.assign({}, t, { parts: t.parts.map((p, j) => j === i ? Object.assign({}, p, { done: !p.done }) : p) }) :
    t));
  }
  function promotePart(id, i) {
    setTasks((list) => {
      const parent = list.find((t) => t.id === id);
      if (!parent || !parent.parts || !parent.parts[i]) return list;
      const part = parent.parts[i];
      const next = list.map((t) => t.id === id ? Object.assign({}, t, { parts: t.parts.filter((_, j) => j !== i) }) : t);
      const at = next.findIndex((t) => t.id === id);
      next.splice(at + 1, 0, { id: Date.now(), title: part.title, project: parent.project, tone: parent.tone,
        status: part.done ? "done" : "todo", est: 20, done: part.done, noSlot: parent.noSlot });
      return next;
    });
  }
  function capture(title) {
    setTasks((list) => list.concat([{ id: Date.now(), title: title, project: null, status: "todo", est: 45, done: false }]));
  }

  const body = screen === "settings" ?
  <SettingsScreen theme={theme} onTheme={setTheme} onBack={() => goScreen("today")} aura={aura} onAura={setAura}
  drift={drift} onDrift={setDrift} pair={pair}
  onPair={(k, v) => setPair((p) => Object.assign({}, p, { [k]: v }))}
  onSignOut={() => {setStage("auth");setAuthMode("login");setScreen("today");}} /> :
  screen === "today" ?
  <TodayScreen tasks={tasks} onOpen={() => setTaskOpen(true)} onToggle={toggle} form={briefForm} onForm={setBriefForm} brief={brief} dragProps={dragProps} drag={drag} /> :
  screen === "workspace" ? <WorkspaceScreen tasks={tasks} onToggle={toggle} onOpen={() => setTaskOpen(true)} drag={drag} dragProps={dragProps} onTogglePart={togglePart} onPromotePart={promotePart} /> :
  screen === "calendar" ? <CalendarScreen tasks={tasks} onOpen={() => setTaskOpen(true)} hourHeight={46} drag={drag} dragProps={dragProps} dropRequest={dropReq} view={calView} opts={calOpts} /> :
  screen === "doc" ? <DocumentScreen onBack={() => setScreen("docs")} /> :
  <DocsScreen onOpenDoc={() => setScreen("doc")} />;

  return (
    <div className={"app theme-surface theme-drifts " + day.themeClass + (drift ? " drift" : "")}
    data-drift-quiet={day.quiet}
    style={Object.assign({ display: "flex", height: "100%" }, day.vars)}>
      {/* Settings takes the whole window: it is a place you go to, not a screen
           you work beside, and the rail would only offer ways to leave it. */}
      {screen === "settings" ? null : <Sidebar onTask={() => setTaskOpen(true)} screen={screen} onScreen={goScreen} theme={theme} onTheme={setTheme}
      tasks={tasks} onCapture={capture} onOpenPalette={() => setPaletteOpen(true)} onSettings={() => goScreen("settings")}
      dragProps={dragProps} drag={drag} selectedDate={selectedDate} onSelectDate={setSelectedDate}
      focus={focus} onStartFocus={(f) => setFocus(Object.assign({ elapsed: 0 }, f))} onStopFocus={() => setFocus(null)} />}
      {focus && aura ? <div className="focus-aura" aria-hidden="true" /> : null}
      {/* The app's own hand, over everything and clickable through. */}
      {window.AgentCursor ? <window.AgentCursor /> : null}
      <main style={{ flex: 1, minWidth: 0, position: "relative", display: "flex", flexDirection: "column", padding: "0 20px 20px", backgroundColor: "var(--background)", backgroundImage: "var(--canvas-veil)", boxShadow: screen === "settings" ? "none" : "var(--border) 1px 0 0 0 inset", overflow: "hidden" }}>
        {screen === "settings" ? null : <TabBar screen={screen} onScreen={goScreen} onTask={() => setTaskOpen(true)} onDoc={() => goScreen("doc")}
        right={screen === "calendar" ? <CalendarControls view={calView} onView={setCalView} opts={calOpts}
        onOpt={(k, v) => setCalOpts((s) => Object.assign({}, s, { [k]: v }))}
        onSettings={() => goScreen("settings")} /> :
        screen === "today" ? <TodayControls canPlan={tasks.some((t) => !t.done && !t.time)}
        form={briefForm} onForm={setBriefForm} brief={brief}
        onBrief={(k, v) => setBrief((s) => Object.assign({}, s, { [k]: v }))} /> :
        null} />}
        <div key={screen} className="screen-enter" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
          {body}
        </div>
        <TaskDialog open={taskOpen} onClose={() => setTaskOpen(false)} />
        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} theme={theme} onTheme={setTheme} />
        <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} onScreen={setScreen} tasks={tasks} />
        {stage === "app" ? <Chat /> : null}
      </main>
      <DragGhost drag={drag} returning={returning} />
      <RouteVeil to={routing} />
      {stage === "auth" ? <AuthScreen mode={authMode} onMode={setAuthMode}
      onDone={() => setStage(authMode === "login" ? "app" : "onboarding")} /> : null}
      {stage === "onboarding" ? <OnboardingScreen theme={theme} onTheme={setTheme} pair={pair}
      drift={drift} onDrift={setDrift} onDone={() => setStage("app")} /> : null}
    </div>);

}

/* THE VEIL — one moving mark over a settling ground. The wordmark rises as the
   veil arrives and the accent hairline under it sweeps once, left to right, for
   exactly as long as the swap takes. It is the same duration every time, so a
   heavy screen and a light one feel the same. */
function RouteVeil({ to }) {
  /* The veil owns its own exit: it holds the last route for the length of the
     fade so it can leave the way it arrived, instead of vanishing the instant
     the screen is ready. */
  const [held, setHeld] = React.useState(null);
  const [shown, setShown] = React.useState(false);
  React.useEffect(() => {
    if (to) {
      setHeld(to);
      let inner = 0;
      const id = window.requestAnimationFrame(() => {inner = window.requestAnimationFrame(() => setShown(true));});
      return () => {window.cancelAnimationFrame(id);window.cancelAnimationFrame(inner);};
    }
    setShown(false);
    const id = window.setTimeout(() => setHeld(null), 280);
    return () => window.clearTimeout(id);
  }, [to]);
  if (!held) return null;
  return (
    <div aria-hidden="true" style={{ position: "absolute", inset: 0, zIndex: 800, display: "grid", placeItems: "center",
      background: "var(--background)", opacity: shown ? 1 : 0, transition: "opacity 0.3s cubic-bezier(0.37, 0, 0.63, 1)", pointerEvents: "none" }}>
      {/* Nothing but the mark, breathing the way it does in the rail. It rises
           with the ground rather than landing on top of it. */}
      <span style={{ display: "block", opacity: shown ? 1 : 0, transform: shown ? "none" : "translateY(6px) scale(0.97)",
        transition: "opacity 0.3s cubic-bezier(0.37, 0, 0.63, 1) 0.04s, transform 0.34s cubic-bezier(0.2, 0.7, 0.2, 1) 0.04s" }}>
        <ExposureWordmark size={54} mode="breathe" />
      </span>
    </div>);

}

/* The design-system compiler bundles this file and evaluates it once at
   bundle-load time, when #root does not exist yet. Mount only when it does. */
const __root = document.getElementById("root");
if (__root) ReactDOM.createRoot(__root).render(<App />);