import { useCallback, useEffect, useRef, useState } from "react";

import type {
  DatesSetArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import type { DateSelectArg } from "@fullcalendar/core";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import FullCalendar from "@fullcalendar/react";

import { TaskModal } from "@/components/tasks/TaskModal";

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
import { EventModal } from "./EventModal";
import { EventQuickView } from "./EventQuickView";
import { resolveCalendarItemId } from "./calendar-item-id";

interface MultiMonthViewProps {
  currentDate: Date;
  onDateClick?: (date: Date) => void;
}

export function MultiMonthView({
  currentDate,
  onDateClick,
}: MultiMonthViewProps) {
  const { feeds, getAllCalendarItems, isLoading, removeEvent } =
    useCalendarStore();
  const showTasksOnCalendar = useCalendarVisibilityStore(
    (state) => state.showTasksOnCalendar
  );
  const { user: userSettings } = useSettingsStore();
  const { createTask, updateTask, completeTask, deleteTask } =
    useTaskMutations();
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
          extendedProps: {
            ...item,
            isTask: item.extendedProps?.isTask,
            isRecurring: item.isRecurring,
            status: item.extendedProps?.status,
            priority: item.extendedProps?.priority,
            // Used as the accessible label for the timed-event color dot so
            // calendar identity is not conveyed by color alone (issue #95).
            calendarName: feeds.find((f) => f.id === item.feedId)?.name,
          },
        }));

      setEvents(formattedItems);
    },
    [feeds, getAllCalendarItems, showTasksOnCalendar]
  );

  // Initial data load
  useEffect(() => {
    Promise.all([
      useCalendarStore.getState().loadFromDatabase(),
      useTaskStore.getState().fetchTasks(),
    ]);
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
    <div className="h-full">
      <FullCalendar
        ref={calendarRef}
        plugins={[multiMonthPlugin, interactionPlugin]}
        initialView="multiMonthYear"
        headerToolbar={false}
        initialDate={currentDate}
        events={events}
        dayMaxEvents={true}
        multiMonthMaxColumns={3}
        expandRows={true}
        stickyHeaderDates={true}
        timeZone="local"
        displayEventEnd={true}
        firstDay={userSettings.weekStartDay === "monday" ? 1 : 0}
        height="100%"
        dateClick={(arg) => onDateClick?.(arg.date)}
        eventClick={handleEventClick}
        select={handleDateSelect}
        selectable={true}
        selectMirror={true}
        datesSet={handleDatesSet}
        eventContent={renderEventContent}
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
          onCreateTag={async (name: string, color?: string) =>
            useTaskStore.getState().createTag({ name, color })
          }
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
