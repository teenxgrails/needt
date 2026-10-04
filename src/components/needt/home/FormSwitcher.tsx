"use client";

/* THE FORM SWITCHER — the settings popover behind the gear, PORT.md §3.
 *
 * The choice between Today, Prose and Canvas is shown as three real
 * miniatures, not three names in a menu — `Miniature` is what makes that
 * true here rather than a promise: it is the same component Settings and
 * Auth use, so a form is recognised by its shape the same way everywhere.
 */
import * as React from "react";

import { LuSettings2 } from "react-icons/lu";

import { Glyph, Hung, IconButton } from "../shell/chrome";

import { Miniature, type MiniatureKind } from "./Miniature";

export type HomeFormKind = "today" | "prose" | "canvas";

const FORMS: readonly { kind: HomeFormKind; label: string; miniature: MiniatureKind }[] = [
  { kind: "today", label: "Today", miniature: "day" },
  { kind: "prose", label: "Prose", miniature: "prose" },
  { kind: "canvas", label: "Canvas", miniature: "canvas" },
];

export interface FormSwitcherProps {
  form: HomeFormKind;
  onChange: (form: HomeFormKind) => void;
}

export function FormSwitcher({ form, onChange }: FormSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <Hung
      open={open}
      kind="popover"
      onDismiss={() => setOpen(false)}
      trigger={
        <IconButton
          label="Choose the brief's form"
          variant="ghost"
          icon={<Glyph of={LuSettings2} size={16} />}
          onClick={() => setOpen((v) => !v)}
        />
      }
    >
      <div style={{ display: "flex", gap: 8, padding: 4, width: 300 }}>
        {FORMS.map(({ kind, label, miniature }) => (
          <button
            key={kind}
            type="button"
            onClick={() => {
              onChange(kind);
              setOpen(false);
            }}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 5,
              padding: 0,
              border: 0,
              background: "transparent",
              cursor: "default",
            }}
          >
            <Miniature kind={miniature} width={124} />
            <span
              style={{
                font: "var(--type-meta-medium)",
                color: form === kind ? "var(--accent)" : "var(--text-secondary)",
                textAlign: "left",
              }}
            >
              {label}
            </span>
          </button>
        ))}
      </div>
    </Hung>
  );
}
