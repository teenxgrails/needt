/* TEAMS — who is holding what, and what is waiting on someone else.
 *
 * Most team surfaces answer "who is on this project", which nobody asks: you
 * know who is on your project. The question that costs a week is WHAT IS
 * WAITING ON SOMEONE, and it is invisible in every list view — a blocked task
 * looks exactly like a task nobody has started.
 *
 * So a team is drawn as two facts and no more: what each person is carrying,
 * and which of your tasks cannot move until one of theirs does. Both come off
 * the task itself (`holder`, `waitsOn`) rather than out of a map kept beside
 * the store — a fact with two homes has two values within a week.
 */
function WsFace({ who, size }) {
  const p = window.NEEDT.person(who);
  const s = size || 22;
  return (
    <span aria-label={p.name} title={p.name}
      style={{ flex: "none", display: "grid", placeItems: "center", width: s, height: s, borderRadius: s / 2,
        background: "color-mix(in oklab, " + p.hue + " 22%, var(--surface-raised))",
        boxShadow: "inset 0 0 0 1px color-mix(in oklab, " + p.hue + " 45%, transparent)",
        font: "var(--type-meta-medium)", fontSize: Math.round(s * 0.42), color: "color-mix(in oklab, " + p.hue + " 78%, var(--text-primary))" }}>
      {p.initials}
    </span>
  );
}

/* The one line a blocked task owes: who it is waiting on, and for what. It
   goes on the task, not in a panel — the place you read the task is the place
   you find out it cannot move. */
function WsWaiting({ wait }) {
  const { Icon } = window.NeedtDesignSystem_25d3c8;
  const p = window.NEEDT.person(wait.on);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: 20, padding: "0 7px 0 5px",
      borderRadius: "var(--radius-sm)", background: "var(--fill-2)", boxShadow: "var(--shadow-inset-ring)" }}>
      <Icon name="clock" size={11} />
      <span style={{ font: "var(--type-meta)", color: "var(--text-tertiary)", whiteSpace: "nowrap" }}>
        Waiting on {p.name} for {wait.for}
      </span>
    </span>
  );
}

/* The team strip. Each person carries a count and their hours, and the ones
   holding something up say so — that is the whole difference between this and
   a row of avatars. */
function WsTeam({ tasks }) {
  const { Icon } = window.NeedtDesignSystem_25d3c8;
  const open = tasks.filter((t) => !t.done);
  const blocks = window.NEEDT.blocking(tasks);
  return (
    <div style={{ display: "flex", alignItems: "stretch", gap: 8, flexWrap: "wrap", flex: "none", paddingBottom: 16 }}>
      {window.NEEDT.people.map((p) => {
        const mine = open.filter((t) => (t.holder || "you") === p.id);
        const mins = mine.reduce((s, t) => s + (t.est || 0), 0);
        const holds = blocks[p.id] || 0;
        return (
          <span key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, height: 40, padding: "0 11px 0 8px",
            borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--shadow-ring)" }}>
            <WsFace who={p.id} size={24} />
            <span style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ font: "var(--type-meta-medium)", color: "var(--text-primary)" }}>{p.name}</span>
              <span style={{ font: "var(--type-meta)", color: "var(--text-quaternary)", fontVariantNumeric: "tabular-nums" }}>
                {mine.length} open{mins ? " · " + (mins >= 60 ? Math.floor(mins / 60) + " h" + (mins % 60 ? " " + (mins % 60) + " min" : "") : mins + " min") : ""}
              </span>
            </span>
            {/* Stated only when true, in words, because a number here would be
                a score rather than a fact about your week. */}
            {holds ? (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, height: 20, padding: "0 7px 0 5px", marginLeft: 3,
                borderRadius: "var(--radius-sm)", background: "var(--fill-destructive)", color: "var(--destructive)" }}>
                <Icon name="clock" size={11} />
                <span style={{ font: "var(--type-meta-medium)", whiteSpace: "nowrap" }}>
                  {holds === 1 ? "blocks one of yours" : "blocks " + holds + " of yours"}
                </span>
              </span>
            ) : null}
          </span>
        );
      })}
    </div>
  );
}

Object.assign(window, { WsTeam, WsFace, WsWaiting });
