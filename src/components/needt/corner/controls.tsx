/* THE TWO CONTROLS THE CORNER NEEDS.
 *
 * Local on purpose. `src/components/ui/**` reads a different token set and
 * lives outside the `.needt-v2` scope; the design system's own rules for
 * `.btn`, `.btn-icon` and their variants are already vendored under that
 * scope, so these carry the class names and let the stylesheet do the work.
 *
 * There is no solid-accent variant here, and there is not one in the design
 * system either: `btn-accent` is `--fill-accent` (12%) rising to
 * `--fill-accent-strong` (24%) with the accent as the TEXT colour. Solid
 * accent belongs to marks.
 */
import * as React from "react";

export type CornerButtonVariant = "neutral" | "flat" | "ghost" | "accent";

const VARIANT_CLASS: Record<CornerButtonVariant, string> = {
  neutral: "",
  flat: " btn-flat",
  ghost: " btn-ghost",
  accent: " btn-accent",
};

/** The design system's small button: 28px tall, radius 8, asymmetric padding. */
const SMALL: React.CSSProperties = {
  height: "var(--control-h-sm)",
  padding: "3px 10px 3px 6px",
  borderRadius: "var(--radius-md)",
};

export function CornerButton({
  variant = "neutral",
  size = "md",
  onClick,
  children,
}: {
  variant?: CornerButtonVariant;
  size?: "sm" | "md";
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`btn${VARIANT_CLASS[variant]}`}
      style={size === "sm" ? SMALL : undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** 34×28, not square — the measured control is wider than it is tall. */
export function CornerIconButton({
  label,
  variant = "neutral",
  onClick,
  children,
}: {
  label: string;
  variant?: CornerButtonVariant;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`btn-icon${VARIANT_CLASS[variant]}`}
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
