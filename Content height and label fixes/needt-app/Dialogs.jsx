const { Dialog, FormRow, FormGroup, Input, Textarea, Select, Checkbox, Switch, RadioGroup, Button, IconButton, Chip, Icon, Tooltip, Popover, DatePicker, StatusDot, Menu, MenuItem, MenuLabel } = window.NeedtDesignSystem_25d3c8;

/* THE TASK EDITOR — the sit-down.
 *
 * Creating is a hurry; the composer owns that. This is the other pace: the
 * thing already exists and you are changing it, so the surface can afford to
 * lay every attribute out at once instead of hiding them behind a menu.
 *
 * TWO COLUMNS, AND THEY DO DIFFERENT WORK. The left is what the task IS — its
 * name, what it means, the pieces it breaks into, what is attached. The right
 * is what the SCHEDULER knows about it — where it lives, how long it takes,
 * when it must be done. The split is not decoration: the left changes when you
 * think differently about the work, the right changes when the day changes.
 *
 * The reference leaves its left column almost empty under the description.
 * Filling it with product is better than filling it with air, and the task
 * already has two things that belong there: the parts it breaks into, and the
 * two-minute step it opens with.
 */
function TdRow({ glyph, label, children, indent }) {
  return (
    <div className="td-row" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 30, padding: "0 8px",
      marginLeft: indent ? 18 : 0, borderRadius: "var(--radius-md)" }}>
      <span style={{ flex: "none", display: "flex", width: 16, color: "var(--text-quaternary)" }}>
        {glyph ? <Icon name={glyph} size={15} /> : null}
      </span>
      <span style={{ flex: "none", width: 92, font: "var(--type-meta)", color: "var(--text-tertiary)" }}>{label}</span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>{children}</span>
    </div>
  );
}

/* A value that is also its own control: it reads as text until you reach for
   it, which is what keeps a rail of fifteen attributes from reading as a form
   of fifteen inputs. */
function TdValue({ children, muted, tone, onClick, glyph }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 5, maxWidth: "100%", height: 24, padding: "0 7px", border: 0, cursor: "default",
        borderRadius: "var(--radius-sm)", background: "transparent",
        font: "var(--type-ui-medium)", color: tone || (muted ? "var(--text-disabled)" : "var(--text-primary)"),
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
      {glyph ? <Icon name={glyph} size={13} /> : null}{children}
    </button>
  );
}

function TdGroup({ children }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 1, padding: "8px 0", boxShadow: "var(--border) 0 -1px 0 0 inset" }}>{children}</div>;
}

const TD_MARKS = [["bold", "B"], ["italic", "I"], ["strikethrough", "S"], ["list", null], ["list-checks", null], ["link", null]];

