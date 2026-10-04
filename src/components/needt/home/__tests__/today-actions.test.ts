import { newDate, newDateFromYMD } from "@/lib/date-utils";
import type { NeedtTask } from "@/lib/needt/types";

import { TaskStatus } from "@/types/task";

import { moveTaskToDay, toggledTaskStatus } from "../today-actions";

const TODAY = newDateFromYMD(2026, 8, 19);

function task(partial: Partial<NeedtTask> = {}): NeedtTask {
  return { id: "task-1", title: "Task", done: false, ...partial };
}

describe("today production actions", () => {
  it("toggles an open task closed and a closed task back to todo", () => {
    expect(toggledTaskStatus(task())).toBe(TaskStatus.COMPLETED);
    expect(toggledTaskStatus(task({ done: true }))).toBe(TaskStatus.TODO);
  });

  it("moves an overdue deadline to today", () => {
    const update = moveTaskToDay(task({ due: "18 Sep" }), TODAY);
    expect(update?.dueDate).toEqual(TODAY);
  });

  it("moves a scheduled block while preserving its time and duration", () => {
    const update = moveTaskToDay(
      task({
        scheduledOn: "2026-09-18",
        scheduledStart: "2026-09-18T09:30:00.000Z",
        scheduledEnd: "2026-09-18T10:15:00.000Z",
      }),
      TODAY
    );
    const movedStart = update?.scheduledStart;
    expect(movedStart?.getFullYear()).toBe(2026);
    expect(movedStart?.getMonth()).toBe(8);
    expect(movedStart?.getDate()).toBe(19);
    expect(movedStart?.getHours()).toBe(
      newDate("2026-09-18T09:30:00.000Z").getHours()
    );
    expect(update?.scheduledEnd?.getTime()).toBe(
      movedStart!.getTime() + 45 * 60 * 1000
    );
  });

  it("does not pretend it can move an incomplete scheduled placement", () => {
    expect(
      moveTaskToDay(
        task({ scheduledOn: "2026-09-18", scheduledStart: "bad" }),
        TODAY
      )
    ).toBeNull();
  });
});
