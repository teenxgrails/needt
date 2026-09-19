"use client";

/* GET HELP — how the product works, in the product. Ported from `Help.jsx`.
 *
 * Not a FAQ and not a tour: the four things a person cannot guess, because
 * each one is a convention this product invented. Content lives in
 * `help-content.ts`; this file only lays it out.
 *
 * THIS IS NOT THE "?" SHEET. PORT.md's spec for this port says the opposite
 * at first read — "Help is the `?` sheet. It is already fed from keys.ts;
 * extend rather than duplicate" — but `KeySheet` (`shell/KeySheet.tsx`, out
 * of this directory's scope) is the keyboard table, not the four product
 * conventions the kit's `HelpSheet` teaches. Duplicating it would mean
 * re-laying-out `NEEDT_KEYS` a second time in a second component. Instead
 * this sheet EXTENDS the existing one: its footer opens the real `KeySheet`
 * through `onOpenKeys`, exactly as the kit's own footer button called
 * `window.__app.setKeysOpen(true)` — there is still only one keyboard sheet
 * in the app, this one just links to it.
 */
import * as React from "react";

import { LuKeyboard, LuX } from "react-icons/lu";

import { Glyph, IconButton } from "../shell/chrome";
import { NEEDT_HELP } from "./help-content";

export interface HelpSheetProps {
  open: boolean;
  onClose: () => void;
  /** Opens the shell's own keyboard sheet — see the file header. */
  onOpenKeys: () => void;
}

export function HelpSheet({ open, onClose, onOpenKeys }: HelpSheetProps) {
  const [at, setAt] = React.useState(0);
  if (!open) return null;
  const topic = NEEDT_HELP[at];

  return (
    <div
      className="co-scrim"
      onMouseDown={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 900,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="co-arrive"
        role="dialog"
        aria-modal="true"
        aria-label="How it works"
        style={{
          display: "flex",
          width: "min(720px, 100%)",
          maxHeight: "100%",
          overflow: "hidden",
          borderRadius: "var(--radius-2xl)",
          background: "var(--surface-raised)",
          boxShadow: "var(--shadow-floating)",
        }}
      >
        {/* Four conventions down the side: short enough to be the navigation
            and the table of contents at once. */}
        <nav
          style={{
            flex: "none",
            width: 188,
            display: "flex",
            flexDirection: "column",
            gap: 2,
            padding: 11,
            boxShadow: "var(--border) -1px 0 0 0 inset",
          }}
        >
          <span
            style={{
              font: "var(--type-meta-medium)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "var(--text-quaternary)",
              padding: "4px 8px 6px",
            }}
          >
            How it works
          </span>
          {NEEDT_HELP.map((t, i) => (
            <button
              key={t.title}
              type="button"
              onClick={() => setAt(i)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                height: 32,
                padding: "0 8px",
                border: 0,
                cursor: "default",
                borderRadius: "var(--radius-md)",
                textAlign: "left",
                background: i === at ? "var(--fill-accent)" : "transparent",
                color: i === at ? "var(--accent)" : "var(--text-secondary)",
                transition: "background-color var(--transition-hover)",
              }}
            >
              <Glyph of={t.glyph} size={14} />
              <span style={{ font: "var(--type-ui-medium)" }}>{t.title}</span>
            </button>
          ))}
        </nav>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 44,
              padding: "0 11px 0 16px",
              flex: "none",
            }}
          >
            <span
              style={{
                flex: 1,
                font: "var(--type-card-title)",
                color: "var(--text-primary)",
              }}
            >
              {topic.title}
            </span>
            <IconButton
              label="Close"
              variant="ghost"
              onClick={onClose}
              icon={<Glyph of={LuX} size={16} />}
            />
          </header>
          <div
            className="scroll-inner"
            style={{
              flex: 1,
              minHeight: 0,
              overflow: "auto",
              padding: "0 16px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {topic.rules.map((r) => (
              <span
                key={r.rule}
                style={{ display: "flex", flexDirection: "column", gap: 2 }}
              >
                <span
                  style={{
                    font: "var(--type-ui-medium)",
                    color: "var(--text-primary)",
                    textWrap: "pretty",
                  }}
                >
                  {r.rule}
                </span>
                <span
                  style={{
                    font: "var(--type-meta)",
                    color: "var(--text-muted)",
                    textWrap: "pretty",
                  }}
                >
                  {r.why}
                </span>
              </span>
            ))}
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                paddingTop: 2,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenKeys();
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  height: 30,
                  padding: "0 10px",
                  border: 0,
                  cursor: "default",
                  borderRadius: "var(--radius-md)",
                  background: "var(--fill-2)",
                  font: "var(--type-meta-medium)",
                  color: "var(--text-secondary)",
                }}
              >
                <Glyph of={LuKeyboard} size={13} />
                Keyboard shortcuts
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
