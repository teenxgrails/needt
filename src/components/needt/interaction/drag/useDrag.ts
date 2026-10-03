"use client";

/* THE DRAG GESTURE — one hook for the whole product.
 *
 * Ported from `Content height and label fixes/needt-app/Drag.jsx`. Pick up
 * anywhere, not just the sidebar: `dragProps(task)` spreads onto whatever
 * should be draggable, and its shape is exactly what `Sidebar`'s own
 * `dragProps` prop already expects (`(task: NeedtTask) =>
 * React.HTMLAttributes<HTMLElement>`), so a caller can hand this hook's
 * return straight to the shell with no adapter.
 *
 * The gesture: press, move `DRAG_THRESHOLD_PX`, and only then is it a drag —
 * a press that does not travel stays a click, so the same task can be
 * opened, closed and moved from one target. A drop on nothing sends the item
 * back where it was picked up rather than silently swallowing the move.
 *
 * PORT.md §8, obeyed here and not treated as optional:
 *   1. Pointer work is coalesced into one rAF. A pointer reports at display
 *      rate; this publishes the drag state once per animation frame, and
 *      publishes nothing when neither the point nor the resolved target
 *      changed (`sameDropTarget`, from `./geometry`).
 *   2. `getBoundingClientRect` never runs inside `pointermove` — `./dom.ts`
 *      caches it per element (`DropRectCache`) and the cache is cleared on
 *      scroll and resize, not on every frame.
 *   3. Nothing here is a `ResizeObserver` per card; the rect cache is the
 *      container-level answer to the same problem, shared across the whole
 *      drag rather than per dragged element.
 *   4. "Where we are" is read from a ref (`live`), not from the closure that
 *      created the listener, so a stale drag state cannot survive a
 *      re-render the way a `goScreen` built from a dependency-array miss
 *      could.
 */
import * as React from "react";

import type { NeedtTask } from "@/lib/needt/types";

import { DropRectCache, dropTargetAt, scrollerAt } from "./dom";
import {
  DRAG_THRESHOLD_PX,
  type DragPoint,
  type DropTarget,
  sameDropTarget,
} from "./geometry";

/** Within 56px of a scroller's edge the grid moves under the hand, faster
 *  the closer the pointer sits to the edge. */
const AUTOSCROLL_EDGE_PX = 56;
const AUTOSCROLL_MAX_PX = 14;
/** How long the "missed" card takes to travel back to where it was picked
 *  up — the one movement in the product that is not a state change. */
const RETURN_MS = 200;

export interface DragState {
  readonly item: NeedtTask;
  readonly mode: string;
  readonly x: number;
  readonly y: number;
  readonly over: DropTarget | null;
  readonly from: DragPoint;
}

export interface ReturningState {
  readonly item: NeedtTask;
  readonly from: DragPoint;
  readonly to: DragPoint;
}

export interface UseDragResult {
  /** `null` until a press has travelled past the threshold. */
  readonly drag: DragState | null;
  /** Spread onto anything that should be draggable. */
  readonly dragProps: (
    task: NeedtTask,
    mode?: string
  ) => React.HTMLAttributes<HTMLElement>;
  /** The card travelling home after a drop that landed on nothing. */
  readonly returning: ReturningState | null;
}

interface Armed {
  readonly item: NeedtTask;
  readonly mode: string;
  readonly x0: number;
  readonly y0: number;
}

/**
 * @param onDrop Called once, when a drag ends over a resolved target. Never
 *   called for a miss — that case plays `returning` instead.
 */
