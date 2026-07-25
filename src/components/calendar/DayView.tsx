import { useCallback, useEffect, useRef, useState } from "react";

import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import type { DateSelectArg } from "@fullcalendar/core";
import interactionPlugin from "@fullcalendar/interaction";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";

import { toast } from "sonner";

import { TaskModal } from "@/components/tasks/TaskModal";

import { formatCalendarHour } from "@/lib/calendar-display";
import { getEventEditability } from "@/lib/calendar-drag";
import {
  getSelectionRange,
  isExplicitCalendarSelection,
} from "@/lib/calendar-selection";
import { useEventModalStore } from "@/lib/commands/groups/calendar";
import { newDate, toLocalDateKey } from "@/lib/date-utils";
import {
  isDateWholeDayBlocked,
  isRangeBlocked,
  type BlockingOverride,
} from "@/lib/flexible-hours-guard";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useCalendarStore } from "@/store/calendar";
import { useCalendarVisibilityStore } from "@/store/calendar-visibility";
import { useSettingsStore } from "@/store/settings";
import { useTaskStore } from "@/store/task";

import { CalendarEvent, ExtendedEventProps } from "@/types/calendar";
import { Task } from "@/types/task";

import { CalendarEventContent } from "./CalendarEventContent";
import { EventModal } from "./EventModal";
import { resolveCalendarItemId } from "./calendar-item-id";
import { renderDayHeaderChip } from "./renderDayHeaderChip";
import { useCalendarDragHandlers } from "./useCalendarDragHandlers";
import { useCalendarExternalTaskDrop } from "./useCalendarExternalTaskDrop";
import { useDefaultScheduleBusinessHours } from "./useDefaultScheduleBusinessHours";

interface DayViewProps {
  currentDate: Date;
}

interface FlexibleHoursOverrideResponse {
  id: string;
  date: string;
  kind: "START_LATER" | "STOP_EARLY" | "BLOCK_HOURS" | "BLOCK_WHOLE_DAY";
  startTime: string | null;
  endTime: string | null;
}

