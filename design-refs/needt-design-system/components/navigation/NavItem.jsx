import React from "react";
import { Icon } from "../icons/Icon.jsx";

export function NavItem({ label, icon, active = false, onClick, style, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="theme-surface"
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = "var(--surface-hover)"; e.currentTarget.style.color = "var(--text)"; } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-2)"; } }}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: "var(--space-3)",
        borderRadius: "var(--radius-lg)",
        border: "none",
        padding: "var(--space-2) var(--space-3)",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-xs)",
        textAlign: "left",
        cursor: "pointer",
        background: active ? "var(--surface-2)" : "transparent",
        color: active ? "var(--text)" : "var(--text-2)",
        fontWeight: active ? "var(--weight-medium)" : "var(--weight-regular)",
        ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={18} color={active ? "var(--text)" : "var(--text-muted)"} />
      {label}
    </button>
  );
}
