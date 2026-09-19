import {
  addCalendarDays,
  format,
  formatInTimeZone,
  newDate,
  newDateFromYMD,
} from "@/lib/date-utils";

export function normalizeUserTimeZone(
  timeZone: string | null | undefined
): string {
  const candidate = timeZone?.trim() || "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: candidate }).format(newDate());
    return candidate;
  } catch {
    return "UTC";
  }
}

export function habitDayKey(
  now: Date,
  timeZone: string | null | undefined
): string {
  return formatInTimeZone(now, normalizeUserTimeZone(timeZone), "yyyy-MM-dd");
}

export function habitDateFromKey(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return newDate(Date.UTC(year, month - 1, day));
}

export function habitDateKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function habitDayWindow(
  now: Date,
  timeZone: string | null | undefined,
  days = 14
): readonly string[] {
  const key = habitDayKey(now, timeZone);
  const [year, month, day] = key.split("-").map(Number);
  const end = newDateFromYMD(year, month - 1, day);
  return Array.from({ length: days }, (_, index) =>
    format(addCalendarDays(end, index - days + 1), "yyyy-MM-dd")
  );
}
