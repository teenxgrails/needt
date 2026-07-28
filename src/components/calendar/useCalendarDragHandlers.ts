import { useCallback } from "react";

import type { EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { notify } from "@/lib/notifications";

import { computeDropUpdate } from "@/lib/calendar-drag";
import type { BlockingOverride } from "@/lib/flexible-hours-guard";
import { logger } from "@/lib/logger";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useCalendarStore } from "@/store/calendar";

import { CalendarEvent } from "@/types/calendar";

const LOG_SOURCE = "useCalendarDragHandlers";

// Shared eventDrop/eventResize handlers for the calendar views. The views
// spread the original store item into extendedProps, so it is recovered here.
export function useCalendarDragHandlers(
  overrides: BlockingOverride[] = []
) {
  const feeds = useCalendarStore((s) => s.feeds);
  const updateEvent = useCalendarStore((s) => s.updateEvent);
  const { moveTask } = useTaskMutations();

  const applyChange = useCallback(
    async (info: EventDropArg | EventResizeDoneArg, isResize: boolean) => {
      const item = info.event.extendedProps as CalendarEvent;
      if (!info.event.start) {
        info.revert();
        return;
      }

      const update = computeDropUpdate(
        {
          item,
          newStart: info.event.start,
          newEnd: info.event.end,
          oldStart: info.oldEvent.start,
          oldEnd: info.oldEvent.end,
          oldAllDay: info.oldEvent.allDay,
          newAllDay: info.event.allDay,
          isResize,
        },
        feeds,
        overrides
      );

      if (update.kind === "blocked") {
        info.revert();
        notify.error(update.reason);
        return;
      }

      try {
        if (update.kind === "task") {
          await moveTask(update.taskId, update.updates);
        } else {
          // No mode: the API routes resolve this row's own external event id
          // (a recurring instance carries its instance-specific id), so a
          // direct patch updates exactly this occurrence. mode "single" would
          // instead look the instance up by the NEW start time and can patch
          // the wrong occurrence.
          await updateEvent(update.eventId, update.updates);
        }
      } catch (error) {
        void logger.error(
          "Failed to apply calendar drag change",
          {
            error: error instanceof Error ? error.message : String(error),
            isResize,
          },
          LOG_SOURCE
        );
        info.revert();
        if (update.kind !== "task") {
          notify.error(
            isResize ? "Failed to resize item" : "Failed to move item"
          );
        }
      }
    },
    [feeds, moveTask, updateEvent, overrides]
  );

  const handleEventDrop = useCallback(
    (info: EventDropArg) => {
      void applyChange(info, false);
    },
    [applyChange]
  );

  const handleEventResize = useCallback(
    (info: EventResizeDoneArg) => {
      void applyChange(info, true);
    },
    [applyChange]
  );

  return { handleEventDrop, handleEventResize };
}
