import { memo } from "react";

import type { EventContentArg } from "@fullcalendar/core";
import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { IoRepeat } from "react-icons/io5";

import { getMonthEventDisplay } from "@/lib/calendar-event-display";
import { springSnappy, springSoft } from "@/lib/motion";
import { isTaskOverdue } from "@/lib/task-utils";
import { cn } from "@/lib/utils";

import { useViewStore } from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";
import { useTaskStore } from "@/store/task";

import { Priority, TaskStatus } from "@/types/task";

import { CalendarTaskActionsMenu } from "./CalendarTaskActionsMenu";
import { resolveCalendarItemId } from "./calendar-item-id";

const DEFAULT_EVENT_COLOR = "var(--color-accent)";

interface CalendarEventContentProps {
  eventInfo: EventContentArg;
  onTaskComplete?: (taskId: string) => Promise<unknown>;
  onTaskOpen?: (taskId: string) => void;
}

const priorityColors = {
  [Priority.HIGH]: "var(--color-danger)",
  [Priority.MEDIUM]: "var(--color-warning)",
  [Priority.LOW]: "var(--primitive-blue-500)",
  [Priority.NONE]: "var(--border-control)",
};

export const CalendarEventContent = memo(function CalendarEventContent({
  eventInfo,
  onTaskComplete,
  onTaskOpen,
}: CalendarEventContentProps) {
  const prefersReducedMotion = useReducedMotion();
  const { user: userSettings } = useSettingsStore();
  const scheduleAnimationRevision = useTaskStore(
    (state) => state.scheduleAnimationRevision
  );
  const selectedEventId = useViewStore((state) => state.selectedEventId);
  const setSelectedEventId = useViewStore((state) => state.setSelectedEventId);
  const isTask = eventInfo.event.extendedProps.isTask;
  const isAutoScheduled = eventInfo.event.extendedProps.isAutoScheduled;
  const taskId = isTask
    ? resolveCalendarItemId(eventInfo.event.extendedProps, eventInfo.event.id)
    : undefined;
  const calendarItemId = taskId ?? eventInfo.event.id;
  const isSelected = selectedEventId === calendarItemId;
  const task = useTaskStore((state) =>
    taskId
      ? state.tasks.find((candidate) => candidate.id === taskId)
      : undefined
  );
  const chunkIndex = eventInfo.event.extendedProps.chunkIndex as
    number | undefined;
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
      data-task-id={taskId}
      onPointerDown={() => setSelectedEventId(calendarItemId)}
      style={{
        backgroundColor: isTask
          ? "var(--calendar-task-bg)"
          : `color-mix(in srgb, ${chipColor} 16%, var(--surface-panel))`,
        borderColor: isTask
          ? "var(--calendar-task-border)"
          : `color-mix(in srgb, ${chipColor} 42%, var(--border-control))`,
        borderLeftColor: isTask ? undefined : chipColor,
      }}
      className={cn(
        "group relative flex h-full min-h-0 flex-col justify-start overflow-hidden rounded-[4px] border px-1.5 py-1 text-[var(--text-primary)] transition-[background-color,border-color,transform] duration-150",
        !isTask && "border-l-[3px]",
        isTask && "hover:bg-[var(--surface-control-hover)]",
        isSelected &&
          "z-[2] border-[var(--text-secondary)] ring-1 ring-[var(--text-secondary)]",
        isOverdue && "border-[var(--color-danger)] text-[var(--color-danger)]",
        status === TaskStatus.COMPLETED && "text-[var(--text-muted)]"
      )}
    >
      <div className="flex min-w-0 items-start gap-1.5">
        {isTask ? (
          <button
            type="button"
            aria-label={
              status === TaskStatus.COMPLETED
                ? `${title} completed`
                : `Complete task ${title}`
            }
            disabled={status === TaskStatus.COMPLETED}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (taskId && status !== TaskStatus.COMPLETED) {
                void onTaskComplete?.(taskId);
              }
            }}
            className="group/check mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-[var(--text-secondary)] text-transparent transition-[background-color,border-color,color,opacity] duration-150 hover:border-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-[var(--surface-canvas)] disabled:cursor-default disabled:border-[var(--color-success)] disabled:bg-transparent disabled:text-[var(--color-success)] disabled:opacity-55"
          >
            <Check
              className={cn(
                "h-3 w-3 transition-opacity duration-150",
                status === TaskStatus.COMPLETED
                  ? "opacity-100"
                  : "opacity-0 group-hover/check:opacity-100"
              )}
            />
          </button>
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
              "calendar-event-title pr-4 text-[12px] font-medium leading-[15px] text-[var(--text-primary)]",
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
            <div className="truncate pt-0.5 text-[10px] font-normal leading-[12px] tabular-nums text-[var(--text-secondary)]">
              {displayTime}
            </div>
          )}
        </div>
        {isTask && task && onTaskOpen && (
          <CalendarTaskActionsMenu task={task} onOpenTask={onTaskOpen} />
        )}
      </div>
      {location && !isTask && duration > 1800000 && (
        <div className="event-location truncate pl-5 text-[10px] leading-snug text-[var(--text-secondary)]">
          {location}
        </div>
      )}
    </motion.div>
  );
});
