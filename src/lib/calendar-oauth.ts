import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export type CalendarProvider = "google" | "outlook";

const STATE_COOKIE_PREFIX = "needt-calendar-oauth-state";

export function calendarOAuthStateCookie(provider: CalendarProvider) {
  return `${STATE_COOKIE_PREFIX}-${provider}`;
}

export function createCalendarOAuthState() {
  return randomBytes(32).toString("hex");
}

function calendarOAuthUserBinding(userId: string) {
  return createHash("sha256").update(userId).digest("hex");
}

export function calendarOAuthStateCookieValue(state: string, userId: string) {
  return `${state}.${calendarOAuthUserBinding(userId)}`;
}

export function isValidCalendarOAuthState(
  expectedCookie: string | undefined,
  received: string | null,
  userId: string
) {
  if (!expectedCookie || !received) return false;
  const [expected, expectedUserBinding, ...extra] = expectedCookie.split(".");
  if (!expected || !expectedUserBinding || extra.length > 0) return false;
  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  const expectedUserBuffer = Buffer.from(expectedUserBinding);
  const receivedUserBuffer = Buffer.from(calendarOAuthUserBinding(userId));
  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer) &&
    expectedUserBuffer.length === receivedUserBuffer.length &&
    timingSafeEqual(expectedUserBuffer, receivedUserBuffer)
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
