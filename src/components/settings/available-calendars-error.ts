const DEFAULT_FETCH_ERROR = "Failed to load available calendars";

export interface CalendarFetchFailure {
  code?: string;
  message: string;
}

export async function extractCalendarFetchFailure(
  response: Response,
  fallback: string = DEFAULT_FETCH_ERROR
): Promise<CalendarFetchFailure> {
  try {
    const data = (await response.json()) as {
      code?: unknown;
      error?: unknown;
    };
    return {
      code: typeof data?.code === "string" ? data.code : undefined,
      message:
        typeof data?.error === "string" && data.error.trim().length > 0
          ? data.error
          : fallback,
    };
  } catch {
    return { message: fallback };
  }
}

/**
 * Extracts a user-facing error message from a non-OK calendar response,
 * preferring the server's classified `error` field (e.g. the CalDAV
 * connection-vs-auth message) and falling back to `fallback` when the body is
 * missing, empty, or not JSON.
 */
export async function extractCalendarFetchError(
  response: Response,
  fallback: string = DEFAULT_FETCH_ERROR
): Promise<string> {
  return (await extractCalendarFetchFailure(response, fallback)).message;
}
