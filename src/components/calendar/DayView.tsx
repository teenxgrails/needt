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

import { TaskModal } from "@/components/tasks/TaskModal";

import {
  formatCalendarHour,
  getCalendarBusinessHours,
} from "@/lib/calendar-display";
import { getEventEditability } from "@/lib/calendar-drag";
import {
  getSelectionRange,
  isExplicitCalendarSelection,
} from "@/lib/calendar-selection";
import { useEventModalStore } from "@/lib/commands/groups/calendar";
import { newDate } from "@/lib/date-utils";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useCalendarStore } from "@/store/calendar";
import { useCalendarVisibilityStore } from "@/store/calendar-visibility";
import { useSettingsStore } from "@/store/settings";
import { useTaskStore } from "@/store/task";

import { CalendarEvent, ExtendedEventProps } from "@/types/calendar";
import { Task, TaskStatus } from "@/types/task";

import { CalendarEventContent } from "./CalendarEventContent";
import {
  CalendarQuickCreate,
  QuickCreateSelection,
} from "./CalendarQuickCreate";
import { EventModal } from "./EventModal";
import { EventQuickView } from "./EventQuickView";
import { resolveCalendarItemId } from "./calendar-item-id";
import { useCalendarDragHandlers } from "./useCalendarDragHandlers";
import { useCalendarExternalTaskDrop } from "./useCalendarExternalTaskDrop";

interface DayViewProps {
  currentDate: Date;
}

