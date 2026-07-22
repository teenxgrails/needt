"use client";

import { useEffect, useRef, useState } from "react";

import Link from "next/link";

import {
  CheckSquare2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MoreHorizontal,
  Settings,
} from "lucide-react";
import {
  AnimatePresence,
  LayoutGroup,
  motion,
  useReducedMotion,
} from "motion/react";
import {
  IoAddOutline,
  IoChevronDown,
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
  APP_TOOLBAR_BUTTON_CLASS,
  APP_TOOLBAR_ICON_BUTTON_CLASS,
} from "@/components/ui/app-toolbar";
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetDescription,
  BottomSheetTitle,
} from "@/components/ui/bottom-sheet";
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
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

import { useIsMobile } from "@/hooks/use-is-mobile";
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

const LOG_SOURCE = "Calendar";

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
  const isPhone = useIsMobile(640);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isRefreshingTasks, setIsRefreshingTasks] = useState(false);
  const [isMobileCreateOpen, setIsMobileCreateOpen] = useState(false);
  const [isMobileOptionsOpen, setIsMobileOptionsOpen] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

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

  const handleAutoSchedule = async () => {
    if (isRefreshingTasks) return;
    setIsRefreshingTasks(true);
    // Inverse-themed "Recalculating tasks..." toast (white on dark, dark on
    // light), matching the Motion reference.
    const toastId = toast.loading("Recalculating tasks...", {
      className: "recalc-toast",
      closeButton: true,
    });
    try {
      const scheduledCount = await scheduleAllTasks();
      toast.success(
        scheduledCount > 0
          ? `${scheduledCount} tasks refreshed on your calendar.`
          : "All tasks are already up to date."
      );
    } catch (error) {
      toast.error("Couldn't refresh tasks. Please try again.");
      void logger.error(
        "Calendar task refresh failed",
        {
          error: error instanceof Error ? error.message : String(error),
        },
        LOG_SOURCE
      );
    } finally {
      toast.dismiss(toastId);
      setIsRefreshingTasks(false);
    }
  };

  const handleViewChange = (nextView: typeof view) => {
    setView(nextView);
  };

  const effectiveView = isPhone && view === "week" ? "day" : view;
  const visibleViews = isPhone
    ? VIEW_ORDER.filter((item) => item === "day" || item === "month")
    : VIEW_ORDER;

  const moveDate = (direction: -1 | 1) => {
    const next = new Date(currentDate);
    if (effectiveView === "day") {
      next.setDate(next.getDate() + direction);
    } else if (effectiveView === "week") {
      next.setDate(next.getDate() + direction * 7);
    } else if (effectiveView === "month") {
      next.setMonth(next.getMonth() + direction);
    } else {
      next.setFullYear(next.getFullYear() + direction);
    }
    setDate(next);
  };

  const dateLabel = new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: effectiveView === "multiMonth" ? undefined : "numeric",
    year:
      effectiveView === "month" || effectiveView === "multiMonth"
        ? "numeric"
        : undefined,
  }).format(currentDate);

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
    <div className="needt-page-depth flex h-full w-full overflow-hidden text-[var(--text-primary)]">
      {/* Main Content */}
      <main className="needt-page-depth flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 flex-none items-center gap-1 border-b border-transparent px-1.5 sm:h-12 sm:gap-2 sm:px-2 max-lg:border-[var(--border-subtle)]">
          <div className="flex min-w-0 items-center gap-1 lg:hidden">
            <button
              type="button"
              onClick={() => moveDate(-1)}
              className={cn(
                APP_TOOLBAR_ICON_BUTTON_CLASS,
                isPhone && "h-10 w-10 border-transparent bg-transparent"
              )}
              aria-label="Previous period"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDate(newDate())}
              className="min-h-10 min-w-0 rounded-md px-1.5 py-1 text-[13px] font-semibold text-[var(--text-primary)] transition-colors duration-150 hover:bg-[var(--surface-hover)] sm:min-h-0"
            >
              <span className="block max-w-[86px] truncate sm:max-w-none">
                {dateLabel}
              </span>
            </button>
            <button
              type="button"
              onClick={() => moveDate(1)}
              className={cn(
                APP_TOOLBAR_ICON_BUTTON_CLASS,
                isPhone && "h-10 w-10 border-transparent bg-transparent"
              )}
              aria-label="Next period"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {/* Right-side actions */}
          <div className="ml-auto flex items-center gap-1">
            {isPhone ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={cn(
                        APP_TOOLBAR_BUTTON_CLASS,
                        "h-10 border-transparent bg-transparent px-2"
                      )}
                      aria-label={`Calendar view: ${VIEW_LABELS[effectiveView]}`}
                    >
                      {VIEW_LABELS[effectiveView]}
                      <IoChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-36">
                    {visibleViews.map((visibleView) => (
                      <DropdownMenuItem
                        key={visibleView}
                        onClick={() => handleViewChange(visibleView)}
                        className={cn(
                          "min-h-11",
                          effectiveView === visibleView &&
                            "text-[var(--color-accent)]"
                        )}
                      >
                        {VIEW_LABELS[visibleView]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                <button
                  type="button"
                  onClick={() => setIsMobileCreateOpen(true)}
                  className={cn(
                    APP_TOOLBAR_ICON_BUTTON_CLASS,
                    "h-10 w-10 border-transparent bg-transparent"
                  )}
                  aria-label="Create task or event"
                >
                  <IoAddOutline className="h-5 w-5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsMobileOptionsOpen(true)}
                  className={cn(
                    APP_TOOLBAR_ICON_BUTTON_CLASS,
                    "h-10 w-10 border-transparent bg-transparent"
                  )}
                  aria-label="More calendar actions"
                >
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                {/* Calendar options panel (Motion-style) */}
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={APP_TOOLBAR_BUTTON_CLASS}
                      title="Calendar options"
                    >
                      <IoOptionsOutline className="h-4 w-4" />
                      <span className="hidden xl:inline">Calendar options</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    sideOffset={6}
                    className="w-[var(--calendar-options-width)] border-[var(--popover-border)] bg-[var(--popover-bg)] p-4 text-[var(--text-primary)]"
                  >
                    <h3 className="mb-4 text-[16px] font-semibold">Calendar</h3>

                    <div className="space-y-2">
                      <div className="flex h-[34px] items-center justify-between gap-3">
                        <span className="text-[14px] text-[var(--text-secondary)]">
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
                          <SelectTrigger className="h-[var(--calendar-options-control-height)] w-[104px] px-3 text-[14px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value="monday"
                              className="h-[var(--calendar-options-control-height)] rounded text-[14px]"
                            >
                              Monday
                            </SelectItem>
                            <SelectItem
                              value="sunday"
                              className="h-[var(--calendar-options-control-height)] rounded text-[14px]"
                            >
                              Sunday
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex h-[30px] items-center justify-between gap-3">
                        <span className="text-[14px] text-[var(--text-secondary)]">
                          24-hour time
                        </span>
                        <Switch
                          className="h-4 w-[26px] [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-[12px]"
                          checked={userSettings.timeFormat === "24h"}
                          onCheckedChange={(checked) =>
                            updateUserSettings({
                              timeFormat: checked ? "24h" : "12h",
                            })
                          }
                        />
                      </div>

                      <div className="flex h-[30px] items-center justify-between gap-3">
                        <span className="text-[14px] text-[var(--text-secondary)]">
                          Shade non-working hours
                        </span>
                        <Switch
                          className="h-4 w-[26px] [&>span]:h-3 [&>span]:w-3 [&>span]:data-[state=checked]:translate-x-[12px]"
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

                    <div className="my-3 h-px bg-[var(--border-subtle)]" />

                    <Link
                      href="/settings#auto-schedule"
                      className="flex h-7 items-center justify-center gap-2 rounded text-[14px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]"
                    >
                      Auto-scheduling settings
                      <Settings className="h-3.5 w-3.5" />
                    </Link>
                    <Link
                      href="/settings#calendar"
                      className="flex h-7 items-center justify-center gap-2 rounded text-[14px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--menu-item-hover)] hover:text-[var(--text-primary)]"
                    >
                      Calendar settings
                      <Settings className="h-3.5 w-3.5" />
                    </Link>
                  </PopoverContent>
                </Popover>

                {/* Refresh all tasks (auto-schedule) */}
                <button
                  onClick={handleAutoSchedule}
                  disabled={isRefreshingTasks}
                  aria-busy={isRefreshingTasks}
                  className={APP_TOOLBAR_BUTTON_CLASS}
                  title="Refresh all tasks"
                  data-testid="refresh-all-tasks"
                >
                  <IoRefreshOutline
                    className={cn(
                      "h-4 w-4",
                      isRefreshingTasks && "animate-spin"
                    )}
                  />
                  <span className="hidden xl:inline">Refresh all tasks</span>
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className={APP_TOOLBAR_ICON_BUTTON_CLASS}
                      title="Create"
                      aria-label="Create task or event"
                    >
                      <IoAddOutline className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    sideOffset={6}
                    className="w-[210px] origin-[var(--radix-dropdown-menu-content-transform-origin)] p-1 shadow-none data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-1"
                  >
                    <DropdownMenuItem
                      onClick={handleNewTask}
                      className="group flex h-9 cursor-pointer items-center gap-2 rounded px-2 text-[13px]"
                    >
                      <CheckSquare2 className="h-4 w-4 text-[var(--text-secondary)] transition-colors group-data-[highlighted]:text-[var(--text-primary)]" />
                      <span className="font-medium">Create task</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={handleNewEvent}
                      className="group flex h-9 cursor-pointer items-center gap-2 rounded border-t border-[var(--border-subtle)] px-2 text-[13px]"
                    >
                      <Clock3 className="h-4 w-4 text-[var(--text-secondary)] transition-colors group-data-[highlighted]:text-[var(--text-primary)]" />
                      <span className="font-medium">Create event</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* View switcher */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={APP_TOOLBAR_BUTTON_CLASS}>
                      {VIEW_LABELS[effectiveView]}
                      <IoChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32">
                    {visibleViews.map((v) => (
                      <DropdownMenuItem
                        key={v}
                        onClick={() => handleViewChange(v)}
                        className={cn(
                          effectiveView === v && "text-[var(--color-accent)]"
                        )}
                      >
                        {VIEW_LABELS[v]}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </header>

        {/* Calendar Grid */}
        <div
          className="flex-1 touch-pan-y overflow-hidden"
          data-schedule-revision={scheduleAnimationRevision}
          onTouchStart={(event) => {
            if (!isPhone || effectiveView !== "day") return;
            const touch = event.touches[0];
            swipeStart.current = { x: touch.clientX, y: touch.clientY };
          }}
          onTouchEnd={(event) => {
            if (!isPhone || effectiveView !== "day" || !swipeStart.current)
              return;
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - swipeStart.current.x;
            const deltaY = touch.clientY - swipeStart.current.y;
            swipeStart.current = null;
            if (Math.abs(deltaX) < 60 || Math.abs(deltaX) < Math.abs(deltaY))
              return;
            moveDate(deltaX > 0 ? -1 : 1);
          }}
        >
          <LayoutGroup id="calendar-schedule">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={effectiveView}
                className="h-full"
                initial={prefersReducedMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.15,
                  ease: "easeOut",
                }}
              >
                {effectiveView === "day" ? (
                  <DayView currentDate={currentDate} />
                ) : effectiveView === "week" ? (
                  <WeekView currentDate={currentDate} />
                ) : effectiveView === "month" ? (
                  <MonthView
                    currentDate={currentDate}
                    onDateClick={(date) => {
                      setDate(date);
                      if (isPhone) setView("day");
                    }}
                  />
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
        onItemTypeChange={() => {
          setIsTaskModalOpen(false);
          eventModalStore.setDefaultDate(currentDate);
          eventModalStore.setDefaultEndDate(
            new Date(currentDate.getTime() + 60 * 60 * 1000)
          );
          eventModalStore.setOpen(true);
        }}
      />
      <BottomSheet
        open={isMobileCreateOpen}
        onOpenChange={setIsMobileCreateOpen}
      >
        <BottomSheetContent aria-describedby={undefined}>
          <BottomSheetTitle>Create</BottomSheetTitle>
          <BottomSheetDescription className="mb-3">
            Add something to your plan.
          </BottomSheetDescription>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => {
                setIsMobileCreateOpen(false);
                handleNewTask();
              }}
              className="flex min-h-12 touch-manipulation items-center gap-3 rounded-md border border-[var(--border-control)] bg-[var(--surface-control)] px-3 text-left text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-control-hover)]"
            >
              <CheckSquare2 className="h-4 w-4 text-[var(--text-secondary)]" />
              Create task
            </button>
            <button
              type="button"
              onClick={() => {
                setIsMobileCreateOpen(false);
                handleNewEvent();
              }}
              className="flex min-h-12 touch-manipulation items-center gap-3 rounded-md px-3 text-left text-sm font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              <Clock3 className="h-4 w-4 text-[var(--text-secondary)]" />
              Create event
            </button>
          </div>
        </BottomSheetContent>
      </BottomSheet>

      <BottomSheet
        open={isMobileOptionsOpen}
        onOpenChange={setIsMobileOptionsOpen}
      >
        <BottomSheetContent>
          <BottomSheetTitle>Calendar options</BottomSheetTitle>
          <BottomSheetDescription className="mb-3">
            Tune the calendar without leaving your day.
          </BottomSheetDescription>
          <div className="space-y-1">
            <div className="flex min-h-12 items-center justify-between gap-3">
              <span className="text-sm text-[var(--text-secondary)]">
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
                <SelectTrigger className="h-10 w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monday" className="min-h-11">
                    Monday
                  </SelectItem>
                  <SelectItem value="sunday" className="min-h-11">
                    Sunday
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex min-h-12 items-center justify-between gap-3">
              <span className="text-sm text-[var(--text-secondary)]">
                24-hour time
              </span>
              <Switch
                checked={userSettings.timeFormat === "24h"}
                onCheckedChange={(checked) =>
                  updateUserSettings({ timeFormat: checked ? "24h" : "12h" })
                }
              />
            </div>
            <div className="flex min-h-12 items-center justify-between gap-3">
              <span className="text-sm text-[var(--text-secondary)]">
                Shade non-working hours
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
          <div className="my-2 h-px bg-[var(--border-subtle)]" />
          <button
            type="button"
            onClick={() => {
              setIsMobileOptionsOpen(false);
              void handleAutoSchedule();
            }}
            disabled={isRefreshingTasks}
            className="flex min-h-12 w-full touch-manipulation items-center gap-3 rounded-md px-3 text-left text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60"
          >
            <IoRefreshOutline
              className={cn("h-4 w-4", isRefreshingTasks && "animate-spin")}
            />
            {isRefreshingTasks ? "Refreshing tasks…" : "Refresh all tasks"}
          </button>
          <Link
            href="/settings#calendar"
            onClick={() => setIsMobileOptionsOpen(false)}
            className="flex min-h-12 items-center gap-3 rounded-md px-3 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            <Settings className="h-4 w-4" />
            Calendar settings
          </Link>
        </BottomSheetContent>
      </BottomSheet>
    </div>
  );
}
