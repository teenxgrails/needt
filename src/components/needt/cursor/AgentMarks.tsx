"use client";

/* THE MARGIN MARK — the receipt.
 *
 * The animation is the verb. It says who changed the thing, and it says it
 * while the change is happening, which is the only moment the claim can be
 * checked. Then it is over — and a verb that is over leaves the person exactly
 * where they were before: a screen that is subtly different from the one they
 * remember, with nothing on it saying which parts moved.
 *
 * So the hand leaves a mark. It stands in the MARGIN, beside the row it
 * touched, and it stays. A day with four marks down its left edge can be read
 * by scanning — here, here, here and here is what changed since you looked —
 * rather than re-read line by line to find out.
 *
 * IT IS A MARK, NOT A SURFACE. PORT.md §0 rule 3: the accent is never a solid
 * fill on a button or a surface, and it is exactly right on a mark — a switch
 * knob, a radio centre, a status dot. This is a status dot, six pixels, solid
 * accent, and it wears the token sheet's own `.nt-dot` so it is the same mark
 * the rest of the product makes. A tinted plate behind it, or a chip with a
 * label, would be a surface in the accent and would break the rule.
 *
 * The note is not printed beside it. Twelve marks each with a line of text is
 * a second column of prose down the margin, which is the opposite of scanning;
 * the mark carries its line in its label, where an ask reveals it.
 */
import * as React from "react";

import { Dot } from "../shell/chrome";
import { boxOf, clipOf, viewportBox } from "./dom";
import { type Box, MARK_DOT, markPoint, withinClip } from "./motion";
import type { AgentMark } from "./types";

interface Placed {
  readonly mark: AgentMark;
  readonly x: number;
  readonly y: number;
}

export interface AgentMarksProps {
  marks: readonly AgentMark[];
  /** The scope the marks are measured inside. */
  shellSelector: string;
}

/**
 * WHERE EACH MARK SITS, RE-ASKED ONLY WHEN IT CAN HAVE CHANGED. Measuring is
 * the expensive question in this app (§8), so it is asked on arrival, on
 * resize, and on scroll — including inner scrollers, which is what the capture
 * phase is for — and every one of those is coalesced into a single frame.
 */
export function AgentMarks({ marks, shellSelector }: AgentMarksProps) {
  const root = React.useRef<HTMLDivElement | null>(null);
  const [placed, setPlaced] = React.useState<readonly Placed[]>([]);

  React.useEffect(() => {
    if (!marks.length) {
      setPlaced([]);
      return undefined;
    }

    let frame = 0;

    function measure() {
      frame = 0;
      const shell: Box =
        boxOf(root.current?.closest(shellSelector) ?? null) ?? viewportBox();
      const next: Placed[] = [];
      for (const mark of marks) {
        const el = document.querySelector(mark.target);
        const row = boxOf(el);
        if (!el || !row) continue;
        if (!withinClip(row, clipOf(el))) continue;
        const point = markPoint(row, shell);
        next.push({ mark, x: point.x, y: point.y });
      }
      setPlaced(next);
    }

    function schedule() {
      if (frame) return;
      frame = window.requestAnimationFrame(measure);
    }

    schedule();
    window.addEventListener("scroll", schedule, {
      capture: true,
      passive: true,
    });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [marks, shellSelector]);

  return (
    <div
      ref={root}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: "var(--z-sticky)" as unknown as number,
        pointerEvents: "none",
      }}
    >
      {placed.map(({ mark, x, y }) => (
        <span
          key={mark.id}
          role="img"
          aria-label={`Needt: ${mark.note}`}
          title={mark.note}
          style={{
            position: "fixed",
            left: 0,
            top: 0,
            display: "block",
            /* One transform, so the mark is one composited layer that moves
               with its row instead of two numbers that can disagree. */
            transform: `translate3d(${x - MARK_DOT / 2}px, ${y - MARK_DOT / 2}px, 0)`,
            pointerEvents: "auto",
          }}
        >
          <Dot tone="accent" />
        </span>
      ))}
    </div>
  );
}