function TaskDialog({ open, onClose }) {
  const [kind, setKind] = React.useState("task");
  const [title, setTitle] = React.useState("Draft the launch brief");
  const [parts, setParts] = React.useState([
    { title: "Pull last month's numbers", done: true },
    { title: "Write the draft", done: false },
    { title: "Send it for review", done: false }
  ]);
  const [hard, setHard] = React.useState(false);
  const [auto, setAuto] = React.useState(true);
  if (!open) return null;

  const closed = parts.filter((p) => p.done).length;
  const proj = window.cvProject ? window.cvProject("Operations") : { hue: "var(--accent)", glyph: "briefcase" };

  return (
    <div className="td-scrim" onMouseDown={onClose}>
      <div className="td-box" onMouseDown={(e) => e.stopPropagation()}>
        <div className="td-main">
          {/* What kind of thing this is, first — everything below it means
              something slightly different depending on the answer. */}
          <header style={{ display: "flex", alignItems: "center", gap: 11, flex: "none" }}>
            <div className="toggle-group" role="group" aria-label="Kind">
              {[["task", "Task", "circle-check"], ["event", "Event", "calendar"], ["doc", "Document", "file-text"]].map(([k, label, glyph]) => (
                <button key={k} type="button" aria-pressed={kind === k} onClick={() => setKind(k)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 26, padding: "0 10px", border: 0,
                    borderRadius: "var(--radius-pill)", font: "var(--type-ui-medium)", cursor: "default",
                    background: kind === k ? "var(--fill-accent)" : "transparent", color: kind === k ? "var(--accent)" : "var(--text-muted)" }}>
                  <Icon name={glyph} size={13} />{label}
                </button>
              ))}
            </div>
            <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              <Button size="sm" variant="ghost" iconLeft={<Icon name="layout-template" size={14} />}>Template</Button>
              <Button size="sm" variant="ghost" iconLeft={<Icon name="repeat" size={14} />}>Recurring</Button>
            </span>
          </header>

          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Name it"
            style={{ flex: "none", width: "100%", margin: 0, padding: 0, border: 0, background: "transparent", outline: "none",
              font: "var(--type-page-title)", color: "var(--text-primary)" }} />

          <div style={{ display: "flex", alignItems: "center", gap: 1, flex: "none", opacity: 0.85 }}>
            {TD_MARKS.map(([glyph, letter]) => (
              <IconButton key={glyph} label={glyph} variant="ghost" size="sm">
                {letter ? <span style={{ font: "var(--type-ui-medium)", fontStyle: glyph === "italic" ? "italic" : "normal",
                  textDecoration: glyph === "strikethrough" ? "line-through" : "none",
                  fontWeight: glyph === "bold" ? 700 : 500 }}>{letter}</span> : <Icon name={glyph} size={14} />}
              </IconButton>
            ))}
          </div>

          <div className="scroll-inner td-body">
            <p style={{ margin: 0, font: "var(--type-body)", color: "var(--text-secondary)", textWrap: "pretty" }}>
              Last month&apos;s numbers, the two decisions we changed, and what the factory needs by Friday.
            </p>

            {/* THE PARTS. Not an afterthought at the bottom of a rail: the
                pieces are what the work actually is, so they sit in the column
                that says what the task is. */}
            <section style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, height: 26 }}>
                <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>Parts</span>
                <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{closed}/{parts.length}</span>
              </span>
              {parts.map((p, i) => (
                <span key={i} className="td-row" style={{ display: "flex", alignItems: "center", gap: 8, minHeight: 30, padding: "0 6px", borderRadius: "var(--radius-md)" }}>
                  <Checkbox checked={p.done} onChange={() => setParts((l) => l.map((x, j) => (j === i ? Object.assign({}, x, { done: !x.done }) : x)))} style={{ minHeight: 0 }} />
                  <span style={{ flex: 1, minWidth: 0, font: "var(--type-ui)", color: p.done ? "var(--text-muted)" : "var(--text-primary)",
                    textDecoration: p.done ? "line-through" : "none" }}>{p.title}</span>
                  <span className="reveal-on-hover" style={{ display: "flex", gap: 2 }}>
                    <Tooltip label="Make it a task of its own" side="left">
                      <IconButton label="Promote" variant="ghost" size="sm"><Icon name="arrow-up-right" size={13} /></IconButton>
                    </Tooltip>
                  </span>
                </span>
              ))}
              <button type="button" onClick={() => setParts((l) => l.concat([{ title: "New part", done: false }]))}
                style={{ display: "flex", alignItems: "center", gap: 7, height: 30, padding: "0 6px", border: 0, cursor: "default",
                  borderRadius: "var(--radius-md)", background: "transparent", font: "var(--type-ui)", color: "var(--text-muted)" }}>
                <Icon name="plus" size={14} />Add a part
              </button>
            </section>

            {/* The two-minute step: the smallest thing that counts as starting,
                and the only control on this side of the dialog. */}
            <section style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>Way in</span>
              <button type="button" className="rb-entry"
                style={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 12px 0 9px",
                  border: 0, cursor: "default", borderRadius: "var(--radius-lg)", "--rb-ink": "color-mix(in oklab, " + proj.hue + " 70%, var(--text-primary))" }}>
                <span className="rb-arrow" style={{ display: "flex" }}><Icon name="arrow-right" size={14} /></span>
                <span className="rb-rest" style={{ font: "var(--type-ui-medium)" }}>Pull last month&apos;s numbers</span>
                <span className="rb-hot" aria-hidden="true" style={{ font: "var(--type-ui-medium)" }}>Start the focus</span>
                <span className="rb-cost" style={{ font: "var(--type-meta)" }}>2 min</span>
              </button>
            </section>
          </div>

          <footer style={{ display: "flex", alignItems: "center", gap: 11, flex: "none", paddingTop: 11, boxShadow: "var(--border) 0 -1px 0 0 inset" }}>
            <Button size="sm" variant="ghost" iconLeft={<Icon name="paperclip" size={14} />}>Attach</Button>
            <span style={{ font: "var(--type-meta)", color: "var(--text-disabled)" }}>Nothing attached</span>
          </footer>
        </div>

        <aside className="td-rail scroll-inner">
          <TdGroup>
            <TdRow glyph="layers" label="Workspace"><TdValue>Needt</TdValue></TdRow>
            <TdRow glyph="folder" label="Project">
              <TdValue tone="var(--text-primary)">
                <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, background: proj.hue }} />Operations
              </TdValue>
            </TdRow>
          </TdGroup>

          {/* THE SCHEDULER'S VERDICT — the one thing on this rail that is not a
              setting but a result, so it is the one thing that carries fill. */}
          <button type="button" onClick={() => setAuto(!auto)}
            style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", height: 44, padding: "0 11px", border: 0, cursor: "default",
              background: auto ? "var(--fill-accent)" : "var(--fill-2)", color: auto ? "var(--accent)" : "var(--text-muted)" }}>
            <Icon name={auto ? "circle-check" : "circle"} size={17} />
            <span style={{ font: "var(--type-ui-medium)" }}>{auto ? "Placed" : "Not placed"}</span>
            <span style={{ marginLeft: "auto", font: "var(--type-meta)", color: auto ? "var(--accent)" : "var(--text-disabled)", opacity: 0.8 }}>
              {auto ? "Tue 09:30" : "you place it"}
            </span>
          </button>

          <TdGroup>
            <TdRow glyph="circle" label="Status"><TdValue>In progress</TdValue></TdRow>
            <TdRow glyph="flag" label="Priority"><TdValue tone="var(--destructive)">Urgent</TdValue></TdRow>
            <TdRow glyph="users" label="Who"><TdValue>Me</TdValue></TdRow>
          </TdGroup>

          <TdGroup>
            <TdRow glyph="hourglass" label="Duration">
              <TdValue>90 min</TdValue>
            </TdRow>
            <TdRow label="Smallest chunk" indent>
              <TdValue muted>Don&apos;t split</TdValue>
            </TdRow>
            <TdRow glyph="calendar" label="Day"><TdValue>Tue 1 Sep</TdValue></TdRow>
            <TdRow glyph="calendar-clock" label="Deadline"><TdValue tone="var(--destructive)">Fri 4 Sep, 17:00</TdValue></TdRow>
            <TdRow label="Hard deadline" indent>
              <Switch checked={hard} onChange={setHard} />
            </TdRow>
            <TdRow glyph="repeat" label="Repeat"><TdValue muted>Never</TdValue></TdRow>
            <TdRow glyph="bell" label="Remind"><TdValue muted>None</TdValue></TdRow>
          </TdGroup>

          <TdGroup>
            <TdRow glyph="tag" label="Labels"><TdValue muted>None</TdValue></TdRow>
            <TdRow glyph="clock" label="Hours"><TdValue>Work hours</TdValue></TdRow>
          </TdGroup>

          <div style={{ padding: "8px 0" }}>
            <button type="button" style={{ display: "flex", alignItems: "center", gap: 7, height: 30, padding: "0 8px", border: 0, cursor: "default",
              borderRadius: "var(--radius-md)", background: "transparent", font: "var(--type-ui)", color: "var(--text-muted)" }}>
              <Icon name="plus" size={14} />More settings
            </button>
          </div>

          <footer style={{ marginTop: "auto", display: "flex", alignItems: "center", gap: 8, paddingTop: 11, boxShadow: "var(--border) 0 -1px 0 0 inset" }}>
            <span style={{ font: "var(--type-meta)", color: "var(--text-disabled)" }}>Saved</span>
            <span style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
              <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button size="sm" onClick={onClose}>Save</Button>
            </span>
          </footer>
        </aside>
      </div>
    </div>
  );
}

