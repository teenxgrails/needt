/* THE FEW QUESTIONS DRAG ASKS THE DOM.
 *
 * Mirrors `src/components/needt/cursor/dom.ts`: what is here forces layout or
 * walks live nodes, so it is asked in one place, cached, and invalidated on
 * scroll and resize rather than inside `pointermove` — PORT.md §8's second
 * rule ("Never call `getBoundingClientRect()` inside `pointermove`... Cache
 * it; invalidate on scroll and resize"). Not unit tested for the same reason
 * the cursor's is not: it has no meaning outside a real document.
 */
import {
  type DropAttrs,
  type DropTarget,
  resolveDropTarget,
  timelineTimeAt,
} from "./geometry";

/**
 * One cached rect per element, dropped whenever the page might have moved
 * under it. `getBoundingClientRect` forces layout; asking it once per drag
 * frame instead of once per `pointermove` call is the whole rule.
 */
export class DropRectCache {
  private rects = new Map<Element, DOMRect>();

  rectOf(el: Element): DOMRect {
    const cached = this.rects.get(el);
    if (cached) return cached;
    const rect = el.getBoundingClientRect();
    this.rects.set(el, rect);
    return rect;
  }

  clear(): void {
    this.rects.clear();
  }
}

function attrsOf(node: Element): DropAttrs {
  return {
    kind: node.getAttribute("data-drop"),
    id: node.getAttribute("data-id"),
    date: node.getAttribute("data-date"),
    label: node.getAttribute("data-label"),
  };
}

/**
 * The `[data-drop]` node under a point, resolved to what it names. The one
 * `elementFromPoint` call a drag frame makes; the rect it needs for a
 * timeline lands in `rects` and is not asked for again while the same node
 * stays under the pointer.
 */
export function dropTargetAt(
  x: number,
  y: number,
  rects: DropRectCache
): DropTarget | null {
  const el = document.elementFromPoint(x, y);
  const node = el?.closest("[data-drop]") ?? null;
  if (!node) return null;
  const attrs = attrsOf(node);
  if (attrs.kind !== "timeline") return resolveDropTarget(attrs);

  const rect = rects.rectOf(node);
  const hourH = parseFloat(node.getAttribute("data-hour-h") ?? "") || 46;
  const start = parseFloat(node.getAttribute("data-start") ?? "") || 0;
  const offset = parseFloat(node.getAttribute("data-offset") ?? "") || 0;
  const scrollTop = node instanceof HTMLElement ? node.scrollTop : 0;
  const time = timelineTimeAt(y, {
    rectTop: rect.top,
    scrollTop,
    hourH,
    start,
    offset,
  });
  return resolveDropTarget(attrs, time);
}

/**
 * The nearest ancestor that actually scrolls, for edge autoscroll. A drag
 * that reaches the edge of a scrolling grid keeps going instead of stopping
 * at the fold.
 */
export function scrollerAt(x: number, y: number): Element | null {
  let el = document.elementFromPoint(x, y);
  while (el && el !== document.body) {
    const style = window.getComputedStyle(el);
    if (
      (style.overflowY === "auto" || style.overflowY === "scroll") &&
      el.scrollHeight > el.clientHeight + 4
    ) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}
