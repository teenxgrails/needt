import { Prisma, ProactiveNudgeType } from "@prisma/client";

import { formatInTimeZone } from "@/lib/date-utils";
import { canUseAdvancedNudges } from "@/lib/entitlements";
import { prisma } from "@/lib/prisma";

type NudgeDraft = {
  taskId?: string;
  type: ProactiveNudgeType;
  timeWindow: string;
  title: string;
  body: string;
  deepLink: string;
};

function inQuietHours(
  now: Date,
  timeZone: string,
  start?: string | null,
  end?: string | null
) {
  if (!start || !end) return false;
  const time = formatInTimeZone(now, timeZone, "HH:mm");
  return start < end
    ? time >= start && time < end
    : time >= start || time < end;
}

export async function generateProactiveNudges(now = new Date()) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      userSettings: { select: { timeZone: true } },
      focusPreferences: {
        select: { quietHoursStart: true, quietHoursEnd: true },
      },
    },
  });
  let created = 0;
  for (const user of users) {
    const timeZone = user.userSettings?.timeZone || "UTC";
    if (
      inQuietHours(
        now,
        timeZone,
        user.focusPreferences?.quietHoursStart,
        user.focusPreferences?.quietHoursEnd
      )
    ) {
      continue;
    }
    const dayWindow = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
    const drafts: NudgeDraft[] = [];
    const latestOverflowRun = await prisma.schedulingRun.findFirst({
      where: {
        userId: user.id,
        finishedAt: { gte: new Date(now.getTime() - 24 * 60 * 60_000) },
        unscheduled: { not: Prisma.DbNull },
      },
      orderBy: { finishedAt: "desc" },
      select: { id: true, unscheduled: true },
    });
    if (
      latestOverflowRun &&
      Array.isArray(latestOverflowRun.unscheduled) &&
      latestOverflowRun.unscheduled.length > 0
    ) {
      drafts.push({
        type: ProactiveNudgeType.OVERBOOKED_DAY,
        timeWindow: dayWindow,
        title: "Your plan is over capacity",
        body: `${latestOverflowRun.unscheduled.length} task${latestOverflowRun.unscheduled.length === 1 ? "" : "s"} could not fit.`,
        deepLink: `/today?run=${latestOverflowRun.id}`,
      });
    }

    const entitlement = await canUseAdvancedNudges(user.id);
    if (entitlement.allowed) {
      const tasks = await prisma.task.findMany({
        where: {
          userId: user.id,
          isArchived: false,
          status: { not: "completed" },
          OR: [
            { deadline: { not: null } },
            { dueDate: { not: null } },
            { scheduledStart: { not: null } },
          ],
        },
        select: {
          id: true,
          title: true,
          deadline: true,
          dueDate: true,
          scheduledStart: true,
          scheduledEnd: true,
          estimatedMinutes: true,
          duration: true,
          focusSessions: {
            where: {
              startedAt: { gte: new Date(now.getTime() - 24 * 60 * 60_000) },
            },
            select: { id: true },
            take: 1,
          },
        },
        take: 250,
      });
      for (const task of tasks) {
        const deadline = task.deadline ?? task.dueDate;
        if (deadline && deadline < now) {
          drafts.push({
            taskId: task.id,
            type: ProactiveNudgeType.OVERDUE_TASK,
            timeWindow: dayWindow,
            title: "Task overdue",
            body: task.title,
            deepLink: `/today?task=${task.id}`,
          });
        } else if (
          deadline &&
          (task.estimatedMinutes ?? task.duration ?? 30) * 60_000 >
            deadline.getTime() - now.getTime()
        ) {
          drafts.push({
            taskId: task.id,
            type: ProactiveNudgeType.DEADLINE_UNREACHABLE,
            timeWindow: dayWindow,
            title: "Deadline at risk",
            body: `“${task.title}” needs more time than remains.`,
            deepLink: `/today?task=${task.id}`,
          });
        }
        if (
          task.scheduledStart &&
          task.scheduledStart < new Date(now.getTime() - 15 * 60_000) &&
          task.scheduledEnd &&
          task.scheduledEnd > new Date(now.getTime() - 24 * 60 * 60_000) &&
          task.focusSessions.length === 0
        ) {
          drafts.push({
            taskId: task.id,
            type: ProactiveNudgeType.MISSED_FOCUS,
            timeWindow: `${dayWindow}:${formatInTimeZone(task.scheduledStart, timeZone, "HH")}`,
            title: "Start the focus block?",
            body: task.title,
            deepLink: `/focus?task=${task.id}`,
          });
        }
      }
    }

    for (const draft of drafts) {
      const dedupeKey = [
        draft.taskId ?? "day",
        draft.type,
        draft.timeWindow,
      ].join(":");
      const result = await prisma.proactiveNudge.createMany({
        data: [{ userId: user.id, dedupeKey, ...draft }],
        skipDuplicates: true,
      });
      created += result.count;
    }
  }
  return { created };
}
