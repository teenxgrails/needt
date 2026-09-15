/* THE FLAME — a category's impulse, drawn rather than counted.
 *
 * Ported from `Content height and label fixes/needt-app/Flame.jsx`. A number
 * here would read as a target; height reads as heat, so the only prop this
 * component draws from is `heat` (0–1) — never a count. Three nested layers
 * flicker on their own clocks (`.flame i` in the vendored
 * `src/styles/needt-motion.css`, already carried over by `npm run
 * tokens:sync` — this file supplies only the height, from data, and the CSS
 * supplies the animation. `data-drift-quiet` (also already vendored, in
 * `needt-themes.css`) slows the flicker at night; nothing here has to know
 * that.
 *
 * `.flame` is not one of `shell/chrome.tsx`'s dual-class primitives — the
 * vendored sheet carries its full static styling (position, aspect-ratio,
 * the animations) under that one name, with no `.nt-flame` counterpart to
 * pair it with, so a single class name here is correct and complete.
 *
 * WHERE `heat` COMES FROM. For a category this is `impulseOf(items)`
 * (`./heat.ts`), a real formula ported unchanged from the prototype. For a
 * single task's own `NeedtTask.heat` there is no formula anywhere — not in
 * the schema, not in the prototype's code, not in any brief; the fixture
 * simply carries a number (0.7, 1, 0.5, …) with nothing that produces it.
 * This component does not invent one: it draws whatever `heat` it is handed
 * and refuses to draw at all when there is none — a cold category has no
 * flame, which is why there is no switch.
 */
export interface FlameProps {
  /** 0–1. `0`, `null` or `undefined` draws nothing. */
  heat?: number | null;
  /** Pixel height at heat 0 (exclusive of the empty case) and at heat 1. */
  min?: number;
  max?: number;
  title?: string;
}

const DEFAULT_TITLE =
  "Impulse: parts and tasks closed lately. Taller means this category is moving.";

export function Flame({ heat, min = 9, max = 18, title }: FlameProps) {
  if (!heat) return null;
  const height = Math.round(min + heat * (max - min));
  return (
    <span
      className="flame"
      aria-hidden="true"
      title={title ?? DEFAULT_TITLE}
      style={{ height }}
    >
      <i />
      <i />
      <i />
    </span>
  );
}
