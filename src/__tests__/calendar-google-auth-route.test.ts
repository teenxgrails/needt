import { NextRequest } from "next/server";

import * as route from "@/app/api/calendar/google/auth/route";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { canAddCalendar } from "@/lib/entitlements";
import * as googleModule from "@/lib/google";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/entitlements");
jest.mock("@/lib/google");

describe("Calendar Google auth route", () => {
  it("requests tasks scope when generating auth URL", async () => {
    jest.mocked(authenticateRequest).mockResolvedValue({ userId: "user-1" });
    jest.mocked(canAddCalendar).mockResolvedValue({
      allowed: true,
      limit: 1,
      used: 0,
      remaining: 1,
      upgradeRequired: false,
      plan: "FREE",
    });
    const generateAuthUrl = jest.fn().mockReturnValue("https://redirect");
    jest
      .spyOn(googleModule, "createGoogleOAuthClient")
      .mockResolvedValue({ generateAuthUrl } as unknown as ReturnType<
        typeof googleModule.createGoogleOAuthClient
      >);

    await route.GET(
      new NextRequest("http://localhost/api/calendar/google/auth")
    );

    expect(generateAuthUrl).toHaveBeenCalled();
    const arg = generateAuthUrl.mock.calls[0][0];
    expect(Array.isArray(arg.scope)).toBe(true);
    expect(arg.scope).toContain("https://www.googleapis.com/auth/tasks");
  });
});
