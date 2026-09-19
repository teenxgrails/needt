"use client";

/* ONE DAY, ON THE GRID — hatch, the two-minute shelf, the placed blocks, and
 * the now-line if this is today.
 *
 * No `ResizeObserver` here: `columnWidthPx` is measured once by the parent
 * grid (`WeekGrid`) and shared by every day, per PORT.md §8's "do not
 * observe every card" — observing the scroller once and dividing its width
 * is the whole point of that rule.
 */
import * as React from "react";

import { CalendarBlock } from "./CalendarBlock";
import { CollapsedChip } from "./CollapsedChip";
import { MinuteBox } from "./Minutes";
import { NowLine } from "./NowLine";
import { type CalendarEntry, entryEndHour } from "./entries";
import {
  HOUR_HEIGHT_PX,
  GRID_END_HOUR,
  GRID_START_HOUR,
  heightForDuration,
  nonWorkingRanges,
  topForHour,
} from "./geometry";
import { type MinuteCandidate, findMinuteGaps } from "./minute-gaps";
import {
  CASCADE_INDENT_PX,
  type OverlapItem,
  columnPixelWidth,
  layoutOverlap,
  overlapSlotBox,
} from "./overlap";

export interface DayColumnProps {
  entries: readonly CalendarEntry[];
  isToday?: boolean;
  gridStart?: number;
  gridEnd?: number;
  hourHeight?: number;
  workStart?: number;
  workEnd?: number;
  /** The column's own pixel width, shared by every day in the row. */
  columnWidthPx: number;
  use24Hour?: boolean;
  dark?: boolean;
  /** The whole task list's shelf candidates, not just this day's — the
   *  two-minute shelf offers the nearest-due step from anywhere. */
  shelfCandidates?: readonly (MinuteCandidate & {
    entryRef: CalendarEntry;
  })[];
  onOpen?: (entry: CalendarEntry) => void;
  onToggle?: (entry: CalendarEntry) => void;
  onPickShelf?: (entry: CalendarEntry, gapStart: number) => void;
}

export function DayColumn({
  entries,
  isToday = false,
  gridStart = GRID_START_HOUR,
  gridEnd = GRID_END_HOUR,
  hourHeight = HOUR_HEIGHT_PX,
  workStart = 9,
  workEnd = 18,
  columnWidthPx,
  use24Hour = true,
  dark = false,
  shelfCandidates = [],
  onOpen,
  onToggle,
  onPickShelf,
}: DayColumnProps) {
  const placed = React.useMemo(
    () => entries.filter((e) => typeof e.at === "number" && e.noSlot !== true),
    [entries]
  );

  const items: OverlapItem[] = React.useMemo(
    () =>
      placed.map((e) => ({
        id: String(e.id),
        start: e.at as number,
        end: entryEndHour(e),
      })),
    [placed]
  );

  const slots = React.useMemo(
    () => layoutOverlap(items, { containerWidth: columnWidthPx }),
    [items, columnWidthPx]
  );

  const byId = React.useMemo(() => {
    const map = new Map<string, CalendarEntry>();
    for (const entry of placed) map.set(String(entry.id), entry);
    return map;
  }, [placed]);

  const hatch = nonWorkingRanges(workStart, workEnd, gridStart, gridEnd);
  const gaps = React.useMemo(
    () => findMinuteGaps(items, workStart, workEnd, hourHeight),
    [items, workStart, workEnd, hourHeight]
  );

  return (
    <div style={{ position: "relative", minWidth: 0 }}>
      {hatch.map(([from, to]) => (
        <span
          key={`off${from}`}
          className="cal-off"
          aria-hidden="true"
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: topForHour(from, gridStart, hourHeight),
            height: (to - from) * hourHeight,
          }}
        />
      ))}

      {gaps.map((gap) => (
        <MinuteBox
          key={`gap${gap.start}`}
          gap={gap}
          candidates={shelfCandidates}
          gridStart={gridStart}
          hourHeight={hourHeight}
          onPick={(entry) => onPickShelf?.(entry, gap.start)}
        />
      ))}

      {slots.map((slot) => {
        if (slot.kind === "chip") {
          const chipItems = slot.ids
            .map((id) => byId.get(id))
            .filter((entry): entry is CalendarEntry => Boolean(entry));
          if (!chipItems.length) return null;
          const top = Math.min(
            ...chipItems.map((entry) =>
              topForHour(entry.at as number, gridStart, hourHeight)
            )
          );
          const bottom = Math.max(
            ...chipItems.map((entry) =>
              topForHour(entryEndHour(entry), gridStart, hourHeight)
            )
          );
          return (
            <div
              key={`chip-${slot.ids.join("-")}`}
              style={{
                position: "absolute",
                top,
                height: Math.max(bottom - top, 32),
                left: 4,
                right: 4,
                zIndex: slot.z,
              }}
            >
              <CollapsedChip
                entries={chipItems}
                use24Hour={use24Hour}
                onOpen={onOpen}
              />
            </div>
          );
        }

        const entry = byId.get(slot.id);
        if (!entry || typeof entry.at !== "number") return null;
        const box = overlapSlotBox(slot);
        if (!box) return null;
        const top = topForHour(entry.at, gridStart, hourHeight);
        const height = heightForDuration(entry.est ?? 30, hourHeight);
        const widthPx =
          slot.kind === "column"
            ? columnPixelWidth(slot.columns, columnWidthPx)
            : slot.kind === "cascade"
              ? columnWidthPx - CASCADE_INDENT_PX
              : columnWidthPx;

        return (
          <div
            key={slot.id}
            style={{
              position: "absolute",
              top,
              height,
              left: box.left,
              width: box.width,
              zIndex: 1 + slot.z,
            }}
          >
            <CalendarBlock
              entry={entry}
              height={height}
              width={widthPx}
              weight="open"
              use24Hour={use24Hour}
              dark={dark}
              onOpen={onOpen}
              onToggle={onToggle}
            />
          </div>
        );
      })}

      {isToday ? (
        <NowLine gridStart={gridStart} hourHeight={hourHeight} />
      ) : null}
    </div>
  );
}
