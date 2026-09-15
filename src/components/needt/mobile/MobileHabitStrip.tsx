"use client";

/* THE HABIT STRIP — the same chips as the desktop rail, scrolled sideways.
 *
 * Ported from `Mobile.jsx`'s `MbHabits`. The desktop's `HabitRail` (in
 * `../home`) draws a field of squares first and a wrapped row of chips under
 * it — the field is the record, the chips are today's controls. A phone has
 * no width to spend on both, so only the chips travel here, sideways rather
 * than wrapped; the field (and the ratio it summarises) stays reachable from
 * a habit's own tooltip, the same way the desktop states it. The measure
 * itself is unchanged: `habitKeptRatio`/`habitWeekKept` from `../home`, so a
 * ratio read on the phone and on the desktop is the same arithmetic, not a
 * second copy of it.
 */
import * as React from "react";

import { LuCheck } from "react-icons/lu";

import { project as resolveProject } from "@/lib/needt/derive";
import {
  habits as fixtureHabits,
  projects as fixtureProjects,
} from "@/lib/needt/fixture";
import type { NeedtHabit, NeedtProject } from "@/lib/needt/types";

import { habitKeptRatio, habitWeekKept } from "../home";
import { Glyph } from "../shell/chrome";
import { HABIT_CHIP_HEIGHT } from "./mobile-logic";

export interface MobileHabitStripProps {
  habits?: readonly NeedtHabit[];
  projects?: readonly NeedtProject[];
}

function MobileHabitChip({
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
      title={`${habit.at ? `${habit.at} · ` : ""}${summary} · ${on ? "kept today, tap to undo" : "tap to mark it kept"}`}
      onClick={onToggle}
      style={{
        flex: "none",
        display: "flex",
        alignItems: "center",
        gap: 7,
        height: HABIT_CHIP_HEIGHT,
        padding: "0 14px 0 11px",
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
          width: 16,
          height: 16,
          borderRadius: 8,
          display: "grid",
          placeItems: "center",
          background: on ? hue : "transparent",
          boxShadow: on ? "none" : `inset 0 0 0 1.5px ${hue}`,
          color: "var(--surface-raised)",
        }}
      >
        {on ? <Glyph of={LuCheck} size={10} /> : null}
      </span>
      <span
        style={{
          font: "var(--type-ui-medium)",
          color: on ? "var(--text-primary)" : "var(--text-secondary)",
          whiteSpace: "nowrap",
        }}
      >
        {habit.title}
      </span>
    </button>
  );
}

export function MobileHabitStrip({
  habits = fixtureHabits,
  projects = fixtureProjects,
}: MobileHabitStripProps) {
  const [today, setToday] = React.useState<Record<string, boolean>>({});

  const live = React.useMemo(
    () =>
      habits.map((habit) => {
        const override = today[habit.id];
        if (override === undefined) return habit;
        const done = habit.done.slice();
        done[done.length - 1] = override ? 1 : 0;
        return { ...habit, done };
      }),
    [habits, today]
  );

  return (
    <div
      className="mb-strip"
      style={{
        flex: "none",
        display: "flex",
        gap: 6,
        overflowX: "auto",
        padding: "0 16px 11px",
      }}
    >
      {live.map((habit) => {
        const resolved = habit.project
          ? resolveProject(habit.project, projects)
          : null;
        const hue = resolved ? resolved.hue : "var(--text-tertiary)";
        const on = Boolean(habit.done[habit.done.length - 1]);
        return (
          <MobileHabitChip
            key={habit.id}
            habit={habit}
            hue={hue}
            onToggle={() =>
              setToday((state) => ({ ...state, [habit.id]: !on }))
            }
          />
        );
      })}
    </div>
  );
}
