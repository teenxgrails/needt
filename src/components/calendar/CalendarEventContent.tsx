import { memo, type CSSProperties } from "react";

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
      data-testid={isTask ? "calendar-task" : "calendar-event"}
      data-task-id={taskId}
      onPointerDown={() => setSelectedEventId(calendarItemId)}
      style={{
        backgroundColor: "var(--calendar-task-bg)",
      }}
      className={cn(
        "group relative flex h-full min-h-0 flex-col justify-start overflow-hidden rounded-[4px] p-0 text-[var(--text-primary)] transition-[background-color] duration-150",
        isSelected && "z-[2] bg-[var(--surface-hover)]",
        isOverdue && "text-[var(--color-danger)]",
        status === TaskStatus.COMPLETED && "opacity-55"
      )}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-px -left-px -top-px z-[1] w-1 rounded-l-[4px]"
        style={{ backgroundColor: chipColor }}
      />
      <span
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-0 bg-[var(--calendar-item-accent)] opacity-0 transition-opacity duration-150 group-hover:opacity-[0.11]", isSelected && "opacity-[0.09]")}
        style={{ "--calendar-item-accent": chipColor } as CSSProperties}
      />
      <div className="relative z-[2] grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-[3px] overflow-hidden py-px pl-[5px] pr-1 text-[12px] leading-4">
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
            className="group/check mt-[2px] grid h-3 w-3 shrink-0 place-items-center rounded-full border border-[var(--text-secondary)] text-transparent transition-[background-color,border-color,color,opacity] duration-150 hover:border-[var(--color-success)] hover:bg-[var(--color-success)] hover:text-[var(--surface-canvas)] disabled:cursor-default disabled:border-[var(--color-success)] disabled:bg-transparent disabled:text-[var(--color-success)]"
          >
            <Check
              className={cn(
                "h-2.5 w-2.5 transition-opacity duration-150",
                status === TaskStatus.COMPLETED
                  ? "opacity-100"
                  : "opacity-0 group-hover/check:opacity-100"
              )}
            />
          </button>
        ) : showTimeChip || isRecurring ? (
          isRecurring ? (
            <IoRepeat
              className="mt-[2px] h-3 w-3 shrink-0"
              style={{ color: eventColor }}
            />
          ) : (
            <span
              aria-hidden="true"
              className="mt-1 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: eventColor }}
            />
          )
        ) : (
          <span
            aria-hidden="true"
            className="mt-1 h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: eventColor }}
          />
        )}
        <div className="min-w-0 overflow-hidden">
          <div
            className={cn(
              "calendar-event-title text-[12px] font-normal leading-4 text-[var(--text-primary)]",
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
            <div className="truncate text-[12px] font-normal leading-4 tabular-nums text-[var(--text-secondary)]">
              {displayTime}
            </div>
          )}
        </div>
        {isTask && task && onTaskOpen && (
          <CalendarTaskActionsMenu task={task} onOpenTask={onTaskOpen} />
        )}
      </div>
      {location && !isTask && duration > 1800000 && (
        <div className="event-location relative z-[2] truncate pl-5 pr-1 text-[11px] leading-4 text-[var(--text-secondary)]">
          {location}
        </div>
      )}
    </motion.div>
  );
});
