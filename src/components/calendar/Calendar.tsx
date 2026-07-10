"use client";

import { useEffect, useState } from "react";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  IoAddOutline,
  IoChevronBack,
  IoChevronDown,
  IoChevronForward,
  IoOptionsOutline,
  IoRefreshOutline,
} from "react-icons/io5";

import { DayView } from "@/components/calendar/DayView";
import { MonthView } from "@/components/calendar/MonthView";
import { MultiMonthView } from "@/components/calendar/MultiMonthView";
import { WeekView } from "@/components/calendar/WeekView";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useEventModalStore } from "@/lib/commands/groups/calendar";
import { addDays, newDate, subDays } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

import {
  useCalendarStore,
  useViewStore,
} from "@/store/calendar";
import { useSettingsStore } from "@/store/settings";
import { useTaskStore } from "@/store/task";

import { CalendarEvent, CalendarFeed } from "@/types/calendar";

const VIEW_LABELS: Record<string, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  multiMonth: "Year",
};

const VIEW_ORDER: Array<"day" | "week" | "month" | "multiMonth"> = [
  "day",
  "week",
  "month",
  "multiMonth",
];

interface CalendarProps {
  initialFeeds?: CalendarFeed[];
  initialEvents?: CalendarEvent[];
}

export function Calendar({
  initialFeeds = [],
  initialEvents = [],
}: CalendarProps) {
  const { date: currentDate, setDate, view, setView } = useViewStore();
  const { scheduleAllTasks } = useTaskStore();
  const { setFeeds, setEvents } = useCalendarStore();
  const { user: userSettings, calendar: calendarSettings, updateUserSettings, updateCalendarSettings } =
    useSettingsStore();
  const eventModalStore = useEventModalStore();
  const prefersReducedMotion = useReducedMotion();
  const [transitionDirection, setTransitionDirection] = useState(0);

  const titlePrimary =
    view === "day"
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(currentDate)
      : new Intl.DateTimeFormat("en-US", { month: "short" }).format(currentDate);
  const titleSecondary = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
  }).format(currentDate);

  // Use initial data from server for hydration
  useEffect(() => {
    if (initialFeeds.length > 0) {
      setFeeds(initialFeeds);
    }

    if (initialEvents.length > 0) {
      setEvents(initialEvents);
    }

    // Only fetch from database if we didn't get initial data
    if (!initialFeeds.length || !initialEvents.length) {
      useCalendarStore.getState().loadFromDatabase();
    }

    // Always fetch tasks since they're not pre-loaded
    useTaskStore.getState().fetchTasks();
  }, [initialFeeds, initialEvents, setFeeds, setEvents]);

  const handlePrevWeek = () => {
    setTransitionDirection(-1);
    if (view === "month" || view === "multiMonth") {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() - 1);
      setDate(newDate);
    } else {
      const days = view === "day" ? 1 : 7;
      setDate(subDays(currentDate, days));
    }
  };

  const handleNextWeek = () => {
    setTransitionDirection(1);
    if (view === "month" || view === "multiMonth") {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + 1);
      setDate(newDate);
    } else {
      const days = view === "day" ? 1 : 7;
      setDate(addDays(currentDate, days));
    }
  };

  const handleAutoSchedule = async () => {
    await scheduleAllTasks();
  };

  const handleViewChange = (nextView: typeof view) => {
    setTransitionDirection(0);
    setView(nextView);
  };

  const handleToday = () => {
    setTransitionDirection(0);
    setDate(newDate());
  };

  const handleNewEvent = () => {
    const start = newDate();
    eventModalStore.setDefaultDate(start);
    eventModalStore.setDefaultEndDate(new Date(start.getTime() + 30 * 60 * 1000));
    eventModalStore.setOpen(true);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#1B1D1E] text-white">
      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col border-y border-r border-[#323234] bg-[#1B1D1E]">
        {/* Header */}
        <header className="flex h-12 flex-none items-center border-b border-[#323234] px-2">
          <div className="flex items-center gap-1.5">
            <motion.button
              whileHover={prefersReducedMotion ? undefined : { y: -1 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              onClick={handleToday}
              className="rounded-md border border-[#323234] bg-[#262627] px-1.5 py-[3px] text-[13px] font-medium text-white hover:bg-[#2B2F31]"
              title="Go to Today (t)"
            >
              Today
            </motion.button>

            <div className="flex items-center gap-0.5">
              <motion.button
                whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                onClick={handlePrevWeek}
                className="rounded-md p-1 text-[#9BA1A6] hover:bg-[#2B2F31] hover:text-white"
                data-testid="calendar-prev-week"
                title="Previous Week (←)"
              >
                <IoChevronBack className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileHover={prefersReducedMotion ? undefined : { y: -1 }}
                whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                onClick={handleNextWeek}
                className="rounded-md p-1 text-[#9BA1A6] hover:bg-[#2B2F31] hover:text-white"
                data-testid="calendar-next-week"
                title="Next Week (→)"
              >
                <IoChevronForward className="h-4 w-4" />
              </motion.button>
            </div>

            <h1 className="px-1.5 text-[20px] leading-none text-white">
              <span className="font-semibold">{titlePrimary}</span>{" "}
              <span className="font-normal text-[#9BA1A6]">
                {titleSecondary}
              </span>
            </h1>
          </div>

          {/* Right-side actions */}
          <div className="ml-auto flex items-center gap-1">
            {/* Calendar options menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="flex items-center gap-1.5 rounded-md border border-[#323234] bg-[#262627] px-1.5 py-[3px] text-[13px] font-medium text-white hover:bg-[#2B2F31]"
                  title="Calendar options"
                >
                  <IoOptionsOutline className="h-4 w-4" />
                  <span className="hidden sm:inline">Calendar options</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Calendar options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={userSettings.timeFormat === "24h"}
                  onCheckedChange={(checked) =>
                    updateUserSettings({ timeFormat: checked ? "24h" : "12h" })
                  }
                >
                  24-hour time
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={userSettings.weekStartDay === "monday"}
                  onCheckedChange={(checked) =>
                    updateUserSettings({
                      weekStartDay: checked ? "monday" : "sunday",
                    })
                  }
                >
                  Start week on Monday
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={calendarSettings.workingHours.enabled}
                  onCheckedChange={(checked) =>
                    updateCalendarSettings({
                      workingHours: {
                        ...calendarSettings.workingHours,
                        enabled: checked,
                      },
                    })
                  }
                >
                  Highlight working hours
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Refresh all tasks (auto-schedule) */}
            <motion.button
              whileHover={prefersReducedMotion ? undefined : { y: -1 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              onClick={handleAutoSchedule}
              className="flex items-center gap-1.5 rounded-md border border-[#323234] bg-[#262627] px-1.5 py-[3px] text-[13px] font-medium text-white hover:bg-[#2B2F31]"
              title="Refresh all tasks"
            >
              <IoRefreshOutline className="h-4 w-4" />
              <span className="hidden md:inline">Refresh all tasks</span>
            </motion.button>

            {/* New event */}
            <motion.button
              whileHover={prefersReducedMotion ? undefined : { y: -1 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
              onClick={handleNewEvent}
              className="rounded-md border border-[#323234] bg-[#262627] p-1 text-white hover:bg-[#2B2F31]"
              title="New event"
            >
              <IoAddOutline className="h-4 w-4" />
            </motion.button>

            {/* View switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 rounded-md border border-[#323234] bg-[#262627] px-1.5 py-[3px] text-[13px] font-medium text-white hover:bg-[#2B2F31]">
                  {VIEW_LABELS[view]}
                  <IoChevronDown className="h-3.5 w-3.5 text-[#9AA0A6]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32">
                {VIEW_ORDER.map((v) => (
                  <DropdownMenuItem
                    key={v}
                    onClick={() => handleViewChange(v)}
                    className={cn(view === v && "text-[var(--accent)]")}
                  >
                    {VIEW_LABELS[v]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${view}-${currentDate.toISOString().slice(0, 10)}`}
              className="h-full"
              initial={
                prefersReducedMotion
                  ? false
                  : { opacity: 0, x: transitionDirection * 12 }
              }
              animate={{ opacity: 1, x: 0 }}
              exit={
                prefersReducedMotion
                  ? { opacity: 1, x: 0 }
                  : { opacity: 0, x: -transitionDirection * 12 }
              }
              transition={{ duration: prefersReducedMotion ? 0 : 0.18 }}
            >
              {view === "day" ? (
                <DayView currentDate={currentDate} onDateClick={setDate} />
              ) : view === "week" ? (
                <WeekView currentDate={currentDate} onDateClick={setDate} />
              ) : view === "month" ? (
                <MonthView currentDate={currentDate} onDateClick={setDate} />
              ) : (
                <MultiMonthView
                  currentDate={currentDate}
                  onDateClick={setDate}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
