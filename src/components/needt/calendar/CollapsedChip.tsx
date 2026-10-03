"use client";

/* THE COLLAPSED CHIP — what a cluster becomes under 64px: one chip, a
 * popover in place, per `overlap.ts`'s `"chip"` slot.
 */
import * as React from "react";

import { Hung, MenuItem } from "../shell/chrome";

import { formatClock } from "./geometry";
import type { CalendarEntry } from "./entries";

export interface CollapsedChipProps {
  entries: readonly CalendarEntry[];
  use24Hour?: boolean;
  onOpen?: (entry: CalendarEntry) => void;
}

function summarize(entries: readonly CalendarEntry[]): string {
  const tasks = entries.filter((e) => !e.event).length;
  const events = entries.length - tasks;
  const parts: string[] = [];
  if (tasks) parts.push(`${tasks} ${tasks === 1 ? "task" : "tasks"}`);
  if (events) parts.push(`${events} ${events === 1 ? "event" : "events"}`);
  return parts.join(" · ") || `${entries.length} items`;
}

export function CollapsedChip({
  entries,
  use24Hour = true,
  onOpen,
}: CollapsedChipProps) {
  const [open, setOpen] = React.useState(false);
  return (
    <Hung
      open={open}
      kind="menu"
      onDismiss={() => setOpen(false)}
      trigger={
        <button
          type="button"
          className="chip nt-chip"
          onClick={() => setOpen((was) => !was)}
          style={{
            width: "100%",
            height: "100%",
            border: 0,
            cursor: "default",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {summarize(entries)}
        </button>
      }
    >
      {entries.map((entry) => (
        <MenuItem
          key={entry.id}
          onClick={() => {
            setOpen(false);
            onOpen?.(entry);
          }}
        >
          {entry.title}
          {typeof entry.at === "number"
            ? ` · ${formatClock(entry.at, use24Hour)}`
            : ""}
        </MenuItem>
      ))}
    </Hung>
  );
}
