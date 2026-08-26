import React from "react";

// Icon set copied verbatim from the Needt product source (src/components/Icon.tsx).
// 24×24 grid, stroke-only, currentColor, 1.6 stroke, round caps + joins.
export const iconPaths = {
  home: ["M3 9.5 12 3l9 6.5", "M5 9v11h14V9", "M9 20v-6h6v6"],
  "check-square": [{ rect: [3, 3, 18, 18, 3] }, "m8 12 3 3 5-6"],
  file: ["M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z", "M14 3v5h5"],
  folder: ["M3 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"],
  calendar: [{ rect: [3, 4.5, 18, 16, 2.5] }, "M3 9h18M8 2.5v4M16 2.5v4"],
  message: ["M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"],
  "credit-card": [{ rect: [3, 5, 18, 14, 2.5] }, "M3 10h18M7 15h4"],
  zap: ["M13 2 4 14h7l-1 8 9-12h-7z"],
  users: [{ circle: [9, 8, 3.2] }, "M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5", "M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20c0-2.4-1-4.2-2.5-5.2"],
  "user-cog": [{ circle: [9, 8, 3.2] }, "M3 20c0-3.3 2.7-5.5 6-5.5c1 0 1.9.2 2.7.5", { circle: [17.5, 16.5, 2.2] }, "M17.5 13v1M17.5 19v1M20.5 16.5h-1M15.5 16.5h-1"],
  workflow: [{ rect: [3, 4, 7, 6, 1.5] }, { rect: [14, 14, 7, 6, 1.5] }, "M6.5 10v4a3 3 0 0 0 3 3H14"],
  store: ["M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9", "M3 6h18l-1 4a3 3 0 0 1-6 0 3 3 0 0 1-6 0L3 6z"],
  building: [{ rect: [5, 3, 14, 18, 1.5] }, "M9 7h2M13 7h2M9 11h2M13 11h2M10 21v-4h4v4"],
  id: [{ rect: [3, 5, 18, 14, 2.5] }, { circle: [9, 11, 2] }, "M6 16c.5-1.4 1.7-2 3-2s2.5.6 3 2M14 9h4M14 13h3"],
  search: [{ circle: [11, 11, 7] }, "m20 20-3.5-3.5"],
  "chevron-up-down": ["m8 9 4-4 4 4M8 15l4 4 4-4"],
  "chevron-right": ["m9 6 6 6-6 6"],
  "chevron-down": ["m6 9 6 6 6-6"],
  plus: ["M12 5v14M5 12h14"],
  more: [{ circle: [5, 12, 1.4] }, { circle: [12, 12, 1.4] }, { circle: [19, 12, 1.4] }],
  filter: ["M3 5h18l-7 8v6l-4-2v-4L3 5z"],
  sort: ["M7 4v16M7 20l-3-3M7 4l3 3M17 20V4M17 4l-3 3M17 20l3-3"],
  paperclip: ["M20 11.5 12 19a4.5 4.5 0 0 1-6.4-6.4L14 4.3a3 3 0 0 1 4.2 4.2L9.8 17a1.5 1.5 0 0 1-2.1-2.1l7.4-7.4"],
  comment: ["M4 5h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"],
  clock: [{ circle: [12, 12, 8.5] }, "M12 7.5V12l3 2"],
  sun: [{ circle: [12, 12, 4] }, "M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"],
  moon: ["M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"],
};

export const iconNames = Object.keys(iconPaths);

export function Icon({ name, size = 16, strokeWidth = 1.6, color, style, className, ...rest }) {
  const parts = iconPaths[name] || [];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ display: "block", flexShrink: 0, color: color || undefined, ...style }}
      {...rest}
    >
      {parts.map((p, i) =>
        typeof p === "string" ? (
          <path key={i} d={p} />
        ) : p.rect ? (
          <rect key={i} x={p.rect[0]} y={p.rect[1]} width={p.rect[2]} height={p.rect[3]} rx={p.rect[4]} />
        ) : (
          <circle key={i} cx={p.circle[0]} cy={p.circle[1]} r={p.circle[2]} />
        )
      )}
    </svg>
  );
}
