/* Drag and drop — one gesture for the whole product.
 *
 * A drop target is any DOM node with data-drop; nothing registers itself, so a
 * new landing place is an attribute, not a change to this file.
 *
 *   data-drop="timeline" + data-start/-hour-h/-offset → a time on a day grid
 *   data-drop="day"      + data-date                  → a date in the mini month
 *   data-drop="row"      + data-id                    → a place in a list
 *   data-drop="focus"                                 → start a session on it
 *
 * The gesture: press, move 4px, and only then is it a drag — a press that does
 * not travel stays a click, so the same task can be opened, closed and moved
 * from one target. Time snaps to 15 minutes. A drop on nothing sends the card
 * back where it came from rather than silently swallowing the move.
 */
const SNAP = 0.25;
const THRESHOLD = 4;

function snapTime(t) { return Math.round(t / SNAP) * SNAP; }
function hhmmOf(t) {
  return String(Math.floor(t)).padStart(2, "0") + ":" + String(Math.round((t % 1) * 60)).padStart(2, "0");
}

/* The nearest thing that scrolls under the pointer. A drag that reaches the
   edge of a scrolling grid keeps going instead of stopping at the fold. */
function scrollerAt(x, y) {
  let el = document.elementFromPoint(x, y);
  while (el && el !== document.body) {
    const st = window.getComputedStyle(el);
    if ((st.overflowY === "auto" || st.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 4) return el;
    el = el.parentElement;
  }
  return null;
}

function useDrag(onDrop) {
  const [drag, setDrag] = React.useState(null);
  const [returning, setReturning] = React.useState(null);
  const armed = React.useRef(null);
  const last = React.useRef(null);
  const pending = React.useRef(0);
  const live = React.useRef(null);
  const at = React.useRef({ x: 0, y: 0 });
  live.current = drag;

  /* Edge autoscroll: within 56px of a scroller's edge the grid moves under the
     hand, faster the closer the pointer is. Runs on its own frame loop so a
     pointer held still at the edge keeps scrolling. */
  React.useEffect(() => {
    if (!drag) return undefined;
    let raf = 0;
    function step() {
      const p = at.current;
      const sc = scrollerAt(p.x, p.y);
      if (sc) {
        const r = sc.getBoundingClientRect();
        const EDGE = 56;
        const down = p.y > r.bottom - EDGE ? (p.y - (r.bottom - EDGE)) / EDGE : 0;
        const up = p.y < r.top + EDGE ? (p.y - (r.top + EDGE)) / EDGE : 0;
        const v = (down || up) * 14;
        if (v) sc.scrollTop += v;
      }
      raf = window.requestAnimationFrame(step);
    }
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [!!drag]);

  React.useEffect(() => {
    function move(e) {
      at.current = { x: e.clientX, y: e.clientY };
      const a = armed.current;
      if (a && !live.current) {
        if (Math.abs(e.clientX - a.x0) + Math.abs(e.clientY - a.y0) < THRESHOLD) return;
        setDrag({ item: a.item, mode: a.mode, x: e.clientX, y: e.clientY, over: null, from: { x: a.x0, y: a.y0 } });
        return;
      }
      if (!live.current) return;
      last.current = { x: e.clientX, y: e.clientY };
      if (pending.current) return;
      pending.current = window.requestAnimationFrame(() => {
        pending.current = 0;
        const p = last.current;
        if (!p || !live.current) return;
        const over = targetAt(p.x, p.y);
        setDrag((d) => {
          if (!d) return d;
          /* Nothing to publish if the frame changed nothing. */
          const same = d.x === p.x && d.y === p.y
            && (d.over === over || (d.over && over && d.over.kind === over.kind && d.over.date === over.date && d.over.time === over.time));
          return same ? d : Object.assign({}, d, { x: p.x, y: p.y, over: over });
        });
      });
    }
    function up(e) {
      const d = live.current;
      armed.current = null;
      if (!d) return;
      const over = targetAt(e.clientX, e.clientY);
      setDrag(null);
      if (over) { onDrop(d.item, over, d.mode); return; }
      /* Missed: the card travels back to where it was picked up. The only
         movement in the product that is not a state change — it is the
         gesture being undone, and it has to be visible to read as undone. */
      setReturning({ item: d.item, from: { x: d.x, y: d.y }, to: d.from });
      window.setTimeout(() => setReturning(null), 200);
    }
    function key(e) { if (e.key === "Escape") { armed.current = null; setDrag(null); } }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", key);
    return () => {
      if (pending.current) window.cancelAnimationFrame(pending.current);
      pending.current = 0;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", key);
    };
  }, []);

  /* Spread onto any element that should be draggable. */
  function dragProps(item, mode) {
    return {
      onPointerDown: (e) => {
        if (e.button !== 0) return;
        armed.current = { item: item, mode: mode || "place", x0: e.clientX, y0: e.clientY };
      }
    };
  }
  return [drag, dragProps, returning];
}

function targetAt(x, y) {
  const el = document.elementFromPoint(x, y);
  const node = el && el.closest ? el.closest("[data-drop]") : null;
  if (!node) return null;
  const kind = node.getAttribute("data-drop");
  if (kind === "timeline") {
    const r = node.getBoundingClientRect();
    const hourH = parseFloat(node.getAttribute("data-hour-h")) || 46;
    const start = parseFloat(node.getAttribute("data-start")) || 0;
    const offset = parseFloat(node.getAttribute("data-offset")) || 0;
    const t = snapTime(start + (y - r.top + node.scrollTop - offset) / hourH);
    return { kind: "timeline", time: t, label: hhmmOf(t), node: node, date: node.getAttribute("data-date") };
  }
  return { kind: kind, id: node.getAttribute("data-id"), date: node.getAttribute("data-date"), label: node.getAttribute("data-label"), node: node };
}

/* Is this element the one being dragged? Sources use it to go pale. */
function isDragged(drag, item) {
  return !!(drag && drag.item && (drag.item.id != null ? drag.item.id === item.id : drag.item.title === item.title));
}

/* The card under the hand, and the same card travelling home after a miss.
   The card is the block, not a summary of it: white surface, rail, circle —
   what it will look like once it lands. It follows the pointer on a spring
   (0.32 of the remaining distance each frame) and leans into its own velocity,
   so the hand feels weight instead of a rigidly pinned rectangle. */
function DragGhost({ drag, returning }) {
  const [settled, setSettled] = React.useState(false);
  const [pos, setPos] = React.useState(null);
  const target = React.useRef(null);
  const frame = React.useRef(0);
  target.current = drag ? { x: drag.x, y: drag.y } : null;

  React.useEffect(() => {
    if (!drag) { setPos(null); return undefined; }
    function tick() {
      setPos((p) => {
        const t = target.current;
        if (!t) return p;
        if (!p) return { x: t.x, y: t.y, vx: 0, vy: 0 };
        const nx = p.x + (t.x - p.x) * 0.32;
        const ny = p.y + (t.y - p.y) * 0.32;
        return { x: nx, y: ny, vx: nx - p.x, vy: ny - p.y };
      });
      frame.current = window.requestAnimationFrame(tick);
    }
    frame.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame.current);
  }, [!!drag]);

  React.useEffect(() => {
    if (!returning) { setSettled(false); return undefined; }
    const id = window.requestAnimationFrame(() => setSettled(true));
    return () => window.cancelAnimationFrame(id);
  }, [returning]);

  if (!drag && !returning) return null;
  const it = (drag || returning).item;
  const at = returning ? (settled ? returning.to : returning.from) : (pos || { x: drag.x, y: drag.y });
  const lean = Math.max(-7, Math.min(7, (pos && pos.vx ? pos.vx : 0) * 0.6));
  const over = drag && drag.over;
  const says = !drag ? "Back where it was"
    : over && over.kind === "timeline" ? over.label
    : over && over.kind === "day" ? over.label
    : over && over.kind === "focus" ? "Focus on this"
    : over && over.kind === "row" ? "Move here"
    : "Drop on a free slot, a day, or Focus";

  return (
    <div style={{ position: "fixed", left: at.x + 12, top: at.y - 16, zIndex: 900, pointerEvents: "none",
      minWidth: 196, maxWidth: 290, display: "flex", alignItems: "stretch", overflow: "hidden",
      borderRadius: "var(--radius-md)", background: "var(--surface-raised)",
      boxShadow: "var(--shadow-floating)", transform: "rotate(" + (returning ? 0 : lean) + "deg) scale(1.02)",
      opacity: returning ? (settled ? 0 : 1) : 1,
      transition: returning ? "left 0.18s ease, top 0.18s ease, opacity 0.18s ease" : "transform 0.12s linear" }}>
      <span aria-hidden="true" style={{ width: 3, flex: "none", background: over && over.kind === "focus" ? "var(--accent)" : it.overdue ? "var(--destructive)" : "var(--info)" }} />
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, padding: "7px 10px" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-hidden="true" style={{ width: 13, height: 13, flex: "none", borderRadius: "50%", boxShadow: "var(--shadow-inset-ring)" }} />
          <span style={{ minWidth: 0, font: "var(--type-ui-medium)", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it.title}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 19, font: "var(--type-meta)", color: "var(--text-quaternary)", fontVariantNumeric: "tabular-nums" }}>
          <span style={{ color: over ? "var(--accent)" : "var(--text-quaternary)" }}>{says}</span>
          {it.est ? <span>{it.est} min</span> : null}
        </span>
      </span>
    </div>
  );
}

/* Would this landing be refused? A task cannot take time that has already
   gone, and it cannot take a block the scheduler is not allowed to move. */
function blockedLanding(items, start, end, now) {
  if (now != null && end <= now) return "Already gone";
  const hit = items.filter((b) => b.start < end && b.end > start && !b.movable)[0];
  return hit ? "Fixed: " + hit.title : null;
}

Object.assign(window, { useDrag, DragGhost, targetAt, snapTime, hhmmOf, isDragged, blockedLanding, scrollerAt, SNAP, THRESHOLD });
