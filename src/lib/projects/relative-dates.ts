import { ProjectRelativeDateAnchor } from "@prisma/client";

import { addCalendarDays } from "@/lib/date-utils";

export interface ProjectStageDates {
  startDate: Date | null;
  deadline: Date | null;
}

export function resolveProjectRelativeDate(
  stage: ProjectStageDates | null,
  anchor: ProjectRelativeDateAnchor | null,
  offsetDays: number | null
) {
  if (!stage || anchor === null || offsetDays === null) return null;
  const boundary =
    anchor === ProjectRelativeDateAnchor.STAGE_START
      ? stage.startDate
      : stage.deadline;
  return boundary ? addCalendarDays(boundary, offsetDays) : null;
}
