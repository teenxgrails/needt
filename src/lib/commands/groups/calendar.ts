import {
  HiOutlineCalendar,
  HiOutlineChevronLeft,
  HiOutlineChevronRight,
  HiOutlineMenu,
  HiOutlinePlus,
} from "react-icons/hi";
import { create } from "zustand";

import { addDays, newDate, subDays } from "@/lib/date-utils";

import { useCalendarUIStore, useViewStore } from "@/store/calendar";

import { Command } from "../types";

/**
 * What survives when someone switches between Task and Event mid-entry.
 *
 * Switching type closes one editor and opens the other, so anything already
 * typed used to vanish — you would name a task, realise it is really a meeting,
 * switch, and start over. Title and description mean the same thing on both
 * sides, so they carry across; everything type-specific is left behind on
 * purpose.
 */
export interface CalendarItemDraft {
  title?: string;
  description?: string;
  /** When it was handed over, so a stale draft cannot leak into a later form. */
  at: number;
}

/**
 * How long a handover stays valid. Several editors are mounted at once and any
 * of them may read first, so the draft is not consumed on read — it simply
 * expires. Long enough to survive a modal swap, far too short to reappear in a
 * task created minutes later.
 */
export const CALENDAR_DRAFT_TTL_MS = 5000;

export function readFreshCalendarDraft(
  draft: CalendarItemDraft | undefined
): CalendarItemDraft | undefined {
  if (!draft) return undefined;
  return Date.now() - draft.at <= CALENDAR_DRAFT_TTL_MS ? draft : undefined;
}

// Create a store for managing event modal state
interface EventModalStore {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  defaultDate?: Date;
  setDefaultDate: (date?: Date) => void;
  defaultEndDate?: Date;
  setDefaultEndDate: (date?: Date) => void;
  draft?: CalendarItemDraft;
  setDraft: (draft?: CalendarItemDraft) => void;
}

export const useEventModalStore = create<EventModalStore>((set) => ({
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
  defaultDate: undefined,
  setDefaultDate: (date) => set({ defaultDate: date }),
  defaultEndDate: undefined,
  setDefaultEndDate: (date) => set({ defaultEndDate: date }),
  draft: undefined,
  setDraft: (draft) => set({ draft }),
}));

export function useCalendarCommands(): Command[] {
  const { date: currentDate, setDate } = useViewStore();
  const { isSidebarOpen, setSidebarOpen } = useCalendarUIStore();

  const calendarContext = {
    requiredPath: "/calendar",
    navigateIfNeeded: true,
  };

  return [
    {
      id: "calendar.today",
      title: "Go to Today",
      keywords: ["calendar", "today", "now", "current"],
      icon: HiOutlineCalendar,
      section: "calendar",
      perform: () => setDate(newDate()),
      shortcut: "t",
      context: calendarContext,
    },
    {
      id: "calendar.prev-week",
      title: "Previous Week",
      keywords: ["calendar", "previous", "week", "back"],
      icon: HiOutlineChevronLeft,
      section: "calendar",
      perform: () => setDate(subDays(currentDate, 7)),
      shortcut: "left",
      context: {
        requiredPath: "/calendar",
        navigateIfNeeded: false,
      },
    },
    {
      id: "calendar.next-week",
      title: "Next Week",
      keywords: ["calendar", "next", "week", "forward"],
      icon: HiOutlineChevronRight,
      section: "calendar",
      perform: () => setDate(addDays(currentDate, 7)),
      shortcut: "right",
      context: {
        requiredPath: "/calendar",
        navigateIfNeeded: false,
      },
    },
    {
      id: "calendar.toggle-sidebar",
      title: "Toggle Calendar Sidebar",
      keywords: ["calendar", "sidebar", "toggle", "show", "hide"],
      icon: HiOutlineMenu,
      section: "calendar",
      perform: () => setSidebarOpen(!isSidebarOpen),
      shortcut: "b",
      context: calendarContext,
    },
    {
      id: "calendar.new-event",
      title: "Create New Event",
      keywords: ["calendar", "event", "new", "create", "add"],
      icon: HiOutlinePlus,
      section: "calendar",
      perform: () => {
        const now = newDate();
        useEventModalStore.getState().setDefaultDate(now);
        useEventModalStore
          .getState()
          .setDefaultEndDate(newDate(now.getTime() + 3600000)); // 1 hour later
        useEventModalStore.getState().setOpen(true);
      },
      shortcut: "ne",
      context: calendarContext,
    },
  ];
}
