import React from "react";
import { Icon } from "../icons/Icon.jsx";

export function IconButton({ icon, size = 34, iconSize = 16, bordered = true, label, style, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = bordered ? "var(--text-2)" : "var(--text-muted)"; }}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: "var(--radius-md)",
        border: bordered ? "1px solid var(--border)" : "1px solid transparent",
        background: "transparent",
        color: bordered ? "var(--text-2)" : "var(--text-muted)",
        cursor: "pointer",
        transition: "var(--transition-surface)",
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={iconSize} />
    </button>
  );
}
