const DEFAULT_CALLBACK_PATH = "/calendar";

/**
 * Returns a local path suitable for a post-auth redirect. Authentication entry
 * points must not accept absolute, protocol-relative, or backslash-based URLs.
 */
export function safeCallbackPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_CALLBACK_PATH;
  }

  if (value.includes("\\")) return DEFAULT_CALLBACK_PATH;

  try {
    const url = new URL(value, "https://needt.invalid");
    return url.origin === "https://needt.invalid"
      ? `${url.pathname}${url.search}${url.hash}`
      : DEFAULT_CALLBACK_PATH;
  } catch {
    return DEFAULT_CALLBACK_PATH;
  }
}
