"use client";

/* THE GHOST — the real block under the hand.
 *
 * PORT.md §5: "Pick up anywhere, not just the sidebar. The ghost is the real
 * block under the hand." The prototype drew a hand-rolled card that
 * summarised the task; the port does not fork `RichBlock` for a second
 * telling of the same object (`RichBlock.tsx`'s own header: "one component,
 * do not fork it per surface"), so this renders the identical component the
 * row and the grid use, at the same `rbShape`, through the compact "card"
 * treatment `Sidebar`'s own unplaced queue already uses for a task that has
 * left its row. What you are carrying looks exactly like what it will look
 * like once it lands.
 *
 * Position is written straight to the element every frame — never through
 * React state — the same rule `cursor/AgentCursor.tsx` keeps for the same
 * reason: through state the ghost's own tree re-renders on every frame it is
 * visible; through `translate3d` nothing re-renders and nothing forces
 * layout (PORT.md §8). The ghost follows the pointer on a spring (closing
 * `FOLLOW` of the remaining distance each frame) and leans into its own
 * velocity, so the hand feels weight instead of a rigidly pinned rectangle.
 */
import * as React from "react";

import { RichBlock } from "../../RichBlock";
import { rbShape } from "../../rb-shape";
import { describeDropTarget } from "./geometry";
import type { DragState, ReturningState } from "./useDrag";

export interface DragGhostProps {
  readonly drag: DragState | null;
  readonly returning: ReturningState | null;
  /** A dark ground wants the quieter edge `RichBlock` already knows about. */
  readonly dark?: boolean;
  /**
   * Overrides the target description with a named refusal — "Already gone",
   * "Fixed: 1:1 Anna" — from `blockedLanding`. Only a surface that knows what
   * already occupies the grid (the calendar) can compute one; this component
   * has no view of neighbouring blocks, so it draws whatever it is handed
   * and otherwise falls back to `describeDropTarget`.
   */
  readonly refusal?: string | null;
}

/** How much of the remaining distance the ghost closes each frame — a
 *  spring, not a rigid pin. */
const FOLLOW = 0.32;
/** Clamp on the lean, in degrees, so a fast flick does not spin the card. */
const LEAN_MAX = 7;

export function DragGhost({
  drag,
  returning,
  dark = false,
  refusal = null,
}: DragGhostProps) {
  const root = React.useRef<HTMLDivElement | null>(null);
  const pos = React.useRef<{ x: number; y: number } | null>(null);
  const target = React.useRef<{ x: number; y: number } | null>(null);
  target.current = drag ? { x: drag.x, y: drag.y } : null;
  const frame = React.useRef(0);
  const [settled, setSettled] = React.useState(false);

  const place = React.useCallback((x: number, y: number, lean: number) => {
    const node = root.current;
    if (!node) return;
    const clamped = Math.max(-LEAN_MAX, Math.min(LEAN_MAX, lean));
    node.style.transform = `translate3d(${x + 12}px, ${y - 16}px, 0) rotate(${clamped}deg) scale(1.02)`;
  }, []);

  /* An element that has only just started a drag has never been written to.
     Placing it here — before the first rAF tick — saves the one frame where
     the ghost would otherwise flash at the origin (the same reasoning as
     `AgentCursor`'s own `useLayoutEffect`). */
  React.useLayoutEffect(() => {
    if (!drag || pos.current) return;
    pos.current = { x: drag.x, y: drag.y };
    place(drag.x, drag.y, 0);
  });

  React.useEffect(() => {
    if (!drag) {
      pos.current = null;
      return undefined;
    }
    function tick() {
      const t = target.current;
      const p = pos.current;
      if (t && p) {
        const nx = p.x + (t.x - p.x) * FOLLOW;
        const ny = p.y + (t.y - p.y) * FOLLOW;
        const vx = nx - p.x;
        pos.current = { x: nx, y: ny };
        place(nx, ny, vx * 0.6);
      }
      frame.current = window.requestAnimationFrame(tick);
    }
    frame.current = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame.current);
  }, [drag, place]);

  React.useEffect(() => {
    if (!returning) {
      setSettled(false);
      return undefined;
    }
    const id = window.requestAnimationFrame(() => setSettled(true));
    return () => window.cancelAnimationFrame(id);
  }, [returning]);

  if (!drag && !returning) return null;

  const item = (drag ?? returning)?.item;
  if (!item) return null;

  const says = !drag
    ? "Back where it was"
    : (refusal ?? describeDropTarget(drag.over));
  /* While returning the trip is a one-shot CSS transition, not a per-frame
     spring, so React owns `transform` for that branch only — the rAF loop
     above owns it exclusively while a drag is live, and the two are never
     both writing to the node in the same render. */
  const homeward = returning ? (settled ? returning.to : returning.from) : null;

  return (
    <div
      ref={root}
      aria-hidden="true"
      style={{
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: "var(--z-splash)" as unknown as number,
        pointerEvents: "none",
        minWidth: 196,
        maxWidth: 290,
        willChange: "transform",
        transform: homeward
          ? `translate3d(${homeward.x + 12}px, ${homeward.y - 16}px, 0)`
          : undefined,
        opacity: returning ? (settled ? 0 : 1) : 1,
        transition: returning
          ? "transform 0.18s ease, opacity 0.18s ease"
          : undefined,
      }}
    >
      <RichBlock
        block={rbShape(item, { layout: "card", dense: true })}
        weight="compressed"
        fit
        dark={dark}
      />
      <div
        style={{
          marginTop: 4,
          padding: "3px 8px",
          borderRadius: "var(--radius-sm)",
          background: "var(--surface-raised)",
          boxShadow: "var(--shadow-floating)",
          font: "var(--type-meta)",
          color: refusal
            ? "var(--destructive)"
            : drag?.over
              ? "var(--accent)"
              : "var(--text-quaternary)",
        }}
      >
        {says}
      </div>
    </div>
  );
}