export function useDrag(
  onDrop: (item: NeedtTask, target: DropTarget, mode: string) => void
): UseDragResult {
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const [returning, setReturning] = React.useState<ReturningState | null>(null);

  const armed = React.useRef<Armed | null>(null);
  /* Rule 4: the pointer handlers read the live drag off this ref rather than
     off the `drag` a stale closure captured. */
  const live = React.useRef<DragState | null>(null);
  live.current = drag;
  const last = React.useRef<DragPoint | null>(null);
  const pending = React.useRef(0);
  const at = React.useRef<DragPoint>({ x: 0, y: 0 });
  const rects = React.useRef(new DropRectCache());
  const onDropRef = React.useRef(onDrop);
  onDropRef.current = onDrop;

  /* Edge autoscroll: its own frame loop, so a pointer held still at the edge
     keeps scrolling rather than needing another `pointermove` to progress.
     Restarting it on every published drag frame (the dependency below) costs
     one cancel and one request — nothing near the layout `elementFromPoint`
     forces, which is the cost §8 actually warns about. */
  React.useEffect(() => {
    if (!drag) return undefined;
    let raf = 0;
    function step() {
      const p = at.current;
      const scroller = scrollerAt(p.x, p.y);
      if (scroller) {
        const r = scroller.getBoundingClientRect();
        const down =
          p.y > r.bottom - AUTOSCROLL_EDGE_PX
            ? (p.y - (r.bottom - AUTOSCROLL_EDGE_PX)) / AUTOSCROLL_EDGE_PX
            : 0;
        const up =
          p.y < r.top + AUTOSCROLL_EDGE_PX
            ? (p.y - (r.top + AUTOSCROLL_EDGE_PX)) / AUTOSCROLL_EDGE_PX
            : 0;
        const v = (down || up) * AUTOSCROLL_MAX_PX;
        if (v) scroller.scrollTop += v;
      }
      raf = window.requestAnimationFrame(step);
    }
    raf = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(raf);
  }, [drag]);

  /* The rect cache outlives any one drag; it only needs clearing when the
     page might have moved under it — a scroll or a resize, never a frame. */
  React.useEffect(() => {
    const cache = rects.current;
    function invalidate() {
      cache.clear();
    }
    window.addEventListener("scroll", invalidate, true);
    window.addEventListener("resize", invalidate);
    return () => {
      window.removeEventListener("scroll", invalidate, true);
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  React.useEffect(() => {
    function move(e: PointerEvent) {
      at.current = { x: e.clientX, y: e.clientY };
      const a = armed.current;
      if (a && !live.current) {
        if (
          Math.abs(e.clientX - a.x0) + Math.abs(e.clientY - a.y0) <
          DRAG_THRESHOLD_PX
        ) {
          return;
        }
        setDrag({
          item: a.item,
          mode: a.mode,
          x: e.clientX,
          y: e.clientY,
          over: null,
          from: { x: a.x0, y: a.y0 },
        });
        return;
      }
      if (!live.current) return;
      last.current = { x: e.clientX, y: e.clientY };
      /* Rule 1: at most one pending frame. A pointer reporting faster than
         the display coalesces into whichever position is current when the
         frame actually runs. */
      if (pending.current) return;
      pending.current = window.requestAnimationFrame(() => {
        pending.current = 0;
        const p = last.current;
        if (!p || !live.current) return;
        const over = dropTargetAt(p.x, p.y, rects.current);
        setDrag((d) => {
          if (!d) return d;
          const same =
            d.x === p.x && d.y === p.y && sameDropTarget(d.over, over);
          /* Rule 1's other half: nothing published when nothing changed. */
          return same ? d : { ...d, x: p.x, y: p.y, over };
        });
      });
    }

    function up(e: PointerEvent) {
      const d = live.current;
      armed.current = null;
      if (!d) return;
      const over = dropTargetAt(e.clientX, e.clientY, rects.current);
      setDrag(null);
      if (over) {
        onDropRef.current(d.item, over, d.mode);
        return;
      }
      setReturning({ item: d.item, from: { x: d.x, y: d.y }, to: d.from });
      window.setTimeout(() => setReturning(null), RETURN_MS);
    }

    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        armed.current = null;
        setDrag(null);
      }
    }

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

  const dragProps = React.useCallback(
    (task: NeedtTask, mode = "place"): React.HTMLAttributes<HTMLElement> => ({
      onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return;
        armed.current = { item: task, mode, x0: e.clientX, y0: e.clientY };
      },
    }),
    []
  );

  return { drag, dragProps, returning };
}
