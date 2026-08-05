import { ProjectRelativeDateAnchor } from "@prisma/client";

import { newDate, toLocalDateKey } from "@/lib/date-utils";
import { deriveProjectBlockerDependencies } from "@/lib/projects/blockers";
import { buildProjectGanttRange, ganttBarMetrics } from "@/lib/projects/gantt";
import { deriveProjectProgress } from "@/lib/projects/progress";
import { resolveProjectRelativeDate } from "@/lib/projects/relative-dates";

describe("project workflow calculations", () => {
  it("derives progress from non-archived tasks", () => {
    expect(
      deriveProjectProgress([
        { status: "completed" },
        { status: "in_progress" },
        { status: "completed", isArchived: true },
      ])
    ).toEqual({ completed: 1, total: 2, progress: 50 });
    expect(deriveProjectProgress([])).toEqual({
      completed: 0,
      total: 0,
      progress: 0,
    });
  });

  it("resolves signed task offsets from stage boundaries", () => {
    const stage = {
      startDate: newDate("2026-08-10T00:00:00.000Z"),
      deadline: newDate("2026-08-20T00:00:00.000Z"),
    };
    expect(
      resolveProjectRelativeDate(
        stage,
        ProjectRelativeDateAnchor.STAGE_START,
        3
      )?.toISOString()
    ).toBe("2026-08-13T00:00:00.000Z");
    expect(
      resolveProjectRelativeDate(
        stage,
        ProjectRelativeDateAnchor.STAGE_DEADLINE,
        -2
      )?.toISOString()
    ).toBe("2026-08-18T00:00:00.000Z");
  });

  it("keeps external blockers pending and clears completed task blockers", () => {
    expect(
      deriveProjectBlockerDependencies([
        { id: "external", blockerTask: null },
        { id: "done", blockerTask: { status: "completed" } },
      ])
    ).toEqual({
      dependencyIds: ["project-blocker:external", "project-blocker:done"],
      completedDependencyIds: ["project-blocker:done"],
    });
  });

  it("builds bounded Gantt ranges and day-aligned bars", () => {
    const range = buildProjectGanttRange({
      project: {
        startDate: "2026-08-10T00:00:00.000Z",
        deadline: "2026-08-20T00:00:00.000Z",
      },
      stages: [],
      tasks: [],
      today: newDate("2026-08-12T00:00:00.000Z"),
    });
    expect(toLocalDateKey(range.start)).toBe("2026-08-08");
    expect(toLocalDateKey(range.end)).toBe("2026-08-28");
    expect(range.days).toHaveLength(21);
    expect(
      ganttBarMetrics(
        {
          startDate: "2026-08-10T00:00:00.000Z",
          deadline: "2026-08-12T00:00:00.000Z",
        },
        range.start,
        40
      )
    ).toEqual({ left: 80, width: 120 });
  });
});
