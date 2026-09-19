import { newDate, startOfDay } from "@/lib/date-utils";
import { isOverdue } from "@/lib/needt/derive";
import type { NeedtTask } from "@/lib/needt/types";

import { TaskStatus, type UpdateTask } from "@/types/task";

export function toggledTaskStatus(task: NeedtTask): TaskStatus {
  return task.done ? TaskStatus.TODO : TaskStatus.COMPLETED;
}

export function moveTaskToDay(task: NeedtTask, day: Date): UpdateTask | null {
  const updates: UpdateTask = {};

  if (task.scheduledStart && task.scheduledEnd) {
    const previousStart = newDate(task.scheduledStart);
    const previousEnd = newDate(task.scheduledEnd);
    const duration = Math.max(
      previousEnd.getTime() - previousStart.getTime(),
      0
    );
    const scheduledStart = newDate(previousStart);
    scheduledStart.setFullYear(
      day.getFullYear(),
      day.getMonth(),
      day.getDate()
    );
    updates.scheduledStart = scheduledStart;
    updates.scheduledEnd = newDate(scheduledStart.getTime() + duration);
  } else if (task.scheduledOn) {
    return null;
  }

  if (!task.scheduledOn || isOverdue(task, day)) {
    updates.dueDate = startOfDay(day);
  }

  return Object.keys(updates).length ? updates : null;
}
