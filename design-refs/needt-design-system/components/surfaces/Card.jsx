import React from "react";

export function Card({ children, hoverable = false, padding = "var(--space-3-5)", style, ...rest }) {
  return (
    <div
      className="theme-surface"
      onMouseEnter={(e) => { if (hoverable) { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.boxShadow = "var(--shadow-card-hover)"; } }}
      onMouseLeave={(e) => { if (hoverable) { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "none"; } }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        padding,
        cursor: hoverable ? "pointer" : "default",
        transition: "var(--transition-shadow)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
