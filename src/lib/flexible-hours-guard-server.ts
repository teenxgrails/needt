import { formatInTimeZone } from "@/lib/date-utils";
import { isRangeBlocked, type BlockingOverride } from "@/lib/flexible-hours-guard";
import { prisma } from "@/lib/prisma";

// The Node process's own local timezone almost never matches the user's —
// resolve the user's real timezone so "which calendar day" a placement falls
// on agrees with the day the override was created for (the browser's local
// day), instead of silently mis-applying near a midnight boundary or
// whenever server and user timezones simply differ.
async function resolveUserTimeZone(userId: string): Promise<string> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { timeZone: true },
  });
  if (settings?.timeZone) return settings.timeZone;
  const defaultSchedule = await prisma.workSchedule.findFirst({
    where: { userId, isDefault: true },
    select: { timeZone: true },
  });
  return defaultSchedule?.timeZone || "UTC";
}

// Server-side counterpart to the client guard, so a direct API call can't
// place a task inside blocked hours that the calendar UI already prevents.
export async function isTaskPlacementBlocked(
  userId: string,
  start: Date,
  end: Date
): Promise<boolean> {
  const timeZone = await resolveUserTimeZone(userId);
  const dateKey = formatInTimeZone(start, timeZone, "yyyy-MM-dd");
  const overrides = await prisma.flexibleHoursOverride.findMany({
    where: { userId, date: new Date(`${dateKey}T00:00:00.000Z`) },
    select: { kind: true, startTime: true, endTime: true },
  });
  const blockingOverrides: BlockingOverride[] = overrides.map((override) => ({
    date: dateKey,
    kind: override.kind,
    startTime: override.startTime,
    endTime: override.endTime,
  }));
  return isRangeBlocked(start, end, blockingOverrides, timeZone);
}
