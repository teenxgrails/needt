import React from "react";
import { Icon } from "../icons/Icon.jsx";
import { Avatar } from "../data-display/Avatar.jsx";

export function TeamSwitcher({ team, initials, label = "Team", onClick, style, ...rest }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="theme-surface"
      onMouseEnter={(e) => { e.currentTarget.style.background = "var(--surface-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        gap: "var(--space-2-5)",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border)",
        background: "transparent",
        padding: "var(--space-2)",
        textAlign: "left",
        cursor: "pointer",
        ...style,
      }}
      {...rest}
    >
      <Avatar initials={initials} size={34} />
      <span style={{ display: "flex", minWidth: 0, flex: 1, flexDirection: "column" }}>
        <span style={{ fontSize: "var(--text-xxs)", fontWeight: "var(--weight-medium)", color: "var(--text-muted)" }}>{label}</span>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--text)" }}>{team}</span>
      </span>
      <Icon name="chevron-up-down" size={16} color="var(--text-muted)" />
    </button>
  );
}
