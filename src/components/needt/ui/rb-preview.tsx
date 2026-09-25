/* THE LINK PREVIEW — the page the block points at, as the page describes
 * itself. The block is the one object allowed to hold an image, for the same
 * reason the map is: here it is the content, not decoration.
 */
import * as React from "react";

import type { RbOg } from "../rb-shape";
import { RbMark } from "./rb-mark";

export function RbPreview({ og }: { og: RbOg }) {
  return (
    <span
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        padding: "8px 9px",
        borderRadius: "var(--radius-md)",
        background: "var(--fill-2)",
        boxShadow: "var(--shadow-inset-ring)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {og.mark ? (
          <span
            style={{
              flex: "none",
              color: "var(--text-tertiary)",
              display: "flex",
            }}
          >
            <RbMark mark={og.mark} size={12} />
          </span>
        ) : null}
        <span
          style={{
            font: "var(--type-meta-medium)",
            color: "var(--text-tertiary)",
          }}
        >
          {og.site}
        </span>
      </span>
      <span
        style={{
          font: "var(--type-ui-medium)",
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {og.title}
      </span>
    </span>
  );
}
