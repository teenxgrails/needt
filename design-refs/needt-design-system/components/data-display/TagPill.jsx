import React from "react";

const tagStyles = {
  blue: { bg: "var(--tag-blue-bg)", fg: "var(--tag-blue-fg)" },
  amber: { bg: "var(--tag-amber-bg)", fg: "var(--tag-amber-fg)" },
  purple: { bg: "var(--tag-purple-bg)", fg: "var(--tag-purple-fg)" },
};

export function TagPill({ label, color = "blue", style, ...rest }) {
  const s = tagStyles[color] || tagStyles.blue;
  return (
    <span
      className="theme-surface"
      style={{
        display: "inline-flex",
        alignItems: "center",
        borderRadius: "var(--radius-full)",
        padding: "2.5px 9px",
        fontSize: "var(--text-xxs)",
        fontWeight: "var(--weight-medium)",
        lineHeight: "var(--leading-none)",
        backgroundColor: s.bg,
        color: s.fg,
        ...style,
      }}
      {...rest}
    >
      {label}
    </span>
  );
}
