import { useEffect, useState } from "react";

import {
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
} from "date-fns";
import { IoChevronBack, IoChevronForward } from "react-icons/io5";

import { cn } from "@/lib/utils";

interface MiniCalendarProps {
  currentDate: Date;
  onDateClick?: (date: Date) => void;
  compact?: boolean;
}

export function MiniCalendar({
  currentDate,
  onDateClick,
  compact = false,
}: MiniCalendarProps) {
  const [calendarDate, setCalendarDate] = useState(currentDate);

  // Follow the main calendar when its selected date jumps to another month
  // (e.g. via the calendar arrows), so the mini-calendar stays in sync.
  useEffect(() => {
    setCalendarDate((prev) =>
      isSameMonth(prev, currentDate) ? prev : currentDate
    );
  }, [currentDate]);

  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day names with unique keys
  const weekDays = [
    { key: "mon", label: "M" },
    { key: "tue", label: "T" },
    { key: "wed", label: "W" },
    { key: "thu", label: "T" },
    { key: "fri", label: "F" },
    { key: "sat", label: "S" },
    { key: "sun", label: "S" },
  ];

  const handlePrevMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCalendarDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(calendarDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCalendarDate(newDate);
  };

  // Get the day of week of the first day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const firstDayOfMonth = monthStart.getDay();
  // Adjust for Monday start (transform Sunday from 0 to 7)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 7 : firstDayOfMonth;
  // Calculate empty days needed before the first day
  const emptyDays = adjustedFirstDay - 1;

  return (
    <div className={cn("mx-auto", compact ? "p-1" : "p-1.5")}>
      {/* Month Navigation */}
      <div className="mb-1.5 flex items-center justify-between px-1">
        <h2 className="text-[13px] font-medium text-[var(--text-hi)]">
          {format(calendarDate, "MMMM yyyy")}
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrevMonth}
            className="rounded-md p-0.5 text-[var(--text-hi)] hover:bg-[var(--active)]"
            aria-label="Previous month"
          >
            <IoChevronBack className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-md p-0.5 text-[var(--text-hi)] hover:bg-[var(--active)]"
            aria-label="Next month"
          >
            <IoChevronForward className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0">
        {/* Weekday headers */}
        {weekDays.map((day) => (
          <div
            key={day.key}
            className="flex h-6 items-center justify-center text-[11px] font-medium text-[var(--text-lo)]"
          >
            {day.label}
          </div>
        ))}

        {/* Empty days */}
        {Array.from({ length: emptyDays }).map((_, index) => (
          <div key={`empty-${index}`} className="h-6" />
        ))}

        {/* Calendar days */}
        {days.map((day) => (
          <button
            key={day.toISOString()}
            onClick={() => onDateClick?.(day)}
            className={cn(
              "mx-0.5 flex h-6 items-center justify-center rounded-md text-[11px] transition-colors",
              isToday(day)
                ? "bg-[var(--accent)] font-semibold text-white hover:opacity-90"
                : isSameDay(day, currentDate)
                  ? "bg-[var(--active)] text-[var(--text-hi)] hover:bg-[var(--active)]"
                  : isSameMonth(day, calendarDate)
                    ? "text-[var(--text-hi)] hover:bg-[var(--active)]"
                    : "text-[var(--text-lo)]/50 hover:bg-[var(--active)]"
            )}
          >
            {format(day, "d")}
          </button>
        ))}
      </div>
    </div>
  );
}
