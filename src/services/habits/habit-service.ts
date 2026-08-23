import type { WorkspaceAccess } from "@/lib/auth/workspace-auth";
import { workspaceDataScopeWhere } from "@/lib/auth/workspace-auth";
import {
  addCalendarDays,
  format,
  fromZonedTime,
  newDate,
  startOfWeek,
  toZonedTime,
} from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";
import { scheduleAllTasksForUserDetailed } from "@/services/scheduling/TaskSchedulingService";

export async function materializeHabitWeek(
  userId: string,
  workspace: WorkspaceAccess,
  habitId: string
) {
  const habit = await prisma.habit.findFirst({
    where: {
      id: habitId,
      ...workspaceDataScopeWhere(workspace, userId),
      userId,
      archivedAt: null,
      isActive: true,
    },
  });
  if (!habit) return null;
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { timeZone: true, weekStartDay: true },
  });
  const timeZone = settings?.timeZone || "UTC";
  const weekStartsOn = settings?.weekStartDay === "sunday" ? 0 : 1;
  const zonedNow = toZonedTime(newDate(), timeZone);
  const weekStart = startOfWeek(zonedNow, { weekStartsOn });
  const allowedDays = new Set(
    habit.daysOfWeek.length ? habit.daysOfWeek : [0, 1, 2, 3, 4, 5, 6]
  );
  const occurrences = Array.from({ length: 7 }, (_, offset) =>
    addCalendarDays(weekStart, offset)
  )
    .filter((day) => allowedDays.has(day.getDay()))
    .slice(0, habit.targetOccurrencesPerWeek)
    .map((day) => {
      const key = format(day, "yyyy-MM-dd");
      return {
        start: fromZonedTime(`${key}T00:00:00`, timeZone),
        deadline: fromZonedTime(
          `${format(addCalendarDays(day, 1), "yyyy-MM-dd")}T00:00:00`,
          timeZone
        ),
      };
    });

  await prisma.task.createMany({
    data: occurrences.map((occurrence) => ({
      title: habit.title,
      description: habit.description,
      status: "todo",
      duration: habit.estimatedMinutes,
      estimatedMinutes: habit.estimatedMinutes,
      energyRequired: habit.energyRequired,
      priorityLevel: habit.priority,
      userId,
      workspaceId: workspace.workspaceId,
      assigneeId: userId,
      scheduleId: habit.scheduleId,
      availableFrom: occurrence.start,
      deadline: occurrence.deadline,
      autoScheduled: true,
      isAutoScheduled: true,
      habitId: habit.id,
      habitOccurrenceAt: occurrence.start,
    })),
    skipDuplicates: true,
  });
  const result = await scheduleAllTasksForUserDetailed(userId, {
    workspaceId: workspace.workspaceId,
  });
  return {
    habitId,
    occurrences: occurrences.map((occurrence) => occurrence.start.toISOString()),
    unscheduled: result.scheduleResult.unscheduled,
  };
}
