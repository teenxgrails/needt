"use client";

/* THE DATE PLATE AND WEEK STRIP — the top of Today and Canvas.
 *
 * One object, not two: the day number at display size with its weekday under
 * it. The tab bar already says which screen this is, so the word "Today" is
 * not repeated here — the number is the heading. Ported from
 * `TodayScreen.jsx`'s inline header, kept local to Home rather than promoted
 * to a shared calendar component, since nothing outside Home draws it this
 * way yet.
 *
 * PROSE OWNS THE PAGE: PORT.md §3 has the date plate and week strip hide
 * there, because a written brief is a document, not a dashboard with a date
 * on it. `Home.tsx` is the one that decides when to mount this at all.
 */
import * as React from "react";

import { newDate } from "@/lib/date-utils";
import { MONTHS } from "@/lib/needt/fixture";
import type { NeedtTask } from "@/lib/needt/types";

import { isoWeekNumber } from "./logic";

export interface WeekPlateProps {
  /** The reference date — never constructed with a bare `new Date()` here. */
  now: Date;
  /** This week's tasks, used only to mark which days carry work. */
  tasks?: readonly NeedtTask[];
}

const DOW_LABELS: readonly string[] = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

function weekDays(now: Date): Date[] {
  const monday = newDate(now);
  const isoDay = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - isoDay);
  return Array.from({ length: 7 }, (_, i) => {
    const d = newDate(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function dueOnDay(task: NeedtTask, day: Date): boolean {
  const match = /^\s*(\d{1,2})\s+([A-Za-z]{3})/.exec(task.due ?? "");
  if (!match) return false;
  const dayOfMonth = Number(match[1]);
  const month = MONTHS.findIndex(
    (name) => name.toLowerCase() === match[2].toLowerCase()
  );
  return dayOfMonth === day.getDate() && month === day.getMonth();
}

function WeekDay({
  day,
  today,
  hasWork,
}: {
  day: Date;
  today: boolean;
  hasWork: boolean;
}) {
  return (
    <span
      style={{
        flex: "1 1 0",
        minWidth: 40,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        padding: "6px 4px",
        borderRadius: "var(--radius-md)",
        boxShadow: today ? "0 0 0 1.5px var(--accent)" : "none",
      }}
    >
      <span
        style={{
          font: "var(--type-meta-medium)",
          fontSize: 10,
          letterSpacing: "0.04em",
          color: today ? "var(--accent)" : "var(--text-quaternary)",
        }}
      >
        {DOW_LABELS[(day.getDay() + 6) % 7]}
      </span>
      <span
        style={{
          font: "var(--type-ui-medium)",
          fontVariantNumeric: "tabular-nums",
          color: today ? "var(--accent)" : "var(--text-secondary)",
        }}
      >
        {day.getDate()}
      </span>
      <span
        aria-hidden="true"
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          background: hasWork ? "var(--text-tertiary)" : "transparent",
        }}
      />
    </span>
  );
}

/**
 * The date plate and the week strip beside it. `Home.tsx` mounts this for
 * Today and Canvas and hides it for Prose — see the file header.
 */
export function WeekPlate({ now, tasks = [] }: WeekPlateProps) {
  const days = React.useMemo(() => weekDays(now), [now]);
  return (
    <div style={{ display: "flex", gap: 20, alignItems: "center", flex: "none", padding: "8px 0 16px" }}>
      <div style={{ flex: "none", display: "flex", alignItems: "flex-end", gap: 11, paddingRight: 4, paddingBottom: 2 }}>
        <span
          style={{
            font: "400 76px/0.82 var(--font-display, var(--font-sans))",
            color: "var(--text-primary)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {now.getDate()}
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: 1, paddingBottom: 4 }}>
          <span style={{ font: "400 27px/1 var(--font-display, var(--font-sans))", color: "var(--text-tertiary)" }}>
            {MONTHS[now.getMonth()]}
          </span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ font: "400 15px/1.2 var(--font-display, var(--font-sans))", color: "var(--text-muted)" }}>
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][now.getDay()]}
            </span>
            <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
              week {isoWeekNumber(now)}
            </span>
          </span>
        </span>
      </div>
      <div style={{ flex: 1, minWidth: 0, display: "flex", gap: 4 }}>
        {days.map((day) => (
          <WeekDay
            key={day.toISOString()}
            day={day}
            today={day.toDateString() === now.toDateString()}
            hasWork={tasks.some((task) => dueOnDay(task, day))}
          />
        ))}
      </div>
    </div>
  );
}
