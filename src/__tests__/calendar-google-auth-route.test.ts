import { NextRequest } from "next/server";

import * as route from "@/app/api/calendar/google/auth/route";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { calendarOAuthStateCookieValue } from "@/lib/calendar-oauth";
import { canAddCalendar } from "@/lib/entitlements";
import * as googleModule from "@/lib/google";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/entitlements");
jest.mock("@/lib/google");
jest.mock("@/lib/logger", () => ({ logger: { error: jest.fn() } }));

describe("Calendar Google auth route", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_URL = "http://localhost";
    jest.mocked(authenticateRequest).mockResolvedValue({ userId: "user-1" });
    jest.mocked(canAddCalendar).mockResolvedValue({
      allowed: true,
      limit: 1,
      used: 0,
      remaining: 1,
      upgradeRequired: false,
      plan: "FREE",
    });
  });

  it("requests calendar access incrementally without Google Tasks", async () => {
    const generateAuthUrl = jest.fn().mockReturnValue("https://redirect");
    jest
      .spyOn(googleModule, "createGoogleOAuthClient")
      .mockResolvedValue({ generateAuthUrl } as unknown as ReturnType<
        typeof googleModule.createGoogleOAuthClient
      >);

    const response = await route.GET(
      new NextRequest("http://localhost/api/calendar/google/auth")
    );
    expect(response).toBeDefined();
    if (!response) throw new Error("Expected an OAuth redirect response");

    expect(generateAuthUrl).toHaveBeenCalled();
    const arg = generateAuthUrl.mock.calls[0][0];
    expect(Array.isArray(arg.scope)).toBe(true);
    expect(arg.scope).toEqual([
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
    ]);
    expect(arg.scope).not.toContain("https://www.googleapis.com/auth/tasks");
    expect(arg.include_granted_scopes).toBe(true);
    expect(arg.state).toMatch(/^[a-f0-9]{64}$/);
    expect(googleModule.createGoogleOAuthClient).toHaveBeenCalledWith({
      redirectUrl: "http://localhost/api/calendar/google",
    });
    expect(
      response.cookies.get("needt-calendar-oauth-state-google")
    ).toMatchObject({
      httpOnly: true,
      name: "needt-calendar-oauth-state-google",
      sameSite: "lax",
      value: calendarOAuthStateCookieValue(arg.state, "user-1"),
    });
  });

  it("returns to settings when Google OAuth cannot start", async () => {
    jest
      .mocked(googleModule.createGoogleOAuthClient)
      .mockRejectedValue(new Error("credentials unavailable"));

    const response = await route.GET(
      new NextRequest("http://localhost/api/calendar/google/auth")
    );
    expect(response).toBeDefined();
    if (!response) throw new Error("Expected an OAuth redirect response");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "http://localhost/settings?provider=google&calendarError=callback_failed#calendars"
    );
  });
});
