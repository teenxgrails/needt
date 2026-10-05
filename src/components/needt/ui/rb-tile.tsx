/* THE TILE — a squircle with a body, not a flat swatch.
 *
 * The hue lifts toward the top where the light is, a hairline sits inside the
 * edge, and the inside darkens at the bottom. That is what makes a dock icon
 * read as an object; a flat square reads as a colour sample.
 *
 * The tile says WHERE THE BLOCK CAME FROM: the source's mark when there is
 * one, the glyph for the kind of thing when there is not.
 */
import * as React from "react";

import type { RbSourceId } from "../rb-shape";
import { RbGlyph, type RbGlyphName } from "./glyph";
import { RbMark } from "./rb-mark";

export function RbTile({
  hue,
  glyph,
  mark,
  size = 34,
  locked = false,
}: {
  hue: string;
  glyph: RbGlyphName;
  mark?: RbSourceId | null;
  size?: number;
  locked?: boolean;
}) {
  const radius = Math.round(size * 0.295);
  return (
    <span
      style={{ position: "relative", flex: "none", width: size, height: size }}
    >
      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: radius,
          display: "grid",
          placeItems: "center",
          /* One step of lift across the tile, and a hairline — the same
             ring-first language as every other surface in the product. */
          background: `linear-gradient(180deg, color-mix(in oklab, ${hue} 90%, white) 0%, color-mix(in oklab, ${hue} 96%, black) 100%)`,
          boxShadow: "inset 0 0 0 0.5px rgba(0, 0, 0, 0.14)",
          color: "#fff",
        }}
      >
        <span className="rb-tile-glyph" style={{ display: "flex" }}>
          {mark ? (
            <RbMark mark={mark} size={Math.round(size * 0.5)} />
          ) : (
            <RbGlyph name={glyph} size={Math.round(size * 0.52)} />
          )}
        </span>
      </span>
      {locked ? (
        <span
          aria-hidden="true"
          title="Fixed: the scheduler may not move it"
          style={{
            position: "absolute",
            right: -3,
            bottom: -3,
            width: 14,
            height: 14,
            borderRadius: 7,
            display: "grid",
            placeItems: "center",
            background: "var(--surface-raised)",
            boxShadow: "var(--shadow-ring)",
            color: "var(--text-tertiary)",
          }}
        >
          <RbGlyph name="lock" size={9} />
        </span>
      ) : null}
    </span>
  );
}
