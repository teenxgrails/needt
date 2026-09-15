"use client";

/* COLUMNS — the day as a to-do board. One column per day, sortable by AI,
 * time or priority, with Overdue and No-date pinned left. A column states
 * its load against its own real capacity, and today's capacity is what is
 * left of today — not what a whole day holds. Over capacity, it shows what
 * will slip before you press anything.
 */
import * as React from "react";

import { NeedtPicker } from "@/components/ui/needt-picker";

import {
  addCalendarDays,
  calendarDayDifference,
  newDate,
  toLocalDateKey,
} from "@/lib/date-utils";
import { dateLabel, isOverdue } from "@/lib/needt/derive";

import { RichBlock } from "../RichBlock";
import { rbShape } from "../rb-shape";
import { IconButton } from "../shell/chrome";
import { LuChevronLeft, LuChevronRight, LuRotateCcw } from "react-icons/lu";

import {
  capacityMinutes,
  computeShed,
  priorityOf,
  reasonFor,
  scoreOf,
  type ColumnsPriority,
  type ShedCandidate,
} from "./columns-logic";
import { type CalendarEntry, entryDueDate } from "./entries";
import { hourOfDay } from "./geometry";

export interface ColumnsScreenProps {
  entries: readonly CalendarEntry[];
  today: Date;
  /** How many day columns to draw after today. */
  dayCount?: number;
  /** The working day's own end — today's capacity is what is left between
   *  now and this hour, never a whole day's worth. */
  workEnd?: number;
  /** Free hours on a day this isn't today. */
  freeHoursDefault?: number;
  dark?: boolean;
  onOpen?: (entry: CalendarEntry) => void;
  onToggle?: (entry: CalendarEntry) => void;
  /** Called with the ids that would move, and where — the shed preview's
   *  "accept" action. The screen never moves anything on its own. */
  onShed?: (entries: readonly CalendarEntry[], toDate: Date) => void;
}

type SortMode = "ai" | "time" | "priority";

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: "ai", label: "Needt's order" },
  { value: "time", label: "Time in the day" },
  { value: "priority", label: "Importance" },
];

const PRIORITY_INK: Record<ColumnsPriority, string> = {
  now: "var(--destructive)",
  soon: "var(--info)",
  later: "var(--accent)",
  none: "var(--text-muted)",
};

const PRIORITY_TITLE: Record<ColumnsPriority, string> = {
  now: "Do it now",
  soon: "Soon",
  later: "Later",
  none: "No priority",
};

const PRIORITY_RANK: Record<ColumnsPriority, number> = {
  now: 0,
  soon: 1,
  later: 2,
  none: 3,
};

interface ShapedEntry {
  entry: CalendarEntry;
  dueInDays: number | null;
  overdue: boolean;
  priority: ColumnsPriority;
  score: number;
  reason: string | null;
}

function shapeEntry(
  entry: CalendarEntry,
  today: Date,
  dueInDays: number | null,
  atRisk: boolean
): ShapedEntry {
  const overdue = isOverdue(entry, today);
  const priority = priorityOf(overdue, atRisk, dueInDays);
  const started = entry.parts?.filter((part) => part.done).length ?? null;
  return {
    entry,
    dueInDays,
    overdue,
    priority,
    score: scoreOf(
      overdue,
      Boolean(entry.parts && entry.parts.length > 0),
      dueInDays,
      entry.est ?? null
    ),
    reason: reasonFor(
      overdue,
      started,
      entry.parts?.length ?? null,
      entry.est ?? null,
      entry.value != null
    ),
  };
}

function sortShaped(list: ShapedEntry[], sort: SortMode): ShapedEntry[] {
  const out = [...list];
  if (sort === "time") {
    out.sort(
      (a, b) => (a.entry.at ?? 99) - (b.entry.at ?? 99)
    );
  } else if (sort === "priority") {
    out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]);
  } else {
    out.sort((a, b) => b.score - a.score);
  }
  return out;
}

