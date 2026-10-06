/* THE TWO-MINUTE BOX.
 *
 * A day is full of gaps too short to plan into — nine minutes before a call,
 * twelve after one — and a planner that only knows how to place 30-minute
 * blocks leaves every one of them empty. The box is the shelf those minutes
 * can spend: the entries already written on tasks, which are by definition the
 * two-minute step a task opens with.
 *
 * WHY IT LIVES ON THE GAP. An inbox of small things is another list to visit.
 * A gap that offers them is the same information at the moment it is useful —
 * you are looking at the empty stretch, and the empty stretch says what fits.
 * So the box appears where the gap is drawn and nowhere else.
 *
 * WHAT COUNTS AS A GAP. Between two placed blocks, inside the working hours,
 * and under fifteen minutes: above that the scheduler can place real work and
 * this shelf would be competing with it.
 */
const MN_MAX = 0.25;
const MN_MIN = 0.1;

const MN_FLOOR_PX = 32;
const MN_LEAST_PX = 12;

function mnGaps(items, from, to, hourH) {
  const h = hourH || 56;
  /* A block occupies its duration or one line, whichever is taller. */
  const floor = MN_FLOOR_PX / h;
  const busy = (items || []).slice().sort((a, b) => a.start - b.start);
  const out = [];
  let at = from;
  busy.forEach((b) => {
    if (b.start > at) out.push([at, b.start]);
    at = Math.max(at, b.start + Math.max(b.end - b.start, floor));
  });
  if (at < to) out.push([at, to]);
  return out
    .filter(([s, e]) => e - s >= MN_MIN && e - s <= MN_MAX && (e - s) * h >= MN_LEAST_PX)
    /* The number is the real gap in the clock; the band is what is left of it
       on screen. Reporting the drawn band as the length would tell you a
       fifteen-minute gap is nine. */
    .map(([s, e]) => ({ start: s, end: e, mins: Math.round((e - s) * 60), band: (e - s) * h }));
}

/* What a gap can hold: entries whose two minutes fit, nearest deadline first,
   because a small step on something due tomorrow is worth more than the same
   step on something due next month. */
function mnOffers(tasks, mins) {
  return (tasks || [])
    .filter((t) => t.entry && !t.done)
    .sort((a, b) => (a.dueIn == null ? 99 : a.dueIn) - (b.dueIn == null ? 99 : b.dueIn))
    .slice(0, mins >= 10 ? 3 : 2);
}

function MinuteBox({ gap, tasks, hourH, top, onPick }) {
  const { Icon, Tooltip } = window.NeedtDesignSystem_25d3c8;
  const [open, setOpen] = React.useState(false);
  const offers = mnOffers(tasks, gap.mins);
  if (!offers.length) return null;
  const h = Math.max((gap.end - gap.start) * hourH - 3, MN_LEAST_PX);
  /* Under 18px there is no room for a number between two rules — the length
     moves into the shelf, where it is stated in words. */
  const tight = h < 18;
  return (
    <span style={{ position: "absolute", left: 8, right: 14, top: top(gap.start) + 2, height: h, zIndex: 2 }}>
      {/* At rest it is a dashed strip stating its own length — the gap is a
          fact about the day whether or not you fill it. */}
      <button type="button" onClick={() => setOpen(!open)}
        className="mn-box"
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, width: "100%", height: "100%",
          border: 0, cursor: "default", borderRadius: "var(--radius-md)", background: "transparent",
          font: "var(--type-meta)", color: "var(--text-quaternary)", fontVariantNumeric: "tabular-nums" }}>
        <span className="mn-rule" aria-hidden="true" />
        {tight ? null : <span className="mn-label" style={{ whiteSpace: "nowrap" }}>{gap.mins} min</span>}
        <span className="mn-rule" aria-hidden="true" />
      </button>
      {open ? (
        <span className="mn-shelf" style={{ position: "absolute", left: 0, right: 0, top: h + 4, zIndex: 40,
          display: "flex", flexDirection: "column", gap: 2, minWidth: 176, padding: 5,
          borderRadius: "var(--radius-lg)", background: "var(--surface-raised)", boxShadow: "var(--shadow-floating)" }}>
          <span style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "2px 5px 4px" }}>
            <span style={{ font: "var(--type-meta-medium)", letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-quaternary)" }}>
              {gap.mins} minutes
            </span>
          </span>
          {offers.map((t) => (
            <button key={t.id || t.title} type="button"
              onClick={(e) => { e.stopPropagation(); setOpen(false); if (onPick) onPick(t, gap); }}
              style={{ display: "flex", alignItems: "center", gap: 7, minHeight: 32, padding: "0 6px", border: 0, cursor: "default",
                borderRadius: "var(--radius-md)", background: "transparent", textAlign: "left" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "var(--fill-3)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
              <span aria-hidden="true" style={{ flex: "none", display: "flex", color: "var(--text-quaternary)" }}>
                <Icon name="arrow-right" size={12} />
              </span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ font: "var(--type-meta-medium)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.entry}</span>
                <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.title}</span>
              </span>
              <span style={{ flex: "none", font: "var(--type-meta)", color: "var(--text-disabled)" }}>2 min</span>
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}

Object.assign(window, { MinuteBox, mnGaps, mnOffers, MN_MAX, MN_FLOOR_PX });
