import {
  calendarConnectionNotice,
  calendarProviderNeedsReconnect,
} from "@/lib/calendar-connection-status";

describe("calendar connection recovery", () => {
  it("maps consent denial without echoing provider input", () => {
    expect(
      calendarConnectionNotice("consent_denied", null, "google")
    ).toMatchObject({
      title: "Google Calendar wasn’t connected",
      provider: "google",
      tone: "error",
    });
    expect(
      calendarConnectionNotice("provider-secret", null, "not-a-provider")
    ).toMatchObject({
      title: "Calendar couldn’t connect",
      provider: undefined,
    });
  });

  it("recognizes revoked and expired provider credentials", () => {
    expect(calendarProviderNeedsReconnect({ statusCode: 401 })).toBe(true);
    expect(
      calendarProviderNeedsReconnect({ message: "invalid_grant: token revoked" })
    ).toBe(true);
    expect(
      calendarProviderNeedsReconnect({ message: "Token refresh failed: Bad Request" })
    ).toBe(true);
    expect(calendarProviderNeedsReconnect({ statusCode: 503 })).toBe(false);
  });
});
