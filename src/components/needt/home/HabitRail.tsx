"use client";

/* THE HABIT RAIL — the standing shape of the day, across the top of Today.
 *
 * Ported from `Content height and label fixes/needt-app/Habits.jsx`'s
 * `HabitRail`. It comes first because a habit owns a slot: a standing block
 * the scheduler may not move, so the frame is stated before the day's
 * contents are.
 *
 * A FIELD OF SQUARES FIRST, CHIPS UNDER IT. The squares are the record — one
 * per day, shaded by how many of the standing habits were kept that day — and
 * the chips are the controls, one per habit, each a toggle for today only.
 *
 * THE MEASURE IS A RATIO, NEVER A STREAK ("kept days out of the last 14").
 * A missed day does nothing: no debt, no Overdue entry, no red. See
 * `./logic.ts` for the pure arithmetic this draws.
 */
import * as React from "react";

import { LuCheck } from "react-icons/lu";

import { project as resolveProject } from "@/lib/needt/derive";
import { habits as fixtureHabits, projects as fixtureProjects } from "@/lib/needt/fixture";
import type { NeedtHabit, NeedtProject } from "@/lib/needt/types";

import { Glyph } from "../shell/chrome";

import { habitFieldDays, habitKeptRatio, habitWeekKept } from "./logic";

export interface HabitRailProps {
  /** Defaults to the fixture's habits. */
  habits?: readonly NeedtHabit[];
  /** Resolves each habit's `project` to a hue. Defaults to the fixture. */
  projects?: readonly NeedtProject[];
}

function HabitFieldView({ habits }: { habits: readonly NeedtHabit[] }) {
  const days = habitFieldDays(habits);
  const label = `One square a day; the darker it is, the more of these you kept.`;
  return (
    <span
      title={label}
      style={{ display: "flex", gap: 2.5, justifyContent: "center", minWidth: 0 }}
    >
      {days.map((day) => {
        const ratio = day.of ? day.kept / day.of : 0;
        return (
          <span
            key={day.index}
            style={{
              width: 7,
              height: 7,
              borderRadius: 2,
              flex: "none",
              background: ratio
                ? `color-mix(in oklab, var(--accent) ${Math.round(26 + ratio * 62)}%, transparent)`
                : "var(--fill-3)",
              boxShadow: day.today ? "0 0 0 1.5px var(--accent)" : "none",
            }}
          />
        );
      })}
    </span>
  );
}

function HabitChip({
  habit,
  hue,
  onToggle,
}: {
  habit: NeedtHabit;
  hue: string;
  onToggle: () => void;
}) {
  const on = Boolean(habit.done[habit.done.length - 1]);
  const { kept, of } = habitKeptRatio(habit.done);
  const week = habitWeekKept(habit.done);
  const summary = habit.quota
    ? `${week}/${habit.quota} this week`
    : `${kept} of ${of}`;
  return (
    <button
      type="button"
      title={`${habit.at ? `${habit.at} · ` : ""}${summary} · ${on ? "kept today, click to undo" : "click to mark it kept"}`}
      onClick={onToggle}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 7,
        height: 30,
        padding: "0 12px 0 9px",
        border: 0,
        cursor: "default",
        borderRadius: "var(--radius-pill)",
        background: on
          ? `color-mix(in oklab, ${hue} 16%, var(--surface-raised))`
          : "var(--surface-raised)",
        boxShadow: "var(--shadow-ring)",
        transition: "background-color var(--transition-hover)",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          flex: "none",
          width: 14,
          height: 14,
          borderRadius: 7,
          display: "grid",
          placeItems: "center",
          background: on ? hue : "transparent",
          boxShadow: on ? "none" : `inset 0 0 0 1.5px ${hue}`,
          color: "var(--surface-raised)",
        }}
      >
        {on ? <Glyph of={LuCheck} size={9} /> : null}
      </span>
      <span
        style={{
          font: "var(--type-meta-medium)",
          color: on ? "var(--text-primary)" : "var(--text-secondary)",
          whiteSpace: "nowrap",
        }}
      >
        {habit.title}
      </span>
    </button>
  );
}

/**
 * The habit rail. Toggling is local to this component — it edits only
 * today's cell of each habit's own record, never the days before it, which
 * is what keeps "a missed day does nothing" true here too.
 */
export function HabitRail({
  habits = fixtureHabits,
  projects = fixtureProjects,
}: HabitRailProps) {
  const [today, setToday] = React.useState<Record<string, boolean>>({});

  const live = React.useMemo(
    () =>
      habits.map((h) => {
        const override = today[h.id];
        if (override === undefined) return h;
        const done = h.done.slice();
        done[done.length - 1] = override ? 1 : 0;
        return { ...h, done };
      }),
    [habits, today]
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        minWidth: 0,
      }}
    >
      <HabitFieldView habits={live} />
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 11,
          flexWrap: "wrap",
          minWidth: 0,
        }}
      >
        {live.map((h) => {
          const proj = h.project ? resolveProject(h.project, projects) : null;
          const hue = proj ? proj.hue : "var(--text-tertiary)";
          const on = Boolean(h.done[h.done.length - 1]);
          return (
            <HabitChip
              key={h.id}
              habit={h}
              hue={hue}
              onToggle={() =>
                setToday((s) => ({ ...s, [h.id]: !on }))
              }
            />
          );
        })}
      </div>
    </div>
  );
}
