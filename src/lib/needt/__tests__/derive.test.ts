import { newDateFromYMD } from "@/lib/date-utils";

import {
  ageInDays,
  blockerOf,
  blocking,
  clearUnblocksCache,
  dateLabel,
  isOverdue,
  parseDueDate,
  person,
  project,
  shiftWeek,
  streak,
  unblocks,
} from "../derive";
import {
  NEEDT,
  closedDays,
  tasks as fixtureTasks,
  people,
  projects,
} from "../fixture";
import type { NeedtDayMark, NeedtTask } from "../types";

const task = (over: Partial<NeedtTask> & { id: number }): NeedtTask => ({
  title: `Task ${over.id}`,
  done: false,
  ...over,
});

describe("blockerOf", () => {
  it("prefers a task blocker over a person blocker", () => {
    const blocker = task({ id: 1 });
    const waiting = task({
      id: 2,
      blockedBy: 1,
      waitsOn: { on: "anna", for: "the legal sign-off" },
    });

    expect(blockerOf(waiting, [blocker, waiting])).toEqual({
      kind: "task",
      task: blocker,
    });
  });

  it("ignores a blocker that is already done and falls through to the person", () => {
    const blocker = task({ id: 1, done: true });
    const waiting = task({
      id: 2,
      blockedBy: 1,
      waitsOn: { on: "anna", for: "the legal sign-off" },
    });

    expect(blockerOf(waiting, [blocker, waiting])).toEqual({
      kind: "person",
      on: "anna",
      for: "the legal sign-off",
    });
  });

  it("reports nothing when the only blocker is done", () => {
    const blocker = task({ id: 1, done: true });
    const waiting = task({ id: 2, blockedBy: 1 });

    expect(blockerOf(waiting, [blocker, waiting])).toBeNull();
  });

  it("returns null honestly when nothing is in the way", () => {
    const lone = task({ id: 1 });
    expect(blockerOf(lone, [lone])).toBeNull();
  });

  it("returns null when the blocking task is not in the list", () => {
    const orphan = task({ id: 2, blockedBy: 99 });
    expect(blockerOf(orphan, [orphan])).toBeNull();
  });
});

describe("unblocks", () => {
  beforeEach(() => {
    clearUnblocksCache();
  });

  it("counts a multi-step chain transitively", () => {
    // 1 ← 2 ← 3 ← 4, plus 5 hanging off 2 as a second branch.
    const list = [
      task({ id: 1 }),
      task({ id: 2, blockedBy: 1 }),
      task({ id: 3, blockedBy: 2 }),
      task({ id: 4, blockedBy: 3 }),
      task({ id: 5, blockedBy: 2 }),
    ];

    expect(unblocks(list[0], list)).toBe(4);
    expect(unblocks(list[1], list)).toBe(3);
    expect(unblocks(list[2], list)).toBe(1);
    expect(unblocks(list[3], list)).toBe(0);
  });

  it("does not count done tasks, or anything behind them", () => {
    const list = [
      task({ id: 1 }),
      task({ id: 2, blockedBy: 1, done: true }),
      task({ id: 3, blockedBy: 2 }),
    ];

    expect(unblocks(list[0], list)).toBe(0);
  });

  it("terminates on a cycle, counting each task in it once", () => {
    // Malformed data: 1 waits on 2 and 2 waits on 1. The walk stops (each id
    // is counted once) rather than spinning; a task inside the cycle is
    // reached by the walk and so counts itself, which is the prototype's
    // behaviour and is only reachable from data that can never resolve.
    const list = [task({ id: 1, blockedBy: 2 }), task({ id: 2, blockedBy: 1 })];

    expect(unblocks(list[0], list)).toBe(2);
  });

  it("returns the cached result for the same list and task", () => {
    const list = [task({ id: 1 }), task({ id: 2, blockedBy: 1 })];

    expect(unblocks(list[0], list)).toBe(1);

    // Mutating in place is the one change the cache cannot see; a cached
    // answer proves the second call did not walk the list again.
    list[1].blockedBy = undefined;
    expect(unblocks(list[0], list)).toBe(1);

    // …and clearing the cache makes it recompute from what is there now.
    clearUnblocksCache();
    expect(unblocks(list[0], list)).toBe(0);
  });

  it("recomputes for a new array, the way a React update hands one over", () => {
    const list = [task({ id: 1 }), task({ id: 2, blockedBy: 1 })];
    expect(unblocks(list[0], list)).toBe(1);

    const next = [list[0], task({ id: 2 })];
    expect(unblocks(next[0], next)).toBe(0);
  });

  it("agrees with the fixture's own chain", () => {
    // 6 ← 1 ← 22, so collecting the numbers unblocks two tasks.
    expect(unblocks(fixtureTasks[18], fixtureTasks)).toBe(2);
  });
});

describe("blocking", () => {
  it("counts open tasks per person, skipping done ones", () => {
    const list = [
      task({ id: 1, waitsOn: { on: "anna", for: "sign-off" } }),
      task({ id: 2, waitsOn: { on: "anna", for: "the numbers" } }),
      task({ id: 3, waitsOn: { on: "tom", for: "the files" } }),
      task({ id: 4, done: true, waitsOn: { on: "tom", for: "the quote" } }),
    ];

    expect(blocking(list)).toEqual({ anna: 2, tom: 1 });
  });

  it("reads the fixture", () => {
    expect(blocking(fixtureTasks)).toEqual({ anna: 1, tom: 1 });
  });
});

