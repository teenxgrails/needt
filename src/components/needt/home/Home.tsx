"use client";

/* HOME — three forms in one screen, chosen in a settings popover.
 *
 * Ported from `TodayScreen.jsx`. Today is the default: the habit rail, then
 * the day cut into its parts, Overdue and Tomorrow beside it as walls. Prose
 * and Canvas are two readings of the week's brief, sharing one object list
 * through `BriefBoard`.
 *
 * PROSE OWNS THE PAGE: the date plate and week strip hide there, because a
 * written brief is a document, not a dashboard with a date on it. The
 * prototype's own `TodayScreen.jsx` also hides them for `form === "today"`;
 * PORT.md §3 only asks for that in Prose. This follows PORT.md — see the
 * report for the discrepancy.
 */
import * as React from "react";

import { LuWandSparkles } from "react-icons/lu";

import {
  tasks as fixtureTasks,
  today as fixtureToday,
} from "@/lib/needt/fixture";
import type { NeedtHabit, NeedtProject, NeedtTask } from "@/lib/needt/types";

import { Glyph } from "../shell/chrome";
import { BriefBoard } from "./BriefBoard";
import { FormSwitcher, type HomeFormKind } from "./FormSwitcher";
import { TodayForm } from "./TodayForm";
import { WeekPlate } from "./WeekPlate";

export interface HomeProps {
  /** Defaults to the fixture's tasks. */
  tasks?: readonly NeedtTask[];
  habits?: readonly NeedtHabit[];
  projects?: readonly NeedtProject[];
  /** The reference "today". Defaults to the fixture's date. */
  now?: Date;
  /** Uncontrolled by default; pass both to control the chosen form. */
  form?: HomeFormKind;
  initialForm?: HomeFormKind;
  onFormChange?: (form: HomeFormKind) => void;
  onOpenTask?: (task: NeedtTask) => void;
  onToggleTask?: (id: string) => void;
  onToggleHabit?: (id: string, completed: boolean) => void;
  onAddTask?: () => void;
  onMoveOverdueToToday?: () => void;
  onPlanMyDay?: () => void;
  /** Production keeps unfinished Prose/Canvas persistence out of view. */
  showFormSwitcher?: boolean;
  habitsReadOnly?: boolean;
}

/** The screen. Export it; the caller decides when and where to mount it. */
export function Home({
  tasks = fixtureTasks,
  habits,
  projects,
  now = fixtureToday,
  form: formProp,
  initialForm = "today",
  onFormChange,
  onOpenTask,
  onToggleTask,
  onToggleHabit,
  onAddTask,
  onMoveOverdueToToday,
  onPlanMyDay,
  showFormSwitcher = true,
  habitsReadOnly = false,
}: HomeProps) {
  const [ownForm, setOwnForm] = React.useState<HomeFormKind>(initialForm);
  const form = formProp ?? ownForm;
  const setForm = onFormChange ?? setOwnForm;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          flex: "none",
          paddingBottom: form === "prose" ? 0 : 4,
        }}
      >
        {form === "prose" ? null : (
          <div style={{ flex: 1, minWidth: 0 }}>
            <WeekPlate now={now} tasks={tasks} />
          </div>
        )}
        <div
          style={{
            marginLeft: form === "prose" ? "auto" : undefined,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          {showFormSwitcher ? (
            <FormSwitcher form={form} onChange={setForm} />
          ) : null}
          {onPlanMyDay ? (
            <button
              type="button"
              onClick={onPlanMyDay}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                height: 32,
                padding: "0 12px 0 10px",
                border: 0,
                cursor: "default",
                borderRadius: "var(--radius-lg)",
                background: "var(--fill-accent)",
                color: "var(--accent)",
                font: "var(--type-ui-medium)",
              }}
            >
              <Glyph of={LuWandSparkles} size={14} />
              Plan my day
            </button>
          ) : null}
        </div>
      </div>

      <div
        className="scroll-inner"
        style={{ flex: 1, minHeight: 0, overflow: "auto", paddingBottom: 20 }}
      >
        {form === "today" ? (
          <TodayForm
            tasks={tasks}
            habits={habits}
            projects={projects}
            now={now}
            onOpenTask={onOpenTask}
            onToggleTask={onToggleTask}
            onToggleHabit={onToggleHabit}
            onAddTask={onAddTask}
            onMoveOverdueToToday={onMoveOverdueToToday}
            habitsReadOnly={habitsReadOnly}
          />
        ) : (
          <BriefBoard form={form} />
        )}
      </div>
    </div>
  );
}