function CvCard({
  shaped,
  sort,
  onOpen,
  onToggle,
  dark,
}: {
  shaped: ShapedEntry;
  sort: SortMode;
  onOpen?: (entry: CalendarEntry) => void;
  onToggle?: (entry: CalendarEntry) => void;
  dark: boolean;
}) {
  const withReason = React.useMemo(
    () => ({ ...shaped.entry, reason: shaped.reason }),
    [shaped.entry, shaped.reason]
  );
  const shape = rbShape(withReason, {
    layout: "card",
    reason: sort === "ai",
  });
  return (
    <article
      onClick={() => onOpen?.(shaped.entry)}
      style={{ position: "relative" }}
    >
      {/* The ring is the priority — an outline, not a filled dot, so an
          unstarted task never reads as a finished one. */}
      <span
        aria-hidden="true"
        title={PRIORITY_TITLE[shaped.priority]}
        style={{
          position: "absolute",
          left: 10,
          top: 10,
          zIndex: 1,
          width: 8,
          height: 8,
          borderRadius: 4,
          boxShadow: `${PRIORITY_INK[shaped.priority]} 0 0 0 1.5px inset`,
        }}
      />
      <RichBlock
        block={shape}
        weight="open"
        fit
        dark={dark}
        onToggle={() => onToggle?.(shaped.entry)}
      />
    </article>
  );
}