describe("streak", () => {
  it("excludes today, because today has not been judged yet", () => {
    // Today is a miss, yesterday and the two before it were kept.
    expect(streak([1, 1, 1, 0] as NeedtDayMark[])).toBe(3);
  });

  it("does not count today even when today is closed", () => {
    expect(streak([0, 1, 1, 1] as NeedtDayMark[])).toBe(2);
  });

  it("stops at the first break walking back", () => {
    expect(streak([1, 1, 0, 1, 1, 1] as NeedtDayMark[])).toBe(2);
  });

  it("is zero when yesterday was missed", () => {
    expect(streak([1, 1, 1, 0, 1] as NeedtDayMark[])).toBe(0);
  });

  it("reads the fixture: three kept days behind an open today", () => {
    expect(streak(closedDays)).toBe(3);
  });
});

describe("project", () => {
  it("resolves by id, by name and by alias", () => {
    expect(project("german", projects)?.id).toBe("german");
    expect(project("German", projects)?.id).toBe("german");
    expect(project("de", projects)?.id).toBe("german");
    expect(project("personal", projects)?.id).toBe("life");
  });

  it("returns null for an unknown ref rather than falling back", () => {
    // The fallback this replaces is how a habit wore Operations' orange.
    expect(project("nope", projects)).toBeNull();
    expect(project(null, projects)).toBeNull();
    expect(project(undefined, projects)).toBeNull();
    expect(project("", projects)).toBeNull();
  });

  it("returns null when an alias points at a project that is gone", () => {
    const withoutGerman = projects.filter((p) => p.id !== "german");
    expect(project("de", withoutGerman)).toBeNull();
  });
});

describe("person", () => {
  it("resolves by id", () => {
    expect(person("anna", people)?.name).toBe("Anna");
  });

  it("falls back to you, the way every avatar in the prototype assumes", () => {
    expect(person(undefined, people)?.id).toBe("you");
    expect(person("ghost", people)?.id).toBe("you");
  });

  it("returns null when there is no you to fall back to", () => {
    expect(
      person(
        "ghost",
        people.filter((p) => p.id !== "you")
      )
    ).toBeNull();
  });
});

describe("dates", () => {
  const now = NEEDT.today; // 1 Sep 2026

  it("parses a day label against the reference year", () => {
    expect(parseDueDate("4 Sep", now)).toEqual(newDateFromYMD(2026, 8, 4));
    expect(parseDueDate("31 Aug", now)).toEqual(newDateFromYMD(2026, 7, 31));
  });

  it("picks the nearest year for a label across the boundary", () => {
    const newYear = newDateFromYMD(2027, 0, 1);
    expect(parseDueDate("31 Dec", newYear)).toEqual(
      newDateFromYMD(2026, 11, 31)
    );
  });

  it("returns null for an absent or unreadable label", () => {
    expect(parseDueDate(undefined, now)).toBeNull();
    expect(parseDueDate("Fri", now)).toBeNull();
    expect(parseDueDate("4 Xyz", now)).toBeNull();
  });

  it("calls a passed deadline overdue and today's deadline not", () => {
    expect(isOverdue(task({ id: 1, due: "31 Aug" }), now)).toBe(true);
    expect(isOverdue(task({ id: 2, due: "1 Sep" }), now)).toBe(false);
    expect(isOverdue(task({ id: 3, due: "4 Sep" }), now)).toBe(false);
  });

  it("never calls a done task overdue", () => {
    expect(isOverdue(task({ id: 1, due: "31 Aug", done: true }), now)).toBe(
      false
    );
  });

  it("agrees with the fixture's authored overdue flag", () => {
    const invoices = fixtureTasks.find((t) => t.id === 2);
    expect(invoices?.overdue).toBe(true);
    expect(isOverdue(invoices as NeedtTask, now)).toBe(true);
  });

  it("reports age from the record, then from a passed deadline", () => {
    expect(ageInDays(task({ id: 1, age: 34 }), now)).toBe(34);
    expect(ageInDays(task({ id: 2, due: "25 Aug" }), now)).toBe(7);
    expect(ageInDays(task({ id: 3, due: "4 Sep" }), now)).toBe(0);
    expect(ageInDays(task({ id: 4 }), now)).toBe(0);
  });

  it("spells one day label", () => {
    expect(dateLabel(now)).toBe("1 Sep");
  });

  it("shifts to the Monday of a week", () => {
    // 1 Sep 2026 is a Tuesday; its Monday is 31 Aug.
    expect(shiftWeek(0, now)).toEqual(newDateFromYMD(2026, 7, 31));
    expect(shiftWeek(1, now)).toEqual(newDateFromYMD(2026, 8, 7));
    expect(shiftWeek(-1, now)).toEqual(newDateFromYMD(2026, 7, 24));
  });
});

describe("the fixture keeps the contract's shape", () => {
  it("carries the seed the design was built against", () => {
    expect(fixtureTasks).toHaveLength(26);
    expect(projects).toHaveLength(5);
    expect(people).toHaveLength(4);
    expect(NEEDT.stages).toHaveLength(4);
    expect(NEEDT.habits).toHaveLength(4);
    expect(closedDays).toHaveLength(14);
    NEEDT.habits.forEach((habit) => expect(habit.done).toHaveLength(14));
  });

  it("is frozen, so no screen can edit the facts under another one", () => {
    expect(Object.isFrozen(NEEDT)).toBe(true);
    expect(Object.isFrozen(fixtureTasks)).toBe(true);
    expect(Object.isFrozen(projects)).toBe(true);
  });
});
