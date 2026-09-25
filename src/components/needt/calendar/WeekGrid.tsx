"use client";

/* THE WEEK GRID — Day and Week share this: a continuous run of days, five in
 * view, the rest by horizontal scroll (wheel and drag). All 24 hours are
 * shown; the grid opens scrolled to the working hours.
 *
 * PORT.md §8, kept literally:
 *   - Pointer work is coalesced into one rAF; nothing publishes when neither
 *     the point nor the snapped time changed.
 *   - `getBoundingClientRect()` is never called inside `pointermove` — it is
 *     cached in a ref and invalidated on scroll and resize.
 *   - The scroller is observed once, not one card at a time; every day
 *     column is handed the same measured width.
 *   - The aim aligns "where we are" from that ref, not from the closure the
 *     pointermove handler was created in.
 */
import * as React from "react";

import { calendarDayDifference } from "@/lib/date-utils";
import type { BlockingOverride } from "@/lib/flexible-hours-guard";
import type { NeedtProject, NeedtWorkWindow } from "@/lib/needt/types";

import { DayColumn } from "./DayColumn";
import { HourGutter } from "./HourGutter";
import {
  blockedRangesForDay,
  type CalendarEntry,
  entriesOnDay,
  workingRangesForDay,
} from "./entries";
import {
  GRID_END_HOUR,
  GRID_START_HOUR,
  GUTTER_WIDTH_PX,
  HOUR_HEIGHT_PX,
  SNAP_HOUR,
  WEEK_VISIBLE_DAYS,
  columnWidth as computeColumnWidth,
  formatClock,
  initialScrollLeft,
  initialScrollTop,
  snapToGrid,
  topForHour,
} from "./geometry";
import type { MinuteCandidate } from "./minute-gaps";

export interface WeekGridProps {
  /** The full scrollable run of days — more than `visibleDays` so there is
   *  somewhere to scroll to. */
  days: readonly Date[];
  entries: readonly CalendarEntry[];
  projects?: readonly NeedtProject[];
  today: Date;
  /** Which index in `days` opens as the first visible column. */
  anchorIndex?: number;
  gridStart?: number;
  gridEnd?: number;
  hourHeight?: number;
  workStart?: number;
  workEnd?: number;
  flexibleHours?: readonly BlockingOverride[];
  workWindows?: readonly NeedtWorkWindow[];
  visibleDays?: number;
  use24Hour?: boolean;
  dark?: boolean;
  shelfCandidates?: readonly (MinuteCandidate & {
    entryRef: CalendarEntry;
  })[];
  onOpen?: (entry: CalendarEntry) => void;
  onToggle?: (entry: CalendarEntry) => void;
  onPickShelf?: (entry: CalendarEntry, gapStart: number, day: Date) => void;
}

function DayHead({
  date,
  isToday,
  entries,
  onOpen,
}: {
  date: Date;
  isToday: boolean;
  entries: readonly CalendarEntry[];
  onOpen?: (entry: CalendarEntry) => void;
}) {
  const allDay = entries.filter((entry) => entry.allDay);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        minHeight: 34,
        padding: "0 8px 4px",
      }}
    >
      <span style={{ display: "flex", alignItems: "baseline", gap: 7 }}>
        <span
          style={{
            font: "var(--weight-medium) 15px / 18px var(--font-sans)",
            fontVariantNumeric: "tabular-nums",
            color: isToday ? "var(--accent)" : "var(--text-secondary)",
          }}
        >
          {date.getDate()}
        </span>
        <span
          style={{
            font: "var(--type-meta)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: isToday ? "var(--accent)" : "var(--text-quaternary)",
          }}
        >
          {new Intl.DateTimeFormat(undefined, { weekday: "short" })
            .format(date)
            .toUpperCase()}
        </span>
      </span>
      {allDay.slice(0, 2).map((entry) => (
        <button
          key={entry.id}
          type="button"
          onClick={() => onOpen?.(entry)}
          className="truncate rounded-[var(--radius-xs)] px-1 text-left text-[11px]"
          style={{
            background: `color-mix(in oklab, ${entry.hue ?? "var(--accent)"} 14%, var(--surface-raised))`,
            color: "var(--text-secondary)",
          }}
        >
          {entry.title}
        </button>
      ))}
    </div>
  );
}

