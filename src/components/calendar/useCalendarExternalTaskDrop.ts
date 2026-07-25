"use client";

import { useCallback } from "react";

import type { DropArg } from "@fullcalendar/interaction";
import { toast } from "sonner";

import { newDate } from "@/lib/date-utils";
import { isRangeBlocked, type BlockingOverride } from "@/lib/flexible-hours-guard";
import { logger } from "@/lib/logger";

import { useTaskMutations } from "@/hooks/useTaskMutations";

import { useSettingsStore } from "@/store/settings";
import { useTaskStore } from "@/store/task";

const LOG_SOURCE = "useCalendarExternalTaskDrop";

export function useCalendarExternalTaskDrop(
  overrides: BlockingOverride[] = []
) {
  const { moveTask } = useTaskMutations();
  const workingHoursStart = useSettingsStore(
    (state) => state.calendar.workingHours.start
  );

  return useCallback(
    (dropInfo: DropArg) => {
      const taskId = dropInfo.draggedEl.dataset.calendarTaskId;
      if (!taskId) return;

      const task = useTaskStore.getState().tasks.find(({ id }) => id === taskId);
      if (!task) return;

      const start = newDate(dropInfo.date);
      if (dropInfo.allDay) {
        const [hours = 9, minutes = 0] = workingHoursStart
          .split(":")
          .map(Number);
        start.setHours(hours, minutes, 0, 0);
      }

      const duration = task.duration ?? task.estimatedMinutes ?? 30;
      const end = newDate(start.getTime() + duration * 60_000);

      // Dropping on the all-day row still places the task at a specific time
      // (workingHoursStart, above) rather than making it a true all-day item,
      // so the ordinary range check applies here too — it already treats
      // BLOCK_WHOLE_DAY as blocking the whole day regardless of time.
      if (isRangeBlocked(start, end, overrides)) {
        toast.error("This time is blocked out");
        return;
      }

      void moveTask(taskId, {
        startDate: start,
        scheduledStart: start,
        scheduledEnd: end,
        isAutoScheduled: true,
        autoScheduled: true,
        scheduleLocked: true,
        isFrozen: true,
      }).catch((error: unknown) => {
        void logger.error(
          "External task drop failed",
          {
            taskId,
            error: error instanceof Error ? error.message : String(error),
          },
          LOG_SOURCE
        );
      });
    },
    [moveTask, workingHoursStart, overrides]
  );
}
