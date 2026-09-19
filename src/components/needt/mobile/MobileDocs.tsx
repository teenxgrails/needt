"use client";

/* DOCS — a list, which is what the phone prototype already is.
 *
 * Ported from `Mobile.jsx`'s `MbDocs`, which is honestly a stub: four rows,
 * no way to open one. The desktop's `DocsScreen` (`../docs`) reads and
 * renders a real document body; nothing on the phone does — PORT.md §3 lists
 * documents among what is "outstanding" on mobile, and this file does not
 * pretend otherwise. Rows are drawn from the same fixture the desktop screen
 * reads (`DOCS_FIXTURE`) rather than a second authored list, so the two
 * surfaces cannot disagree about what a document is called.
 */
import * as React from "react";

import { LuFileText } from "react-icons/lu";

import { DOCS_FIXTURE } from "../docs";
import { Glyph } from "../shell/chrome";

export function MobileDocs() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: "0 16px 16px",
      }}
    >
      {DOCS_FIXTURE.map((doc) => (
        <span
          key={doc.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            minHeight: 56,
            padding: "0 12px",
            borderRadius: "var(--radius-lg)",
            background: "var(--surface-raised)",
            boxShadow: "var(--shadow-ring)",
          }}
        >
          <span
            style={{
              flex: "none",
              display: "flex",
              color: "var(--text-tertiary)",
            }}
          >
            <Glyph of={LuFileText} size={18} />
          </span>
          <span
            style={{
              flex: 1,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <span
              style={{
                font: "var(--type-ui-medium)",
                color: "var(--text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {doc.title}
            </span>
            <span
              style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}
            >
              {[doc.project, doc.meta].filter(Boolean).join(" · ")}
            </span>
          </span>
        </span>
      ))}
    </div>
  );
}
