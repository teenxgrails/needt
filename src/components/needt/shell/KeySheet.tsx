"use client";

/* THE PRINTED SHEET — and it reads the table the handler reads.
 *
 * There is no display copy of the bindings anywhere in this file. Everything
 * on screen comes out of `NEEDT_KEYS`, including the caps, which are the same
 * strings `matchNeedtKey` parses into the chord. A row cannot be printed here
 * and bound to something else there, because there is only one row.
 *
 * `.td-scrim` and `.key-sheet` are the vendored sheet's: the scrim fades, the
 * sheet pops, and a cap is drawn as a physical key — a raised face on a
 * recessed well, in the mono face, because a key legend is a value.
 */
import * as React from "react";

import { NEEDT_KEYS } from "./keys";

export interface KeySheetProps {
  open: boolean;
  onClose: () => void;
}

export function KeySheet({ open, onClose }: KeySheetProps) {
  if (!open) return null;
  return (
    <div className="td-scrim" onMouseDown={onClose}>
      <div
        className="key-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 11,
            flex: "none",
            paddingBottom: 4,
          }}
        >
          <h2
            style={{
              margin: 0,
              font: "var(--type-card-title)",
              color: "var(--text-primary)",
            }}
          >
            Keyboard
          </h2>
          <span
            style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}
          >
            Press ? anywhere to bring this back.
          </span>
          <span
            style={{
              marginLeft: "auto",
              font: "var(--type-meta)",
              color: "var(--text-disabled)",
            }}
          >
            esc to close
          </span>
        </header>

        <div
          className="scroll-inner"
          style={{
            flex: 1,
            minHeight: 0,
            overflow: "auto",
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "20px 32px",
            alignContent: "start",
            paddingTop: 8,
          }}
        >
          {NEEDT_KEYS.map((group) => (
            <section
              key={group.title}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                minWidth: 0,
              }}
            >
              <span
                style={{
                  font: "var(--type-meta-medium)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: "var(--text-quaternary)",
                  paddingBottom: 4,
                }}
              >
                {group.title}
              </span>
              {group.keys.map((row) => (
                <span
                  key={row.label}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 11,
                    minHeight: 28,
                  }}
                >
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      font: "var(--type-ui)",
                      color: row.quiet
                        ? "var(--text-muted)"
                        : "var(--text-primary)",
                    }}
                  >
                    {row.label}
                  </span>
                  <span style={{ flex: "none", display: "flex", gap: 3 }}>
                    {row.caps.map((cap, index) => (
                      /* Caps are positional and can repeat within a row. */
                      <kbd key={index} className="key-cap">
                        {cap}
                      </kbd>
                    ))}
                  </span>
                </span>
              ))}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
