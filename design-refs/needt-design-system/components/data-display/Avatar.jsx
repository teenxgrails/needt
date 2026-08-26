import React from "react";

export function Avatar({ initials, size = 20, style, ...rest }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexShrink: 0,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "var(--radius-full)",
        fontWeight: "var(--weight-semibold)",
        color: "rgba(255,255,255,0.9)",
        width: size,
        height: size,
        fontSize: size * 0.42,
        backgroundImage: "var(--avatar-gradient)",
        ...style,
      }}
      {...rest}
    >
      {initials}
    </span>
  );
}
