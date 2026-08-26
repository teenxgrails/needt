import React from "react";

const statusColors = {
  todo: "var(--dot-todo)",
  progress: "var(--dot-progress)",
  review: "var(--dot-review)",
  done: "var(--dot-done)",
};

export function StatusDot({ status = "todo", size = 8, style, ...rest }) {
  return (
    <span
      style={{
        display: "inline-block",
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: "var(--radius-full)",
        backgroundColor: statusColors[status] || statusColors.todo,
        ...style,
      }}
      {...rest}
    />
  );
}
