import {
  addCalendarDays,
  calendarDayDifference,
  newDate,
  startOfDay,
} from "@/lib/date-utils";

interface DateValue {
  startDate?: Date | string | null;
  deadline?: Date | string | null;
  dueDate?: Date | string | null;
  scheduledStart?: Date | string | null;
  scheduledEnd?: Date | string | null;
}

export interface ProjectGanttRange {
  start: Date;
  end: Date;
  days: Date[];
}

function validDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = newDate(value);
  return Number.isNaN(date.getTime()) ? null : startOfDay(date);
}

export function ganttItemDates(item: DateValue) {
  const start = validDate(item.scheduledStart ?? item.startDate);
  const end = validDate(
    item.scheduledEnd ?? item.deadline ?? item.dueDate ?? item.startDate
  );
  return { start, end: end && start && end < start ? start : end };
}

export function buildProjectGanttRange(input: {
  project: DateValue;
  stages: DateValue[];
  tasks: DateValue[];
  today?: Date;
}): ProjectGanttRange {
  const today = startOfDay(input.today ?? newDate());
  const values = [input.project, ...input.stages, ...input.tasks];
  const dates = values.flatMap((value) => {
    const { start, end } = ganttItemDates(value);
    return [start, end].filter((date): date is Date => date !== null);
  });
  const earliest = dates.reduce<Date>(
    (current, date) => (date < current ? date : current),
    today
  );
  const latest = dates.reduce<Date>(
    (current, date) => (date > current ? date : current),
    addCalendarDays(today, 14)
  );
  const start = addCalendarDays(earliest, -2);
  const rawEnd = addCalendarDays(latest, 2);
  const end =
    calendarDayDifference(rawEnd, start) > 365
      ? addCalendarDays(start, 365)
      : rawEnd;
  const days = Array.from(
    { length: calendarDayDifference(end, start) + 1 },
    (_, index) => addCalendarDays(start, index)
  );
  return { start, end, days };
}

export function ganttBarMetrics(
  item: DateValue,
  rangeStart: Date,
  dayWidth: number
) {
  const { start, end } = ganttItemDates(item);
  if (!start && !end) return null;
  const actualStart = start ?? end!;
  const actualEnd = end ?? start!;
  return {
    left: Math.max(
      0,
      calendarDayDifference(actualStart, rangeStart) * dayWidth
    ),
    width: Math.max(
      dayWidth,
      (calendarDayDifference(actualEnd, actualStart) + 1) * dayWidth
    ),
  };
}
