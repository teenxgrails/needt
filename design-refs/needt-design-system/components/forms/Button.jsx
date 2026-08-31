import React from "react";
import { Icon } from "../icons/Icon.jsx";

export function Button({ children, icon, variant = "secondary", disabled, style, ...rest }) {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2)",
    borderRadius: "var(--radius-md)",
    padding: "6px var(--space-3)",
    fontSize: "var(--text-xs)",
    fontFamily: "var(--font-sans)",
    lineHeight: "var(--leading-snug)",
    cursor: disabled ? "default" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: "var(--transition-surface)",
  };
  const variants = {
    secondary: { border: "1px solid var(--border)", background: "transparent", color: "var(--text-2)" },
    ghost: { border: "1px solid transparent", background: "transparent", color: "var(--text-muted)" },
    dashed: {
      border: "1px dashed var(--border)",
      background: "transparent",
      color: "var(--text-muted)",
      borderRadius: "var(--radius-xl)",
      justifyContent: "center",
      width: "100%",
      padding: "10px var(--space-3)",
      gap: "var(--space-1-5)",
    },
  };
  return (
    <button
      type="button"
      disabled={disabled}
      onMouseEnter={(e) => { if (!disabled) { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text)"; } }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = variants[variant].color; }}
      style={{ ...base, ...variants[variant], ...style }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={15} /> : null}
      {children}
    </button>
  );
}
