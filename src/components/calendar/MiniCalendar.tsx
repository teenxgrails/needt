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

  // Two-letter weekday initials (Mon-first), matching the Motion reference.
  const weekDays = [
    { key: "mon", label: "Mo" },
    { key: "tue", label: "Tu" },
    { key: "wed", label: "We" },
    { key: "thu", label: "Th" },
    { key: "fri", label: "Fr" },
    { key: "sat", label: "Sa" },
    { key: "sun", label: "Su" },
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

  const handleToday = () => {
    const today = new Date();
    setCalendarDate(today);
    onDateClick?.(today);
  };

  // Get the day of week of the first day (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  const firstDayOfMonth = monthStart.getDay();
  // Adjust for Monday start (transform Sunday from 0 to 7)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 7 : firstDayOfMonth;
  // Calculate empty days needed before the first day
  const emptyDays = adjustedFirstDay - 1;

  const cellSize = compact ? "h-6 text-[11px]" : "h-7 text-[12px]";

  return (
    <div className={cn(compact ? "p-1" : "p-1.5")}>
      {/* Month navigation */}
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-[13px] text-[var(--text-hi)]">
          <span className="font-semibold">{format(calendarDate, "MMMM")}</span>{" "}
          <span className="text-[var(--text-lo)]">
            {format(calendarDate, "yyyy")}
          </span>
        </h2>
        <div className="flex items-center gap-1">
          <button
            onClick={handleToday}
            className="rounded-md border border-[var(--line-strong)] bg-[var(--raised)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-hi)] transition-colors hover:bg-[var(--active)]"
            aria-label="Go to today"
          >
            Today
          </button>
          <button
            onClick={handlePrevMonth}
            className="rounded-md p-0.5 text-[var(--text-lo)] transition-colors hover:bg-[var(--active)] hover:text-[var(--text-hi)]"
            aria-label="Previous month"
          >
            <IoChevronBack className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={handleNextMonth}
            className="rounded-md p-0.5 text-[var(--text-lo)] transition-colors hover:bg-[var(--active)] hover:text-[var(--text-hi)]"
            aria-label="Next month"
          >
            <IoChevronForward className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {/* Weekday headers */}
        {weekDays.map((day) => (
          <div
            key={day.key}
            className={cn(
              "flex items-center justify-center font-medium text-[var(--text-lo)]",
              cellSize
            )}
          >
            {day.label}
          </div>
        ))}

        {/* Leading blanks so the 1st lands on the right weekday */}
        {Array.from({ length: emptyDays }).map((_, index) => (
          <div key={`empty-${index}`} className={cellSize} />
        ))}

        {/* Current-month days only (no adjacent-month dates) */}
        {days.map((day) => (
          <div key={day.toISOString()} className="flex justify-center">
            <button
              onClick={() => onDateClick?.(day)}
              className={cn(
                "flex aspect-square w-7 items-center justify-center rounded-md transition-colors",
                cellSize,
                isToday(day)
                  ? "bg-[var(--accent)] font-semibold text-white hover:opacity-90"
                  : isSameDay(day, currentDate)
                    ? "bg-[var(--active)] text-[var(--text-hi)]"
                    : "text-[var(--text-hi)] hover:bg-[var(--active)]"
              )}
            >
              {format(day, "d")}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
