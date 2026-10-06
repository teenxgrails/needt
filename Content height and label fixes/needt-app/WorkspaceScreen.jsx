const { Card, SegmentedControl, ToggleGroup, Button, Icon, IconButton, EmptyState, SkeletonRows, DropdownMenu, MenuItem, MenuLabel, MenuSeparator, Checkbox, StatusDot } = window.NeedtDesignSystem_25d3c8;

/* Workspace stands where Inbox stood. Two views over the same tasks: a list
   grouped by project, and a board whose columns are the task's status —
   Task.status in the schema: todo, in_progress, completed. */
const STATUS = [
  ["todo", "To do"],
  ["in_progress", "In progress"],
  ["done", "Done"]
];
const PROJECT_TONE = { "Operations": "info", "Design system": "accent", "German": "success" };
const PROJECT_ORDER = ["Operations", "Design system", "German", "Resale", "No project"];

function statusOf(t) { return t.done ? "done" : t.status || "todo"; }

function groupByProject(list) {
  return PROJECT_ORDER
    .map((name) => [name, list.filter((t) => (t.project || "No project") === name)])
    .filter((g) => g[1].length);
}

/* The flame and its measure live in Flame.jsx — one object, one contract. */
const { Flame, impulseOf } = window;

/* A group whose tasks carry money states its own total: what the group is
   worth when every task in it is closed. */
function GroupHeader({ name, count, sum, heat }) {
  /* Pins 28px down — beneath the table head, which owns top: 0. Two sticky
     layers on the same line means the opaque one wins and the group name
     disappears exactly when a long group needs it. */
  return (
    <div style={{ position: "sticky", top: 28, zIndex: 1, display: "flex", alignItems: "center", gap: 8, height: 28, padding: "0 6px", background: "var(--background)" }}>
      <StatusDot tone={PROJECT_TONE[name] || "neutral"} />
      <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>{name}</span>
      <Flame heat={heat} />
      <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{count}</span>
      {sum ? (
        <span title="What this group is worth with every task closed"
          style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: 5 }}>
          <span style={{ font: "var(--type-meta)", color: "var(--text-disabled)" }}>all closed</span>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>{window.rbMoney(sum)}</span>
        </span>
      ) : null}
    </div>
  );
}

function BoardCard({ task, onOpen }) {
  return (
    <button type="button" onClick={onOpen}
      style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%", textAlign: "left", border: 0, cursor: "default", padding: 11, borderRadius: "var(--radius-3xl)", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)", transition: "box-shadow var(--transition-hover)" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-ring-strong)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--shadow-ring)"; }}>
      <span style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        <span style={{ paddingTop: 5 }}><StatusDot tone={PROJECT_TONE[task.project] || "neutral"} /></span>
        <span style={{ minWidth: 0, font: "var(--type-ui-medium)", color: task.done ? "var(--text-muted)" : "var(--text-primary)", textDecoration: task.done ? "line-through" : "none", textWrap: "pretty" }}>{task.title}</span>
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 11, paddingLeft: 14 }}>
        <span style={{ font: "var(--type-meta)", color: task.overdue ? "var(--destructive)" : "var(--text-quaternary)", fontVariantNumeric: "tabular-nums" }}>{task.due || "No date"}</span>
        <span style={{ font: "var(--type-meta)", color: "var(--text-disabled)", fontVariantNumeric: "tabular-nums" }}>{task.est ? task.est + " min" : ""}</span>
      </span>
    </button>
  );
}

