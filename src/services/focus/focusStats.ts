import { recomputeTaskActuals } from "@/services/time-tracking/timeEntries";
import { FocusSessionMode, TimeEntrySource } from "@prisma/client";

import {
  addDays,
  formatInTimeZone,
  newDate,
  startOfDay,
} from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export interface WeeklyFocusReport {
  focusMinutes: number;
  sessionsCompleted: number;
  bestDay: string | null;
  estimateAccuracyPercent: number | null;
  /** Focused minutes per day for the last 7 days, oldest first (bar chart). */
  dailyMinutes: { label: string; minutes: number }[];
  streakStatus: {
    current: number;
    longest: number;
    atRisk: boolean;
  };
}

function localDayKey(date: Date, timeZone: string) {
  return formatInTimeZone(date, timeZone, "yyyy-MM-dd");
}

function daysBetweenKeys(a: string, b: string): number {
  return Math.round(
    (Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) /
      86_400_000
  );
}

function scoreFrom(input: {
  focusGoalRatio: number;
  completed: number,
  abandoned: number,
  accuracy: number;
  currentStreak: number;
}): number {
  const completionScore =
    input.completed + input.abandoned === 0
      ? 0
      : input.completed / (input.completed + input.abandoned);
  const streakScore = Math.min(1, input.currentStreak / 7);
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        Math.min(1, input.focusGoalRatio) * 35 +
          completionScore * 30 +
          input.accuracy * 20 +
          streakScore * 15
      )
    )
  );
}

async function estimateAccuracy(userId: string): Promise<number> {
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      actualMinutes: { gt: 0 },
      estLikely: { gt: 0 },
    },
    select: { actualMinutes: true, estLikely: true },
    take: 50,
    orderBy: { completedAt: "desc" },
  });

  if (tasks.length === 0) return 0.5;

  const averageError =
    tasks.reduce((total, task) => {
      const actual = task.actualMinutes ?? 0;
      const likely = task.estLikely ?? 1;
      return total + Math.min(1, Math.abs(actual - likely) / likely);
    }, 0) / tasks.length;

  return Math.max(0, 1 - averageError);
}

export async function recordFocusSession(input: {
  userId: string;
  taskId?: string | null;
  mode: FocusSessionMode;
  plannedMinutes?: number | null;
  elapsedMinutes: number;
  completed: boolean;
  abandoned?: boolean;
  startedAt: Date;
  endedAt: Date;
}) {
  const session = await prisma.focusSession.create({
    data: {
      userId: input.userId,
      taskId: input.taskId || null,
      mode: input.mode,
      plannedMinutes: input.plannedMinutes ?? null,
      elapsedMinutes: input.elapsedMinutes,
      completed: input.completed,
      abandoned: Boolean(input.abandoned),
      startedAt: input.startedAt,
      endedAt: input.endedAt,
    },
  });

  if (input.taskId && input.completed && input.elapsedMinutes > 0) {
    await prisma.timeEntry.create({
      data: {
        taskId: input.taskId,
        userId: input.userId,
        startedAt: input.startedAt,
        endedAt: input.endedAt,
        source: TimeEntrySource.focus,
      },
    });
    await recomputeTaskActuals(input.taskId);
  }

  await recomputeFocusStats(input.userId);
  return session;
}

