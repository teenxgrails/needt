export type CalendarOAuthProvider = "google" | "outlook";

const CALENDAR_OAUTH_CALLBACK_PATHS: Record<
  CalendarOAuthProvider,
  `/${string}`
> = {
  google: "/api/calendar/google",
  outlook: "/api/calendar/outlook",
};

export function buildCalendarOAuthRedirectUrl(
  provider: CalendarOAuthProvider,
  origin = process.env.NEXTAUTH_URL
): string {
  if (!origin) {
    throw new Error("NEXTAUTH_URL is required to build an OAuth redirect URL");
  }

  return `${origin.replace(/\/$/, "")}${CALENDAR_OAUTH_CALLBACK_PATHS[provider]}`;
}
