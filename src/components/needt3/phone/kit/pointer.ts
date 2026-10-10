/**
 * Window-level pointer tracking for one drag (phone-kit.jsx `pkTrack`), and
 * taking the finger over from the screen's own gestures (`pkOwnGesture`).
 */

export interface Tracker {
  mv: (e: PointerEvent) => void;
  up: (e: PointerEvent) => void;
}

/**
 * Follow one drag on the window: `move(e)` for every pointermove, `end(e)` once
 * on up or cancel, then the listeners are gone. Returns a function that
 * detaches early (an unmount in the middle of a drag).
 */
export function pkTrack(
  move: (e: PointerEvent) => void,
  end: (e: PointerEvent) => void
) {
  const off = () => {
    window.removeEventListener("pointermove", fn.mv, true);
    window.removeEventListener("pointerup", fn.up, true);
    window.removeEventListener("pointercancel", fn.up, true);
  };
  const fn: Tracker = {
    mv: (e) => move(e),
    up: (e) => {
      off();
      end(e);
    },
  };
  window.addEventListener("pointermove", fn.mv, true);
  window.addEventListener("pointerup", fn.up, true);
  window.addEventListener("pointercancel", fn.up, true);
  return off;
}

/**
 * A hold that becomes a lift (a drag) takes the finger: the screen's own
 * trackers get a pointercancel, and touch moves stop scrolling until the
 * returned release() is called.
 */
export function pkOwnGesture(pointerId: number) {
  try {
    window.dispatchEvent(new PointerEvent("pointercancel", { pointerId }));
  } catch {
    /* an old browser without PointerEvent constructors */
  }
  const stop = (e: TouchEvent) => {
    e.stopPropagation();
    if (e.cancelable) e.preventDefault();
  };
  window.addEventListener("touchmove", stop, { capture: true, passive: false });
  return () =>
    window.removeEventListener("touchmove", stop, {
      capture: true,
    } as EventListenerOptions);
}

/**
 * One animation frame per pointer stream: `schedule(fn)` runs `fn` on the
 * next frame, and a second call before then only replaces what runs. So a
 * burst of pointermoves paints once per frame.
 */
export function frameWriter() {
  let raf = 0;
  let next: (() => void) | null = null;
  return {
    schedule(fn: () => void) {
      next = fn;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const run = next;
        next = null;
        run?.();
      });
    },
    cancel() {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      next = null;
    },
  };
}
