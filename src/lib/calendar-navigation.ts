import type { CalendarView } from "@/types/calendar";

import { newDate } from "@/lib/date-utils";

export function moveCalendarDate(
  date: Date,
  view: CalendarView,
  direction: -1 | 1
) {
  const next = newDate(date);
  if (view === "day") next.setDate(next.getDate() + direction);
  else if (view === "week") next.setDate(next.getDate() + direction * 7);
  else if (view === "month") next.setMonth(next.getMonth() + direction);
  else next.setFullYear(next.getFullYear() + direction);
  return next;
}

export function isCalendarNavigationTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "input,textarea,select,button,[contenteditable=true],[role=dialog],[role=menu],.fc-event,.fc-event-resizer"
      )
    )
  );
}
