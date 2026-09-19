"use client";

/* THE WALLS — Overdue parked off the left edge, Tomorrow off the right.
 *
 * Overdue is the only thing competing with today for today's hours, so it
 * sits beside the day rather than a screen away — but it must not compete for
 * the eye while you are reading Today. Parked, a wall shows only its 22px lip
 * at low opacity: "you can see something is stacked out there but cannot read
 * it." Reaching the lip slides the whole shelf in OVER the day, because the
 * thing you are reading must not move while you look somewhere else.
 *
 * Geometry is `wallGeometry()` from `./logic` — pure numbers, tested without a
 * DOM. This file only turns those numbers into a transform and decides who
 * gets the pointer: the wall's own containing block (`TodayForm`'s room) is
 * `overflow: clip`, and everywhere outside the shelf itself is
 * `pointer-events: none`, or a parked shelf becomes a transparent shield
 * across a third of the screen.
 */
import * as React from "react";

import { Count, SidebarHint } from "../shell/chrome";

import { type WallSide, WALL_WIDTH, wallGeometry } from "./logic";

export interface WallProps {
  side: WallSide;
  title: string;
  count: number;
  /** A trailing header control — Overdue's "move everything to today". */
  action?: React.ReactNode;
  /** Shown when there is nothing on this wall. */
  emptyText: string;
  children?: React.ReactNode;
}

export function Wall({ side, title, count, action, emptyText, children }: WallProps) {
  const [extended, setExtended] = React.useState(false);
  const geo = wallGeometry(side, extended);
  const extend = React.useCallback(() => setExtended(true), []);
  const retract = React.useCallback(() => setExtended(false), []);

  return (
    <div
      /* The room, not the shelf, clips — this box only positions it. Its own
         width is exactly the shelf's rest width, so it never steals pointer
         area the shelf itself has given up. */
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [side]: 0,
        width: WALL_WIDTH,
        display: "flex",
        justifyContent: side === "left" ? "flex-start" : "flex-end",
        pointerEvents: "none",
      }}
    >
      <section
        onMouseEnter={extend}
        onMouseLeave={retract}
        onFocus={extend}
        onBlur={retract}
        style={{
          position: "relative",
          width: WALL_WIDTH,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "10px 12px 12px",
          borderRadius: "var(--radius-3xl)",
          background: "var(--surface-raised)",
          boxShadow: "var(--shadow-ring)",
          /* Only the shelf itself — lip sliver or full body — takes the
             pointer; the room around it stays click-through. */
          pointerEvents: "auto",
          opacity: geo.opacity,
          transform: `translateX(${geo.translateX}px)`,
          transition:
            "transform var(--transition-hover), opacity var(--transition-hover)",
        }}
      >
        <header style={{ display: "flex", alignItems: "baseline", gap: 8, height: 28, flex: "none" }}>
          <span style={{ font: "var(--type-card-title)", fontSize: 13, color: "var(--text-primary)" }}>
            {title}
          </span>
          {count ? <Count n={count} /> : null}
          {action ? <span style={{ marginLeft: "auto" }}>{action}</span> : null}
        </header>
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            paddingBottom: 8,
          }}
        >
          {children ?? <SidebarHint>{emptyText}</SidebarHint>}
        </div>
      </section>
    </div>
  );
}

/** The gutter shade — belongs to the room. Drawn once by `TodayForm` above
 * both walls, so it never clips away with a parked shelf's own transform. */
export function WallShade({ side }: { side: WallSide }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        top: 0,
        bottom: 0,
        [side]: 0,
        width: WALL_WIDTH,
        pointerEvents: "none",
        background: `linear-gradient(to ${side === "left" ? "right" : "left"}, color-mix(in oklab, var(--background) 55%, transparent), transparent)`,
      }}
    />
  );
}
