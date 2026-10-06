/* CHAT — one object, three states.
 *
 * Closed it is a pill. Open it is a panel. And between the two there is a
 * third state the product needed and did not have: the **island**, where the
 * same object swells for a few seconds to say one thing, then goes back to
 * being a pill.
 *
 * The island is not a toast. A toast is a second object that appears beside
 * the thing it belongs to, which is why toasts are ignored — nothing on
 * screen changed, something new merely arrived. Here the object you already
 * know grows, carries the message, and shrinks: the motion IS the notice, and
 * the place it happens is the place you would have asked the question from.
 *
 * It is rare on purpose. The first arrives well after the app has settled, and
 * they are minutes apart after that — a hint that fires often is an
 * interruption with a friendly voice.
 */
const { Icon, IconButton, Button, Tooltip } = window.NeedtDesignSystem_25d3c8;

const SEED_CHAT = [
  { from: "needt", text: "Legal sign-off is the only thing blocking the batch. Want me to draft the chase email?" },
  { from: "you", text: "Yes, short. And find me two hours before Thursday." }
];

/* What the island is allowed to say. Each one either teaches something the
   product can do or reports something it just did — never praise, never a
   count of things that are fine. */
const CHAT_NOTES = [
  { glyph: "wand-sparkles", tone: "var(--accent)", title: "Two hours opened up",
    body: "The factory call moved. Want the tank graphic in that stretch?", act: "Fill it", say: "plan my day" },
  { glyph: "keyboard", tone: "var(--text-tertiary)", title: "G then C",
    body: "Two-letter jumps move between screens. G H, G C, G W, G D." },
  { glyph: "list-plus", tone: "var(--success)", title: "Break a task into parts",
    body: "Type / while writing one, or add parts after — the counter appears on the block." },
  { glyph: "flame", tone: "var(--destructive)", title: "One task is holding up three",
    body: "Workspace → Flow names what to do first, by how much it frees.", act: "Show me", say: "flow" },
  { glyph: "clock", tone: "var(--accent)", title: "Say it in words",
    body: "“ship the boots tomorrow 3pm for 30 min #resale” — the composer reads all of it." },
  { glyph: "moon", tone: "var(--text-tertiary)", title: "The paper warms after sunset",
    body: "Drift follows the sun where you are. Settings → Appearance." }
];

function ChatIsland({ note, onOpen, onAct, onDismiss }) {
  return (
    <div className="ci-body" style={{ display: "flex", alignItems: "center", gap: 11, height: "100%", padding: "0 8px 0 12px" }}>
      <span aria-hidden="true" style={{ flex: "none", display: "grid", placeItems: "center", width: 30, height: 30,
        borderRadius: "var(--radius-md)", color: note.tone,
        background: "color-mix(in oklab, " + note.tone + " 14%, transparent)" }}>
        <Icon name={note.glyph} size={15} />
      </span>
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1, textAlign: "left" }}>
        <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.title}</span>
        <span style={{ font: "var(--type-meta)", color: "var(--text-tertiary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{note.body}</span>
      </span>
      {note.act ? (
        <Button size="sm" variant="flat" onClick={onAct}>{note.act}</Button>
      ) : null}
      <IconButton label="Dismiss" variant="ghost" size="sm" onClick={onDismiss}><Icon name="x" size={13} /></IconButton>
    </div>
  );
}

