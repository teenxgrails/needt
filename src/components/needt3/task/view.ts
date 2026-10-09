import {
  type ProjectLike,
  cvDur,
  dueLabel,
  hhmm,
  hourOf,
  project,
} from "@/lib/needt3/derive";
import type { V3Task } from "@/lib/needt3/map";
import type { NeedtCalendarEntry, NeedtTask } from "@/lib/needt/types";

/** Existing NeedtTask with the fields supplied by the v3 data adapter. */
export interface TaskData extends NeedtTask {
  projectId?: V3Task["projectId"];
  dueDate?: V3Task["dueDate"];
  estimatedMinutes?: V3Task["estimatedMinutes"];
  isFixed?: V3Task["isFixed"];
  source?: V3Task["source"];
  event?: NeedtCalendarEntry["event"];
  calendarName?: NeedtCalendarEntry["calendarName"];
}

export function taskView(
  task: TaskData,
  projects: readonly ProjectLike[] = []
) {
  const at = task.scheduledStart
    ? hourOf(task.scheduledStart)
    : (task.at ?? null);
  const minutes = task.estimatedMinutes ?? task.est ?? null;
  const len = minutes || 30;
  const p = task.event
    ? null
    : project(
        task.projectId !== undefined ? task.projectId : task.project,
        projects
      );
  const parts = task.parts;
  const done = parts?.filter((part) => part.done).length ?? 0;
  const due = task.dueDate !== undefined ? dueLabel(task) : (task.due ?? null);
  return {
    id: task.id,
    title: task.title,
    done: task.done,
    event: !!task.event,
    calendarName: task.calendarName ?? "Calendar",
    at,
    time: hhmm(at),
    len,
    minutes,
    range: at == null ? null : `${hhmm(at)}–${hhmm(at + len / 60)}`,
    dur: minutes
      ? minutes < 60
        ? `${minutes} min`
        : `${Math.floor(minutes / 60)} h${minutes % 60 ? ` ${minutes % 60}` : ""}`
      : "",
    durLong: cvDur(len),
    due,
    overdue: !!task.overdue,
    lateTitle: due ? `Overdue — was due ${due}` : undefined,
    projectName: p?.name ?? null,
    hue: p?.color ?? null,
    parts: parts?.length ? { done, total: parts.length } : null,
    value: task.value || null,
    entry: task.entry || null,
    source: task.source ?? null,
  };
}

export type TaskView = ReturnType<typeof taskView>;