function ColumnHeader({
  label,
  today,
  count,
  loadMinutes,
  capacityMin,
  action,
}: {
  label: string;
  today: boolean;
  count: number;
  loadMinutes: number;
  capacityMin: number | null;
  action?: React.ReactNode;
}) {
  const over = capacityMin != null && loadMinutes > capacityMin;
  return (
    <header
      style={{
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        height: 34,
        flex: "none",
        minWidth: 0,
      }}
    >
      <span
        style={{
          flex: "none",
          font: "var(--type-card-title)",
          fontSize: 14,
          color: today ? "var(--accent)" : "var(--text-primary)",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      {count ? (
        <span
          style={{
            font: "var(--type-meta)",
            color: over ? "var(--destructive)" : "var(--text-muted)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {count}
        </span>
      ) : null}
      {action ? <span style={{ marginLeft: "auto" }}>{action}</span> : null}
    </header>
  );
}

export function ColumnsScreen({
  entries,
  today,
  dayCount = 7,
  workEnd = 18,
  freeHoursDefault = 6,
  dark = false,
  onOpen,
  onToggle,
  onShed,
}: ColumnsScreenProps) {
  const [sort, setSort] = React.useState<SortMode>("ai");
  const stripRef = React.useRef<HTMLDivElement | null>(null);
  const nudge = React.useCallback((dir: number) => {
    stripRef.current?.scrollBy({ left: dir * 288, behavior: "smooth" });
  }, []);

  const nowHour = hourOfDay(newDate());

  const placeable = React.useMemo(
    () => entries.filter((entry) => entry.noSlot !== true),
    [entries]
  );

  const overdue = React.useMemo(
    () =>
      placeable.filter((entry) => isOverdue(entry, today)).map((entry) =>
        shapeEntry(entry, today, -1, true)
      ),
    [placeable, today]
  );

  const dayColumns = React.useMemo(() => {
    const overdueIds = new Set(overdue.map((s) => s.entry.id));
    const columns: Array<{
      key: string;
      date: Date;
      isToday: boolean;
      shaped: ShapedEntry[];
      capacityMin: number | null;
    }> = [];

    for (let i = 0; i < dayCount; i++) {
      const date = addCalendarDays(today, i);
      const isToday = i === 0;
      const own = placeable.filter((entry) => {
        if (overdueIds.has(entry.id)) return false;
        const due = entryDueDate(entry, today);
        return due != null && calendarDayDifference(due, date) === 0;
      });
      const capacityMin = capacityMinutes(
        isToday,
        nowHour,
        workEnd,
        freeHoursDefault
      );
      const shaped = own.map((entry) =>
        shapeEntry(entry, today, i, false)
      );
      columns.push({
        key: toLocalDateKey(date),
        date,
        isToday,
        shaped,
        capacityMin,
      });
    }
    return columns;
  }, [placeable, overdue, today, dayCount, nowHour, workEnd, freeHoursDefault]);

  const noDate = React.useMemo(
    () =>
      placeable
        .filter((entry) => !isOverdue(entry, today) && entryDueDate(entry, today) == null)
        .map((entry) => shapeEntry(entry, today, null, false)),
    [placeable, today]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 11 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "none" }}>
        <span className="nt-select" style={{ width: 160 }}>
          <NeedtPicker
            value={sort}
            options={SORT_OPTIONS}
            mode="plain"
            onValueChange={(value) => setSort(value as SortMode)}
            ariaLabel="Sort columns"
            triggerVariant="field"
            className="nt-select-trigger"
          />
        </span>
        <span style={{ marginLeft: "auto", display: "flex", gap: 2 }}>
          <IconButton
            label="Earlier days"
            variant="ghost"
            onClick={() => nudge(-1)}
            icon={<LuChevronLeft size={16} />}
          />
          <IconButton
            label="Later days"
            variant="ghost"
            onClick={() => nudge(1)}
            icon={<LuChevronRight size={16} />}
          />
        </span>
      </div>

      <div
        ref={stripRef}
        className="scroll-inner cv-strip"
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          gap: 20,
          overflowX: "auto",
          overflowY: "hidden",
        }}
      >
        {overdue.length ? (
          <section
            style={{
              flex: "0 0 auto",
              width: 268,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <ColumnHeader
              label="Overdue"
              today={false}
              count={overdue.length}
              loadMinutes={0}
              capacityMin={null}
              action={
                <IconButton
                  label="Move everything overdue to today"
                  variant="ghost"
                  icon={<LuRotateCcw size={14} />}
                  onClick={() =>
                    onShed?.(
                      overdue.map((s) => s.entry),
                      today
                    )
                  }
                />
              }
            />
            <div
              className="scroll-inner"
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {sortShaped(overdue, "priority").map((shaped) => (
                <CvCard
                  key={shaped.entry.id}
                  shaped={shaped}
                  sort={sort}
                  onOpen={onOpen}
                  onToggle={onToggle}
                  dark={dark}
                />
              ))}
            </div>
          </section>
        ) : null}

        {dayColumns.map((day) => {
          const open = day.shaped.filter((s) => !s.entry.done);
          const loadMinutes = open.reduce((n, s) => n + (s.entry.est ?? 0), 0);
          const shedResult = computeShed<ShedCandidate & { shaped: ShapedEntry }>(
            open.map((s) => ({
              id: s.entry.id,
              estMinutes: s.entry.est ?? 0,
              dueInDays: s.dueInDays,
              shaped: s,
            })),
            day.capacityMin
          );
          return (
            <section
              key={day.key}
              style={{
                flex: "0 0 auto",
                width: 268,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <ColumnHeader
                label={day.isToday ? "Today" : dateLabel(day.date)}
                today={day.isToday}
                count={open.length}
                loadMinutes={loadMinutes}
                capacityMin={day.capacityMin}
              />
              {shedResult ? (
                <button
                  type="button"
                  onClick={() =>
                    onShed?.(
                      shedResult.moves.map((m) => m.shaped.entry),
                      addCalendarDays(day.date, 1)
                    )
                  }
                  title={`Move to the next day: ${shedResult.moves
                    .map((m) => m.shaped.entry.title)
                    .join(", ")}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    width: "100%",
                    height: 26,
                    padding: "0 8px",
                    border: 0,
                    cursor: "default",
                    borderRadius: "var(--radius-md)",
                    background: "transparent",
                    textAlign: "left",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      flex: "none",
                      width: 6,
                      height: 6,
                      borderRadius: 3,
                      background: "var(--destructive)",
                    }}
                  />
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      font: "var(--type-meta)",
                      color: "var(--text-secondary)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {Math.round(shedResult.overMinutes)} min over — move{" "}
                    {shedResult.moves.length === 1
                      ? shedResult.moves[0].shaped.entry.title
                      : `${shedResult.moves.length} tasks`}
                  </span>
                </button>
              ) : null}
              <div
                className="scroll-inner"
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {sortShaped(day.shaped, sort).map((shaped) => (
                  <CvCard
                    key={shaped.entry.id}
                    shaped={shaped}
                    sort={sort}
                    onOpen={onOpen}
                    onToggle={onToggle}
                    dark={dark}
                  />
                ))}
                {!day.shaped.length ? (
                  <span
                    style={{
                      font: "var(--type-meta)",
                      fontStyle: "italic",
                      color: "var(--text-disabled)",
                      padding: "2px 2px 6px",
                    }}
                  >
                    Nothing here yet.
                  </span>
                ) : null}
              </div>
            </section>
          );
        })}

        {noDate.length ? (
          <section
            style={{
              flex: "0 0 auto",
              width: 268,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <ColumnHeader
              label="No date"
              today={false}
              count={noDate.length}
              loadMinutes={0}
              capacityMin={null}
            />
            <div
              className="scroll-inner"
              style={{
                flex: 1,
                minHeight: 0,
                overflow: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {sortShaped(noDate, sort).map((shaped) => (
                <CvCard
                  key={shaped.entry.id}
                  shaped={shaped}
                  sort={sort}
                  onOpen={onOpen}
                  onToggle={onToggle}
                  dark={dark}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
