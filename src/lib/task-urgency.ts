import { newDate } from "@/lib/date-utils";

import { Task, TaskStatus } from "@/types/task";

export type UrgencyLevel = "red" | "yellow" | "green" | "none";

export const URGENCY_COLORS: Record<UrgencyLevel, string> = {
  red: "#F87171",
  yellow: "#F59E0B",
  green: "#34D399",
  // No due date - a muted circle.
  none: "#6B7075",
};

// Lower rank sorts first (most urgent at the top).
const URGENCY_RANK: Record<UrgencyLevel, number> = {
  red: 0,
  yellow: 1,
  green: 2,
  none: 3,
};

interface UrgencyThresholds {
  redThresholdHours: number;
  yellowThresholdHours: number;
}

/**
 * Classify a task's urgency from its due date and the configured thresholds.
 * Overdue or due within the red window => red; within the yellow window =>
 * yellow; further out => green; no due date => none.
 */
export function getTaskUrgency(
  task: Task,
  thresholds: UrgencyThresholds,
  now: Date = newDate()
): UrgencyLevel {
  const due = task.deadline
    ? newDate(task.deadline)
    : task.dueDate
      ? newDate(task.dueDate)
      : null;
  if (!due) return "none";

  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDue <= thresholds.redThresholdHours) return "red";
  if (hoursUntilDue <= thresholds.yellowThresholdHours) return "yellow";
  return "green";
}

/**
 * Is this an active task that belongs in today's sidebar list? A task is shown
 * only when its effective due date, scheduled block, or start date is today.
 */
export function isTodayTask(task: Task, now: Date = newDate()): boolean {
  if (task.status === TaskStatus.COMPLETED) return false;

  const isSameLocalDay = (value: Date | string | null | undefined) => {
    if (!value) return false;
    const date = newDate(value);
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  };

  const effectiveDueDate = task.deadline ?? task.dueDate;
  return [effectiveDueDate, task.scheduledStart, task.startDate].some(
    isSameLocalDay
  );
}

/**
 * Sort tasks most-urgent first: red (overdue pinned to the top) then yellow
 * then green, and within a level by the soonest due date.
 */
export function sortByUrgency(
  tasks: Task[],
  thresholds: UrgencyThresholds,
  now: Date = newDate()
): Task[] {
  return [...tasks].sort((a, b) => {
    const rankA = URGENCY_RANK[getTaskUrgency(a, thresholds, now)];
    const rankB = URGENCY_RANK[getTaskUrgency(b, thresholds, now)];
    if (rankA !== rankB) return rankA - rankB;

    const dueA = a.deadline
      ? newDate(a.deadline).getTime()
      : a.dueDate
        ? newDate(a.dueDate).getTime()
        : Infinity;
    const dueB = b.deadline
      ? newDate(b.deadline).getTime()
      : b.dueDate
        ? newDate(b.dueDate).getTime()
        : Infinity;
    return dueA - dueB;
  });
}