export function DayView({ currentDate }: DayViewProps) {
  const { feeds, getAllCalendarItems, isLoading } = useCalendarStore();
  const showTasksOnCalendar = useCalendarVisibilityStore(
    (state) => state.showTasksOnCalendar
  );
  const { user: userSettings, calendar: calendarSettings } = useSettingsStore();
  const { createTask, updateTask, completeTask } = useTaskMutations();
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent>>();
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedEndDate, setSelectedEndDate] = useState<Date>();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [events, setEvents] = useState<
    Array<{
      id: string;
      title: string;
      start: Date;
      end: Date;
      location?: string;
      backgroundColor: string;
      borderColor: string;
      allDay: boolean;
      classNames: string[];
      startEditable: boolean;
      durationEditable: boolean;
      extendedProps?: ExtendedEventProps;
    }>
  >([]);
  const [flexibleHourBackgrounds, setFlexibleHourBackgrounds] = useState<
    Array<{
      id: string;
      title: string;
      start: Date;
      end: Date;
      display: "background";
      allDay: boolean;
      classNames: string[];
      backgroundColor: string;
    }>
  >([]);
  const [flexibleHourOverrides, setFlexibleHourOverrides] = useState<
    BlockingOverride[]
  >([]);
  const scheduleBusinessHours = useDefaultScheduleBusinessHours();
  const calendarRef = useRef<FullCalendar>(null);
  const tasks = useTaskStore((state) => state.tasks);
  const eventModalStore = useEventModalStore();
  const { handleEventDrop, handleEventResize } = useCalendarDragHandlers(
    flexibleHourOverrides
  );
  const handleExternalTaskDrop = useCalendarExternalTaskDrop(
    flexibleHourOverrides
  );

  // Update events when the calendar view changes
  const handleDatesSet = useCallback(
    async (arg: DatesSetArg) => {
      const items = getAllCalendarItems(arg.start, arg.end);
      const formattedItems = items
        .filter((item) => {
          if (item.feedId === "tasks") return showTasksOnCalendar;
          const feed = feeds.find((f) => f.id === item.feedId);
          return feed?.enabled;
        })
        .map((item) => ({
          id: item.id,
          title: item.title,
          start: newDate(item.start),
          end: newDate(item.end),
          location: item.location,
          backgroundColor:
            item.feedId === "tasks"
              ? item.color || "#4f46e5"
              : feeds.find((f) => f.id === item.feedId)?.color || "#6366F1",
          borderColor:
            item.feedId === "tasks"
              ? item.color || "#4f46e5"
              : feeds.find((f) => f.id === item.feedId)?.color || "#6366F1",
          allDay: item.allDay,
          classNames: [
            item.extendedProps?.isTask ? "calendar-task" : "calendar-event",
          ],
          ...getEventEditability(item, feeds),
          extendedProps: {
            ...item,
            isTask: item.extendedProps?.isTask,
            isRecurring: item.isRecurring,
            status: item.extendedProps?.status,
            priority: item.extendedProps?.priority,
          },
        }));

      setEvents(formattedItems);

      try {
        const inclusiveEnd = newDate(arg.end);
        inclusiveEnd.setDate(inclusiveEnd.getDate() - 1);
        const response = await fetch(
          `/api/flexible-hours?from=${toLocalDateKey(arg.start)}&to=${toLocalDateKey(inclusiveEnd)}`
        );
        if (!response.ok) throw new Error("Failed to load flexible hours");
        const data = (await response.json()) as {
          overrides: FlexibleHoursOverrideResponse[];
        };
        setFlexibleHourOverrides(
          data.overrides.map((override) => ({
            date: override.date.slice(0, 10),
            kind: override.kind,
            startTime: override.startTime,
            endTime: override.endTime,
          }))
        );
        setFlexibleHourBackgrounds(
          data.overrides.flatMap((override) => {
            const date = override.date.slice(0, 10);
            const startTime =
              override.kind === "START_LATER"
                ? "00:00"
                : override.kind === "STOP_EARLY"
                  ? override.endTime || "00:00"
                  : override.kind === "BLOCK_WHOLE_DAY"
                    ? "00:00"
                    : override.startTime || "00:00";
            const endTime =
              override.kind === "START_LATER"
                ? override.startTime || "00:00"
                : override.kind === "STOP_EARLY" ||
                    override.kind === "BLOCK_WHOLE_DAY"
                  ? "23:59"
                  : override.endTime || "23:59";
            const timed = {
              id: `flexible-hours:${override.id}`,
              title: "",
              start: newDate(`${date}T${startTime}:00`),
              end: newDate(`${date}T${endTime}:00`),
              display: "background" as const,
              allDay: false,
              classNames: ["needt-flexible-hours-texture"],
              backgroundColor: "transparent",
            };
            if (override.kind !== "BLOCK_WHOLE_DAY") return [timed];
            return [
              timed,
              {
                id: `flexible-hours:${override.id}:all-day`,
                title: "",
                start: newDate(`${date}T00:00:00`),
                end: newDate(`${date}T23:59:00`),
                display: "background" as const,
                allDay: true,
                classNames: ["needt-flexible-hours-texture"],
                backgroundColor: "transparent",
              },
            ];
          })
        );
      } catch {
        setFlexibleHourBackgrounds([]);
        setFlexibleHourOverrides([]);
      }
    },
    [feeds, getAllCalendarItems, showTasksOnCalendar]
  );

  useEffect(() => {
    const refresh = () => {
      const calendar = calendarRef.current?.getApi();
      if (!calendar) return;
      void handleDatesSet({
        start: calendar.view.activeStart,
        end: calendar.view.activeEnd,
      } as DatesSetArg);
    };
    window.addEventListener("needt:flexible-hours-changed", refresh);
    return () =>
      window.removeEventListener("needt:flexible-hours-changed", refresh);
  }, [handleDatesSet]);

  // Initial data load
  useEffect(() => {
    // Only load data if the store is empty - the parent component may have
    // already loaded data from the server
    const state = useCalendarStore.getState();
    const taskState = useTaskStore.getState();

    if (state.events.length === 0 || state.feeds.length === 0) {
      state.loadFromDatabase();
    }

    if (taskState.tasks.length === 0) {
      taskState.fetchTasks();
    }
  }, []);

  // Update items when loading state changes, feeds change, or tasks change
  useEffect(() => {
    if (!isLoading && calendarRef.current) {
      const calendar = calendarRef.current.getApi();
      handleDatesSet({
        start: calendar.view.activeStart,
        end: calendar.view.activeEnd,
        startStr: calendar.view.activeStart.toISOString(),
        endStr: calendar.view.activeEnd.toISOString(),
        timeZone: userSettings.timeZone,
        view: calendar.view,
      });
    }
  }, [isLoading, feeds, userSettings.timeZone, handleDatesSet, tasks]);

  // Update calendar date when currentDate changes
  useEffect(() => {
    if (calendarRef.current) {
      setTimeout(() => {
        if (calendarRef.current) {
          const calendar = calendarRef.current.getApi();
          calendar.gotoDate(currentDate);
        }
      }, 0);
    }
  }, [currentDate]);

  const openTaskEditor = useCallback((taskId: string) => {
    const task = useTaskStore
      .getState()
      .tasks.find((item) => item.id === taskId);
    if (!task) return;
    setSelectedTask(task);
    setIsTaskModalOpen(true);
  }, []);

  const handleEventClick = (info: EventClickArg) => {
    const item = info.event.extendedProps;
    const itemId = resolveCalendarItemId(item, info.event.id);

    if (item.isTask) {
      openTaskEditor(itemId);
      return;
    }
    // Match the task path: open the full editor directly instead of an
    // intermediate quick-view popover.
    const event = useCalendarStore
      .getState()
      .events.find((e) => e.id === itemId);
    if (!event) return;
    setSelectedEvent(event);
    setIsEventModalOpen(true);
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (!isExplicitCalendarSelection(selectInfo)) {
      calendarRef.current?.getApi().unselect();
      return;
    }

    const { start, end, allDay } = getSelectionRange(selectInfo);

    const blocked = allDay
      ? isDateWholeDayBlocked(start, flexibleHourOverrides)
      : isRangeBlocked(start, end, flexibleHourOverrides);
    if (blocked) {
      calendarRef.current?.getApi().unselect();
      toast.error("This time is blocked out");
      return;
    }

    setSelectedDate(start);
    setSelectedEndDate(end);
    setSelectedEvent({
      allDay,
    });
    calendarRef.current?.getApi().unselect();
    setIsNewTaskModalOpen(true);
  };

  const handleSlotClick = (arg: { date: Date; allDay: boolean }) => {
    const end = new Date(arg.date.getTime() + 30 * 60 * 1000);
    const blocked = arg.allDay
      ? isDateWholeDayBlocked(arg.date, flexibleHourOverrides)
      : isRangeBlocked(arg.date, end, flexibleHourOverrides);
    if (blocked) {
      toast.error("This time is blocked out");
      return;
    }
    setSelectedDate(arg.date);
    setSelectedEndDate(end);
    setSelectedEvent({ allDay: arg.allDay });
    setIsNewTaskModalOpen(true);
  };

  const handleEventModalClose = () => {
    setIsEventModalOpen(false);
    eventModalStore.setOpen(false);
    setSelectedEvent(undefined);
    setSelectedDate(undefined);
    setSelectedEndDate(undefined);
    eventModalStore.setDefaultDate(undefined);
    eventModalStore.setDefaultEndDate(undefined);
  };

  const handleTaskModalClose = () => {
    setIsTaskModalOpen(false);
    setIsNewTaskModalOpen(false);
    setSelectedTask(undefined);
    setSelectedDate(undefined);
    setSelectedEndDate(undefined);
  };

  const renderEventContent = useCallback(
    (arg: EventContentArg) => {
      // Background events (e.g. the blocked-hours texture) render their own
      // CSS background — skip the task/event card so it doesn't paint an
      // opaque surface over the texture.
      if (arg.event.display === "background") return null;
      return (
        <CalendarEventContent
          eventInfo={arg}
          onTaskComplete={completeTask}
          onTaskOpen={openTaskEditor}
        />
      );
    },
    [completeTask, openTaskEditor]
  );

  return (
    <div className="calendar-day-view fc-tz-corner h-full [&_.fc-daygrid-day-events]:!min-h-0 [&_.fc-daygrid-day-frame]:!min-h-0 [&_.fc-timegrid-axis-cushion]:!py-1 [&_.fc-timegrid-slot-label]:!py-1 [&_.fc-timegrid-slot]:!h-[35px]">
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridDay"
        headerToolbar={false}
        initialDate={currentDate}
        events={[...events, ...flexibleHourBackgrounds]}
        nowIndicator={true}
        allDaySlot={true}
        slotMinTime="00:00:00"
        slotMaxTime="24:00:00"
        scrollTime={calendarSettings.workingHours.start}
        expandRows={true}
        slotEventOverlap={true}
        stickyHeaderDates={true}
        slotDuration="00:30:00"
        timeZone="local"
        displayEventEnd={true}
        eventTimeFormat={{
          hour: userSettings.timeFormat === "12h" ? "numeric" : "2-digit",
          minute: "2-digit",
          meridiem: userSettings.timeFormat === "12h" ? "short" : false,
          hour12: userSettings.timeFormat === "12h",
        }}
        slotLabelInterval="01:00:00"
        slotLabelContent={(arg) =>
          formatCalendarHour(arg.date, userSettings.timeFormat)
        }
        firstDay={userSettings.weekStartDay === "monday" ? 1 : 0}
        businessHours={
          calendarSettings.workingHours.enabled ? scheduleBusinessHours : false
        }
        dayHeaderContent={renderDayHeaderChip}
        height="100%"
        dateClick={handleSlotClick}
        eventClick={handleEventClick}
        select={handleDateSelect}
        selectable={true}
        selectMirror={true}
        datesSet={handleDatesSet}
        eventContent={renderEventContent}
        eventDrop={handleEventDrop}
        droppable={true}
        drop={handleExternalTaskDrop}
        eventResize={handleEventResize}
        eventResizableFromStart={true}
        snapDuration="00:15:00"
        dragRevertDuration={220}
      />

      <EventModal
        isOpen={isEventModalOpen || eventModalStore.isOpen}
        onClose={handleEventModalClose}
        event={selectedEvent}
        defaultDate={selectedDate || eventModalStore.defaultDate}
        defaultEndDate={selectedEndDate || eventModalStore.defaultEndDate}
        onItemTypeChange={() => {
          const start =
            selectedDate || eventModalStore.defaultDate || currentDate;
          const end =
            selectedEndDate ||
            eventModalStore.defaultEndDate ||
            new Date(start.getTime() + 30 * 60 * 1000);
          setSelectedDate(start);
          setSelectedEndDate(end);
          setIsEventModalOpen(false);
          eventModalStore.setOpen(false);
          setIsNewTaskModalOpen(true);
        }}
      />

      {selectedTask && (
        <TaskModal
          isOpen={isTaskModalOpen}
          onClose={handleTaskModalClose}
          task={selectedTask}
          tags={useTaskStore.getState().tags}
          onSave={async (updates) => {
            await updateTask(selectedTask.id, updates);
            handleTaskModalClose();
          }}
          onCreateTag={async (name: string, color?: string) => {
            return useTaskStore.getState().createTag({ name, color });
          }}
        />
      )}

      {isNewTaskModalOpen && selectedDate && selectedEndDate && (
        <TaskModal
          isOpen={isNewTaskModalOpen}
          onClose={handleTaskModalClose}
          tags={useTaskStore.getState().tags}
          initialStart={selectedDate}
          initialEnd={selectedEndDate}
          onItemTypeChange={() => {
            setIsNewTaskModalOpen(false);
            setIsEventModalOpen(true);
          }}
          onSave={async (updates) => {
            await createTask(updates);
            handleTaskModalClose();
          }}
          onCreateTag={async (name: string, color?: string) => {
            return useTaskStore.getState().createTag({ name, color });
          }}
        />
      )}
    </div>
  );
}
