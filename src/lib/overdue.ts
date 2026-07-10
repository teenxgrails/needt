import { Task, TaskStatus } from "@/types/task";

export type OverdueSeverity = "none" | "orange" | "red";

export function getTaskDueDate(task: Pick<Task, "dueDate" | "deadline">) {
  return task.dueDate || task.deadline || null;
}

export function getOverdueSummary(tasks: Task[]) {
  const now = new Date();
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  const redCutoff = new Date(now);
  redCutoff.setDate(redCutoff.getDate() - 3);
  redCutoff.setHours(0, 0, 0, 0);

  let count = 0;
  let severity: OverdueSeverity = "none";

  for (const task of tasks) {
    if (task.status === TaskStatus.COMPLETED) continue;
    const dueDate = getTaskDueDate(task);
    if (!dueDate) continue;
    const due = new Date(dueDate);
    if (Number.isNaN(due.getTime())) continue;
    if (due.getTime() <= endOfToday.getTime()) {
      count += 1;
      severity = due.getTime() < redCutoff.getTime() ? "red" : severity;
      if (severity !== "red") severity = "orange";
    }
  }

  return { count, severity };
}
