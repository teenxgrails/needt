import type { DayHeaderContentArg } from "@fullcalendar/core";

import { CalendarDayActions } from "./CalendarDayActions";

// Shared dayHeaderContent renderer for WeekView/DayView so the today
// indicator and weekday/date formatting can't drift between the two views.
export function renderDayHeaderChip(arg: DayHeaderContentArg) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
  }).format(arg.date);
  const day = arg.date.getDate();

  return (
    <div className="group/day relative flex w-full items-center justify-center">
      <span
        className={
          arg.isToday
            ? "inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--text-primary)]"
            : "inline-flex items-center gap-1.5 text-[var(--text-secondary)]"
        }
      >
        <span className={arg.isToday ? "" : "text-[13px] font-medium"}>
          {weekday}
        </span>
        <span className={arg.isToday ? "" : "text-[14px] font-semibold"}>
          {day}
        </span>
        {arg.isToday && (
          <span
            className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]"
            aria-hidden="true"
          />
        )}
      </span>
      <CalendarDayActions date={arg.date} />
    </div>
  );
}
