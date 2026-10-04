/* A PAYLOAD PILL. One shape for every fact that fits on a line.
 *
 * The hue lives in the small plate behind the glyph and nowhere else: the text
 * stays on the ladder, so the pill reads the same whatever colour the project
 * happens to own.
 */
import * as React from "react";

import { RbGlyph, type RbGlyphName } from "./glyph";

export function RbPill({
  glyph,
  hue,
  strong = false,
  children,
}: {
  glyph?: RbGlyphName;
  hue: string;
  /** A place is somewhere you have to be, so its plate carries the hue solid. */
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        flex: "0 0 auto",
        minWidth: 0,
        maxWidth: "100%",
        height: 24,
        padding: glyph ? "0 8px 0 4px" : "0 8px",
        borderRadius: "var(--radius-sm)",
        background: "var(--fill-2)",
        boxShadow: "var(--shadow-inset-ring)",
      }}
    >
      {glyph ? (
        <span
          style={{
            flex: "none",
            display: "grid",
            placeItems: "center",
            width: 18,
            height: 18,
            borderRadius: 5,
            background: strong
              ? hue
              : `color-mix(in oklab, ${hue} 34%, transparent)`,
            color: strong ? "#fff" : `color-mix(in oklab, ${hue} 72%, white)`,
          }}
        >
          <RbGlyph name={glyph} size={11} />
        </span>
      ) : null}
      <span
        style={{
          minWidth: 0,
          font: "var(--type-meta-medium)",
          color: "var(--text-secondary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </span>
    </span>
  );
}
