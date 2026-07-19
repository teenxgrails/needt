import type { CalendarSettings, TimeFormat } from "@/types/settings";

export function formatCalendarHour(date: Date, timeFormat: TimeFormat): string {
  if (timeFormat === "24h") {
    return new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(date);
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: true,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "";
  const dayPeriod =
    parts.find((part) => part.type === "dayPeriod")?.value.toUpperCase() ?? "";

  return `${hour} ${dayPeriod}`.trim();
}

export function getCalendarBusinessHours(
  workingHours: CalendarSettings["workingHours"]
) {
  if (!workingHours.enabled) return false;

  return {
    daysOfWeek: workingHours.days,
    startTime: workingHours.start,
    endTime: workingHours.end,
  };
}
