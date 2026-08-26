import React from "react";
import { Icon } from "../icons/Icon.jsx";
import { IconButton } from "../forms/IconButton.jsx";

export function SectionHeader({ label, expanded = true, onToggle, actions = true, style, ...rest }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 var(--space-3) var(--space-1)",
        ...style,
      }}
      {...rest}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1-5)",
          border: "none",
          background: "transparent",
          padding: 0,
          cursor: "pointer",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xxs)",
          fontWeight: "var(--weight-medium)",
          textTransform: "uppercase",
          letterSpacing: "var(--tracking-wide)",
          color: "var(--text-muted)",
        }}
      >
        <Icon name={expanded ? "chevron-down" : "chevron-right"} size={13} />
        {label}
      </button>
      {actions ? (
        <span style={{ display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
          <IconButton icon="plus" bordered={false} size={20} iconSize={14} label={`Add to ${label}`} />
          <IconButton icon="more" bordered={false} size={20} iconSize={14} label={`${label} options`} />
        </span>
      ) : null}
    </div>
  );
}
