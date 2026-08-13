import { NextRequest } from "next/server";

import * as route from "@/app/api/calendar/outlook/events/route";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getOutlookClient, createOutlookEvent } from "@/lib/outlook-calendar";
import { syncOutlookCalendar } from "@/lib/outlook-sync";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/api-auth", () => ({
  authenticateRequest: jest.fn(),
}));
jest.mock("@/lib/outlook-calendar", () => ({
  createOutlookEvent: jest.fn(),
  deleteOutlookEvent: jest.fn(),
  getOutlookClient: jest.fn(),
  updateOutlookEvent: jest.fn(),
}));
jest.mock("@/lib/outlook-sync", () => ({
  syncOutlookCalendar: jest.fn(),
}));
jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), warn: jest.fn() },
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    calendarFeed: { findUnique: jest.fn() },
    calendarEvent: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as unknown as {
  calendarFeed: { findUnique: jest.Mock };
  calendarEvent: {
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
};

function request() {
  return new NextRequest("http://localhost/api/calendar/outlook/events", {
    method: "POST",
    body: JSON.stringify({
      feedId: "feed-1",
      title: "Review planning",
      start: "2026-08-13T09:00:00.000Z",
      end: "2026-08-13T09:30:00.000Z",
    }),
  });
}

describe("Outlook calendar event creation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({ userId: "user-1" });
    mockPrisma.calendarFeed.findUnique.mockResolvedValue({
      id: "feed-1",
      type: "OUTLOOK",
      url: "calendar-1",
      accountId: "account-1",
    });
    jest.mocked(createOutlookEvent).mockResolvedValue({ id: "graph-1" });
    mockPrisma.calendarEvent.findFirst.mockResolvedValue(null);
    mockPrisma.calendarEvent.create.mockResolvedValue({
      id: "local-1",
      externalEventId: "graph-1",
      syncStatus: "PENDING",
    });
    jest.mocked(getOutlookClient).mockResolvedValue({} as never);
  });

  it("persists the event as pending and returns it when refresh sync fails", async () => {
    jest.mocked(syncOutlookCalendar).mockRejectedValue(new Error("Graph slow"));

    const response = await route.POST(request());
    if (!response) throw new Error("Expected a response");

    expect(response.status).toBe(202);
    expect(mockPrisma.calendarEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        feedId: "feed-1",
        externalEventId: "graph-1",
        syncStatus: "PENDING",
      }),
    });
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ id: "local-1", syncStatus: "PENDING" })
    );
  });

  it("returns the synchronized local event after refresh succeeds", async () => {
    const synchronizedEvent = {
      id: "local-1",
      externalEventId: "graph-1",
      syncStatus: "SYNCED",
    };
    jest.mocked(syncOutlookCalendar).mockResolvedValue({
      processedEventIds: new Set(),
      nextSyncToken: undefined,
    });
    mockPrisma.calendarEvent.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(synchronizedEvent);

    const response = await route.POST(request());
    if (!response) throw new Error("Expected a response");

    expect(response.status).toBe(200);
    expect(syncOutlookCalendar).toHaveBeenCalledWith(
      expect.anything(),
      { id: "feed-1", url: "calendar-1" },
      undefined
    );
    await expect(response.json()).resolves.toEqual(synchronizedEvent);
  });
});
