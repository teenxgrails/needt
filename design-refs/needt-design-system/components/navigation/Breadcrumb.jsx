import React from "react";
import { Icon } from "../icons/Icon.jsx";

export function Breadcrumb({ items, style, ...rest }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-1-5)",
        fontSize: "var(--text-xs)",
        color: "var(--text-muted)",
        ...style,
      }}
      {...rest}
    >
      <Icon name="home" size={15} />
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <React.Fragment key={item}>
            <Icon name="chevron-right" size={13} />
            {last ? (
              <span
                className="theme-surface"
                style={{
                  borderRadius: "var(--radius-sm)",
                  background: "var(--surface-2)",
                  padding: "2px var(--space-2)",
                  color: "var(--text-2)",
                }}
              >
                {item}
              </span>
            ) : (
              <span>{item}</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
