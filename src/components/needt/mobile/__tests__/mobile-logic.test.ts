import { newDateFromYMD } from "@/lib/date-utils";
import type { NeedtProject, NeedtTask } from "@/lib/needt/types";

import {
  AUTH_BUTTON_HEIGHT,
  COMPOSER_HIT_SIZE,
  DAY_STRIP_CELL,
  FAB_SIZE,
  HABIT_CHIP_HEIGHT,
  HEADER_BUTTON_SIZE,
  MOBILE_TAP_MIN,
  MOBILE_TABS,
  QUEUE_BUTTON_HEIGHT,
  SETTINGS_ROW_MIN_HEIGHT,
  TAB_ITEM_HEIGHT,
  TASK_SHEET_ROW_HEIGHT,
  meetsTapMin,
  mobileDayLists,
  mobileDayStrip,
  mobileDueOffset,
  mobileDueTodayCount,
  mobileDuration,
  mobileGroupByProject,
  mobileQueue,
  mobileQueueMinutes,
} from "../mobile-logic";

const NOW = newDateFromYMD(2026, 8, 1); // Tuesday, 1 Sep 2026 — the fixture's own "today"

function task(partial: Partial<NeedtTask> & Pick<NeedtTask, "id">): NeedtTask {
  return { title: `Task ${partial.id}`, done: false, ...partial };
}

/* ── Tap sizes — the phone's own binding constant ────────────────────────
   Every named control size in this module has to clear the phone's 44px
   floor; a control this port draws smaller than that is a defect, not a
   style choice. `.co-go` is the one deliberate exception, and it is not a
   constant this module owns — see MobileComposer.tsx's own file header. */
describe("every named tap size clears the 44px floor", () => {
  it.each([
    ["HEADER_BUTTON_SIZE", HEADER_BUTTON_SIZE],
    ["HABIT_CHIP_HEIGHT", HABIT_CHIP_HEIGHT],
    ["TAB_ITEM_HEIGHT", TAB_ITEM_HEIGHT],
    ["FAB_SIZE", FAB_SIZE],
    ["QUEUE_BUTTON_HEIGHT", QUEUE_BUTTON_HEIGHT],
    ["COMPOSER_HIT_SIZE", COMPOSER_HIT_SIZE],
    ["SETTINGS_ROW_MIN_HEIGHT", SETTINGS_ROW_MIN_HEIGHT],
    ["TASK_SHEET_ROW_HEIGHT", TASK_SHEET_ROW_HEIGHT],
    ["AUTH_BUTTON_HEIGHT", AUTH_BUTTON_HEIGHT],
    ["DAY_STRIP_CELL.height", DAY_STRIP_CELL.height],
    ["DAY_STRIP_CELL.width", DAY_STRIP_CELL.width],
  ])("%s >= %d", (_name, size) => {
    expect(size).toBeGreaterThanOrEqual(MOBILE_TAP_MIN);
  });
});

describe("meetsTapMin", () => {
  it("accepts a control fixed at or above the floor on both axes", () => {
    expect(meetsTapMin({ width: 44, height: 44 })).toBe(true);
    expect(meetsTapMin({ width: 56, height: 56 })).toBe(true);
  });

  it("rejects a control fixed under the floor on either axis", () => {
    expect(meetsTapMin({ width: 32, height: 44 })).toBe(false);
    expect(meetsTapMin({ width: 44, height: 32 })).toBe(false);
  });

  it("treats an unfixed (flex) axis as satisfied", () => {
    expect(meetsTapMin({ height: 44 })).toBe(true);
  });
});

describe("mobileDuration", () => {
  it("is empty for nothing waiting", () => {
    expect(mobileDuration(0)).toBe("");
    expect(mobileDuration(null)).toBe("");
    expect(mobileDuration(undefined)).toBe("");
  });

  it("states minutes under an hour", () => {
    expect(mobileDuration(45)).toBe("45 min");
  });

  it("states hours, and hours plus minutes", () => {
    expect(mobileDuration(60)).toBe("1 h");
    expect(mobileDuration(90)).toBe("1 h 30 min");
  });
});

