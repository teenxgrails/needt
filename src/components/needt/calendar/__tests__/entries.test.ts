import { newDateFromYMD } from "@/lib/date-utils";

import { entriesOnDay, type CalendarEntry } from "../entries";

describe("calendar entry dates", () => {
  const today = newDateFromYMD(2026, 8, 20);

  it("places a scheduled task on its block day instead of its due day", () => {
    const entry: CalendarEntry = {
      id: "task:block",
      sourceId: "task",
      kind: "task",
      title: "Prepare review",
      done: false,
      due: "22 Sep",
      dueOn: "2026-09-22",
      scheduledOn: "2026-09-21",
      at: 9.5,
    };

    expect(entriesOnDay([entry], newDateFromYMD(2026, 8, 21), today)).toEqual([
      entry,
    ]);
    expect(
      entriesOnDay([entry], newDateFromYMD(2026, 8, 22), today)
    ).toEqual([]);
  });
});
