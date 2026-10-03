"use client";

/* THE HOUR GUTTER — a dotted rail down its middle, the hour interrupting the
 * dots in a gap it makes.
 *
 * `.cal-stick` (sticky, opaque) and `.cal-rail::after` (the dotted line
 * itself, one dot per quarter hour) are already vendored in
 * `src/styles/needt-*.css` — this component only places the hour labels at
 * their own `topForHour`, each opaque against the page so it reads as a gap
 * cut into the dots rather than text laid over them. Reading a time should
 * never require crossing from the label to the rail.
 */
import * as React from "react";

import { GRID_START_HOUR, HOUR_HEIGHT_PX, formatClock, topForHour } from "./geometry";

export interface HourGutterProps {
  gridStart?: number;
  gridEnd?: number;
  hourHeight?: number;
  use24Hour?: boolean;
  width?: number;
}

export function HourGutter({
  gridStart = GRID_START_HOUR,
  gridEnd = 24,
  hourHeight = HOUR_HEIGHT_PX,
  use24Hour = true,
  width,
}: HourGutterProps) {
  const hours: number[] = [];
  for (let h = gridStart; h < gridEnd; h++) hours.push(h);

  return (
    <div
      className="cal-stick cal-rail"
      style={{ position: "sticky", left: 0, zIndex: 50, width }}
    >
      {hours.map((h) => (
        <span
          key={h}
          style={{
            position: "absolute",
            left: 0,
            right: 8,
            top: topForHour(h, gridStart, hourHeight),
            transform: "translateY(-8px)",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span
            style={{
              padding: "0 6px",
              background: "var(--background)",
              font: "var(--type-meta-medium)",
              color: "var(--text-tertiary)",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {formatClock(h, use24Hour)}
          </span>
        </span>
      ))}
    </div>
  );
}
