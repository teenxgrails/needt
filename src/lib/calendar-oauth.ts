import { randomBytes, timingSafeEqual } from "node:crypto";

export type CalendarProvider = "google" | "outlook";

const STATE_COOKIE_PREFIX = "needt-calendar-oauth-state";

export function calendarOAuthStateCookie(provider: CalendarProvider) {
  return `${STATE_COOKIE_PREFIX}-${provider}`;
}

export function createCalendarOAuthState() {
  return randomBytes(32).toString("hex");
}

export function isValidCalendarOAuthState(
  expected: string | undefined,
  received: string | null
) {
  if (!expected || !received) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}

export function calendarOAuthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: 10 * 60,
    path: "/api/calendar",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
