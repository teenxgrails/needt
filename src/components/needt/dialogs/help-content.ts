/* THE FOUR CONVENTIONS — ported from `Help.jsx`, unchanged in substance.
 *
 * Not a FAQ and not a tour: the four things a person cannot guess, because
 * each one is a convention this product invented. A rail that means
 * movability, a line you type instead of a form, a gap that offers two
 * minutes, a square per day that never becomes a debt. Everything else in the
 * interface explains itself by being looked at.
 *
 * Kept as its own module — not inline in `HelpSheet.tsx` — for the same
 * reason `NEEDT_KEYS` is its own module: content a component reads is content
 * a test can read too, without rendering anything.
 */
import type { IconType } from "react-icons";
import { LuCalendarDays, LuCircle, LuRepeat, LuType } from "react-icons/lu";

export interface HelpRule {
  rule: string;
  why: string;
}

export interface HelpTopic {
  title: string;
  glyph: IconType;
  rules: readonly HelpRule[];
}

export const NEEDT_HELP: readonly HelpTopic[] = Object.freeze([
  {
    title: "The rail",
    glyph: LuCircle,
    rules: [
      {
        rule: "A grey edge means you pinned it",
        why: "The scheduler will not move a block with a grey edge, however tight the day gets.",
      },
      {
        rule: "A coloured edge means it may move",
        why: "The scheduler placed it and can place it again — that is what the colour is telling you.",
      },
      {
        rule: "No edge at all means it has no slot",
        why: "A resale item closes when it closes. There is nothing to move, so it takes no place in the day.",
      },
    ],
  },
  {
    title: "The line",
    glyph: LuType,
    rules: [
      {
        rule: "Type the task, not a form",
        why: '"ship the boots tomorrow 3pm for 30 min #resale urgent" makes all of it at once.',
      },
      {
        rule: "What it understood turns into a chip",
        why: "Each chip can be cleared on its own. What it did not understand stays as the title.",
      },
      {
        rule: "A slash opens the rest",
        why: "Press / for description, parts, deadline, repeat, labels — the things a sentence cannot say.",
      },
    ],
  },
  {
    title: "The day",
    glyph: LuCalendarDays,
    rules: [
      {
        rule: "Short gaps offer two minutes",
        why: "Any stretch under fifteen minutes shows its length and offers the entries that fit it.",
      },
      {
        rule: "An entry is the first step, not the task",
        why: "It is what you press when you do not have time to start properly.",
      },
      {
        rule: "Plan my day fills the free hours",
        why: "It respects pinned blocks, your working hours and the buffers you set.",
      },
    ],
  },
  {
    title: "Habits",
    glyph: LuRepeat,
    rules: [
      {
        rule: "A square a day, and a miss stays empty",
        why: "It never turns into a debt or an overdue task — that is the whole point of the shelf.",
      },
      {
        rule: "The count is out of the last fourteen days",
        why: "A streak punishes one miss with total loss, which is why streaks get abandoned.",
      },
      {
        rule: "A habit with a time is a standing block",
        why: "It holds its hour, so the planner builds the rest of the day around it.",
      },
    ],
  },
]);
