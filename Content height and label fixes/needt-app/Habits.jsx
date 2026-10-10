/* HABITS — the standing shape of a week.
 *
 * A habit is not a task, and one consequence decides the whole design: a miss
 * must never become debt. If a habit fell into the unplaced queue or the
 * overdue column, every skipped day would turn into a backlog — the guilt
 * spiral that makes people abandon trackers. A habit is not closed, it
 * returns; a missed dot stays empty and nothing else happens.
 *
 * WHAT IT IS MEASURED BY. Not a streak: a streak punishes one miss with total
 * loss, which is why streaks get broken once and then abandoned. The number is
 * the share of the last fourteen days — "10 of 14" — and the dots are the
 * pattern, which reads as a shape rather than as a verdict.
 *
 * WHERE IT LIVES IN THE DAY. A habit owns a SLOT, not a day: German at 18:00
 * is a standing block with the grey rail, which is the rail that says the
 * scheduler may not move it. Habits are therefore the skeleton the scheduler
 * plans around — a real function, not a widget beside the plan.
 */
const HbNS = window.NeedtDesignSystem_25d3c8;
const { Icon: HbIcon, NavSection: HbSection, Tooltip: HbTooltip } = HbNS;

/* done: the last 14 days, oldest first. A quota habit counts per week. */
/* The list lives in Data.js — this file owns how a habit is drawn, not which
   habits there are. */
const HABITS = window.NEEDT.habits;

/* The strip is fourteen cells: filled for a day it happened, hollow for a day
   it did not, and the last cell is today — the only one you can still act on,
   so it is the only one drawn as a control. */
function HabitStrip({ done, hue, onToggle }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 2 }}>
      {done.map((d, i) => {
        const today = i === done.length - 1;
        return (
          <span key={i} role={today ? "checkbox" : undefined} aria-checked={today ? !!d : undefined}
            aria-label={today ? "Done today" : undefined}
            onClick={today ? (e) => { e.stopPropagation(); onToggle(); } : undefined}
            title={today ? "Today" : null}
            style={{ width: today ? 9 : 6, height: today ? 9 : 6, borderRadius: 3, flex: "none",
              background: d ? hue : "transparent",
              boxShadow: d ? "none" : "inset 0 0 0 1px " + (today ? hue : "var(--border)"),
              transition: "background-color var(--transition-hover)" }} />
        );
      })}
    </span>
  );
}

