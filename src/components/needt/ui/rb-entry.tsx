/* THE TWO-MINUTE ENTRY.
 *
 * The one thing on a block you press, so the one thing built as a control: the
 * raised default button, 28px tall at `--radius-lg`, the arrow in the
 * project's hue, the cost right-aligned. On hover the label cross-fades to
 * "Start the focus" and the whole button answers in the accent.
 *
 * Not a green fill. A solid colour on a button is the thing this system does
 * not do, and `--success` means "done" — the opposite of an invitation. The
 * rest, the hover and the reduced-motion case live in `needt-themes.css` under
 * `.rb-entry`, because both labels share one grid cell and only the opacity
 * pair there keeps one of them hidden.
 */
import * as React from "react";

import { RbGlyph } from "./glyph";

type WithVars = React.CSSProperties & Record<`--${string}`, string>;

export function RbEntry({ label, hue }: { label: string; hue: string }) {
  const style: WithVars = {
    display: "flex",
    alignItems: "center",
    gap: 7,
    minWidth: 0,
    maxWidth: "100%",
    height: 28,
    padding: "0 10px 0 8px",
    border: 0,
    cursor: "default",
    borderRadius: "var(--radius-lg)",
    "--rb-ink": `color-mix(in oklab, ${hue} 70%, var(--text-primary))`,
  };
  return (
    <button
      type="button"
      className="rb-entry"
      onClick={(event) => event.stopPropagation()}
      style={style}
    >
      <span className="rb-arrow" style={{ flex: "none", display: "flex" }}>
        <RbGlyph name="arrow-right" size={13} />
      </span>
      <span style={{ display: "grid", minWidth: 0 }}>
        <span
          className="rb-rest"
          style={{
            gridArea: "1 / 1",
            minWidth: 0,
            font: "var(--type-ui-medium)",
            color: "inherit",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
        <span
          className="rb-hot"
          aria-hidden="true"
          style={{
            gridArea: "1 / 1",
            minWidth: 0,
            font: "var(--type-ui-medium)",
            color: "inherit",
            whiteSpace: "nowrap",
          }}
        >
          Start the focus
        </span>
      </span>
      <span
        className="rb-cost"
        style={{
          flex: "none",
          font: "var(--type-meta)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        2 min
      </span>
    </button>
  );
}
