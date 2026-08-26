import React from "react";
import { StatusDot } from "../data-display/StatusDot.jsx";
import { CountBadge } from "../data-display/CountBadge.jsx";
import { IconButton } from "../forms/IconButton.jsx";

export function ColumnHeader({ title, status = "todo", count, style, ...rest }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", ...style }} {...rest}>
      <StatusDot status={status} />
      <h2 style={{ margin: 0, fontSize: "var(--text-xs)", fontWeight: "var(--weight-semibold)", color: "var(--text)" }}>{title}</h2>
      <CountBadge>{count}</CountBadge>
      <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "var(--space-1)" }}>
        <IconButton icon="plus" bordered={false} size={22} iconSize={15} label={`Add to ${title}`} />
        <IconButton icon="more" bordered={false} size={22} iconSize={15} label={`${title} options`} />
      </span>
    </div>
  );
}