describe("mobileDueOffset", () => {
  it("is 0 for a task due today", () => {
    expect(mobileDueOffset(task({ id: 1, due: "1 Sep" }), NOW)).toBe(0);
  });

  it("is positive for a task due later", () => {
    expect(mobileDueOffset(task({ id: 2, due: "4 Sep" }), NOW)).toBe(3);
  });

  it("is null for a task with no due date", () => {
    expect(mobileDueOffset(task({ id: 3 }), NOW)).toBeNull();
  });
});

describe("mobileDayLists", () => {
  it("splits overdue from due-today, and excludes done and noSlot tasks", () => {
    const tasks: NeedtTask[] = [
      task({ id: 1, due: "31 Aug" }), // overdue
      task({ id: 2, due: "1 Sep" }), // today
      task({ id: 3, due: "31 Aug", done: true }), // closed — excluded
      task({ id: 4, due: "1 Sep", noSlot: true }), // no slot — excluded
      task({ id: 5, due: "4 Sep" }), // neither list
    ];
    const { debt, today } = mobileDayLists(tasks, NOW);
    expect(debt.map((t) => t.id)).toEqual([1]);
    expect(today.map((t) => t.id)).toEqual([2]);
  });
});

describe("mobileDueTodayCount", () => {
  it("is 0 on a clear day — a dot that is always lit is not a signal", () => {
    expect(mobileDueTodayCount([task({ id: 1, due: "4 Sep" })], NOW)).toBe(0);
  });

  it("counts overdue plus due-today together", () => {
    const tasks = [task({ id: 1, due: "31 Aug" }), task({ id: 2, due: "1 Sep" })];
    expect(mobileDueTodayCount(tasks, NOW)).toBe(2);
  });
});

describe("mobileQueue", () => {
  it("excludes done, already-timed, and noSlot tasks", () => {
    const tasks: NeedtTask[] = [
      task({ id: 1 }),
      task({ id: 2, time: "09:00" }),
      task({ id: 3, done: true }),
      task({ id: 4, noSlot: true }),
    ];
    expect(mobileQueue(tasks).map((t) => t.id)).toEqual([1]);
  });

  it("sums the queue's own minutes", () => {
    const tasks: NeedtTask[] = [task({ id: 1, est: 20 }), task({ id: 2, est: 25 })];
    expect(mobileQueueMinutes(tasks)).toBe(45);
  });
});

describe("mobileGroupByProject", () => {
  const projects: readonly NeedtProject[] = [
    { id: "ops", name: "Operations", hue: "#FF7A45", glyph: "briefcase" },
    { id: "ds", name: "Design system", hue: "#4C8DFF", glyph: "component" },
  ];

  it("groups in registry order, with an unresolved bucket last", () => {
    const tasks: NeedtTask[] = [
      task({ id: 1, project: "Design system" }),
      task({ id: 2, project: null }),
      task({ id: 3, project: "Operations" }),
    ];
    const groups = mobileGroupByProject(tasks, projects);
    expect(groups.map((g) => g.name)).toEqual(["Operations", "Design system", "No project"]);
  });

  it("sums each group's task value", () => {
    const tasks: NeedtTask[] = [
      task({ id: 1, project: "Operations", value: 100 }),
      task({ id: 2, project: "Operations", value: 50 }),
    ];
    const groups = mobileGroupByProject(tasks, projects);
    expect(groups[0]?.value).toBe(150);
  });

  it("leaves an empty registry bucket out entirely", () => {
    const tasks: NeedtTask[] = [task({ id: 1, project: "Operations" })];
    const groups = mobileGroupByProject(tasks, projects);
    expect(groups.map((g) => g.key)).toEqual(["ops"]);
  });
});

describe("mobileDayStrip", () => {
  it("runs two days back, four ahead, with today somewhere in the middle", () => {
    const days = mobileDayStrip(NOW);
    expect(days).toHaveLength(7);
    expect(days.filter((d) => d.isToday)).toHaveLength(1);
    expect(days[2]?.isToday).toBe(true);
    expect(days[0]?.dayOfMonth).toBe(30); // two days before 1 Sep is 30 Aug
    expect(days[6]?.dayOfMonth).toBe(5); // four days after 1 Sep is 5 Sep
  });
});

describe("MOBILE_TABS", () => {
  it("is the fixed four — no fifth tab", () => {
    expect(MOBILE_TABS.map((t) => t.id)).toEqual(["home", "calendar", "workspace", "docs"]);
  });
});
