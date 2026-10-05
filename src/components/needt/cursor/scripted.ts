/* THE STAND-IN AUTHOR — a run, composed from the fixture, with no model.
 *
 * PORT.md §9 is honest that the kit's scheduler is scripted: "Plan my day"
 * plays a plausible placement, it does not solve one. That stays true here and
 * is stated rather than hidden — what this file proves is the HAND, not the
 * reasoning. Real placement belongs to `src/services/scheduling/`, and when it
 * arrives it satisfies `AgentRunSource` and this file stops being mounted.
 *
 * The selectors are the seams the shell already leaves: `data-agent-queue`
 * around the unplaced rows, `data-drop` on the rows, the mini-month cells and
 * the focus control. Nothing here reaches for a class name or an nth-child;
 * a run written against styling is a run that breaks on the next restyle.
 */
import { dateLabel } from "@/lib/needt/derive";
import type { NeedtTask } from "@/lib/needt/types";

import type { AgentRun, AgentRunSource } from "./types";

/** The first unplaced row in the rail — the one the queue shows at the top. */
const QUEUE_ROW = '[data-agent-queue] [data-drop="row"]';
/** The focus control, and the two things inside it a run touches. */
const FOCUS = '[data-drop="focus"]';
const FOCUS_TRIGGER = `${FOCUS} button`;
const FOCUS_FIELD = `${FOCUS} .nt-input`;
const FOCUS_START = `${FOCUS} .btn-accent`;

/** How long the sentence on the day cell stays up before the hand moves on. */
const READ_MS = 520;

function minutes(task: NeedtTask): string {
  const est = task.est ?? 0;
  if (est >= 60 && est % 60 === 0) return `${est / 60}h`;
  if (est > 60) return `${Math.floor(est / 60)}h ${est % 60}m`;
  return `${est}m`;
}

/**
 * PLACE THE FIRST UNPLACED TASK. Pick it up out of the queue, carry it to a
 * day, put it down — and leave the receipt beside the TASK, because the task
 * is what changed; the day cell only received it.
 */
export function placeFirstUnplaced(
  tasks: readonly NeedtTask[],
  today: Date
): AgentRun | null {
  const task = tasks.find((one) => !one.done && !one.time && !one.noSlot);
  if (!task) return null;

  /* `dateLabel` is the one day label in the product, and it is what the
     mini-month writes into `data-label` — so the run names a day the way the
     screen does rather than in a second private format.

     The day is TODAY, not the task's own `due`. Most of what waits in the
     queue is already past its date, and a hand that carries an overdue task
     back to the day it missed has placed it nowhere: that day has no hours
     left in it, and the cell is not even on the board. */
  const day = dateLabel(today);

  return {
    label: `Place ${task.title}`,
    steps: [
      {
        target: QUEUE_ROW,
        act: { kind: "hold", title: task.title },
        say: `Taking ${task.title} — ${minutes(task)}.`,
      },
      {
        target: `[data-drop="day"][data-label="${day}"]`,
        act: { kind: "drop" },
        say: `${day} is the first day with room.`,
        afterMs: READ_MS,
        mark: { note: `Needt placed this on ${day}.`, on: QUEUE_ROW },
      },
    ],
  };
}

/**
 * START A FOCUS SESSION. Three acts on one control — open it, say what the
 * session is for, start it — which is the run that shows the hand doing
 * something a person would otherwise have done with four presses.
 */
export function startFocus(tasks: readonly NeedtTask[]): AgentRun {
  const task = tasks.find((one) => !one.done && !one.noSlot);
  const intention = task ? task.title : "The morning";

  return {
    label: "Start a focus session",
    steps: [
      {
        target: FOCUS_TRIGGER,
        act: { kind: "click" },
        say: "Setting a session up.",
      },
      {
        target: FOCUS_FIELD,
        act: { kind: "type", text: intention },
        say: "What it is for.",
      },
      {
        target: FOCUS_START,
        act: { kind: "click" },
        say: "Fifty minutes.",
        mark: { note: `Needt started a session on ${intention}.`, on: FOCUS },
      },
    ],
  };
}

/**
 * The scripted source. First match wins, in order — the same shape the
 * corner's scripted agent uses, so the two stand-ins read alike and are
 * replaced the same way.
 */
export function scriptedRuns(
  tasks: readonly NeedtTask[],
  today: Date
): AgentRunSource {
  return {
    plan(prompt: string) {
      if (/focus|session/i.test(prompt)) return startFocus(tasks);
      if (/plan|place|schedule/i.test(prompt)) {
        return placeFirstUnplaced(tasks, today);
      }
      return placeFirstUnplaced(tasks, today);
    },
  };
}
