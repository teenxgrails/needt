"use client";

/* THE NOW-LINE — solid accent, the one place a fill is correct on the grid
 * (PORT.md §0: solid accent is correct on a mark, and the now-line is one).
 */
import * as React from "react";

import { newDate } from "@/lib/date-utils";

import { GRID_START_HOUR, HOUR_HEIGHT_PX, hourOfDay, topForHour } from "./geometry";

export interface NowLineProps {
  gridStart?: number;
  hourHeight?: number;
  /** How often the line re-reads the clock. It is not frame-accurate on
   *  purpose — a minute is close enough for a line that marks "now". */
  tickMs?: number;
}

export function NowLine({
  gridStart = GRID_START_HOUR,
  hourHeight = HOUR_HEIGHT_PX,
  tickMs = 60_000,
}: NowLineProps) {
  const [hour, setHour] = React.useState(() => hourOfDay(newDate()));

  React.useEffect(() => {
    const id = setInterval(() => setHour(hourOfDay(newDate())), tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: topForHour(hour, gridStart, hourHeight),
        height: 0,
        zIndex: 30,
        pointerEvents: "none",
      }}
    >
      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          borderTop: "1px solid var(--accent)",
        }}
      />
      <span
        style={{
          position: "absolute",
          left: 0,
          top: -3,
          width: 6,
          height: 6,
          borderRadius: 3,
          background: "var(--accent)",
        }}
      />
    </span>
  );
}
