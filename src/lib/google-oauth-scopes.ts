export const GOOGLE_SIGN_IN_SCOPES = ["openid", "email", "profile"] as const;

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

// Google Tasks is intentionally deferred. Restore the integration by adding
// this list to a dedicated connect flow and enabling task sync together.
export const GOOGLE_TASKS_SCOPES = [
  "https://www.googleapis.com/auth/tasks",
] as const;
export const GOOGLE_TASKS_SYNC_ENABLED = false;
