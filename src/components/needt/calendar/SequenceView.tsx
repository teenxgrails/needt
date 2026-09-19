"use client";

/* SEQUENCE — invented for this port.
 *
 * PORT.md names it in the view list and says nothing else: "no file in the
 * bundle and no description beyond its name... built from that." What is
 * built here, exactly, so it can be judged and revised:
 *
 * Day, Week and Month all answer "when". Columns answers "what, grouped by
 * day, with room to reorder within a day". Sequence answers a third,
 * narrower question the other four cannot: **what happens next, in the
 * order it happens, regardless of which day it falls on.** It is one
 * vertical rail — not a grid, not columns — of every PLACED entry (it has a
 * time; `noSlot` and undated tasks have nothing to sequence), grouped under
 * a day heading only to orient the eye, connected top to bottom by a single
 * hairline rail so the "next thing" reads as a thread rather than a list of
 * unrelated rows. A habit's fixed slot and a scheduled task's movable one
 * both take a place on the thread; nothing here reorders them — Sequence is
 * a read, not a planning surface, which is what keeps it honest as an
 * invention: it does not pretend to solve what Columns already owns.
 *
 * Kept deliberately simple, per the owner's instruction: one rail, one
 * column, the existing `RichBlock` card layout doing all the drawing.
 */
import * as React from "react";

import { calendarDayDifference } from "@/lib/date-utils";
import { dateLabel } from "@/lib/needt/derive";

import { RichBlock } from "../RichBlock";
import { rbShape } from "../rb-shape";

import { type CalendarEntry, entryDueDate, isPlaceable } from "./entries";
import { formatClock } from "./geometry";

export interface SequenceViewProps {
  entries: readonly CalendarEntry[];
  today: Date;
  use24Hour?: boolean;
  dark?: boolean;
  onOpen?: (entry: CalendarEntry) => void;
  onToggle?: (entry: CalendarEntry) => void;
}

interface SequenceRow {
  entry: CalendarEntry;
  date: Date | null;
}

function sequenceRows(
  entries: readonly CalendarEntry[],
  today: Date
): SequenceRow[] {
  return entries
    .filter(isPlaceable)
    .map((entry) => ({ entry, date: entryDueDate(entry, today) }))
    .sort((a, b) => {
      const dayDiff =
        a.date && b.date
          ? calendarDayDifference(a.date, b.date)
          : a.date
            ? -1
            : b.date
              ? 1
              : 0;
      if (dayDiff !== 0) return dayDiff;
      return (a.entry.at ?? 0) - (b.entry.at ?? 0);
    });
}

export function SequenceView({
  entries,
  today,
  use24Hour = true,
  dark = false,
  onOpen,
  onToggle,
}: SequenceViewProps) {
  const rows = React.useMemo(() => sequenceRows(entries, today), [entries, today]);

  let lastDayKey: string | null = null;

  return (
    <div
      className="scroll-inner"
      style={{ flex: 1, minHeight: 0, overflow: "auto" }}
    >
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 520,
          margin: "0 auto",
          padding: "4px 0 24px",
        }}
      >
        {/* The thread: one hairline down the row of dots, drawn once behind
            every row rather than stitched between each pair. */}
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 5,
            top: 8,
            bottom: 8,
            width: 1,
            background: "var(--border)",
          }}
        />
        {rows.map((row) => {
          const dayKey = row.date ? row.date.toDateString() : "undated";
          const showHeading = dayKey !== lastDayKey;
          lastDayKey = dayKey;
          const shape = rbShape(row.entry, { layout: "card" });
          return (
            <React.Fragment key={row.entry.id}>
              {showHeading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    paddingLeft: 20,
                    marginTop: 4,
                  }}
                >
                  <span
                    style={{
                      font: "var(--type-meta-medium)",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "var(--text-quaternary)",
                    }}
                  >
                    {row.date
                      ? calendarDayDifference(row.date, today) === 0
                        ? "Today"
                        : dateLabel(row.date)
                      : "No date"}
                  </span>
                </div>
              ) : null}
              <div
                style={{ position: "relative", display: "flex", gap: 12, paddingLeft: 20 }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: 2,
                    top: 8,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    background: row.entry.overdue
                      ? "var(--destructive)"
                      : "var(--fill-accent-strong)",
                  }}
                />
                {typeof row.entry.at === "number" ? (
                  <span
                    style={{
                      flex: "none",
                      width: 48,
                      paddingTop: 6,
                      font: "var(--type-meta)",
                      color: "var(--text-quaternary)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatClock(row.entry.at, use24Hour)}
                  </span>
                ) : (
                  <span style={{ flex: "none", width: 48 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <article onClick={() => onOpen?.(row.entry)}>
                    <RichBlock
                      block={shape}
                      weight="open"
                      fit
                      dark={dark}
                      onToggle={() => onToggle?.(row.entry)}
                    />
                  </article>
                </div>
              </div>
            </React.Fragment>
          );
        })}
        {!rows.length ? (
          <span
            style={{
              font: "var(--type-meta)",
              fontStyle: "italic",
              color: "var(--text-disabled)",
              paddingLeft: 20,
            }}
          >
            Nothing placed on the clock yet.
          </span>
        ) : null}
      </div>
    </div>
  );
}
