export const UNSCHEDULED_REASON_MESSAGES = {
  NO_WORKING_TIME: "No free time in the Work Schedule.",
  BEFORE_EARLIEST_START: "The task starts beyond the planning window.",
  DEPENDENCY_BLOCKED: "A dependency must be completed first.",
  DEADLINE_IMPOSSIBLE: "The deadline is earlier than the task can finish.",
  NO_DURATION: "The task needs a valid duration.",
  ENERGY_WINDOW_UNAVAILABLE: "No matching energy window is available.",
  HARD_DEADLINE_MISSED: "No free time remains before the hard deadline.",
} as const;

export type UnscheduledReason = keyof typeof UNSCHEDULED_REASON_MESSAGES;

export interface UnscheduledReasonItem {
  taskId: string;
  reason: UnscheduledReason;
}

export function summarizeUnscheduledReasons(
  items: UnscheduledReasonItem[]
): string {
  const counts = new Map<UnscheduledReason, number>();
  for (const item of items) {
    counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1);
  }

  return [...counts]
    .map(([reason, count]) => {
      const message = UNSCHEDULED_REASON_MESSAGES[reason];
      return count === 1 ? message : `${count} tasks: ${message}`;
    })
    .join(" ");
}
