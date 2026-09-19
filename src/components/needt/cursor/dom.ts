/* THE FEW QUESTIONS THIS SUBSYSTEM ASKS THE DOM.
 *
 * All of them force layout to answer, so all of them are asked in one place
 * and at moments chosen on purpose — PORT.md §8: never inside a pointer or
 * frame callback, cached, and invalidated on scroll and resize. A reach
 * measures its target once, at the step that starts it; the marks re-measure
 * once per scroll or resize, coalesced into a single frame.
 */
import type { Box, Point } from "./motion";

/** A rect, flattened to the four numbers the maths reads. */
export function boxOf(el: Element | null): Box | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
}

export function centreOf(box: Box): Point {
  return {
    x: box.left + (box.right - box.left) / 2,
    y: box.top + (box.bottom - box.top) / 2,
  };
}

/** The window, for the case where the shell cannot be found. */
export function viewportBox(): Box {
  return {
    left: 0,
    top: 0,
    right: window.innerWidth,
    bottom: window.innerHeight,
  };
}

/**
 * What actually scrolls this element. A mark belongs to a row, and a row that
 * has scrolled out of its own container takes its mark with it — so the
 * clipping rect is the nearest ancestor that scrolls, and the window when
 * nothing does.
 */
export function clipOf(el: Element): Box {
  let node: Element | null = el.parentElement;
  while (node) {
    const style = window.getComputedStyle(node);
    const flow = `${style.overflowY} ${style.overflowX}`;
    if (/auto|scroll|hidden/.test(flow)) {
      const box = boxOf(node);
      if (box) return box;
    }
    node = node.parentElement;
  }
  return viewportBox();
}

/** With it on, the cursor does not fly. The change and its mark still happen. */
export function prefersStillness(): boolean {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Typing into a real input. React installs its own value setter on the
 * instance, so writing `el.value` updates the DOM and tells React nothing;
 * the prototype's descriptor dance is the fix and it is still the fix.
 */
export function typeInto(el: Element, text: string): void {
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const proto =
      el instanceof HTMLInputElement
        ? HTMLInputElement.prototype
        : HTMLTextAreaElement.prototype;
    const native = Object.getOwnPropertyDescriptor(proto, "value");
    if (native?.set) {
      native.set.call(el, text);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
  }
  el.textContent = text;
}

/** Press it. A decorative target has nothing to click, and that is allowed. */
export function pressOn(el: Element): void {
  if (el instanceof HTMLElement) {
    try {
      el.click();
    } catch {
      /* A target that refuses a synthetic press is not a failed run. */
    }
  }
}
