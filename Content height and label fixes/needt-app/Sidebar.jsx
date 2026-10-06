const NS = window.NeedtDesignSystem_25d3c8;
const { NavRow, NavSection, CommandBar, Avatar, SidebarHint, IconButton, Icon, ToggleGroup, Tooltip, StatusDot, Checkbox, Chip, Button, Input, Popover, Menu, MenuItem, MenuLabel, MenuSeparator, DropdownMenu } = NS;

/* Booked minutes per day of September, out of an 11-hour day — the dot under a
   date is the day's load, so a heavy week is visible without opening one. */
const LOAD = { 1: 390, 2: 420, 3: 300, 4: 480, 5: 60, 6: 0, 7: 360, 8: 450, 9: 510, 10: 420, 11: 240, 12: 90, 13: 0, 14: 330, 15: 480, 16: 540, 17: 390, 18: 600, 19: 120, 20: 0, 21: 300, 22: 270, 23: 360, 24: 420, 25: 210, 26: 0, 27: 0, 28: 330, 29: 390, 30: 300 };
const CALENDAR_SOURCES = [
  { id: "work", name: "Work", tone: "accent", account: "google" },
  { id: "personal", name: "Personal", tone: "success", account: "apple" },
  { id: "family", name: "Family", tone: "info", account: "apple" }
];
const PINNED = [
  { title: "Launch brief — September" },
  { title: "Needt design rules" }
];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];

/* The mark itself lives in ExposureWordmark.jsx — the sidebar, the account
   screen and the route veil all render that one component. */
const { ExposureWordmark } = window;

const FIND_HINTS = [
  ["Find anything", "⌘K"],
  ["Capture a task", "⏎"],
  ["Start focus", "⌘⇧F"],
  ["Plan my day", "⌘⇧P"],
  ["Jump to a day", "⌘G"]
];

function FindBar({ onClick, frozen }) {
  const [i, setI] = React.useState(0);
  const [lit, setLit] = React.useState(true);
  React.useEffect(() => {
    if (frozen) return undefined;
    const id = window.setInterval(() => {
      setLit(false);
      window.setTimeout(() => { setI((n) => (n + 1) % FIND_HINTS.length); setLit(true); }, 340);
    }, 11000);
    return () => window.clearInterval(id);
  }, [frozen]);
  const [label, keys] = FIND_HINTS[frozen ? 0 : i];
  return (
    <span style={{ display: "block", opacity: lit ? 1 : 0, transition: "opacity 0.34s cubic-bezier(0.37, 0, 0.63, 1)" }}>
      <CommandBar label={label} keys={keys} width="100%" onClick={onClick} />
    </span>
  );
}

/* A month, small — and a place to act on a day, not only to look at it.
   Every cell is a drop target; hovering one offers the day menu in the slot
   the load dot occupies at rest, so the affordance costs no extra height. */
const DAY_ACTIONS = [
  ["sunrise", "Start the day later", "Move today's tasks to when you are ready."],
  ["sunset", "Finish early", "Reschedule what is left of the day."],
  ["ban", "Block out hours", "Pick hours the scheduler cannot use."],
  ["ban", "Block out the whole day", "Nothing gets placed here."],
  ["rotate-ccw", "Unblock the day", "Every hour is available again."]
];

function DayMenu({ at, onClose }) {
  React.useEffect(() => {
    function away(e) { if (!e.target.closest || !e.target.closest(".nt-menu")) onClose(); }
    function key(e) { if (e.key === "Escape") onClose(); }
    window.setTimeout(() => document.addEventListener("mousedown", away), 0);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", key); };
  }, []);
  /* Same reason as the brief's overlays: a screen with a transform re-bases
     fixed coordinates, so a menu placed from a rectangle belongs on the body. */
  return ReactDOM.createPortal(
    <div className="nt-menu" style={{ position: "fixed", left: at.x, top: at.y, width: 268, zIndex: 800 }}>
      <MenuLabel>{at.date} September</MenuLabel>
      {DAY_ACTIONS.map(([icon, label, hint], i) => (
        <button key={i} type="button" className="nt-menu-item" onClick={onClose}
          style={{ height: "auto", alignItems: "flex-start", padding: "7px 8px", gap: 8 }}>
          <span style={{ paddingTop: 2 }}><Icon name={icon} size={16} /></span>
          <span style={{ display: "flex", flexDirection: "column", gap: 1, minWidth: 0 }}>
            <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>{label}</span>
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>{hint}</span>
          </span>
        </button>
      ))}
    </div>, document.body);
}

