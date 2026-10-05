import { NextRequest, NextResponse } from "next/server";

import { WorkspaceRole } from "@prisma/client";

import { POST as createEvent } from "@/app/api/events/route";
import { POST as createFeed } from "@/app/api/feeds/route";
import { authenticateRequest } from "@/lib/auth/api-auth";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/prisma", () => ({ prisma: {} }));

describe("calendar mutation workspace access", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(authenticateRequest).mockResolvedValue({
      response: NextResponse.json(
        { error: "The requested workspace role is required." },
        { status: 403 }
      ),
    });
  });

  it.each([
    ["event", createEvent, "events-route"],
    ["feed", createFeed, "calendar-feeds-route"],
  ])("requires Editor before creating a %s", async (_, handler, source) => {
    const request = new NextRequest(`http://localhost/api/${source}`, {
      method: "POST",
      body: "{}",
    });
    const response = await handler(request);

    expect(response?.status).toBe(403);
    expect(authenticateRequest).toHaveBeenCalledWith(request, source, {
      requiredRole: WorkspaceRole.EDITOR,
    });
  });
});
