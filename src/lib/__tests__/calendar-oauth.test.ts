import {
  calendarOAuthCookieOptions,
  calendarOAuthStateCookie,
  calendarOAuthStateCookieValue,
  createCalendarOAuthState,
  isValidCalendarOAuthState,
} from "@/lib/calendar-oauth";

describe("calendar OAuth state", () => {
  it("creates provider-scoped, short-lived state cookies", () => {
    const first = createCalendarOAuthState();
    const second = createCalendarOAuthState();

    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(second).toMatch(/^[a-f0-9]{64}$/);
    expect(second).not.toBe(first);
    expect(calendarOAuthStateCookie("google")).toBe(
      "needt-calendar-oauth-state-google"
    );
    expect(calendarOAuthStateCookie("outlook")).toBe(
      "needt-calendar-oauth-state-outlook"
    );
    expect(calendarOAuthCookieOptions()).toMatchObject({
      httpOnly: true,
      maxAge: 600,
      path: "/api/calendar",
      sameSite: "lax",
    });
  });

  it.each([
    [undefined, "state", "user-1"],
    [calendarOAuthStateCookieValue("state", "user-1"), null, "user-1"],
    [calendarOAuthStateCookieValue("state", "user-1"), "other", "user-1"],
    [calendarOAuthStateCookieValue("state", "user-1"), "state", "user-2"],
    ["malformed", "malformed", "user-1"],
  ])("rejects missing or mismatched state", (expected, received, userId) => {
    expect(isValidCalendarOAuthState(expected, received, userId)).toBe(false);
  });

  it("accepts only an exact state match", () => {
    expect(
      isValidCalendarOAuthState(
        calendarOAuthStateCookieValue("state", "user-1"),
        "state",
        "user-1"
      )
    ).toBe(true);
  });
});
