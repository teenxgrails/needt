import React from "react";

export function CountBadge({ children, style, ...rest }) {
  return (
    <span
      className="theme-surface"
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "var(--radius-sm)",
        backgroundColor: "var(--surface-2)",
        padding: "0 var(--space-1-5)",
        fontSize: "var(--text-xxs)",
        color: "var(--text-muted)",
        ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
