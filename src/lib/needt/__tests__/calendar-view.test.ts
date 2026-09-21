import { newDate } from "@/lib/date-utils";

import {
  toCalendarEventEntries,
  toCalendarTaskEntries,
  type CalendarEventViewRow,
} from "../calendar-view";
import type { NeedtTaskRow } from "../task-view";

function taskRow(): NeedtTaskRow {
  return {
    id: "task-1",
    title: "Split launch review",
    status: "todo",
    scheduledStart: null,
    scheduledEnd: null,
    estimatedMinutes: 90,
    isFrozen: false,
    scheduleLocked: false,
    dueDate: null,
    project: null,
    parts: [],
    waits: [],
    activities: [],
    scheduledBlocks: [
      {
        id: "block-a",
        taskId: "task-1",
        userId: "user-1",
        start: newDate("2026-09-20T07:30:00.000Z"),
        end: newDate("2026-09-20T08:00:00.000Z"),
        chunkIndex: 0,
        chunkCount: 2,
        isFrozen: false,
        createdAt: newDate("2026-09-19T00:00:00.000Z"),
        updatedAt: newDate("2026-09-19T00:00:00.000Z"),
      },
      {
        id: "block-b",
        taskId: "task-1",
        userId: "user-1",
        start: newDate("2026-09-20T09:15:00.000Z"),
        end: newDate("2026-09-20T10:15:00.000Z"),
        chunkIndex: 1,
        chunkCount: 2,
        isFrozen: true,
        createdAt: newDate("2026-09-19T00:00:00.000Z"),
        updatedAt: newDate("2026-09-19T00:00:00.000Z"),
      },
    ],
  } as unknown as NeedtTaskRow;
}

function event(
  overrides: Partial<CalendarEventViewRow> = {}
): CalendarEventViewRow {
  return {
    id: "event-1",
    feedId: "feed-1",
    externalEventId: null,
    title: "Customer call",
    description: "Agenda",
    start: newDate("2026-09-20T09:30:00.000Z"),
    end: newDate("2026-09-20T10:15:00.000Z"),
    location: "Meet",
    isRecurring: false,
    recurrenceRule: null,
    allDay: false,
    status: "confirmed",
    isMaster: false,
    masterEventId: null,
    recurringEventId: null,
    feed: { name: "Work", color: "#336699" },
    ...overrides,
  };
}

describe("calendar production adapter", () => {
  it("fans split tasks out with exact minute placement and stable block ids", () => {
    const entries = toCalendarTaskEntries(
      taskRow(),
      newDate("2026-09-20T00:00:00.000Z"),
      "UTC"
    );

    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      id: "task:task-1:block-a",
      sourceId: "task-1",
      scheduledBlockId: "block-a",
      at: 7.5,
      est: 30,
      chunkIndex: 0,
      chunkCount: 2,
      movable: true,
    });
    expect(entries[1]).toMatchObject({
      id: "task:task-1:block-b",
      at: 9.25,
      est: 60,
      frozen: true,
      movable: false,
    });
  });

  it("maps own events without dropping calendar-owned details", () => {
    const [entry] = toCalendarEventEntries(
      [event()],
      newDate("2026-09-20T00:00:00.000Z"),
      newDate("2026-09-21T00:00:00.000Z"),
      "UTC"
    );

    expect(entry).toMatchObject({
      kind: "event",
      sourceId: "event-1",
      title: "Customer call",
      description: "Agenda",
      location: "Meet",
      calendarName: "Work",
      hue: "#336699",
      at: 9.5,
      est: 45,
      movable: false,
    });
  });

  it("keeps shared Busy opaque", () => {
    const [entry] = toCalendarEventEntries(
      [
        event({
          id: "workspace-busy:opaque",
          feedId: "workspace-busy",
          title: "Busy",
          description: null,
          location: null,
          feed: { name: "Busy", color: null },
        }),
      ],
      newDate("2026-09-20T00:00:00.000Z"),
      newDate("2026-09-21T00:00:00.000Z"),
      "UTC"
    );

    expect(entry).toMatchObject({
      kind: "busy",
      title: "Busy",
      description: undefined,
      location: undefined,
      movable: false,
    });
  });

  it("places each day of a multi-day all-day event without an hourly slot", () => {
    const entries = toCalendarEventEntries(
      [
        event({
          id: "all-day",
          allDay: true,
          start: newDate("2026-09-20T00:00:00.000Z"),
          end: newDate("2026-09-22T00:00:00.000Z"),
        }),
      ],
      newDate("2026-09-20T00:00:00.000Z"),
      newDate("2026-09-23T00:00:00.000Z"),
      "Europe/Zurich"
    );

    expect(entries.map((entry) => entry.scheduledOn)).toEqual([
      "2026-09-20",
      "2026-09-21",
    ]);
    expect(entries.every((entry) => entry.at === undefined)).toBe(true);
  });

  it("expands recurring masters and omits a replaced occurrence", () => {
    const master = event({
      id: "master",
      isRecurring: true,
      isMaster: true,
      recurrenceRule: "DTSTART:20260920T090000Z\nRRULE:FREQ=DAILY;COUNT=3",
      start: newDate("2026-09-20T09:00:00.000Z"),
      end: newDate("2026-09-20T09:30:00.000Z"),
    });
    const replacement = event({
      id: "replacement",
      masterEventId: "master",
      start: newDate("2026-09-21T09:00:00.000Z"),
      end: newDate("2026-09-21T10:00:00.000Z"),
    });
    const entries = toCalendarEventEntries(
      [master, replacement],
      newDate("2026-09-20T00:00:00.000Z"),
      newDate("2026-09-23T00:00:00.000Z"),
      "UTC"
    );

    expect(entries.map((entry) => entry.scheduledStart)).toEqual([
      "2026-09-20T09:00:00.000Z",
      "2026-09-21T09:00:00.000Z",
      "2026-09-22T09:00:00.000Z",
    ]);
    expect(entries.find((entry) => entry.sourceId === "replacement")?.est).toBe(60);
  });
});
