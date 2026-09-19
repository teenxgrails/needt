import { NextRequest } from "next/server";

import * as googleRoute from "@/app/api/calendar/google/route";
import * as outlookRoute from "@/app/api/calendar/outlook/route";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { calendarOAuthStateCookieValue } from "@/lib/calendar-oauth";
import { canAddCalendar } from "@/lib/entitlements";

jest.mock("@/lib/auth/api-auth");
jest.mock("@/lib/entitlements");

const entitlement = {
  allowed: true,
  limit: 1,
  used: 0,
  remaining: 1,
  upgradeRequired: false,
  plan: "FREE" as const,
};

function callbackRequest(
  provider: "google" | "outlook",
  query: string,
  initiatingUserId = "user-1"
) {
  return new NextRequest(`http://localhost/api/calendar/${provider}?${query}`, {
    headers: {
      cookie: `needt-calendar-oauth-state-${provider}=${calendarOAuthStateCookieValue(
        "expected-state",
        initiatingUserId
      )}`,
    },
  });
}

describe.each([
  ["google", googleRoute],
  ["outlook", outlookRoute],
] as const)("%s calendar OAuth callback", (provider, route) => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NEXTAUTH_URL = "http://localhost";
    jest.mocked(authenticateRequest).mockResolvedValue({ userId: "user-1" });
    jest.mocked(canAddCalendar).mockResolvedValue(entitlement);
  });

  it("rejects a callback not bound to the initiating session", async () => {
    const response = await route.GET(
      callbackRequest(provider, "state=wrong-state&code=secret-code")
    );
    expect(response).toBeDefined();
    if (!response) throw new Error("Expected an OAuth callback response");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://localhost/settings?provider=${provider}&calendarError=invalid_state#calendars`
    );
    expect(
      response.cookies.get(`needt-calendar-oauth-state-${provider}`)?.value
    ).toBe("");
    expect(canAddCalendar).not.toHaveBeenCalled();
  });

  it("rejects a callback after the signed-in user changes", async () => {
    const response = await route.GET(
      callbackRequest(
        provider,
        "state=expected-state&code=secret-code",
        "user-before-switch"
      )
    );
    expect(response).toBeDefined();
    if (!response) throw new Error("Expected an OAuth callback response");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://localhost/settings?provider=${provider}&calendarError=invalid_state#calendars`
    );
    expect(canAddCalendar).not.toHaveBeenCalled();
  });

  it("turns denied consent into an actionable safe error", async () => {
    const response = await route.GET(
      callbackRequest(provider, "state=expected-state&error=access_denied")
    );
    expect(response).toBeDefined();
    if (!response) throw new Error("Expected an OAuth callback response");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://localhost/settings?provider=${provider}&calendarError=consent_denied#calendars`
    );
    expect(response.headers.get("location")).not.toContain("access_denied");
  });

  it("reports denied consent before checking calendar limits", async () => {
    jest.mocked(canAddCalendar).mockResolvedValue({
      ...entitlement,
      allowed: false,
      remaining: 0,
      upgradeRequired: true,
    });

    const response = await route.GET(
      callbackRequest(provider, "state=expected-state&error=access_denied")
    );
    expect(response).toBeDefined();
    if (!response) throw new Error("Expected an OAuth callback response");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://localhost/settings?provider=${provider}&calendarError=consent_denied#calendars`
    );
    expect(canAddCalendar).not.toHaveBeenCalled();
  });

  it("reports a callback that did not include an authorization code", async () => {
    const response = await route.GET(
      callbackRequest(provider, "state=expected-state")
    );
    expect(response).toBeDefined();
    if (!response) throw new Error("Expected an OAuth callback response");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      `http://localhost/settings?provider=${provider}&calendarError=missing_code#calendars`
    );
  });
});
