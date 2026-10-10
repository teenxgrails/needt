/* REPORT BUG — a report the developer can act on, gathered without asking.
 *
 * Most bug forms ask the person to describe a state the app already knows:
 * which screen, which theme, which view, what browser. So this one states all
 * of that back and asks only the two things it cannot know — what happened,
 * and what was supposed to happen. Everything below the line is collected and
 * shown, so nothing is sent that was not seen.
 *
 * The red belongs to the entry in the menu, not to this sheet: reporting a
 * fault is a favour to the product, not a destructive act, and a red panel
 * would make the reporter feel like the fault. */
function BugSheet({ open, onClose }) {
  const { Icon, IconButton, Button, Input } = window.NeedtDesignSystem_25d3c8;
  const [what, setWhat] = React.useState("");
  const [meant, setMeant] = React.useState("");
  const [sent, setSent] = React.useState(false);
  React.useEffect(() => { if (open) { setWhat(""); setMeant(""); setSent(false); } }, [open]);
  if (!open) return null;

  /* What the app knows about itself at the moment the report is opened. */
  const app = window.__app || {};
  const root = document.querySelector(".app");
  const theme = root ? (["paper", "dim", "dark", "system"].filter((t) => root.classList.contains(t))[0] || "paper") : "—";
  const facts = [
    ["Screen", (app.screen || document.querySelector("[data-screen-label]") ? (app.screen || "today") : "today")],
    ["Theme", theme],
    ["Window", window.innerWidth + " × " + window.innerHeight],
    ["Version", "kit · " + new Date().toISOString().slice(0, 10)]
  ];

  return (
    <div className="co-scrim" onMouseDown={onClose}
      style={{ position: "absolute", inset: 0, zIndex: 900, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onMouseDown={(e) => e.stopPropagation()} className="co-arrive"
        style={{ display: "flex", flexDirection: "column", width: "min(460px, 100%)", maxHeight: "100%",
          borderRadius: "var(--radius-2xl)", background: "var(--surface-raised)", boxShadow: "var(--shadow-floating)", overflow: "hidden" }}>
        <header style={{ display: "flex", alignItems: "center", gap: 8, height: 46, padding: "0 11px 0 16px", flex: "none" }}>
          <span aria-hidden="true" style={{ display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: "var(--radius-xs)",
            color: "var(--destructive)", background: "var(--fill-destructive)" }}>
            <Icon name="bug" size={13} />
          </span>
          <span style={{ flex: 1, font: "var(--type-card-title)", color: "var(--text-primary)" }}>Report a bug</span>
          <IconButton label="Close" variant="ghost" onClick={onClose}><Icon name="x" size={16} /></IconButton>
        </header>

        {sent ? (
          <div style={{ padding: "4px 16px 20px", display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>Sent. Thank you.</span>
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>
              It arrived with the screen, the theme and the window size attached, so nobody has to ask you for them.
            </span>
          </div>
        ) : (
          <div className="scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto", padding: "0 16px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Two questions, because the other six answer themselves. */}
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "var(--type-meta-medium)", color: "var(--text-secondary)" }}>What happened</span>
              <textarea autoFocus value={what} rows={3} onChange={(e) => setWhat(e.target.value)}
                placeholder="I dragged a task onto Thursday and it landed on Wednesday."
                style={{ margin: 0, padding: "8px 10px", resize: "none", borderRadius: "var(--radius-md)", border: 0,
                  background: "var(--fill-2)", boxShadow: "var(--shadow-inset-ring)", outline: "none",
                  font: "var(--type-ui)", color: "var(--text-primary)" }} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              <span style={{ font: "var(--type-meta-medium)", color: "var(--text-secondary)" }}>What you expected</span>
              <Input value={meant} onChange={(e) => setMeant(e.target.value)} placeholder="It should land where the outline was." />
            </label>

            {/* Collected, and shown — nothing is sent that was not seen. */}
            <span style={{ display: "flex", flexDirection: "column", gap: 6, paddingTop: 2 }}>
              <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>
                Sent with it
              </span>
              <span style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                {facts.map(([k, v]) => (
                  <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 24, padding: "0 8px",
                    borderRadius: "var(--radius-sm)", background: "var(--fill-2)", boxShadow: "var(--shadow-inset-ring)" }}>
                    <span style={{ font: "var(--type-meta)", color: "var(--text-quaternary)" }}>{k}</span>
                    <span style={{ font: "var(--type-meta-medium)", color: "var(--text-secondary)" }}>{v}</span>
                  </span>
                ))}
              </span>
            </span>
          </div>
        )}

        {sent ? null : (
          <footer style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 16px 16px", flex: "none" }}>
            <span style={{ flex: 1, font: "var(--type-meta)", color: "var(--text-disabled)" }}>Goes straight to the developer.</span>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button disabled={!what.trim()} onClick={() => setSent(true)}>Send report</Button>
          </footer>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { BugSheet });