export function DayView({ currentDate }: DayViewProps) {
  const { feeds, getAllCalendarItems, isLoading, removeEvent } =
    useCalendarStore();
  const showTasksOnCalendar = useCalendarVisibilityStore(
    (state) => state.showTasksOnCalendar
  );
  const { user: userSettings, calendar: calendarSettings } = useSettingsStore();
  const { createTask, updateTask, completeTask, deleteTask } =
    useTaskMutations();
  const [selectedEvent, setSelectedEvent] = useState<Partial<CalendarEvent>>();
  const [selectedTask, setSelectedTask] = useState<Task>();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedEndDate, setSelectedEndDate] = useState<Date>();
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isNewTaskModalOpen, setIsNewTaskModalOpen] = useState(false);
  const [quickCreateSelection, setQuickCreateSelection] =
    useState<QuickCreateSelection>();
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
  const calendarRef = useRef<FullCalendar>(null);
  const tasks = useTaskStore((state) => state.tasks);
  const [quickViewItem, setQuickViewItem] = useState<CalendarEvent | Task>();
  const [isTask, setIsTask] = useState(false);
  const eventModalStore = useEventModalStore();
  const [clickedElement, setClickedElement] = useState<HTMLElement | null>(
    null
  );
  const { handleEventDrop, handleEventResize } = useCalendarDragHandlers();
  const handleExternalTaskDrop = useCalendarExternalTaskDrop();

  const cancelQuickCreate = useCallback(() => {
    calendarRef.current?.getApi().unselect();
    setQuickCreateSelection(undefined);
    setSelectedDate(undefined);
    setSelectedEndDate(undefined);
    setSelectedEvent(undefined);
  }, []);

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
    },
    [feeds, getAllCalendarItems, showTasksOnCalendar]
  );

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
    setQuickViewItem(undefined);
  }, []);

  const handleEventClick = (info: EventClickArg) => {
    const item = info.event.extendedProps;
    const itemId = resolveCalendarItemId(item, info.event.id);
    const isTask = item.isTask;

    if (isTask) {
      openTaskEditor(itemId);
    } else {
      setClickedElement(info.el);
      const event = useCalendarStore
        .getState()
        .events.find((e) => e.id === itemId);
      setQuickViewItem(event as CalendarEvent);
      setIsTask(false);
    }
  };

  const handleDateSelect = (selectInfo: DateSelectArg) => {
    if (!isExplicitCalendarSelection(selectInfo)) {
      calendarRef.current?.getApi().unselect();
      return;
    }

    const { start, end, allDay } = getSelectionRange(selectInfo);

    setSelectedDate(start);
    setSelectedEndDate(end);
    setSelectedEvent({
      allDay,
    });
    setQuickCreateSelection({
      start,
      end,
      allDay,
      point: selectInfo.jsEvent
        ? { x: selectInfo.jsEvent.clientX, y: selectInfo.jsEvent.clientY }
        : undefined,
    });
  };

  const handleSlotClick = (arg: {
    date: Date;
    allDay: boolean;
    jsEvent: MouseEvent;
  }) => {
    const end = new Date(arg.date.getTime() + 30 * 60 * 1000);
    setSelectedDate(arg.date);
    setSelectedEndDate(end);
    setSelectedEvent({ allDay: arg.allDay });
    setQuickCreateSelection({
      start: arg.date,
      end,
      allDay: arg.allDay,
      point: { x: arg.jsEvent.clientX, y: arg.jsEvent.clientY },
    });
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

  const openTaskEditorFromQuickCreate = () => {
    calendarRef.current?.getApi().unselect();
    setQuickCreateSelection(undefined);
    setIsNewTaskModalOpen(true);
  };

  const openEventEditorFromQuickCreate = () => {
    calendarRef.current?.getApi().unselect();
    setQuickCreateSelection(undefined);
    setIsEventModalOpen(true);
  };

  const handleQuickViewClose = () => {
    setQuickViewItem(undefined);
    setClickedElement(null);
  };

  const handleQuickViewEdit = () => {
    if (!quickViewItem) return;

    if (isTask) {
      setSelectedTask(quickViewItem as Task);
      setIsTaskModalOpen(true);
    } else {
      setSelectedEvent(quickViewItem as CalendarEvent);
      setIsEventModalOpen(true);
    }
    handleQuickViewClose();
  };

  const handleQuickViewDelete = async () => {
    if (!quickViewItem) return;

    if (isTask) {
      if (confirm("Are you sure you want to delete this task?")) {
        await deleteTask(quickViewItem.id);
        handleQuickViewClose();
      }
    } else {
      if (confirm("Are you sure you want to delete this event?")) {
        await removeEvent(
          quickViewItem.id,
          quickViewItem.isRecurring ? "series" : "single"
        );
        handleQuickViewClose();
      }
    }
  };

  const handleQuickViewStatusChange = async (
    taskId: string,
    status: TaskStatus
  ) => {
    if (!quickViewItem) return;

    if (status === TaskStatus.COMPLETED) {
      await completeTask(taskId, status);
    } else {
      await updateTask(taskId, { status });
    }

    // Update the quick view item to reflect the new status
    if (isTask) {
      const updatedTask = useTaskStore
        .getState()
        .tasks.find((t) => t.id === taskId);
      if (updatedTask) {
        setQuickViewItem(updatedTask);
      }
    }
  };

  const renderEventContent = useCallback(
    (arg: EventContentArg) => (
      <CalendarEventContent
        eventInfo={arg}
        onTaskComplete={completeTask}
        onTaskOpen={openTaskEditor}
      />
    ),
    [completeTask, openTaskEditor]
  );

  return (
    <div className="calendar-day-view h-full [&_.fc-daygrid-day-events]:!min-h-0 [&_.fc-daygrid-day-frame]:!min-h-0 [&_.fc-timegrid-axis-cushion]:!py-1 [&_.fc-timegrid-slot-label]:!py-1 [&_.fc-timegrid-slot]:!h-[35px]">
      <FullCalendar
        ref={calendarRef}
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridDay"
        headerToolbar={false}
        initialDate={currentDate}
        events={events}
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
        businessHours={getCalendarBusinessHours(calendarSettings.workingHours)}
        dayHeaderContent={(arg) => {
          const weekday = new Intl.DateTimeFormat("en-US", {
            weekday: "short",
          }).format(arg.date);
          const day = arg.date.getDate();
          return (
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-[13px] font-medium text-[var(--text-secondary)]">
                {weekday}
              </span>
              <span
                className={
                  arg.isToday
                    ? "flex h-[22px] min-w-[22px] items-center justify-center rounded-md bg-[var(--accent)] px-1 text-[13px] font-semibold text-white"
                    : "text-[14px] font-semibold text-[var(--text-secondary)]"
                }
              >
                {day}
              </span>
            </div>
          );
        }}
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
      />

      <CalendarQuickCreate
        selection={quickCreateSelection}
        onClose={cancelQuickCreate}
        onOpenTaskEditor={openTaskEditorFromQuickCreate}
        onOpenEventEditor={openEventEditorFromQuickCreate}
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
          onSave={async (updates) => {
            await createTask(updates);
            handleTaskModalClose();
          }}
          onCreateTag={async (name: string, color?: string) => {
            return useTaskStore.getState().createTag({ name, color });
          }}
        />
      )}

      {quickViewItem && (
        <EventQuickView
          isOpen={!!quickViewItem}
          onClose={handleQuickViewClose}
          item={quickViewItem}
          onEdit={handleQuickViewEdit}
          onDelete={handleQuickViewDelete}
          onStatusChange={handleQuickViewStatusChange}
          referenceElement={clickedElement}
          isTask={isTask}
        />
      )}
    </div>
  );
}
