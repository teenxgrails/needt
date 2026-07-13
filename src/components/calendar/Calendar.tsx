"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import { CheckSquare2, Clock3, Settings } from "lucide-react";
import {
  IoAddOutline,
  IoChevronBack,
  IoChevronDown,
  IoChevronForward,
  IoOptionsOutline,
  IoRefreshOutline,
} from "react-icons/io5";
import { toast } from "sonner";

import { DayView } from "@/components/calendar/DayView";
import { MonthView } from "@/components/calendar/MonthView";
import { MultiMonthView } from "@/components/calendar/MultiMonthView";
import { WeekView } from "@/components/calendar/WeekView";
import { TaskModal } from "@/components/tasks/TaskModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

import { useEventModalStore } from "@/lib/commands/groups/calendar";
import { addDays, newDate, subDays } from "@/lib/date-utils";
import { cn } from "@/lib/utils";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useCalendarStore, useViewStore } from "@/store/calendar";
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
  const { scheduleAllTasks, scheduleAnimationRevision, tags } = useTaskStore();
  const { createTask } = useTaskMutations();
  const { setFeeds, setEvents } = useCalendarStore();
  const {
    user: userSettings,
    calendar: calendarSettings,
    updateUserSettings,
    updateCalendarSettings,
  } = useSettingsStore();
  const eventModalStore = useEventModalStore();
  const prefersReducedMotion = useReducedMotion();
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  const titlePrimary =
    view === "day"
      ? new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(currentDate)
      : new Intl.DateTimeFormat("en-US", { month: "short" }).format(
          currentDate
        );
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
    // Inverse-themed "Recalculating tasks..." toast (white on dark, dark on
    // light), matching the Motion reference.
    const toastId = toast.loading("Recalculating tasks...", {
      className: "recalc-toast",
      closeButton: true,
    });
    try {
      await scheduleAllTasks();
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleViewChange = (nextView: typeof view) => {
    setView(nextView);
  };

  const handleToday = () => {
    setDate(newDate());
  };

  const handleNewEvent = () => {
    const start = newDate();
    eventModalStore.setDefaultDate(start);
    eventModalStore.setDefaultEndDate(
      new Date(start.getTime() + 30 * 60 * 1000)
    );
    eventModalStore.setOpen(true);
  };

  const handleNewTask = () => {
    setIsTaskModalOpen(true);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#1B1D1E] text-white">
      {/* Main Content */}
      <main className="flex min-w-0 flex-1 flex-col bg-[#1B1D1E]">
        {/* Header */}
        <header className="flex h-12 flex-none items-center px-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleToday}
              className="h-[25px] rounded-md border border-[#3A3F42] bg-[#313538] px-1.5 py-[3px] text-[13px] font-medium leading-[17px] text-white transition-colors duration-150 ease-out hover:bg-[#383D40]"
              title="Go to Today (t)"
            >
              Today
            </button>

            <div className="flex items-center gap-0.5">
              <button
                onClick={handlePrevWeek}
                className="rounded-md p-1 text-[#9BA1A6] transition-colors duration-150 ease-out hover:bg-[#2B2F31] hover:text-white"
                data-testid="calendar-prev-week"
                title="Previous Week (←)"
              >
                <IoChevronBack className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextWeek}
                className="rounded-md p-1 text-[#9BA1A6] transition-colors duration-150 ease-out hover:bg-[#2B2F31] hover:text-white"
                data-testid="calendar-next-week"
                title="Next Week (→)"
              >
                <IoChevronForward className="h-4 w-4" />
              </button>
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
            {/* Calendar options panel (Motion-style) */}
            <Popover>
              <PopoverTrigger asChild>
                <button
                  className="flex h-[25px] items-center gap-1.5 rounded-md border border-[#3A3F42] bg-[#313538] px-1.5 py-[3px] text-[13px] font-medium leading-[17px] text-white transition-colors duration-150 ease-out hover:bg-[#383D40]"
                  title="Calendar options"
                >
                  <IoOptionsOutline className="h-4 w-4" />
                  <span className="hidden sm:inline">Calendar options</span>
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                className="w-72 bg-[var(--raised)] p-4 text-[var(--text-hi)]"
              >
                <h3 className="mb-3 text-[15px] font-semibold">Calendar</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-[var(--text-lo)]">
                      Start week on
                    </span>
                    <Select
                      value={userSettings.weekStartDay}
                      onValueChange={(value) =>
                        updateUserSettings({
                          weekStartDay: value as "monday" | "sunday",
                        })
                      }
                    >
                      <SelectTrigger className="h-8 w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monday">Monday</SelectItem>
                        <SelectItem value="sunday">Sunday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-[var(--text-lo)]">
                      24-hour time
                    </span>
                    <Switch
                      checked={userSettings.timeFormat === "24h"}
                      onCheckedChange={(checked) =>
                        updateUserSettings({
                          timeFormat: checked ? "24h" : "12h",
                        })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[13px] text-[var(--text-lo)]">
                      Highlight working hours
                    </span>
                    <Switch
                      checked={calendarSettings.workingHours.enabled}
                      onCheckedChange={(checked) =>
                        updateCalendarSettings({
                          workingHours: {
                            ...calendarSettings.workingHours,
                            enabled: checked,
                          },
                        })
                      }
                    />
                  </div>
                </div>

                <div className="my-3 h-px bg-[var(--line-strong)]" />

                <Link
                  href="/settings#auto-schedule"
                  className="flex items-center justify-center gap-2 rounded-md py-1.5 text-[13px] text-[var(--text-lo)] transition-colors hover:bg-[var(--active)] hover:text-[var(--text-hi)]"
                >
                  Auto-scheduling settings
                  <Settings className="h-3.5 w-3.5" />
                </Link>
                <Link
                  href="/settings#calendar"
                  className="flex items-center justify-center gap-2 rounded-md py-1.5 text-[13px] text-[var(--text-lo)] transition-colors hover:bg-[var(--active)] hover:text-[var(--text-hi)]"
                >
                  Calendar settings
                  <Settings className="h-3.5 w-3.5" />
                </Link>
              </PopoverContent>
            </Popover>

            {/* Refresh all tasks (auto-schedule) */}
            <button
              onClick={handleAutoSchedule}
              className="flex h-[25px] items-center gap-1.5 rounded-md border border-[#3A3F42] bg-[#313538] px-1.5 py-[3px] text-[13px] font-medium leading-[17px] text-white transition-colors duration-150 ease-out hover:bg-[#383D40]"
              title="Refresh all tasks"
            >
              <IoRefreshOutline className="h-4 w-4" />
              <span className="hidden md:inline">Refresh all tasks</span>
            </button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="grid h-[25px] w-[25px] place-items-center rounded-md border border-[#3A3F42] bg-[#313538] text-white transition-colors duration-150 ease-out hover:bg-[#383D40]"
                  title="Create"
                  aria-label="Create task or event"
                >
                  <IoAddOutline className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 border-[#2B2F31] bg-[#202425] p-1 text-[#F2F2F2]"
              >
                <DropdownMenuItem
                  onClick={handleNewTask}
                  className="group flex cursor-pointer items-start gap-3 rounded-[4px] px-3 py-2.5 focus:bg-[#2B2F31]"
                >
                  <CheckSquare2 className="mt-0.5 h-4 w-4 text-[#9BA1A6] transition-colors group-data-[highlighted]:text-[#F2F2F2]" />
                  <span className="space-y-0.5">
                    <span className="block text-[13px] font-medium">
                      Create task
                    </span>
                    <span className="block text-[12px] text-[#9BA1A6]">
                      Add work for the planner to schedule.
                    </span>
                  </span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleNewEvent}
                  className="group flex cursor-pointer items-start gap-3 rounded-[4px] px-3 py-2.5 focus:bg-[#2B2F31]"
                >
                  <Clock3 className="mt-0.5 h-4 w-4 text-[#9BA1A6] transition-colors group-data-[highlighted]:text-[#F2F2F2]" />
                  <span className="space-y-0.5">
                    <span className="block text-[13px] font-medium">
                      Create event
                    </span>
                    <span className="block text-[12px] text-[#9BA1A6]">
                      Block a fixed time on a calendar.
                    </span>
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* View switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex h-[25px] items-center gap-1 rounded-md border border-[#3A3F42] bg-[#313538] px-1.5 py-[3px] text-[13px] font-medium leading-[17px] text-white transition-colors duration-150 ease-out hover:bg-[#383D40]">
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
        <div
          className="flex-1 overflow-hidden"
          data-schedule-revision={scheduleAnimationRevision}
        >
          <LayoutGroup id="calendar-schedule">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`${view}-${currentDate.toISOString().slice(0, 10)}`}
                className="h-full"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.15,
                  ease: "easeOut",
                }}
              >
                {view === "day" ? (
                  <DayView currentDate={currentDate} />
                ) : view === "week" ? (
                  <WeekView currentDate={currentDate} />
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
          </LayoutGroup>
        </div>
      </main>
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        tags={tags}
        onSave={async (task) => {
          await createTask(task);
          setIsTaskModalOpen(false);
        }}
        onCreateTag={(name, color) =>
          useTaskStore.getState().createTag({ name, color })
        }
      />
    </div>
  );
}