function SettingsDialog({ open, onClose, theme, onTheme }) {
  const [font, setFont] = React.useState("inter");
  return (
    <Dialog open={open} onClose={onClose} title="Settings" subtitle="Appearance and scheduling"
      footer={<><Button variant="ghost" onClick={onClose}>Close</Button><Button variant="accent" onClick={onClose}>Save</Button></>}>
      <div style={{ paddingTop: 16, maxWidth: 560 }}>
        <FormGroup title="Appearance">
          <FormRow label="Theme">
            <RadioGroup horizontal name="theme-setting" value={theme} onChange={onTheme}
              items={[{ value: "system", label: "System" }, { value: "paper", label: "Paper" }, { value: "warm", label: "Warm" }, { value: "dim", label: "Dim" }, { value: "dark", label: "Dark" }]} />
          </FormRow>
          <FormRow label="Interface font">
            <Select value={font} onChange={setFont} options={[{ value: "inter", label: "Inter" }, { value: "system", label: "System" }]} />
          </FormRow>
          <FormRow label="Document width"><Input suffix="px" defaultValue="844" style={{ width: 120 }} /></FormRow>
        </FormGroup>
        <FormGroup title="Scheduling" style={{ marginTop: 21 }}>
          <FormRow label="Working hours"><span style={{ display: "flex", alignItems: "center", gap: 8 }}><Input type="time" defaultValue="09:00" style={{ width: 108 }} /><span style={{ color: "var(--text-muted)", font: "var(--type-ui)" }}>to</span><Input type="time" defaultValue="18:00" style={{ width: 108 }} /></span></FormRow>
          <FormRow label="Auto-schedule"><Switch checked onChange={() => {}} /></FormRow>
          <FormRow label="Protect focus" hint="The scheduler will not place meetings inside a focus block."><Switch checked onChange={() => {}} /></FormRow>
          <FormRow label="Week starts on"><Select value="mon" options={[{ value: "mon", label: "Monday" }, { value: "sun", label: "Sunday" }]} /></FormRow>
        </FormGroup>
      </div>
    </Dialog>
  );
}

