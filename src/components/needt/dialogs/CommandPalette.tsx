"use client";

/* THE COMMAND PALETTE — ⌘K. Ported from `Dialogs.jsx`'s `CommandPalette`.
 *
 * "It reads its actions from the same keyboard table as everything else."
 * The kit hardcoded a second list — five rows spelling out "Open Today" with
 * shortcuts like "⌘1" that `keys.ts`'s handler never bound (the real bindings
 * are `G` then a letter). That is exactly the drift PORT.md's keyboard
 * section warns about: a printed list that disagrees with what fires. So
 * this palette has no list of its own — every actionable row comes out of
 * `NEEDT_KEY_ROWS`, split into "Actions" (new, focus, plan, theme, the
 * keyboard sheet) and "Go to" (the screens), and a chosen row is handed to
 * `onAction`, the same `(action: NeedtKeyAction) => void` the global key
 * handler calls. Whoever wires this up passes the identical dispatcher to
 * both, which is what makes "same table" true rather than aspirational.
 *
 * It finds things as well as doing them: tasks and pinned documents are
 * ranked by `paletteMatch` alongside the actions, so typing "brief" turns up
 * the task before it turns up "Documents".
 */
import * as React from "react";

import { LuArrowRight, LuCircle, LuFileText } from "react-icons/lu";

import type { NeedtTask } from "@/lib/needt/types";

import {
  NEEDT_KEY_ROWS,
  type NeedtKey,
  type NeedtKeyAction,
  type NeedtKeyHandler,
  type PinnedDoc,
  sequenceOf,
} from "../shell";
import { Glyph, MenuItem, MenuLabel } from "../shell/chrome";
import { paletteMatch } from "./palette-match";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  tasks: readonly NeedtTask[];
  docs?: readonly PinnedDoc[];
  /** The same dispatcher `useNeedtKeys` drives — see the file header. */
  onAction: NeedtKeyHandler;
  onSelectTask?: (task: NeedtTask) => void;
  onSelectDoc?: (doc: PinnedDoc) => void;
}

type BoundKey = NeedtKey & { action: NeedtKeyAction };

function isBound(key: NeedtKey): key is BoundKey {
  return key.action !== null;
}

const GO_ROWS: readonly BoundKey[] = NEEDT_KEY_ROWS.filter(
  (row): row is BoundKey => isBound(row) && row.action.kind === "go"
);

const ACTION_ROWS: readonly BoundKey[] = NEEDT_KEY_ROWS.filter(
  (row): row is BoundKey =>
    isBound(row) &&
    row.action.kind !== "go" &&
    row.action.kind !== "palette" &&
    row.action.kind !== "close"
);

/** "⌘K" for a chord, "G H" for a sequence — the two shapes `keys.ts` prints. */
function formatCaps(key: NeedtKey): string {
  return sequenceOf(key) ? key.caps.join(" ") : key.caps.join("");
}

export function CommandPalette({
  open,
  onClose,
  tasks,
  docs = [],
  onAction,
  onSelectTask,
  onSelectDoc,
}: CommandPaletteProps) {
  const [q, setQ] = React.useState("");

  React.useEffect(() => {
    if (open) setQ("");
  }, [open]);

  if (!open) return null;

  const query = q.trim();
  const foundTasks = query ? paletteMatch(tasks, query, (t) => t.title, 5) : [];
  const foundDocs = query ? paletteMatch(docs, query, (d) => d.title, 4) : [];
  const foundActions = paletteMatch(ACTION_ROWS, query, (r) => r.label);
  const foundGo = paletteMatch(GO_ROWS, query, (r) => r.label);
  const nothingFound =
    query.length > 0 &&
    foundTasks.length === 0 &&
    foundDocs.length === 0 &&
    foundActions.length === 0 &&
    foundGo.length === 0;

  function fire(action: NeedtKeyAction) {
    onAction(action);
    onClose();
  }

  return (
    <div
      className="nt-scrim"
      style={{
        position: "absolute",
        alignItems: "flex-start",
        paddingTop: 96,
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Find anything"
        style={{
          width: 560,
          borderRadius: "var(--radius-xl)",
          background: "var(--surface-raised)",
          boxShadow: "var(--shadow-floating)",
          padding: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            height: 32,
            padding: "0 6px",
          }}
        >
          <Glyph of={LuArrowRight} size={16} />
          <input
            autoFocus
            className="nt-input nt-input-plain"
            placeholder="Find a task, a document or a place"
            value={q}
            onChange={(event) => setQ(event.target.value)}
            style={{ boxShadow: "none" }}
          />
          <span
            style={{ font: "var(--type-meta)", color: "var(--text-muted)" }}
          >
            esc
          </span>
        </div>
        <div className="nt-menu-sep" />

        {/* The stagger animation keys off `.nt-menu`; the surface it also
            carries is switched off inline so this reads as one panel, not
            two stacked ones — see PORT.md §0.5, elevation is ring-first. */}
        <div
          className="nt-menu"
          style={{
            width: "100%",
            minWidth: 0,
            padding: 0,
            background: "transparent",
            boxShadow: "none",
          }}
        >
          {foundTasks.length ? <MenuLabel>Tasks</MenuLabel> : null}
          {foundTasks.map((t) => (
            <MenuItem
              key={t.id}
              icon={<Glyph of={LuCircle} size={14} />}
              shortcut={t.due ?? ""}
              onClick={() => {
                onSelectTask?.(t);
                onClose();
              }}
            >
              {t.title}
            </MenuItem>
          ))}

          {foundDocs.length ? <MenuLabel>Documents</MenuLabel> : null}
          {foundDocs.map((d) => (
            <MenuItem
              key={d.id}
              icon={<Glyph of={LuFileText} size={14} />}
              onClick={() => {
                onSelectDoc?.(d);
                onClose();
              }}
            >
              {d.title}
            </MenuItem>
          ))}

          {foundActions.length ? <MenuLabel>Actions</MenuLabel> : null}
          {foundActions.map((row) => (
            <MenuItem
              key={row.label}
              shortcut={formatCaps(row)}
              onClick={() => fire(row.action)}
            >
              {row.label}
            </MenuItem>
          ))}

          {foundGo.length ? <MenuLabel>Go to</MenuLabel> : null}
          {foundGo.map((row) => (
            <MenuItem
              key={row.label}
              shortcut={formatCaps(row)}
              onClick={() => fire(row.action)}
            >
              {row.label}
            </MenuItem>
          ))}

          {nothingFound ? (
            <p
              className="nt-empty-text"
              style={{ padding: "11px 8px", margin: 0 }}
            >
              Nothing matches.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
