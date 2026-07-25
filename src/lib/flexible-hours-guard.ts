import { formatInTimeZone, fromZonedTime, toLocalDateKey } from "@/lib/date-utils";

export interface BlockingOverride {
  date: string; // "YYYY-MM-DD"
  kind: "START_LATER" | "STOP_EARLY" | "BLOCK_HOURS" | "BLOCK_WHOLE_DAY";
  startTime: string | null;
  endTime: string | null;
}

// Client callers (calendar views, drag handlers) omit `timeZone` — the
// browser's own local getters (toLocalDateKey/setHours) already resolve the
// user's real timezone there. Server callers pass the user's actual
// `UserSettings.timeZone`, since the Node process's local timezone almost
// never matches the user's and would otherwise resolve the wrong calendar
// day near a midnight boundary.
function resolveDateKey(date: Date, timeZone?: string): string {
  return timeZone
    ? formatInTimeZone(date, timeZone, "yyyy-MM-dd")
    : toLocalDateKey(date);
}

function resolveWallClockTime(
  dateKey: string,
  time: string,
  referenceDate: Date,
  timeZone?: string
): Date {
  if (timeZone) {
    return fromZonedTime(`${dateKey}T${time}:00`, timeZone);
  }
  const [hours, minutes] = time.split(":").map(Number);
  const result = new Date(referenceDate);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

// Only BLOCK_HOURS/BLOCK_WHOLE_DAY stop manual placement. START_LATER/
// STOP_EARLY narrow the auto-scheduler's window but don't forbid a manual
// task or event from being placed there.
export function isRangeBlocked(
  start: Date,
  end: Date,
  overrides: BlockingOverride[],
  timeZone?: string
): boolean {
  const dateKey = resolveDateKey(start, timeZone);
  return overrides.some((override) => {
    if (override.kind !== "BLOCK_HOURS" && override.kind !== "BLOCK_WHOLE_DAY")
      return false;
    if (dateKey !== override.date) return false;

    if (override.kind === "BLOCK_WHOLE_DAY") return true;

    if (!override.startTime || !override.endTime) return false;
    const blockStart = resolveWallClockTime(
      override.date,
      override.startTime,
      start,
      timeZone
    );
    const blockEnd = resolveWallClockTime(
      override.date,
      override.endTime,
      start,
      timeZone
    );

    return start < blockEnd && end > blockStart;
  });
}

// All-day items (all-day row clicks/drags, all-day task due dates) aren't a
// time range — only a whole-day block applies to them. A partial BLOCK_HOURS
// override doesn't preclude an all-day item.
export function isDateWholeDayBlocked(
  date: Date,
  overrides: BlockingOverride[],
  timeZone?: string
): boolean {
  const dateKey = resolveDateKey(date, timeZone);
  return overrides.some(
    (override) =>
      override.kind === "BLOCK_WHOLE_DAY" && override.date === dateKey
  );
}
