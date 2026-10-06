/* THE FLAME — a category's impulse, drawn rather than counted.
 *
 * A number here would read as a target; height reads as heat. The measure is
 * how much the category has moved lately — parts closed plus tasks closed,
 * tasks weighted double — normalised to 0…1. A cold category has no flame at
 * all, so there is nothing to switch off.
 *
 * Silhouette: three nested clipped polygons whose apex sits over the middle of
 * a level base. Each layer runs its own clock and leans by a small skew about
 * that base, so the shape never repeats and the tip never leaves the base.
 * Height comes from the element's style — the data — and the animation only
 * supplies the flicker (see .flame in the host stylesheet).
 *
 * Props: heat (0…1) · min/max (px, the height the heat maps onto). */
function impulseOf(items) {
  const parts = items.reduce((n, t) => n + ((t.parts || []).filter((p) => p.done).length), 0);
  const closed = items.filter((t) => t.done).length;
  return Math.min((parts + closed * 2) / 6, 1);
}

function Flame({ heat, min, max, title }) {
  if (!heat) return null;
  const lo = min || 9;
  const hi = max || 18;
  return (
    <span className="flame" aria-hidden="true"
      title={title || "Impulse: parts and tasks closed lately. Taller means this category is moving."}
      style={{ height: Math.round(lo + heat * (hi - lo)) }}><i /><i /><i /></span>
  );
}

Object.assign(window, { Flame, impulseOf });