function MiniMonth({ selected, onSelect, dragOverDate }) {
  const [menu, setMenu] = React.useState(null);
  const [hover, setHover] = React.useState(null);
  const cells = [];
  cells.push({ date: 31, outside: true, key: "a31" });
  for (let d = 1; d <= 30; d++) cells.push({ date: d, key: "s" + d, today: d === 1 });
  for (let d = 1; cells.length % 7; d++) cells.push({ date: d, outside: true, key: "o" + d });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 24, padding: "0 2px" }}>
        <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>September 2026</span>
        <span style={{ display: "flex", gap: 2 }}>
          <IconButton label="Previous month" variant="ghost"><Icon name="chevron-left" size={14} /></IconButton>
          <IconButton label="Next month" variant="ghost"><Icon name="chevron-right" size={14} /></IconButton>
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 1, justifyItems: "stretch" }}>
        {DOW.map((d, i) => <span key={i} style={{ display: "grid", placeItems: "center", height: 14, font: "var(--type-meta-medium)", fontSize: 11, color: "var(--text-muted)" }}>{d}</span>)}
        {cells.map((c) => {
          const load = c.outside ? 0 : (LOAD[c.date] || 0) / 660;
          const on = !c.outside && selected === c.date;
          const over = !c.outside && dragOverDate === String(c.date);
          const hot = !c.outside && hover === c.key;
          return (
            <div key={c.key} style={{ position: "relative" }}
              onMouseEnter={() => setHover(c.key)} onMouseLeave={() => setHover(null)}>
              <button type="button" data-drop={c.outside ? undefined : "day"} data-date={c.date} data-label={c.date + " September"}
                onClick={() => !c.outside && onSelect(c.date)}
                style={{ display: "grid", placeItems: "center", width: "100%", height: 30, border: 0, cursor: "default", borderRadius: "var(--radius-md)",
                  background: over ? "var(--fill-accent-strong)" : on ? "var(--fill-accent)" : c.today ? "var(--fill-accent-strong)" : hot ? "var(--fill-3)" : "transparent",
                  boxShadow: over ? "var(--shadow-focus)" : "none",
                  font: "var(--type-ui)", color: c.outside ? "var(--text-disabled)" : (on || c.today) ? "var(--accent)" : "var(--text-secondary)",
                  fontVariantNumeric: "tabular-nums", transition: "background-color var(--transition-hover)" }}>
                {c.date}
              </button>
              {/* One slot, two jobs: the day's load at rest, the day's menu
                  under the hand. */}
              {!c.outside ? (hot ? (
                <button type="button" aria-label={"Actions for " + c.date + " September"}
                  onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); setMenu({ date: c.date, x: Math.min(r.left, window.innerWidth - 280), y: Math.min(r.bottom + 4, window.innerHeight - 320) }); }}
                  style={{ position: "absolute", left: "50%", bottom: 0, transform: "translateX(-50%)", display: "grid", placeItems: "center",
                    width: 14, height: 10, border: 0, background: "transparent", cursor: "default", color: "var(--text-quaternary)", padding: 0 }}>
                  <Icon name="chevron-down" size={11} />
                </button>
              ) : load > 0 ? (
                <span style={{ position: "absolute", left: "50%", bottom: 2, transform: "translateX(-50%)", width: load >= 0.75 ? 4 : 3, height: load >= 0.75 ? 4 : 3, borderRadius: "var(--radius-pill)",
                  background: load >= 0.9 ? "var(--text-secondary)" : load >= 0.5 ? "var(--text-quaternary)" : "var(--text-disabled)" }} />
              ) : null) : null}
            </div>
          );
        })}
      </div>
      {menu ? <DayMenu at={menu} onClose={() => setMenu(null)} /> : null}
    </div>
  );
}

/* An upward menu: the same DS Menu, hung above its trigger instead of below,
   because a control on the last row of the rail has no room beneath it. */
function UpMenu({ trigger, width, children }) {
  const [open, setOpen] = React.useState(false);
  const wrap = React.useRef(null);
  React.useEffect(() => {
    if (!open) return undefined;
    function away(e) { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); }
    function esc(e) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div ref={wrap} style={{ position: "relative", display: "flex", width: "100%" }}>
      <span onClick={() => setOpen(!open)} style={{ display: "flex", width: "100%" }}>{trigger}</span>
      {open ? (
        <div className="menu-up" style={{ position: "absolute", left: 0, right: 0, bottom: "calc(100% + 4px)", zIndex: "var(--z-dropdown)" }} onClick={() => setOpen(false)}>
          <Menu width={width}>{children}</Menu>
        </div>
      ) : null}
    </div>
  );
}

/* Focus. Not a screen — a button that knows whether a session is running, and
   a popover that asks the one question a timer cannot: what for. */
