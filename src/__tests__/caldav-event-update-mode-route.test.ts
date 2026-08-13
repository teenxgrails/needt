import { NextRequest } from "next/server";

import * as route from "@/app/api/calendar/caldav/events/route";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getEvent, validateEvent } from "@/lib/calendar-db";
import { CalDAVCalendarService } from "@/lib/caldav-calendar";
import { prisma } from "@/lib/prisma";

const updateEvent = jest.fn();
const deleteEvent = jest.fn();

jest.mock("@/lib/auth/api-auth", () => ({
  authenticateRequest: jest.fn(),
}));
jest.mock("@/lib/calendar-db", () => ({
  getEvent: jest.fn(),
  validateEvent: jest.fn(),
}));
jest.mock("@/lib/caldav-calendar", () => ({
  CalDAVCalendarService: jest
    .fn()
    .mockImplementation(() => ({ updateEvent, deleteEvent })),
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), info: jest.fn() },
}));
jest.mock("@/lib/prisma", () => ({
  prisma: { connectedAccount: { findUnique: jest.fn() } },
}));

describe("CalDAV event update route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({ userId: "user-1" });
    jest.mocked(getEvent).mockResolvedValue({
      id: "event-1",
      feedId: "feed-1",
      feed: { userId: "user-1" },
    } as never);
    jest.mocked(validateEvent).mockResolvedValue({
      id: "event-1",
      feedId: "feed-1",
      feed: {
        url: "https://dav.example.com/calendar/",
        accountId: "account-1",
      },
      externalEventId: "series-1_20260813T090000Z",
      title: "Planning",
      start: new Date("2026-08-13T09:00:00.000Z"),
      end: new Date("2026-08-13T09:30:00.000Z"),
      allDay: false,
      isRecurring: true,
      recurrenceRule: "FREQ=WEEKLY",
    } as never);
    (prisma.connectedAccount.findUnique as jest.Mock).mockResolvedValue({
      id: "account-1",
    });
    updateEvent.mockResolvedValue({ id: "event-1" });
  });

  it("passes single occurrence mode to the CalDAV service", async () => {
    const response = await route.PUT(
      new NextRequest("http://localhost/api/calendar/caldav/events", {
        method: "PUT",
        body: JSON.stringify({
          eventId: "event-1",
          mode: "single",
          title: "Rescheduled planning",
        }),
      })
    );
    if (!response) throw new Error("Expected a response");

    expect(response.status).toBe(200);
    expect(updateEvent).toHaveBeenCalledWith(
      expect.anything(),
      "https://dav.example.com/calendar/",
      "series-1_20260813T090000Z",
      expect.objectContaining({ title: "Rescheduled planning" }),
      "single",
      "user-1"
    );
  });

  it("rejects an invalid occurrence mode", async () => {
    const response = await route.PUT(
      new NextRequest("http://localhost/api/calendar/caldav/events", {
        method: "PUT",
        body: JSON.stringify({ eventId: "event-1", mode: "future" }),
      })
    );
    if (!response) throw new Error("Expected a response");

    expect(response.status).toBe(400);
    expect(CalDAVCalendarService).not.toHaveBeenCalled();
  });

  it("rejects an invalid delete mode before resolving the event", async () => {
    const response = await route.DELETE(
      new NextRequest("http://localhost/api/calendar/caldav/events", {
        method: "DELETE",
        body: JSON.stringify({ eventId: "event-1", mode: "future" }),
      })
    );
    if (!response) throw new Error("Expected a response");

    expect(response.status).toBe(400);
    expect(getEvent).not.toHaveBeenCalled();
    expect(CalDAVCalendarService).not.toHaveBeenCalled();
  });
});
