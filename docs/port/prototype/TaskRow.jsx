/* THE WORKSPACE TABLE — the row layout of the task, plus the two things a
 * table needs that a task does not: a head, and a part beneath its parent.
 *
 * The row itself is not drawn here. It is `RichBlock` at `weight="row"`, so
 * the tile, the risk line, the age ladder, the counter and the money pair are
 * the same marks the grid and the columns draw. This file owns the TABLE —
 * column widths, the head, the indent — and nothing about what a task looks
 * like.
 *
 * The columns are declared once and reused by the head, the row and the part
 * row, so nothing can drift out of alignment. The Value column is always
 * present even when most cells are empty: a table whose columns move between
 * groups is not a table. */
const { Checkbox, Icon, IconButton, ContextMenu, MenuItem, MenuSeparator, Tooltip } = window.NeedtDesignSystem_25d3c8;

const COLS = "28px minmax(0,1fr) 148px 96px 76px 88px";
const HAIR = "var(--border) 0 -1px 0 0 inset";

function TaskTableHead() {
  const cell = { font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" };
  return (
    <div style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", gap: 8, height: 28, padding: "0 6px", boxShadow: HAIR }}>
      <span />
      <span style={cell}>Task</span>
      <span style={cell}>Project</span>
      <span style={cell}>Due</span>
      <span style={Object.assign({ textAlign: "right" }, cell)}>Est</span>
      <span style={Object.assign({ textAlign: "right" }, cell)}>Value</span>
    </div>
  );
}

/* A part is one piece of its task: it lives in the Task column, indented under
   its parent on a hairline, and its only action is promotion — the one way a
   part becomes something that can take a place in the day. */
function PartRow({ task, part, index, onTogglePart, onPromotePart }) {
  return (
    <div className="group" style={{ display: "grid", gridTemplateColumns: COLS, alignItems: "center", gap: 8, minHeight: 28, padding: "0 6px", boxShadow: HAIR, transition: "background-color var(--transition-hover)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      <span style={{ display: "flex", justifyContent: "flex-end", paddingRight: 2 }}>
        <Checkbox checked={part.done} onChange={() => onTogglePart && onTogglePart(task.id, index)} style={{ minHeight: 0 }} />
      </span>
      <span style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8, paddingLeft: 11, boxShadow: "var(--border) 1px 0 0 0 inset" }}>
        <span style={{ minWidth: 0, font: "var(--type-meta)", color: part.done ? "var(--text-muted)" : "var(--text-secondary)", textDecoration: part.done ? "line-through" : "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{part.title}</span>
        <span className="reveal-on-hover" style={{ flex: "none" }}>
          <Tooltip label="Make it a task" side="right">
            <IconButton label="Make it a task" variant="ghost" size="sm" onClick={() => onPromotePart && onPromotePart(task.id, index)}><Icon name="arrow-up-right" size={13} /></IconButton>
          </Tooltip>
        </span>
      </span>
      <span /><span /><span /><span />
    </div>
  );
}

function TaskRow({ task, onToggle, onOpen, drag, dragProps, onTogglePart, onPromotePart }) {
  const RichBlock = window.RichBlock;
  const parts = task.parts || [];
  /* No slot means no rail: a task that does not belong in the day has nothing
     to move, so it never offers the drag that would place it. */
  const movable = dragProps && !task.noSlot;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <ContextMenu
        items={<>
          <MenuItem icon={<Icon name="pencil" size={14} />} onClick={onOpen}>Edit</MenuItem>
          <MenuItem icon={<Icon name="list-plus" size={14} />}>Add a part</MenuItem>
          {task.noSlot
            ? <MenuItem icon={<Icon name="clock" size={14} />}>Give it a slot</MenuItem>
            : <MenuItem icon={<Icon name="clock" size={14} />} shortcut="⌘⇧S">Reschedule</MenuItem>}
          <MenuItem icon={<Icon name="folder" size={14} />} submenu>Move to project</MenuItem>
          <MenuSeparator />
          <MenuItem variant="destructive" icon={<Icon name="trash-2" size={14} />} shortcut="⌫">Delete</MenuItem>
        </>}
      >
        <div data-id={task.id} {...(movable ? dragProps(task, "place") : {})}
          style={{ cursor: movable ? "grab" : "default", opacity: isDragged(drag, task) ? 0.35 : 1 }}>
          {RichBlock ? (
            <RichBlock b={window.rbShape(task, { layout: "row" })} weight="row" cols={COLS}
              onToggle={() => onToggle(task.id)} onOpen={onOpen} />
          ) : null}
        </div>
      </ContextMenu>

      {/* Parts are always visible: the task is its pieces, not a disclosure. */}
      {parts.map((p, i) => <PartRow key={p.title + i} task={task} part={p} index={i} onTogglePart={onTogglePart} onPromotePart={onPromotePart} />)}
    </div>
  );
}

Object.assign(window, { TaskRow, TaskTableHead, PartRow, TASK_COLS: COLS });
