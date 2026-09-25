"use client";

/* MONTH — density and pattern: which days are heavy, where the free space
 * is. 6×7, up to three items per cell then "+N more", today marked with an
 * accent ring (a filled square would read as a selected day).
 */
import * as React from "react";

import type { NeedtProject } from "@/lib/needt/types";

import { Hung, MenuItem } from "../shell/chrome";
import { rbShape } from "../rb-shape";

import { type CalendarEntry, entriesOnDay } from "./entries";
import { type MonthCell, monthGridCells } from "./geometry";

export interface MonthViewProps {
  monthAnchor: Date;
  today: Date;
  entries: readonly CalendarEntry[];
  projects?: readonly NeedtProject[];
  weekStart?: "mon" | "sun";
  onOpen?: (entry: CalendarEntry) => void;
  onSelectDay?: (date: Date) => void;
}

const WEEKDAY_LABELS: Record<"mon" | "sun", readonly string[]> = {
  mon: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
  sun: ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"],
};

function MonthRow({
  entry,
  projects,
  onOpen,
}: {
  entry: CalendarEntry;
  projects?: readonly NeedtProject[];
  onOpen?: (entry: CalendarEntry) => void;
}) {
  const shape = rbShape(entry, { layout: "card", dense: true, projects });
  const task = !shape.event;
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onOpen?.(entry);
      }}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        height: 18,
        padding: task ? "0 5px 0 0" : "0 5px",
        border: 0,
        cursor: "default",
        borderRadius: "var(--radius-xs)",
        overflow: "hidden",
        background: task
          ? "var(--surface-raised)"
          : `color-mix(in oklab, ${shape.hue ?? "var(--accent)"} 14%, var(--surface-raised))`,
        boxShadow: task ? "var(--shadow-ring)" : "none",
        textAlign: "left",
      }}
    >
      {task ? (
        <span
          aria-hidden="true"
          style={{
            flex: "none",
            width: 3,
            alignSelf: "stretch",
            background: shape.movable
              ? (shape.hue ?? "var(--accent)")
              : "var(--text-muted)",
          }}
        />
      ) : null}
      <span
        style={{
          flex: 1,
          minWidth: 0,
          font: "var(--type-meta)",
          color: "var(--text-primary)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {shape.title}
      </span>
    </button>
  );
}

function MonthCellView({
  cell,
  entries,
  projects,
  onOpen,
  onSelectDay,
}: {
  cell: MonthCell;
  entries: readonly CalendarEntry[];
  projects?: readonly NeedtProject[];
  onOpen?: (entry: CalendarEntry) => void;
  onSelectDay?: (date: Date) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const shown = entries.slice(0, 3);
  const extra = entries.length - shown.length;

  return (
    <div
      onClick={() => onSelectDay?.(cell.date)}
      style={{
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: 5,
        background: cell.inMonth ? "var(--surface-raised)" : "var(--fill-2)",
        boxShadow: "var(--border) -1px -1px 0 0 inset",
      }}
    >
      <span
        style={{
          display: "grid",
          placeItems: "center",
          minWidth: 20,
          height: 20,
          borderRadius: "var(--radius-sm)",
          /* A ring, never a fill — a filled square reads as a selected day,
             not today. */
          boxShadow: cell.isToday ? "var(--accent) 0 0 0 1.5px inset" : "none",
          font: "var(--type-meta-medium)",
          color: cell.isToday
            ? "var(--accent)"
            : cell.inMonth
              ? "var(--text-secondary)"
              : "var(--text-disabled)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {cell.date.getDate()}
      </span>
      {shown.map((entry) => (
        <MonthRow
          key={entry.id}
          entry={entry}
          projects={projects}
          onOpen={onOpen}
        />
      ))}
      {extra > 0 ? (
        <Hung
          open={open}
          kind="menu"
          onDismiss={() => setOpen(false)}
          trigger={
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setOpen((was) => !was);
              }}
              style={{
                border: 0,
                cursor: "default",
                background: "transparent",
                textAlign: "left",
                font: "var(--type-meta)",
                color: "var(--text-muted)",
                paddingLeft: 2,
              }}
            >
              +{extra} more
            </button>
          }
        >
          {entries.slice(3).map((entry) => (
            <MenuItem
              key={entry.id}
              onClick={() => {
                setOpen(false);
                onOpen?.(entry);
              }}
            >
              {entry.title}
            </MenuItem>
          ))}
        </Hung>
      ) : null}
    </div>
  );
}

export function MonthView({
  monthAnchor,
  today,
  entries,
  projects,
  weekStart = "mon",
  onOpen,
  onSelectDay,
}: MonthViewProps) {
  /* The lead-in is derived from the real weekday of the month's own first
     day (see `geometry.monthGridCells`) — never a literal, and never a
     fixture index the way the prototype's month once read one out of the
     week array. */
  const cells = monthGridCells(monthAnchor, today, weekStart);

  return (
    <div
      style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0,1fr))",
          flex: "none",
        }}
      >
        {WEEKDAY_LABELS[weekStart].map((label) => (
          <span
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: 28,
              font: "var(--type-meta-medium)",
              color: "var(--text-quaternary)",
            }}
          >
            {label}
          </span>
        ))}
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "grid",
          gridTemplateRows: "repeat(6, minmax(0,1fr))",
          gridTemplateColumns: "repeat(7, minmax(0,1fr))",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-ring)",
        }}
      >
        {cells.map((cell) => (
          <MonthCellView
            key={cell.date.getTime()}
            cell={cell}
            entries={entriesOnDay(entries, cell.date, today)}
            projects={projects}
            onOpen={onOpen}
            onSelectDay={onSelectDay}
          />
        ))}
      </div>
    </div>
  );
}