export function WeekGrid({
  days,
  entries,
  projects,
  today,
  anchorIndex = 0,
  gridStart = GRID_START_HOUR,
  gridEnd = GRID_END_HOUR,
  hourHeight = HOUR_HEIGHT_PX,
  workStart = 9,
  workEnd = 18,
  flexibleHours = [],
  workWindows,
  visibleDays = WEEK_VISIBLE_DAYS,
  use24Hour = true,
  dark = false,
  shelfCandidates = [],
  onOpen,
  onToggle,
  onPickShelf,
}: WeekGridProps) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const gridBodyRef = React.useRef<HTMLDivElement | null>(null);
  const [colW, setColW] = React.useState(0);

  /* One observer, on the scroller itself — never one per card or per
     column. Every DayColumn below is handed the same `colW`. */
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    const sync = () => setColW(computeColumnWidth(el.clientWidth, visibleDays, GUTTER_WIDTH_PX));
    sync();
    if (typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => ro.disconnect();
  }, [visibleDays]);

  /* Land on the anchor day, scrolled to the working hours, once the column
     width is known. */
  const landedRef = React.useRef(false);
  React.useEffect(() => {
    landedRef.current = false;
  }, [anchorIndex]);
  React.useEffect(() => {
    const el = scrollerRef.current;
    if (!el || landedRef.current || colW <= 0) return;
    el.scrollTop = initialScrollTop(workStart, hourHeight, gridStart);
    el.scrollLeft = initialScrollLeft(anchorIndex, colW);
    landedRef.current = true;
  }, [anchorIndex, colW, workStart, hourHeight, gridStart]);

  /* THE AIM LINE — coalesced into one rAF, the rect cached and invalidated
     rather than re-measured on every event. */
  const rectRef = React.useRef<DOMRect | null>(null);
  const pendingRef = React.useRef<{ y: number } | null>(null);
  const rafRef = React.useRef<number | null>(null);
  const lastAimRef = React.useRef<number | null>(null);
  const [aim, setAim] = React.useState<number | null>(null);

  const invalidateRect = React.useCallback(() => {
    rectRef.current = null;
  }, []);

  const flush = React.useCallback(() => {
    rafRef.current = null;
    const pending = pendingRef.current;
    if (!pending) return;
    let rect = rectRef.current;
    if (!rect && gridBodyRef.current) {
      rect = gridBodyRef.current.getBoundingClientRect();
      rectRef.current = rect;
    }
    if (!rect) return;
    const hour = gridStart + (pending.y - rect.top) / hourHeight;
    const snapped = snapToGrid(hour, SNAP_HOUR, gridStart, gridEnd);
    if (snapped !== lastAimRef.current) {
      lastAimRef.current = snapped;
      setAim(snapped);
    }
  }, [gridStart, gridEnd, hourHeight]);

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      pendingRef.current = { y: event.clientY };
      if (rafRef.current == null) {
        rafRef.current = requestAnimationFrame(flush);
      }
    },
    [flush]
  );

  const onPointerLeave = React.useCallback(() => {
    pendingRef.current = null;
    lastAimRef.current = null;
    setAim(null);
  }, []);

  React.useEffect(
    () => () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  /* Drag-to-scroll on the header, for a mouse with no horizontal wheel. */
  const onHeaderPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as HTMLElement;
      if (target.closest("button, [role=checkbox]")) return;
      const el = scrollerRef.current;
      if (!el) return;
      const startX = event.clientX;
      const startLeft = el.scrollLeft;
      el.setPointerCapture(event.pointerId);
      const move = (moveEvent: PointerEvent) => {
        el.scrollLeft = startLeft - (moveEvent.clientX - startX);
      };
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
    },
    []
  );

  const bodyHeight = (gridEnd - gridStart) * hourHeight;
  const cols = `${GUTTER_WIDTH_PX}px repeat(${days.length}, ${colW || 180}px)`;

  return (
    <div
      ref={scrollerRef}
      className="scroll-inner"
      style={{ flex: 1, minHeight: 0, overflow: "auto" }}
      onScroll={invalidateRect}
    >
      <div
        style={{
          width: GUTTER_WIDTH_PX + days.length * (colW || 180),
          minWidth: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 60,
            background: "var(--background)",
            display: "grid",
            gridTemplateColumns: cols,
          }}
          onPointerDown={onHeaderPointerDown}
        >
          <span className="cal-stick" />
          {days.map((date) => (
            <DayHead
              key={date.getTime()}
              date={date}
              isToday={calendarDayDifference(date, today) === 0}
              entries={entriesOnDay(entries, date, today)}
              onOpen={onOpen}
            />
          ))}
        </div>

        <div
          ref={gridBodyRef}
          style={{
            position: "relative",
            display: "grid",
            gridTemplateColumns: cols,
            height: bodyHeight + 16,
            paddingTop: 16,
          }}
          onPointerMove={onPointerMove}
          onPointerLeave={onPointerLeave}
        >
          <HourGutter
            gridStart={gridStart}
            gridEnd={gridEnd}
            hourHeight={hourHeight}
            use24Hour={use24Hour}
          />
          {days.map((date) => {
            const isToday = calendarDayDifference(date, today) === 0;
            const blockedRanges = blockedRangesForDay(
              flexibleHours,
              date,
              workStart,
              workEnd
            );
            return (
              <DayColumn
                key={date.getTime()}
                entries={entriesOnDay(entries, date, today)}
                projects={projects}
                isToday={isToday}
                gridStart={gridStart}
                gridEnd={gridEnd}
                hourHeight={hourHeight}
                workStart={workStart}
                workEnd={workEnd}
                blockedRanges={blockedRanges}
                workingRanges={
                  workWindows ? workingRangesForDay(workWindows, date) : undefined
                }
                columnWidthPx={colW}
                use24Hour={use24Hour}
                dark={dark}
                shelfCandidates={shelfCandidates}
                onOpen={onOpen}
                onToggle={onToggle}
                onPickShelf={(entry, gapStart) =>
                  onPickShelf?.(entry, gapStart, date)
                }
              />
            );
          })}
          {aim !== null ? (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: topForHour(aim, gridStart, hourHeight),
                height: 0,
                zIndex: 3,
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: GUTTER_WIDTH_PX - 12,
                  right: 0,
                  top: 0,
                  height: 0,
                  borderTop: "1px dashed var(--text-secondary)",
                }}
              />
              <span
                className="cal-aim-time"
                style={{
                  position: "sticky",
                  left: 0,
                  float: "left",
                  width: GUTTER_WIDTH_PX - 12,
                  marginTop: -7,
                  zIndex: 51,
                  paddingRight: 11,
                  textAlign: "right",
                  font: "var(--type-meta-medium)",
                  color: "var(--text-primary)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatClock(aim, use24Hour)}
              </span>
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