export async function recomputeFocusStats(userId: string) {
  const [sessions, accuracy, preferences, settings] = await Promise.all([
    prisma.focusSession.findMany({
      where: { userId },
      orderBy: { startedAt: "asc" },
    }),
    estimateAccuracy(userId),
    prisma.focusPreferences.findUnique({ where: { userId } }),
    prisma.userSettings.findUnique({
      where: { userId },
      select: { timeZone: true },
    }),
  ]);
  const timeZone = settings?.timeZone || "UTC";

  const completed = sessions.filter((session) => session.completed);
  const abandoned = sessions.filter((session) => session.abandoned).length;
  const lifetimeMinutes = completed.reduce(
    (total, session) => total + session.elapsedMinutes,
    0
  );

  const uniqueDays = Array.from(
    new Set(completed.map((session) => localDayKey(session.startedAt, timeZone)))
  ).sort();

  let longestStreak = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of uniqueDays) {
    run = previous && daysBetweenKeys(day, previous) === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    previous = day;
  }

  const lastFocusDate = uniqueDays.length
    ? newDate(`${uniqueDays[uniqueDays.length - 1]}T12:00:00Z`)
    : null;
  const currentStreak =
    uniqueDays.length &&
    daysBetweenKeys(localDayKey(newDate(), timeZone), uniqueDays.at(-1)!) <= 1
      ? run
      : 0;
  const sevenDayCutoff = addDays(newDate(), -7);
  const recentMinutes = completed
    .filter((session) => session.startedAt >= sevenDayCutoff)
    .reduce((total, session) => total + session.elapsedMinutes, 0);
  const focusGoalRatio =
    recentMinutes / Math.max(1, (preferences?.dailyGoalMinutes ?? 25) * 7);
  const focusScore = scoreFrom({
    focusGoalRatio,
    completed: completed.length,
    abandoned,
    accuracy,
    currentStreak,
  });

  return prisma.focusStats.upsert({
    where: { userId },
    create: {
      userId,
      focusScore,
      currentStreak,
      longestStreak,
      lifetimeMinutes,
      lastFocusDate,
    },
    update: {
      focusScore,
      currentStreak,
      longestStreak,
      lifetimeMinutes,
      lastFocusDate,
    },
  });
}

export async function getWeeklyFocusReport(
  userId: string
): Promise<WeeklyFocusReport> {
  const since = startOfDay(addDays(newDate(), -7));

  const [sessions, stats, accuracy, settings] = await Promise.all([
    prisma.focusSession.findMany({
      where: { userId, startedAt: { gte: since } },
      orderBy: { startedAt: "asc" },
    }),
    prisma.focusStats.findUnique({ where: { userId } }),
    estimateAccuracy(userId),
    prisma.userSettings.findUnique({
      where: { userId },
      select: { timeZone: true },
    }),
  ]);
  const timeZone = settings?.timeZone || "UTC";

  const completed = sessions.filter((session) => session.completed);
  const minutesByDay = new Map<string, number>();
  for (const session of completed) {
    const key = formatInTimeZone(session.startedAt, timeZone, "EEE");
    minutesByDay.set(
      key,
      (minutesByDay.get(key) ?? 0) + session.elapsedMinutes
    );
  }

  const bestDay =
    [...minutesByDay.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  const lastFocusDate = stats?.lastFocusDate ?? null;

  // Fixed 7-day window (oldest first) so the bar chart always has 7 columns,
  // including days with no focus.
  const dailyMinutes: { label: string; minutes: number }[] = [];
  const today = startOfDay(newDate());
  const minutesByDayKey = new Map<string, number>();
  for (const session of completed) {
    const key = localDayKey(session.startedAt, timeZone);
    minutesByDayKey.set(
      key,
      (minutesByDayKey.get(key) ?? 0) + session.elapsedMinutes
    );
  }
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = addDays(today, -offset);
    const key = localDayKey(day, timeZone);
    dailyMinutes.push({
      label: formatInTimeZone(day, timeZone, "EEEEE"),
      minutes: minutesByDayKey.get(key) ?? 0,
    });
  }

  return {
    focusMinutes: completed.reduce(
      (total, session) => total + session.elapsedMinutes,
      0
    ),
    sessionsCompleted: completed.length,
    bestDay,
    dailyMinutes,
    estimateAccuracyPercent: Math.round(accuracy * 100),
    streakStatus: {
      current: stats?.currentStreak ?? 0,
      longest: stats?.longestStreak ?? 0,
      atRisk: lastFocusDate
        ? daysBetweenKeys(
            localDayKey(newDate(), timeZone),
            localDayKey(lastFocusDate, timeZone)
          ) === 1
        : false,
    },
  };
}