function WorkspaceScreen({ tasks, onToggle, onOpen, drag, dragProps, onTogglePart, onPromotePart }) {
  const [view, setView] = React.useState("list");
  const [tab, setTab] = React.useState("inbox");
  const [loading, setLoading] = React.useState(false);
  function switchTab(v) {
    setTab(v);
    if (v === "done") { setLoading(true); window.setTimeout(() => setLoading(false), 600); }
  }
  const open = tasks.filter((t) => !t.done);
  const done = tasks.filter((t) => t.done);
  const today = open.filter((t) => t.time && t.time.indexOf(":") > -1);
  const shown = tab === "done" ? done : tab === "later" ? [] : tab === "today" ? today : open;
  const groups = groupByProject(shown);

  return (
    <>
      <PageHeader title="Workspace" meta="3 projects" actions={<>
        <ToggleGroup value={view} onChange={setView} label="Workspace view"
          items={[{ value: "list", label: "List" }, { value: "board", label: "Kanban" }, { value: "flow", label: "Flow" }]} />
        <DropdownMenu align="right" trigger={<Button variant="flat" iconLeft={<Icon name="sliders-horizontal" size={16} />}>View</Button>}>
          <MenuLabel>Group by</MenuLabel>
          <MenuItem selected>Project</MenuItem>
          <MenuItem>Due date</MenuItem>
          <MenuItem>Priority</MenuItem>
          <MenuSeparator />
          <MenuItem icon={<Icon name="eye" size={14} />} onClick={() => switchTab("done")}>Show done</MenuItem>
        </DropdownMenu>
        <Button variant="accent" iconLeft={<Icon name="plus" size={16} />} onClick={onOpen}>New task</Button>
      </>} />

      {window.WsTeam ? <window.WsTeam tasks={tasks} /> : null}

      <div style={{ display: "flex", alignItems: "center", gap: 16, paddingBottom: 16, flex: "none" }}>
        <SegmentedControl value={tab} onChange={switchTab} label="Task filter" items={[
          { value: "inbox", label: "All", count: open.length },
          { value: "today", label: "Today", count: today.length },
          { value: "later", label: "Later" },
          { value: "done", label: "Done", count: done.length }
        ]} />
        <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <Checkbox indeterminate label="Select all" />
          <IconButton label="Sort"><Icon name="arrow-up-down" size={16} /></IconButton>
        </span>
      </div>

      {view === "flow" && window.FlowView ? (
        <window.FlowView tasks={tasks} onOpen={onOpen} />
      ) : view === "list" ? (
        <div style={{ flex: 1, minHeight: 0, display: "flex", paddingBottom: 20 }}>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column", gap: 0 }}>
            {loading ? <SkeletonRows count={9} /> : shown.length === 0 ? (
              <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <EmptyState icon={<Icon name="calendar-off" size={24} />} text="Nothing scheduled for later. Tasks you defer land here with their date."
                  action={<Button size="sm" variant="flat" iconLeft={<Icon name="plus" size={13} />} onClick={onOpen}>New task</Button>} />
              </div>
            ) : (
              <div className="scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column" }}>
                {/* The head lives INSIDE the scroller: outside it, the scrollbar
                    gutter makes the rows narrower than the head and the 1fr Task
                    column absorbs the difference, so every right-hand column
                    drifts. Sticky keeps it still while the list moves. */}
                <div style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--background)" }}><TaskTableHead /></div>
                {groups.map(([name, items], i) => (
                  <div key={name} style={{ display: "flex", flexDirection: "column", marginTop: i ? 11 : 0 }}>
                    <GroupHeader name={name} count={items.length} sum={items.reduce((s, t) => s + (t.value || 0), 0)} heat={impulseOf(items)} />
                    {items.map((t) => <TaskRow key={t.id} task={t} onToggle={onToggle} onOpen={onOpen} drag={drag} dragProps={dragProps} onTogglePart={onTogglePart} onPromotePart={onPromotePart} />)}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16, paddingBottom: 20 }}>
          {STATUS.map(([id, label]) => {
            const items = tasks.filter((t) => statusOf(t) === id);
            return (
              <section key={id} data-screen-label={label} style={{ display: "flex", flexDirection: "column", minHeight: 0, gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none", height: 28 }}>
                  <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>{label}</span>
                  <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{items.length}</span>
                </div>
                <div className="scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 8, padding: 8, borderRadius: "var(--radius-3xl)", background: "var(--fill-2)" }}>
                  {items.length
                    ? items.map((t) => <BoardCard key={t.id} task={t} onOpen={onOpen} />)
                    : <p style={{ margin: "auto", font: "var(--type-meta)", fontStyle: "italic", color: "var(--text-muted)" }}>Nothing in this column.</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

Object.assign(window, { WorkspaceScreen });
