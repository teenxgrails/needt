import { memo } from "react";

import type { EventContentArg } from "@fullcalendar/core";
import { motion, useReducedMotion } from "motion/react";
import {
  IoCheckmarkCircle,
  IoCheckmarkCircleOutline,
  IoEllipsisHorizontal,
  IoRepeat,
} from "react-icons/io5";

import { getMonthEventDisplay } from "@/lib/calendar-event-display";
import { isTaskOverdue } from "@/lib/task-utils";
import { springSnappy, springSoft } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { useSettingsStore } from "@/store/settings";
import { useTaskStore } from "@/store/task";

import { Priority, TaskStatus } from "@/types/task";

const DEFAULT_EVENT_COLOR = "#6366F1";

interface CalendarEventContentProps {
  eventInfo: EventContentArg;
}

const priorityColors = {
  [Priority.HIGH]: "#f87171",
  [Priority.MEDIUM]: "#f59e0b",
  [Priority.LOW]: "#60a5fa",
  [Priority.NONE]: "#323234",
};

export const CalendarEventContent = memo(function CalendarEventContent({
  eventInfo,
}: CalendarEventContentProps) {
  const prefersReducedMotion = useReducedMotion();
  const { user: userSettings } = useSettingsStore();
  const scheduleAnimationRevision = useTaskStore(
    (state) => state.scheduleAnimationRevision
  );
  const isTask = eventInfo.event.extendedProps.isTask;
  const isAutoScheduled = eventInfo.event.extendedProps.isAutoScheduled;
  const taskId = eventInfo.event.extendedProps.taskId as string | undefined;
  const chunkIndex = eventInfo.event.extendedProps.chunkIndex as
    | number
    | undefined;
  const isRecurring = eventInfo.event.extendedProps.isRecurring;
  const status = eventInfo.event.extendedProps.status;
  const priority = eventInfo.event.extendedProps.priority;
  const location = eventInfo.event.extendedProps.location;
  const calendarName = eventInfo.event.extendedProps.calendarName;
  const dueDate = eventInfo.event.extendedProps?.extendedProps?.dueDate;
  const title = eventInfo.event.title;
  const endTime = eventInfo.event.end?.getTime() ?? 0;
  const startTime = eventInfo.event.start?.getTime() ?? 0;
  const duration = endTime - startTime;

  const isOverdue = isTask && isTaskOverdue({ dueDate, status });

  // Issue #95: surface the start time and calendar color for timed events in
  // month/multi-month views so they read as clearly as the colored all-day
  // events. Time-grid (day/week) views are unaffected.
  // Format the chip in the same time zone FullCalendar renders with (its
  // `local` sentinel today) so the chip time always matches the calendar's own
  // display, even if the browser's local zone differs from the configured one.
  const calendarTimeZone =
    (eventInfo.view.calendar.getOption("timeZone") as string | undefined) ??
    "local";
  const { isDayGridTimed, showTimeChip, timeText } = getMonthEventDisplay({
    viewType: eventInfo.view.type,
    allDay: eventInfo.event.allDay,
    isTask: !!isTask,
    start: eventInfo.event.start,
    isStart: eventInfo.isStart,
    timeFormat: userSettings.timeFormat,
    timeZone: calendarTimeZone,
  });
  const eventColor =
    eventInfo.event.backgroundColor ||
    eventInfo.event.borderColor ||
    DEFAULT_EVENT_COLOR;
  const taskColor =
    isTask && priority
      ? priorityColors[priority as Priority] || eventColor
      : eventColor;
  const chipColor = isTask ? taskColor : eventColor;
  const displayTime = eventInfo.timeText || timeText;
  const staggerIndex = (taskId ?? eventInfo.event.id)
    .split("")
    .reduce((total, character) => total + character.charCodeAt(0), 0);
  const settleTransition =
    isAutoScheduled && scheduleAnimationRevision > 0
      ? {
          ...springSoft,
          delay: prefersReducedMotion ? 0 : (staggerIndex % 6) * 0.02,
        }
      : springSnappy;

  return (
    <motion.div
      layout={!prefersReducedMotion}
      layoutId={
        prefersReducedMotion
          ? undefined
          : `calendar-item-${taskId ?? eventInfo.event.id}-${chunkIndex ?? 0}`
      }
      transition={settleTransition}
      whileHover={prefersReducedMotion ? undefined : { y: -1 }}
      data-testid={isTask ? "calendar-task" : "calendar-event"}
      style={{
        backgroundColor: isTask
          ? "#303335"
          : `color-mix(in srgb, ${chipColor} 19%, #26292B)`,
        borderColor: isTask
          ? "#44494C"
          : `color-mix(in srgb, ${chipColor} 46%, #3A3F42)`,
        borderLeftColor: isTask ? undefined : chipColor,
      }}
      className={cn(
        "group relative flex h-full min-h-0 flex-col justify-start overflow-hidden rounded-[4px] border px-1.5 py-1 text-white",
        !isTask && "border-l-[3px]",
        isTask && "hover:bg-[#393D40]",
        isOverdue && "border-[#C76565] text-[#FFD0D0]",
        status === TaskStatus.COMPLETED && "text-[#9AA0A6]"
      )}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        {isTask ? (
          status === TaskStatus.COMPLETED ? (
            <IoCheckmarkCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#9AA0A6]" />
          ) : (
            <IoCheckmarkCircleOutline className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#A9B0B5]" />
          )
        ) : showTimeChip || isRecurring ? (
          isRecurring ? (
            <IoRepeat
              className="mt-0.5 h-3 w-3 shrink-0"
              style={{ color: eventColor }}
            />
          ) : (
            <span
              aria-hidden="true"
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: eventColor }}
            />
          )
        ) : (
          <span
            aria-hidden="true"
            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: eventColor }}
          />
        )}
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "calendar-event-title pr-4 text-[12px] font-medium leading-[15px] text-[#F4F5F6]",
              duration <= 1800000 ? "truncate" : "line-clamp-2 break-words",
              status === TaskStatus.COMPLETED && "line-through"
            )}
          >
            {isDayGridTimed && calendarName && (
              <span className="sr-only">{calendarName}, </span>
            )}
            {title}
          </div>
          {displayTime && (
            <div className="truncate pt-0.5 text-[10px] font-normal leading-[12px] tabular-nums text-[#A1A7AC]">
              {displayTime}
            </div>
          )}
        </div>
        {isTask && (
          <button
            type="button"
            aria-label="Task actions"
            className="absolute right-0.5 top-0.5 grid h-5 w-5 place-items-center rounded text-[#A9B0B5] opacity-0 transition-opacity hover:bg-[#4A4F52] hover:text-white group-hover:opacity-100"
          >
            <IoEllipsisHorizontal className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {location && !isTask && duration > 1800000 && (
        <div className="event-location truncate pl-5 text-[10px] leading-snug text-[#A1A7AC]">
          {location}
        </div>
      )}
    </motion.div>
  );
});
