"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getBusinessHoursFromWindows,
  type WorkScheduleWindowLike,
} from "@/lib/calendar-display";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "useDefaultScheduleBusinessHours";

interface WorkScheduleResponse {
  id: string;
  isDefault: boolean;
  windows: WorkScheduleWindowLike[];
}

// Mirrors the "Edit schedule" UI's and the auto-scheduler's source of truth
// (WorkSchedule + WorkScheduleWindow) so calendar shading stays in sync with
// what Needt actually treats as working hours, instead of the separate flat
// CalendarSettings.workingHours range.
export function useDefaultScheduleBusinessHours() {
  const [businessHours, setBusinessHours] = useState<
    ReturnType<typeof getBusinessHoursFromWindows>
  >([]);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/work-schedules");
      if (!response.ok) throw new Error("Failed to load work schedules");
      const data = (await response.json()) as {
        schedules: WorkScheduleResponse[];
      };
      const defaultSchedule =
        data.schedules.find((schedule) => schedule.isDefault) ??
        data.schedules[0];
      setBusinessHours(
        getBusinessHoursFromWindows(defaultSchedule?.windows ?? [])
      );
    } catch (error) {
      void logger.error(
        "Failed to load default work schedule for calendar shading",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
    }
  }, []);

  useEffect(() => {
    void refresh();
    window.addEventListener("needt:work-schedule-changed", refresh);
    return () =>
      window.removeEventListener("needt:work-schedule-changed", refresh);
  }, [refresh]);

  return businessHours;
}
