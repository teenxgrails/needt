/* GET HELP — how the product works, in the product.
 *
 * Not a FAQ and not a tour: the four things a person cannot guess, because
 * each one is a convention this product invented. A rail that means movability,
 * a line you type instead of a form, a gap that offers two minutes, a square
 * per day that never becomes a debt. Everything else in the interface explains
 * itself by being looked at.
 *
 * Each entry is written as a rule with its own example, so it can be read in
 * ten seconds and remembered as one sentence. */
const HELP = [
  ["The rail", "circle", [
    ["A grey edge means you pinned it", "The scheduler will not move a block with a grey edge, however tight the day gets."],
    ["A coloured edge means it may move", "The scheduler placed it and can place it again — that is what the colour is telling you."],
    ["No edge at all means it has no slot", "A resale item closes when it closes. There is nothing to move, so it takes no place in the day."]
  ]],
  ["The line", "type", [
    ["Type the task, not a form", "“ship the boots tomorrow 3pm for 30 min #resale urgent” makes all of it at once."],
    ["What it understood turns into a chip", "Each chip can be cleared on its own. What it did not understand stays as the title."],
    ["A slash opens the rest", "Press / for description, parts, deadline, repeat, labels — the things a sentence cannot say."]
  ]],
  ["The day", "calendar-days", [
    ["Short gaps offer two minutes", "Any stretch under fifteen minutes shows its length and offers the entries that fit it."],
    ["An entry is the first step, not the task", "It is what you press when you do not have time to start properly."],
    ["Plan my day fills the free hours", "It respects pinned blocks, your working hours and the buffers you set."]
  ]],
  ["Habits", "repeat", [
    ["A square a day, and a miss stays empty", "It never turns into a debt or an overdue task — that is the whole point of the shelf."],
    ["The count is out of the last fourteen days", "A streak punishes one miss with total loss, which is why streaks get abandoned."],
    ["A habit with a time is a standing block", "It holds its hour, so the planner builds the rest of the day around it."]
  ]]
];

function HelpSheet({ open, onClose }) {
  const { Icon, IconButton } = window.NeedtDesignSystem_25d3c8;
  const [at, setAt] = React.useState(0);
  if (!open) return null;
  const [title, glyph, rules] = HELP[at];
  return (
    <div className="co-scrim" onMouseDown={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onMouseDown={(e) => e.stopPropagation()} className="co-arrive"
        style={{ display: "flex", width: "min(720px, 100%)", maxHeight: "100%", overflow: "hidden",
          borderRadius: "var(--radius-2xl)", background: "var(--surface-raised)", boxShadow: "var(--shadow-floating)" }}>
        {/* Four conventions down the side: the list is short enough to be the
            navigation and the table of contents at once. */}
        <nav style={{ flex: "none", width: 188, display: "flex", flexDirection: "column", gap: 2, padding: 11,
          boxShadow: "var(--border) -1px 0 0 0 inset" }}>
          <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)", padding: "4px 8px 6px" }}>
            How it works
          </span>
          {HELP.map(([t, g], i) => (
            <button key={t} type="button" onClick={() => setAt(i)}
              style={{ display: "flex", alignItems: "center", gap: 8, height: 32, padding: "0 8px", border: 0, cursor: "default",
                borderRadius: "var(--radius-md)", textAlign: "left",
                background: i === at ? "var(--fill-accent)" : "transparent",
                color: i === at ? "var(--accent)" : "var(--text-secondary)",
                transition: "background-color var(--transition-hover)" }}>
              <Icon name={g} size={14} />
              <span style={{ font: "var(--type-ui-medium)" }}>{t}</span>
            </button>
          ))}
        </nav>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <header style={{ display: "flex", alignItems: "center", gap: 8, height: 44, padding: "0 11px 0 16px", flex: "none" }}>
            <span style={{ flex: 1, font: "var(--type-card-title)", color: "var(--text-primary)" }}>{title}</span>
            <IconButton label="Close" variant="ghost" onClick={onClose}><Icon name="x" size={16} /></IconButton>
          </header>
          <div className="scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
            {rules.map(([rule, why]) => (
              <span key={rule} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)", textWrap: "pretty" }}>{rule}</span>
                <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>{why}</span>
              </span>
            ))}
            <span style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 2 }}>
              <button type="button" onClick={() => { onClose(); if (window.__app) window.__app.setKeysOpen(true); }}
                style={{ display: "flex", alignItems: "center", gap: 6, height: 30, padding: "0 10px", border: 0, cursor: "default",
                  borderRadius: "var(--radius-md)", background: "var(--fill-2)", font: "var(--type-meta-medium)", color: "var(--text-secondary)" }}>
                <Icon name="keyboard" size={13} />Keyboard shortcuts
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { HelpSheet, HELP });
