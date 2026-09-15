"use client";

/* THE TODAY FORM — the day, and the standing shape around it.
 *
 * Ported from `HomeToday.jsx`. The habit rail comes first because it is the
 * frame the day is planned inside, not a widget beside it. Then the day's own
 * tasks, cut into Morning / Afternoon / Evening. Overdue sits beside Today,
 * because overdue work is the only thing competing with today for today's
 * hours — parked off the left wall rather than a screen away. Tomorrow sits
 * the same way on the right, a look ahead rather than a commitment.
 *
 * THE WALLS' CONTAINING BLOCK CLIPS THEM. A `transform` does not remove an
 * element from an ancestor's scrollable overflow, so this room is
 * `overflow: clip` — not `hidden`, which would turn it into a scroll
 * container of its own — and the shade over each parked shelf is drawn here,
 * above both walls, so it never clips away with a parked wall's own
 * transform. See `Wall.tsx` and `logic.ts`.
 */
import * as React from "react";

import { LuPlus, LuRotateCcw } from "react-icons/lu";

import { calendarDayDifference, startOfDay } from "@/lib/date-utils";
import { isOverdue, parseDueDate } from "@/lib/needt/derive";
import { today as fixtureToday, tasks as fixtureTasks } from "@/lib/needt/fixture";
import type { NeedtTask } from "@/lib/needt/types";

import { RichBlock } from "../RichBlock";
import { rbShape } from "../rb-shape";
import { Glyph, IconButton, SidebarHint } from "../shell/chrome";

import { HabitRail } from "./HabitRail";
import { homeParted } from "./logic";
import { Wall, WallShade } from "./Wall";

export interface TodayFormProps {
  /** Defaults to the fixture's tasks. */
  tasks?: readonly NeedtTask[];
  /** The reference "today". Defaults to the fixture's date — never a bare
   * `new Date()`, per repository convention. */
  now?: Date;
  onOpenTask?: (task: NeedtTask) => void;
  onToggleTask?: (id: number) => void;
  onAddTask?: () => void;
  onMoveOverdueToToday?: () => void;
}

function dueOffset(task: NeedtTask, now: Date): number | null {
  const due = parseDueDate(task.due, now);
  if (!due) return null;
  return calendarDayDifference(startOfDay(due), startOfDay(now));
}

function TaskColumn({
  tasks,
  dense,
  onOpen,
  onToggle,
}: {
  tasks: readonly NeedtTask[];
  dense?: boolean;
  onOpen?: (task: NeedtTask) => void;
  onToggle?: (id: number) => void;
}) {
  return (
    <>
      {tasks.map((task) => (
        <RichBlock
          key={task.id}
          block={rbShape(task, { layout: "card", dense })}
          weight={dense ? "compressed" : "open"}
          fit
          onOpen={onOpen ? () => onOpen(task) : undefined}
          onToggle={onToggle ? () => onToggle(task.id) : undefined}
        />
      ))}
    </>
  );
}

/** Today's own column: the habit rail's contents, cut into its parts. */
function TodayColumn({
  tasks,
  onOpen,
  onToggle,
  onAdd,
}: {
  tasks: readonly NeedtTask[];
  onOpen?: (task: NeedtTask) => void;
  onToggle?: (id: number) => void;
  onAdd?: () => void;
}) {
  const rows = homeParted(tasks);
  return (
    <section
      style={{
        flex: "1.35 1 0",
        minWidth: 0,
        maxWidth: 560,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <header style={{ display: "flex", alignItems: "baseline", gap: 8, height: 28, flex: "none" }}>
        <span style={{ font: "var(--type-card-title)", fontSize: 13, color: "var(--accent)" }}>Today</span>
        <span style={{ font: "var(--type-meta)", color: "var(--text-muted)", fontVariantNumeric: "tabular-nums" }}>
          {tasks.length}
        </span>
      </header>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 8,
          paddingBottom: 8,
        }}
      >
        {rows.length === 0 ? (
          <SidebarHint>Nothing is due today.</SidebarHint>
        ) : (
          rows.map((row) =>
            row.kind === "header" ? (
              <span
                key={row.part}
                style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: row.first ? 0 : 6 }}
              >
                <span
                  style={{
                    flex: "none",
                    font: "var(--type-meta-medium)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "var(--text-quaternary)",
                  }}
                >
                  {row.part}
                </span>
                <span aria-hidden="true" style={{ flex: 1, borderTop: "1px solid var(--border)" }} />
              </span>
            ) : (
              <RichBlock
                key={row.task.id}
                block={rbShape(row.task, { layout: "card" })}
                weight="open"
                fit
                onOpen={onOpen ? () => onOpen(row.task) : undefined}
                onToggle={onToggle ? () => onToggle(row.task.id) : undefined}
              />
            )
          )
        )}
        <button
          type="button"
          onClick={onAdd}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 7,
            height: 30,
            padding: "0 8px",
            border: 0,
            cursor: "default",
            borderRadius: "var(--radius-md)",
            background: "transparent",
            font: "var(--type-ui)",
            color: "var(--text-muted)",
          }}
        >
          <Glyph of={LuPlus} size={14} />
          Add task
        </button>
      </div>
    </section>
  );
}

/**
 * The Today form: the habit rail across the top, then Today between the two
 * walls. Everything is a controlled prop with a fixture-backed default so
 * this can be dropped into a page (or a lab) with no wiring at all.
 */
export function TodayForm({
  tasks = fixtureTasks,
  now = fixtureToday,
  onOpenTask,
  onToggleTask,
  onAddTask,
  onMoveOverdueToToday,
}: TodayFormProps) {
  const debt = React.useMemo(
    () => tasks.filter((t) => !t.done && !t.noSlot && isOverdue(t, now)),
    [tasks, now]
  );
  const mine = React.useMemo(
    () => tasks.filter((t) => !t.noSlot && !isOverdue(t, now) && dueOffset(t, now) === 0),
    [tasks, now]
  );
  const next = React.useMemo(
    () => tasks.filter((t) => !t.noSlot && !isOverdue(t, now) && dueOffset(t, now) === 1),
    [tasks, now]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, gap: 16 }}>
      <div style={{ flex: "none" }}>
        <HabitRail />
      </div>
      <div style={{ position: "relative", flex: 1, minHeight: 0, display: "flex", justifyContent: "center", overflow: "clip" }}>
        <WallShade side="left" />
        <WallShade side="right" />
        {debt.length ? (
          <Wall
            side="left"
            title="Overdue"
            count={debt.length}
            emptyText="Nothing overdue."
            action={
              <IconButton
                label="Move everything overdue to today"
                variant="ghost"
                icon={<Glyph of={LuRotateCcw} size={14} />}
                onClick={onMoveOverdueToToday}
              />
            }
          >
            <TaskColumn tasks={debt} dense onOpen={onOpenTask} onToggle={onToggleTask} />
          </Wall>
        ) : null}
        <TodayColumn tasks={mine} onOpen={onOpenTask} onToggle={onToggleTask} onAdd={onAddTask} />
        <Wall side="right" title="Tomorrow" count={next.length} emptyText="Nothing yet.">
          <TaskColumn tasks={next} dense onOpen={onOpenTask} onToggle={onToggleTask} />
        </Wall>
      </div>
    </div>
  );
}
