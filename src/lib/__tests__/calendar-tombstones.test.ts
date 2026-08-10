import { persistGoogleCalendarEvents } from "@/lib/calendar-db";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: { $transaction: jest.fn() },
}));

function event() {
  return {
    externalEventId: "external-1",
    title: "Planning",
    start: new Date("2026-08-09T09:00:00.000Z"),
    end: new Date("2026-08-09T10:00:00.000Z"),
    isRecurring: false,
    allDay: false,
  };
}

describe("calendar sync tombstones", () => {
  const tx = {
    calendarEvent: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .mocked(prisma.$transaction)
      .mockImplementation(async (callback) => callback(tx as never));
  });

  it("does not revive an archived provider event", async () => {
    tx.calendarEvent.findFirst.mockResolvedValue({
      id: "event-1",
      archivedAt: new Date("2026-08-09T08:00:00.000Z"),
    });

    await persistGoogleCalendarEvents({
      feedId: "feed-1",
      events: [event()],
    });

    expect(tx.calendarEvent.update).not.toHaveBeenCalled();
    expect(tx.calendarEvent.create).not.toHaveBeenCalled();
  });

  it("archives provider removals instead of deleting rows", async () => {
    await persistGoogleCalendarEvents({
      feedId: "feed-1",
      events: [],
      deletedExternalIds: ["external-1"],
    });

    expect(tx.calendarEvent.updateMany).toHaveBeenCalledWith({
      where: {
        feedId: "feed-1",
        archivedAt: null,
        externalEventId: { in: ["external-1"] },
      },
      data: { archivedAt: expect.any(Date) },
    });
  });
});