/* It finds things as well as doing them: tasks and documents are matched by
   name alongside the places and the actions. */
const PALETTE_DOCS = ["Launch brief — September", "Needt design rules", "Scheduler — placement notes", "Weekly review, week 35"];

function CommandPalette({ open, onClose, onScreen, tasks }) {
  const [q, setQ] = React.useState("");
  if (!open) return null;
  const hit = (s) => s.toLowerCase().indexOf(q.toLowerCase()) > -1;
  const foundTasks = (tasks || []).filter((t) => q && hit(t.title)).slice(0, 5);
  const foundDocs = PALETTE_DOCS.filter((t) => q && hit(t)).slice(0, 4);
  const items = [
    ["Open Today", "today", "calendar-days", "⌘1"],
    ["Open Workspace", "workspace", "folder-kanban", "⌘2"],
    ["Open Calendar", "calendar", "calendar", "⌘3"],
    ["Open Documents", "docs", "file-text", "⌘4"],
    ["Plan my day", "today", "wand-sparkles", "⌘⇧P"]
  ].filter((i) => hit(i[0]));
  return (
    <div className="nt-scrim" style={{ position: "absolute", alignItems: "flex-start", paddingTop: 96 }} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ width: 560, borderRadius: "var(--radius-xl)", background: "var(--surface-raised)", boxShadow: "var(--shadow-floating)", padding: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 6px" }}>
          <Icon name="arrow-right" size={16} />
          <input autoFocus className="nt-input nt-input-plain" placeholder="Find a task, a document or a place" value={q} onChange={(e) => setQ(e.target.value)} style={{ boxShadow: "none" }} />
          <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>esc</span>
        </div>
        <div className="nt-menu-sep" />
        {foundTasks.length ? <MenuLabel>Tasks</MenuLabel> : null}
        {foundTasks.map((t) => (
          <MenuItem key={t.id} icon={<Icon name="circle" size={14} />} shortcut={t.due || ""} onClick={() => { onScreen("today"); onClose(); }}>{t.title}</MenuItem>
        ))}
        {foundDocs.length ? <MenuLabel>Documents</MenuLabel> : null}
        {foundDocs.map((t) => (
          <MenuItem key={t} icon={<Icon name="file-text" size={14} />} onClick={() => { onScreen("doc"); onClose(); }}>{t}</MenuItem>
        ))}
        {items.length ? <MenuLabel>Go to</MenuLabel> : null}
        {items.map(([label, screen, icon, keys]) => (
          <MenuItem key={label} icon={<Icon name={icon} size={14} />} shortcut={keys} onClick={() => { onScreen(screen); onClose(); }}>{label}</MenuItem>
        ))}
        {!items.length && !foundTasks.length && !foundDocs.length
          ? <p className="nt-empty-text" style={{ padding: "11px 8px", margin: 0 }}>Nothing matches. Press Enter to capture it as a task.</p> : null}
      </div>
    </div>
  );
}

Object.assign(window, { TaskDialog, SettingsDialog, CommandPalette });
