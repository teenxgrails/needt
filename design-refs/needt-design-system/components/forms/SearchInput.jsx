import React from "react";
import { Icon } from "../icons/Icon.jsx";

export function SearchInput({ placeholder = "Search", value, onChange, style, ...rest }) {
  return (
    <div
      className="theme-surface"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        borderRadius: "var(--radius-xl)",
        border: "1px solid var(--border)",
        background: "var(--surface)",
        padding: "var(--space-2) var(--space-3)",
        ...style,
      }}
      {...rest}
    >
      <Icon name="search" size={15} color="var(--text-muted)" />
      <input
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          width: "100%",
          minWidth: 0,
          background: "transparent",
          border: "none",
          outline: "none",
          fontFamily: "var(--font-sans)",
          fontSize: "var(--text-xs)",
          color: "var(--text)",
        }}
      />
    </div>
  );
}