function Chat({ onOpenBrief, hidden }) {
  const [open, setOpen] = React.useState(false);
  const [messages, setMessages] = React.useState(SEED_CHAT);
  const [draft, setDraft] = React.useState("");
  const [thinking, setThinking] = React.useState(false);
  const [note, setNote] = React.useState(null);
  const seen = React.useRef(0);
  const field = React.useRef(null);

  /* Rare, and never while you are reading the panel or being shown something
     by the agent: the island is for the quiet moments. */
  React.useEffect(() => {
    if (hidden) return undefined;
    let live = true;
    function surface() {
      if (!live || open || (window.__agent && window.__agent.busy())) return;
      setNote(CHAT_NOTES[seen.current % CHAT_NOTES.length]);
      seen.current += 1;
    }
    const first = window.setTimeout(surface, 9000);
    const every = window.setInterval(surface, 75000);
    return () => { live = false; window.clearTimeout(first); window.clearInterval(every); };
  }, [hidden, open]);

  /* It retracts on its own. Long enough to read two lines twice, short enough
     that it is gone before it becomes furniture. */
  React.useEffect(() => {
    if (!note) return undefined;
    const id = window.setTimeout(() => setNote(null), 7000);
    return () => window.clearTimeout(id);
  }, [note]);

  React.useEffect(() => {
    if (open && field.current) field.current.focus();
  }, [open]);

  function act(text) {
    const t = text.toLowerCase();
    if (!window.__agent) return false;
    if (/plan|place|schedule|\u0440\u0430\u0441\u0441\u0442\u0430\u0432/.test(t)) {
      window.__agent.run([
        { sel: "[data-agent-queue] [role=checkbox]", act: "hold", say: "Taking the first unplaced task", title: "Finish the tank graphic" },
        { sel: "[data-drop=\"timeline\"][data-date=\"1\"]", act: "drop", say: "Into the first free stretch today" },
        { sel: "[data-agent-plan]", act: "click", say: "Planning the rest of the day" }
      ]);
      return true;
    }
    if (/focus|\u0444\u043e\u043a\u0443\u0441/.test(t)) {
      window.__agent.run([{ sel: "[data-drop=focus] button", act: "click", say: "Starting a focus session" }]);
      return true;
    }
    if (/capture|add|\u0437\u0430\u0434\u0430\u0447/.test(t)) {
      window.__agent.run([
        { sel: "[data-agent-capture] input", act: "type", text: "Call the courier back", say: "Capturing it" },
        { sel: "[data-agent-capture] input", act: "click", say: null }
      ]);
      return true;
    }
    return false;
  }

  function send(text) {
    const line = (text != null ? text : draft).trim();
    if (!line) return;
    setMessages((m) => m.concat([{ from: "you", text: line }]));
    setDraft("");
    setThinking(true);
    window.setTimeout(() => {
      setThinking(false);
      const doing = act(line);
      setMessages((m) => m.concat([{ from: "needt", text: doing ? "Watch — doing it now." : "Done — it is on the brief for this week.", typed: true }]));
      if (doing) setOpen(false);
    }, 700);
  }

  const island = !!note && !open;
  /* Three widths, three heights, one element. The radius travels with them, so
     the pill, the island and the panel are the same object at three sizes. */
  const w = open ? 392 : island ? 376 : 116;
  const h = open ? 496 : island ? 54 : 40;

  return (
    <div data-agent-anchor className={"chat-shell" + (island ? " is-island" : "")}
      style={{ position: "absolute", right: 20, bottom: 20, zIndex: 500,
        opacity: hidden ? 0 : 1, transform: hidden ? "scale(0.7)" : "none", pointerEvents: hidden ? "none" : "auto",
        transformOrigin: "100% 100%",
        width: w, height: h,
        display: "flex", flexDirection: "column", overflow: "hidden",
        borderRadius: open ? "var(--radius-4xl)" : "var(--radius-floating)",
        background: "var(--surface-raised)", boxShadow: "var(--shadow-floating)",
        transition: "width 0.42s var(--ease-pop), height 0.42s var(--ease-pop), border-radius 0.42s var(--ease-pop), opacity 0.18s ease, transform 0.24s var(--ease-pop)" }}>

      {island ? (
        <ChatIsland note={note}
          onAct={() => { setNote(null); setOpen(true); send(note.say); }}
          onDismiss={() => setNote(null)}
          onOpen={() => { setNote(null); setOpen(true); }} />
      ) : (
        <button type="button" data-agent-home onClick={() => setOpen(!open)}
          style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 11px", border: 0, background: "transparent", cursor: "default",
            boxShadow: open ? "var(--border) 0 -1px 0 0 inset" : "none" }}>
          <span style={{ display: "grid", placeItems: "center", width: 20, height: 20, color: open ? "var(--accent)" : "var(--text-secondary)" }}>
            <Icon name={open ? "sparkles" : "message-circle"} size={16} />
          </span>
          <span style={{ font: "var(--type-ui-medium)", color: "var(--text-primary)" }}>{open ? "Needt" : "Chat"}</span>
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            {!open ? <span style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}>⌘J</span> : null}
            {open ? <Icon name="chevron-down" size={14} /> : null}
          </span>
        </button>
      )}

      {open ? (
        <>
          <div className="scroll-inner" style={{ flex: 1, minHeight: 0, overflow: "auto", display: "flex", flexDirection: "column", gap: 14, padding: "16px 16px 8px" }}>
            {messages.map((m, i) => (
              /* Yours is a raised card on the right, its is prose on the left:
                 a conversation reads as two voices only if they are set
                 differently, and the one you typed is the one that should
                 look like an object you placed. */
              <div key={i} className="chat-line" style={{ display: "flex", justifyContent: m.from === "you" ? "flex-end" : "flex-start" }}>
                {m.from === "you" ? (
                  <span style={{ maxWidth: "82%", padding: "8px 11px", borderRadius: "var(--radius-lg)",
                    background: "var(--fill-3)", boxShadow: "var(--shadow-ring)",
                    font: "var(--type-ui)", color: "var(--text-primary)", textWrap: "pretty" }}>{m.text}</span>
                ) : (
                  <span style={{ display: "flex", gap: 9, alignItems: "flex-start", maxWidth: "94%" }}>
                    <span style={{ flex: "none", display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: "var(--radius-sm)",
                      background: "var(--fill-accent)", color: "var(--accent)" }}>
                      <Icon name="sparkles" size={13} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, font: "var(--type-ui)", lineHeight: "21px", color: "var(--text-primary)", textWrap: "pretty" }}>
                      {m.typed ? <Typed text={m.text} color="var(--text-primary)" /> : m.text}
                    </span>
                  </span>
                )}
              </div>
            ))}
            {thinking ? (
              <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
                <span style={{ flex: "none", display: "grid", placeItems: "center", width: 22, height: 22, borderRadius: "var(--radius-sm)",
                  background: "var(--fill-accent)", color: "var(--accent)" }}><Icon name="sparkles" size={13} /></span>
                <span className="chat-dots" style={{ display: "flex", gap: 4 }}><i /><i /><i /></span>
              </div>
            ) : null}
          </div>

          {/* Three things it can do, offered rather than described. They go
              once you have typed, because a suggestion beside your own
              sentence is noise. */}
          {!draft.trim() && !thinking ? (
            <div style={{ flex: "none", display: "flex", gap: 6, padding: "0 16px 10px", flexWrap: "wrap" }}>
              {[["Plan my day", "plan my day"], ["Start focus", "focus"], ["What is stuck?", "flow"]].map(([label, said]) => (
                <button key={label} type="button" onClick={() => send(said)}
                  style={{ height: 28, padding: "0 11px", border: 0, cursor: "default", borderRadius: "var(--radius-pill)",
                    background: "var(--fill-2)", boxShadow: "var(--shadow-inset-ring)",
                    font: "var(--type-meta-medium)", color: "var(--text-secondary)" }}>{label}</button>
              ))}
            </div>
          ) : null}

          <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 8, padding: 11, boxShadow: "var(--border) 0 1px 0 0 inset" }}>
            <input ref={field} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              placeholder="Ask, or tell it what to change" className="nt-input" style={{ flex: 1 }} />
            <IconButton label="Send" variant={draft.trim() ? "accent" : "ghost"} onClick={() => send()}><Icon name="arrow-up" size={16} /></IconButton>
          </div>
        </>
      ) : null}
    </div>
  );
}

Object.assign(window, { Chat, ChatIsland, CHAT_NOTES });
