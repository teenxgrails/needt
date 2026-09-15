"use client";

/* AN EMPTY SCREEN, STATED — not a blank box.
 *
 * The shell owns the frame; another agent fills it. So the frame says what
 * belongs here and admits that it is not here yet, which is the difference
 * between a placeholder and a lie.
 *
 * THE GROUND STAYS THE GROUND. There is no sheet under the screen. PORT.md §0
 * rule 6: a sheet under a whole screen makes the screen one big card, and then
 * everything on it is a card on a card. The empty region reads by a hairline
 * and the canvas veil, not by a fill.
 *
 * `<section>` is deliberate: the motion sheet staggers
 * `.screen-enter section:nth-of-type(n)` left to right, which is the order the
 * screens are read in.
 */
import * as React from "react";

import type { IconType } from "react-icons";

import { Glyph } from "./chrome";
import { type NeedtScreenId, needtScreen } from "./screens";

export interface ScreenFrameProps {
  id: NeedtScreenId;
  glyph: IconType;
  /** The screen's own controls, when it has any yet. */
  actions?: React.ReactNode;
  /** The real screen, once it exists. Without it the frame states its absence. */
  children?: React.ReactNode;
}

export function ScreenFrame({
  id,
  glyph,
  actions,
  children,
}: ScreenFrameProps) {
  const screen = needtScreen(id);
  return (
    <section
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 16,
        paddingTop: 4,
      }}
    >
      <header
        style={{
          flex: "none",
          display: "flex",
          alignItems: "baseline",
          gap: 11,
          minWidth: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            font: "var(--type-page-title)",
            color: "var(--text-primary)",
          }}
        >
          {screen.title}
        </h1>
        <p
          style={{
            margin: 0,
            minWidth: 0,
            font: "var(--type-meta)",
            color: "var(--text-muted)",
            textWrap: "pretty",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {screen.blurb}
        </p>
        {actions ? (
          <span style={{ marginLeft: "auto", flex: "none" }}>{actions}</span>
        ) : null}
      </header>

      {children ?? (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            display: "grid",
            placeItems: "center",
            borderRadius: "var(--radius-3xl)",
            /* A hairline and the ground, not a surface. */
            boxShadow: "var(--shadow-inset-ring)",
          }}
        >
          <div className="nt-empty">
            <span className="nt-empty-icon">
              <Glyph of={glyph} size={24} />
            </span>
            <span className="nt-empty-text">
              {screen.title} has not been ported yet. The shell is here — the
              rail, the tabs, the keyboard — and this frame is where the screen
              lands.
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
