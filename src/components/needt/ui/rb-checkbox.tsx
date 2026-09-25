/* THE CLOSE MARK.
 *
 * A checkbox is a MARK, not a surface, which is the one place a solid colour
 * is correct: at rest it is a ring in the project's hue, and once closed it is
 * a filled disc in `--success`. The tick is drawn in the raised surface's own
 * colour so it reads as a hole in the disc rather than white paint on it.
 */
import * as React from "react";

import { RbGlyph } from "./glyph";

export function RbCheckbox({
  done,
  hue,
  label,
  size = 15,
  hitSlop = 0,
  onToggle,
}: {
  done: boolean;
  hue: string;
  /** Named for the task, so a screen reader says which one is being closed. */
  label: string;
  size?: number;
  /**
   * Pixels of invisible target added on every side.
   *
   * The mark stays 15px because that is what was measured; a phone needs 44px
   * of finger. Growing the button itself would reflow every dense row on the
   * desktop, so the target grows instead of the mark: an absolutely positioned
   * child extends past the button and takes the press, and layout never sees
   * it. The phone shell passes enough to clear 44.
   */
  hitSlop?: number;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={done}
      aria-label={label}
      disabled={!onToggle}
      onClick={(event) => {
        event.stopPropagation();
        onToggle?.();
      }}
      style={{
        position: "relative",
        flex: "none",
        width: size,
        height: size,
        padding: 0,
        border: 0,
        borderRadius: size,
        display: "grid",
        placeItems: "center",
        cursor: "default",
        boxShadow: `inset 0 0 0 1.6px ${done ? "var(--success)" : hue}`,
        background: done ? "var(--success)" : "transparent",
        color: "var(--surface-raised)",
        transition:
          "background-color var(--transition-hover), box-shadow var(--transition-hover)",
      }}
    >
      {hitSlop > 0 ? (
        <span
          aria-hidden="true"
          style={{ position: "absolute", inset: -hitSlop }}
        />
      ) : null}
      {done ? <RbGlyph name="check" size={Math.round(size * 0.6)} /> : null}
    </button>
  );
}