function HabitRow({ h, onToggle }) {
  const proj = window.cvProject ? window.cvProject(h.project) : { hue: "var(--accent)" };
  const hue = h.project ? proj.hue : "var(--text-tertiary)";
  const hit = h.done.filter(Boolean).length;
  /* A quota habit is measured by its week, so a missed day inside a week that
     still meets the quota is not a miss at all. */
  const week = h.done.slice(-7).filter(Boolean).length;
  const label = h.quota ? week + "/" + h.quota + " this week" : hit + " of 14";
  return (
    <div className="group" style={{ display: "flex", flexDirection: "column", gap: 3, padding: "5px 6px", borderRadius: "var(--radius-md)",
      transition: "background-color var(--transition-hover)" }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-2)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
      <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
        <span style={{ flex: 1, minWidth: 0, font: "var(--type-ui)", color: "var(--text-primary)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.title}</span>
        {/* The hour is the habit's own slot — the thing the scheduler builds
            the day around, so it is stated even when nothing else is. */}
        {h.at ? (
          <span style={{ flex: "none", font: "var(--type-meta)", color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums" }}>{h.at}</span>
        ) : null}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
        <HabitStrip done={h.done} hue={hue} onToggle={onToggle} />
        <span style={{ flex: 1, minWidth: 0, font: "var(--type-meta)", color: "var(--text-tertiary)", fontVariantNumeric: "tabular-nums",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
      </span>
    </div>
  );
}

function StreakChip({ compact }) {
  const n = window.NEEDT.streak();
  const closed = window.NEEDT.closedDays;
  const of14 = closed.reduce((s, d) => s + d, 0);
  if (!n) return null;
  return (
    <HbTooltip label={"A day counts as closed when everything due that day was closed. Today is still open; " + of14 + " of the last 14 held."} side="top">
      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, height: compact ? 18 : 22,
        padding: compact ? "0 6px" : "0 8px", borderRadius: "var(--radius-sm)",
        background: "var(--fill-2)", boxShadow: "var(--shadow-inset-ring)" }}>
        <span aria-hidden="true" style={{ flex: "none", display: "flex", color: "var(--accent)" }}>
          <HbIcon name="flame" size={compact ? 11 : 12} />
        </span>
        <span style={{ font: "var(--type-meta-medium)", color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {n} {n === 1 ? "day" : "days"} closed
        </span>
      </span>
    </HbTooltip>
  );
}

function HabitShelf() {
  const [state, setState] = React.useState({});
  const live = HABITS.map((h) => {
    const t = state[h.id];
    if (t == null) return h;
    const done = h.done.slice();
    done[done.length - 1] = t ? 1 : 0;
    return Object.assign({}, h, { done: done });
  });
  const todayDone = live.filter((h) => h.done[h.done.length - 1]).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <HbSection title="Every day" action={
        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>{todayDone}/{live.length}</span>
      } />
      <span style={{ display: "flex", padding: "2px 6px 6px" }}><StreakChip compact /></span>
      {live.map((h) => (
        <HabitRow key={h.id} h={h}
          onToggle={() => setState((s) => Object.assign({}, s, { [h.id]: !h.done[h.done.length - 1] }))} />
      ))}
      {/* No scolding, and no debt: a habit that was missed is simply a hollow
          dot, and the next one is today. */}
      <p style={{ margin: "5px 6px 0", font: "var(--type-meta)", color: "var(--text-muted)", textWrap: "pretty" }}>
        A missed day stays empty. Nothing carries over.
      </p>
    </div>
  );
}

const HB_WEEKS = 26;
const HB_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* A day's history, generated once from the habits' own strips so the field and
   the strips cannot disagree: the last fourteen days come from the data, and
   the weeks before them from a stable pseudo-random walk seeded per day. */
function hbHistory(live) {
  const today = new Date(2026, 8, 1);
  const days = [];
  const total = HB_WEEKS * 7;
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const back = i;
    let kept;
    if (back < 14) {
      kept = live.filter((h) => h.done[h.done.length - 1 - back]).length;
    } else {
      /* Deterministic, so the field does not reshuffle on every render. */
      const s = Math.sin(d.getTime() / 8.64e7) * 10000;
      kept = Math.round(Math.abs(s - Math.floor(s)) * live.length);
    }
    days.push({ date: d, kept: kept, of: live.length, today: back === 0 });
  }
  return days;
}

function HabitField({ live, onToggleAll }) {
  const days = hbHistory(live);
  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  /* One label per month, at the week its first day falls in. */
  const labels = weeks.map((w, i) => {
    const m = w[0].date.getMonth();
    const prev = i ? weeks[i - 1][0].date.getMonth() : -1;
    return m !== prev ? HB_MONTHS[m] : null;
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      <div style={{ display: "flex", gap: 2.5, overflow: "hidden", justifyContent: "flex-end", minWidth: 0 }}>
        {weeks.map((w, i) => (
          <span key={i} style={{ display: "flex", flexDirection: "column", gap: 2.5, marginLeft: labels[i] && i ? 8 : 0 }}>
            {w.map((d, j) => {
              const ratio = d.of ? d.kept / d.of : 0;
              return (
                <span key={j} title={d.kept + " of " + d.of + " kept · " + d.date.getDate() + " " + HB_MONTHS[d.date.getMonth()]}
                  onClick={d.today ? onToggleAll : undefined}
                  style={{ width: 7, height: 7, borderRadius: 2, flex: "none",
                    background: ratio ? "color-mix(in oklab, var(--accent) " + Math.round(26 + ratio * 62) + "%, transparent)" : "var(--fill-3)",
                    boxShadow: d.today ? "0 0 0 1.5px var(--accent)" : "none" }} />
              );
            })}
          </span>
        ))}
      </div>
      <div style={{ display: "flex", gap: 2.5, height: 13, overflow: "hidden", justifyContent: "flex-end", minWidth: 0 }}>
        {labels.map((l, i) => (
          <span key={i} style={{ width: 7, flex: "none", position: "relative", marginLeft: l && i ? 8 : 0 }}>
            {l ? <span style={{ position: "absolute", left: 0, top: 0, font: "var(--type-meta)", fontSize: 10, color: "var(--text-quaternary)", whiteSpace: "nowrap" }}>{l}</span> : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function HabitRail() {
  const [state, setState] = React.useState({});
  const live = HABITS.map((h) => {
    const t = state[h.id];
    if (t == null) return h;
    const done = h.done.slice();
    done[done.length - 1] = t ? 1 : 0;
    return Object.assign({}, h, { done: done });
  });
  const allOn = live.every((h) => h.done[h.done.length - 1]);
  const todayDone = live.filter((h) => h.done[h.done.length - 1]).length;
  function toggleAll() {
    const next = {};
    live.forEach((h) => { next[h.id] = !allOn; });
    setState((s) => Object.assign({}, s, next));
  }
  const of14 = window.NEEDT.closedDays.reduce((s, d) => s + d, 0);
  const days = window.NEEDT.streak();
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, minWidth: 0 }}>
      <HbTooltip label={"One square a day; the darker it is, the more of these you kept. " + days + " days closed in a row, " + of14 + " of the last 14."} side="bottom">
        <span style={{ display: "flex" }}><HabitField live={live} onToggleAll={toggleAll} /></span>
      </HbTooltip>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 11, flexWrap: "wrap", minWidth: 0 }}>
        {live.map((h) => {
          const proj = window.cvProject ? window.cvProject(h.project) : { hue: "var(--accent)" };
          const hue = h.project ? proj.hue : "var(--text-tertiary)";
          const on = !!h.done[h.done.length - 1];
          const kept = h.done.reduce((s, d) => s + d, 0);
          return (
            <HbTooltip key={h.id}
              label={(h.at ? h.at + " · " : "") + kept + " of the last 14 · " + (on ? "kept today, click to undo" : "click to mark it kept")}
              side="bottom">
              <button type="button"
                onClick={() => setState((s) => Object.assign({}, s, { [h.id]: !on }))}
                style={{ display: "flex", alignItems: "center", gap: 7, height: 30, padding: "0 12px 0 9px", border: 0, cursor: "default",
                  borderRadius: "var(--radius-pill)", background: on ? "color-mix(in oklab, " + hue + " 16%, var(--surface-raised))" : "var(--surface-raised)",
                  boxShadow: "var(--shadow-ring)", transition: "background-color var(--transition-hover)" }}>
                <span aria-hidden="true" style={{ flex: "none", width: 14, height: 14, borderRadius: 7, display: "grid", placeItems: "center",
                  background: on ? hue : "transparent", boxShadow: on ? "none" : "inset 0 0 0 1.5px " + hue, color: "var(--surface-raised)" }}>
                  {on ? <HbIcon name="check" size={9} /> : null}
                </span>
                <span style={{ font: "var(--type-meta-medium)", color: on ? "var(--text-primary)" : "var(--text-secondary)", whiteSpace: "nowrap" }}>{h.title}</span>
              </button>
            </HbTooltip>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { HabitShelf, HabitRail, StreakChip, HabitField, HabitRow, HabitStrip, HABITS });
