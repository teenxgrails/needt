import { NextRequest, NextResponse } from "next/server";

import { WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { addCalendarDays, newDate } from "@/lib/date-utils";
import { prismaDataSource } from "@/lib/needt/prisma-source";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "NeedtCalendarAPI";
const NO_STORE = { "Cache-Control": "private, no-store, max-age=0" } as const;
const MAX_RANGE_DAYS = 400;

function requestedRange(request: NextRequest, now: Date) {
  const startParam = request.nextUrl.searchParams.get("start");
  const endParam = request.nextUrl.searchParams.get("end");
  const start = startParam ? newDate(startParam) : addCalendarDays(now, -45);
  const end = endParam ? newDate(endParam) : addCalendarDays(now, 320);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    start > end ||
    end.getTime() - start.getTime() > MAX_RANGE_DAYS * 86_400_000
  ) {
    return null;
  }
  return { start, end };
}

function hourOf(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const [hour, minute] = value.split(":").map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return fallback;
  return hour + minute / 60;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  if (!auth.workspace) {
    return NextResponse.json(
      { error: "Workspace unavailable" },
      { status: 500, headers: NO_STORE }
    );
  }

  const now = newDate();
  const range = requestedRange(request, now);
  if (!range) {
    return NextResponse.json(
      { error: "Invalid calendar range" },
      { status: 400, headers: NO_STORE }
    );
  }

  const source = prismaDataSource(auth.userId, auth.workspace, () => now);
  const [
    entries,
    projects,
    calendars,
    userSettings,
    calendarSettings,
    flexibleHours,
  ] =
    await Promise.all([
      source.getCalendarEntries(range.start, range.end),
      source.getProjects(),
      source.getCalendars(),
      prisma.userSettings.findUnique({ where: { userId: auth.userId } }),
      prisma.calendarSettings.findUnique({ where: { userId: auth.userId } }),
      prisma.flexibleHoursOverride.findMany({
        where: {
          userId: auth.userId,
          date: { gte: range.start, lte: range.end },
        },
        orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      }),
    ]);

  return NextResponse.json(
    {
      workspaceId: auth.workspace.workspaceId,
      now: now.toISOString(),
      entries,
      projects,
      calendars,
      canEdit: auth.workspace.role !== WorkspaceRole.VIEWER,
      options: {
        use24Hour: userSettings?.timeFormat === "24h",
        weekStart: userSettings?.weekStartDay === "sunday" ? "sun" : "mon",
        workStart: hourOf(calendarSettings?.workingHoursStart, 9),
        workEnd: hourOf(calendarSettings?.workingHoursEnd, 17),
        flexibleHours: flexibleHours.map((override) => ({
          date: override.date.toISOString().slice(0, 10),
          kind: override.kind,
          startTime: override.startTime,
          endTime: override.endTime,
        })),
      },
    },
    { headers: NO_STORE }
  );
}

export const __internal = { requestedRange, hourOf };
