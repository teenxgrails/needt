import type { AgendaGroup } from "@/components/today/AgendaTaskSection";

import { endOfWeek, isSameDay, newDate } from "@/lib/date-utils";

import { type Task, TaskStatus } from "@/types/task";

function taskDates(task: Task) {
  return [
    task.scheduledStart,
    task.startDate,
    task.dueDate,
    ...(task.scheduledBlocks?.map((block) => block.start) ?? []),
  ]
    .filter(Boolean)
    .map((date) => newDate(date!));
}

export function taskBelongsToDay(task: Task, date: Date) {
  return taskDates(task).some((taskDate) => isSameDay(taskDate, date));
}

function taskDisplayDate(task: Task) {
  const value = task.dueDate ?? task.scheduledStart ?? task.startDate;
  return value ? newDate(value) : null;
}

export function buildAgendaGroups({
  tasks,
  dayStart,
  dayEnd,
  viewingToday,
  referencedIds,
}: {
  tasks: Task[];
  dayStart: Date;
  dayEnd: Date;
  viewingToday: boolean;
  referencedIds: Set<string>;
}) {
  const incomplete = tasks.filter(
    (task) => task.status !== TaskStatus.COMPLETED
  );
  const todayTasks = incomplete
    .filter((task) => taskBelongsToDay(task, dayStart))
    .sort((left, right) => {
      const leftDate = taskDisplayDate(left)?.getTime() ?? Infinity;
      const rightDate = taskDisplayDate(right)?.getTime() ?? Infinity;
      return leftDate - rightDate;
    });
  const todayIds = new Set(todayTasks.map((task) => task.id));
  const overdue = viewingToday
    ? incomplete.filter(
        (task) =>
          !todayIds.has(task.id) &&
          task.dueDate &&
          newDate(task.dueDate) < dayStart
      )
    : [];
  const overdueIds = new Set(overdue.map((task) => task.id));
  const weekEnd = endOfWeek(dayStart, { weekStartsOn: 1 });
  const weekTasks = viewingToday
    ? incomplete.filter((task) => {
        if (todayIds.has(task.id) || overdueIds.has(task.id)) return false;
        const date = taskDisplayDate(task);
        return Boolean(date && date > dayEnd && date <= weekEnd);
      })
    : [];
  const completed = tasks.filter((task) => {
    if (task.status !== TaskStatus.COMPLETED) return false;
    return Boolean(
      (task.completedAt && isSameDay(newDate(task.completedAt), dayStart)) ||
        taskBelongsToDay(task, dayStart)
    );
  });

  return [
    { id: "today", title: "Today's tasks", tasks: todayTasks },
    {
      id: "overdue",
      title: "Tasks past deadline",
      tasks: overdue,
      tone: "danger",
    },
    { id: "week", title: "This week's tasks", tasks: weekTasks },
    {
      id: "completed",
      title: "Completed",
      tasks: completed,
      tone: "muted",
    },
  ]
    .map((group) => ({
      ...group,
      tasks: group.tasks.filter((task) => !referencedIds.has(task.id)),
    }))
    .filter((group) => group.tasks.length > 0) as AgendaGroup[];
}