function FocusControl({ tasks, focus, onStart, onStop }) {
  const [open, setOpen] = React.useState(false);
  const [intention, setIntention] = React.useState("");
  const [minutes, setMinutes] = React.useState("50");
  const [taskId, setTaskId] = React.useState(String((tasks[0] || {}).id || ""));
  const running = !!focus;
  const total = running ? focus.planned * 60 : 0;
  const pct = running ? Math.min(focus.elapsed / total, 1) : 0;
  const left = running ? Math.max(total - focus.elapsed, 0) : 0;
  const clock = String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0");

  return (
    <Popover className="pop-up" style={{ width: "100%" }} open={open} onToggle={() => setOpen(!open)} onClose={() => setOpen(false)}
      anchor={
        <button type="button" onClick={(e) => { if (running) { e.stopPropagation(); onStop(); } }}
          className={running ? "focus-live" : ""}
          style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, width: "100%", height: 40, padding: "0 11px", border: 0, cursor: "default",
            borderRadius: "var(--radius-floating)", overflow: "hidden", background: running ? "var(--fill-accent)" : "var(--surface-raised)",
            boxShadow: running ? "none" : "var(--shadow-raised)", transition: "box-shadow var(--transition-hover), background-color var(--transition-hover)" }}>
          {/* The fill is the session: it advances every tick, and the ring
              around the button breathes while it runs. */}
          {running ? <span aria-hidden="true" style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: (pct * 100) + "%", background: "var(--fill-accent-strong)", transition: "width 0.2s linear" }} /> : null}
          <Icon name="target" size={16} />
          <span style={{ position: "relative", font: "var(--type-ui-medium)", color: running ? "var(--accent)" : "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {running ? focus.intention || "In focus" : "Focus"}
          </span>
          <span style={{ position: "relative", marginLeft: "auto", font: "var(--type-meta)", fontFamily: "var(--font-mono)", color: running ? "var(--accent)" : "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
            {running ? clock : "⌘⇧F"}
          </span>
        </button>
      }>
      {/* Dialog rhythm: 6px inside a group, 21px between groups. The panel had
          six items on one flat 11px stack, which is why nothing read as
          belonging to anything. */}
      <div style={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", gap: 21 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>Start a session</span>
          <Input value={intention} onChange={(e) => setIntention(e.target.value)} placeholder="What is this session for?" />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>Length</span>
          <ToggleGroup value={minutes} onChange={setMinutes} label="Length" fullWidth
            items={[{ value: "25", label: "25 min" }, { value: "50", label: "50 min" }, { value: "90", label: "90 min" }]} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>On</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 168, minWidth: 0, overflowX: "hidden", overflowY: "auto" }} className="scroll-inner">
            {tasks.filter((t) => !t.done).slice(0, 5).map((t) => (
              <span key={t.id} onClick={() => setTaskId(String(t.id))}
                style={{ display: "block", borderRadius: "var(--radius-lg)",
                  boxShadow: String(t.id) === taskId ? "var(--shadow-focus)" : "none" }}>
                <CvCard t={Object.assign({}, t, { where: t.project })} dense onToggle={() => {}} onOpen={() => {}} />
              </span>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          <Button variant="accent" fullWidth iconLeft={<Icon name="target" size={16} />}
            onClick={() => { onStart({ intention: intention, planned: parseInt(minutes, 10), taskId: taskId }); setOpen(false); }}>
            Start
          </Button>
          <p style={{ margin: 0, paddingTop: 11, boxShadow: "var(--border) 0 1px 0 0 inset", font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>
            The scheduler will not place anything inside the session, and the mark up there stops breathing until it ends.
          </p>
        </div>
      </div>
    </Popover>
  );
}

function Sidebar({ screen, onScreen, theme, onTheme, onOpenPalette, onSettings, tasks, onCapture, onTask, dragProps, drag, focus, onStartFocus, onStopFocus, selectedDate, onSelectDate }) {
  const [visible, setVisible] = React.useState(["work", "personal", "family"]);
  const onDay = (window.PLACED || []).map((b) => b.title);
  const queue = tasks.filter((t) => !t.done && !t.time && !t.noSlot && onDay.indexOf(t.title) === -1);
  const overdue = tasks.filter((t) => t.overdue && !t.done).length;
  const dragOverDate = drag && drag.over && drag.over.kind === "day" ? drag.over.date : null;

  function toggleCal(id) {
    setVisible((l) => (l.indexOf(id) > -1 ? l.filter((x) => x !== id) : l.concat([id])));
  }

  return (
    <aside style={{ width: "var(--sidebar-w)", flex: "none", display: "flex", flexDirection: "column", padding: "11px 8px", background: "var(--background)", height: "100%", boxSizing: "border-box", overflow: "hidden" }}>
      {/* Pinned: who and where. Never scrolls away. */}
      <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 2 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 48, padding: "0 6px" }}>
          <ExposureWordmark size={46} mode="breathe+pulse" busy={focus ? true : false} style={{ lineHeight: 1, marginTop: -5 }} />
        </div>
        <FindBar onClick={onOpenPalette} frozen={!!focus} />
      </div>

      {/* Scrolls: everything that grows. */}
      <div className="scroll-inner" style={{ flex: "1 1 auto", minHeight: 0, minWidth: 0, overflowX: "hidden", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, padding: "16px 0" }}>
        <MiniMonth selected={selectedDate} onSelect={onSelectDate} dragOverDate={dragOverDate} />

        <div data-agent-queue style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavSection title="Unplaced" action={<span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{queue.length}</span>} />
          {/* An unplaced task is the same object it will be on the grid, minus
              its position: white surface, hairline, and the rail that says the
              scheduler may place it. Picking it up therefore looks like moving
              a block, not like dragging a list item that turns into one. */}
          {queue.length ? queue.slice(0, 3).map((t) => (
            <div key={t.id} {...dragProps(t, "place")} data-drop="row" data-id={t.id}
              style={{ marginBottom: 2, cursor: "grab", opacity: isDragged(drag, t) ? 0.35 : 1 }}>
              <CvCard t={Object.assign({}, t, { where: t.project, priority: t.overdue ? "now" : "soon" })}
                compact onToggle={() => {}} onOpen={() => onTask && onTask(t)} />
            </div>
          )) : <SidebarHint>Everything has a time.</SidebarHint>}
          {queue.length ? (
            <p style={{ margin: "6px 6px 0", font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>
              {(function () {
                const m = queue.reduce((n, t) => n + (t.est || 0), 0);
                const hrs = m >= 60 ? Math.floor(m / 60) + " h" + (m % 60 ? " " + (m % 60) + " min" : "") : m + " min";
                return hrs + " waiting. Drag one onto a day, or onto a free slot in the calendar.";
              })()}
            </p>
          ) : null}
        </div>

        <HabitShelf />

        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <NavSection title="Pinned" />
          {PINNED.map((d) => <NavRow key={d.title} label={d.title} onClick={() => onScreen("doc")} icon={<Icon name="file-text" size={20} />} />)}
        </div>
      </div>

      {/* Pinned: capture, focus, account. */}
      <div style={{ flex: "none", display: "flex", flexDirection: "column", gap: 8, paddingTop: 8 }}>

        <div className="needt-stretch pop-up" data-drop="focus"><FocusControl tasks={tasks} focus={focus} onStart={onStartFocus} onStop={onStopFocus} /></div>

        <div className="needt-stretch">
        <UpMenu trigger={
          <button type="button" style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", height: 40, padding: "0 6px", border: 0, background: "transparent", cursor: "default", borderRadius: "var(--radius-md)", boxShadow: "var(--border) 0 -1px 0 0 inset", transition: "background-color var(--transition-hover)" }}>
            <Avatar initials="MK" name="Maks" size={24} />
            <span style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <span style={{ font: "var(--type-meta-medium)", color: "var(--text-primary)" }}>Maks</span>
              <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>Synced 2 min ago</span>
            </span>
            <span style={{ marginLeft: "auto" }}><Icon name="chevron-down" size={14} /></span>
          </button>
        }>
          <MenuLabel>tox222tox@gmail.com</MenuLabel>
          <MenuItem icon={<Icon name="settings" size={14} />} shortcut="⌘," onClick={onSettings}>Settings</MenuItem>
          <MenuItem icon={<Icon name="globe" size={14} />} submenu
            onClick={() => window.__app && window.__app.setSettingsOpen(true)}>Language</MenuItem>
          <MenuItem icon={<Icon name="keyboard" size={14} />} shortcut="⌘/"
            onClick={() => window.__app && window.__app.setKeysOpen(true)}>Keyboard shortcuts</MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Icon name="circle-help" size={14} />}
            onClick={() => window.__app && window.__app.setHelpOpen(true)}>Get help</MenuItem>
          <MenuItem icon={<Icon name="bug" size={14} />} variant="destructive"
            onClick={() => window.__app && window.__app.setBugOpen(true)}>Report bug</MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Icon name="log-out" size={14} />}
            onClick={() => window.__app && window.__app.setStage("auth")}>Log out</MenuItem>
        </UpMenu>
        </div>

      </div>
    </aside>
  );
}

Object.assign(window, { Sidebar, MiniMonth, FocusControl, DayMenu, DAY_ACTIONS, CALENDAR_SOURCES, LOAD });
