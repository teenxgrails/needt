import { NextRequest } from "next/server";

import * as eventsRoute from "@/app/api/events/route";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { toWorkspaceBusyEvent } from "@/lib/calendar-privacy";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/prisma", () => ({
  prisma: {
    calendarEvent: { findMany: jest.fn() },
    workspaceMember: { findMany: jest.fn() },
  },
}));

const calendarEventFindMany = prisma.calendarEvent.findMany as jest.Mock;
const workspaceMemberFindMany = prisma.workspaceMember.findMany as jest.Mock;

describe("workspace calendar privacy", () => {
  it("projects another member's personal event to busy/free only", () => {
    const privateEvent = {
      id: "private-event-1",
      title: "Confidential acquisition",
      description: "Secret agenda",
      location: "Private room",
      attendees: [{ email: "secret@example.com" }],
      organizer: { email: "owner@example.com" },
      start: new Date("2026-08-05T09:00:00.000Z"),
      end: new Date("2026-08-05T10:00:00.000Z"),
      allDay: false,
      status: "confirmed",
    };

    const projected = toWorkspaceBusyEvent(privateEvent);
    const serialized = JSON.stringify(projected);

    expect(projected).toMatchObject({
      title: "Busy",
      description: null,
      location: null,
      attendees: null,
      organizer: null,
      start: privateEvent.start,
      end: privateEvent.end,
    });
    expect(serialized).not.toContain(privateEvent.title);
    expect(serialized).not.toContain(privateEvent.description);
    expect(serialized).not.toContain(privateEvent.location);
    expect(serialized).not.toContain("secret@example.com");
    expect(serialized).not.toContain("owner@example.com");
  });

  it("returns full own events and only redacted intervals from workspace peers", async () => {
    jest.mocked(authenticateRequest).mockResolvedValue({
      userId: "viewer-1",
      workspace: {
        enabled: true,
        workspaceId: "workspace-1",
        workspaceKind: "SHARED",
        role: "VIEWER",
        dataScope: { mode: "workspace", workspaceId: "workspace-1" },
      },
    } as never);
    workspaceMemberFindMany.mockResolvedValue([{ userId: "member-2" }]);
    calendarEventFindMany
      .mockResolvedValueOnce([
        {
          id: "own-event",
          title: "My own title",
          start: new Date("2026-08-05T08:00:00.000Z"),
          end: new Date("2026-08-05T09:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([
        {
          id: "peer-event",
          title: "Peer secret",
          description: "Peer description",
          location: "Peer location",
          attendees: [{ email: "peer@example.com" }],
          start: new Date("2026-08-05T10:00:00.000Z"),
          end: new Date("2026-08-05T11:00:00.000Z"),
          allDay: false,
          status: "confirmed",
        },
      ]);

    const response = await eventsRoute.GET(
      new NextRequest("http://localhost/api/events?workspaceId=workspace-1")
    );
    const body = await response!.json();
    const serialized = JSON.stringify(body);

    expect(body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "own-event", title: "My own title" }),
        expect.objectContaining({
          id: "workspace-busy:peer-event",
          title: "Busy",
          description: null,
          location: null,
          attendees: null,
        }),
      ])
    );
    expect(serialized).not.toContain("Peer secret");
    expect(serialized).not.toContain("Peer description");
    expect(serialized).not.toContain("Peer location");
    expect(serialized).not.toContain("peer@example.com");
  });
});
