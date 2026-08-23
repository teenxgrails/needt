import {
  sanitizeLogEntry,
  sanitizeLogMetadata,
  sanitizeLogText,
} from "@/lib/logger/sanitize";

describe("persisted log sanitization", () => {
  it("removes content-bearing metadata and redacts sensitive strings", () => {
    expect(
      sanitizeLogMetadata({
        email: "person@example.com",
        body: "private mail body",
        pageContent: "private page body",
        token: "secret-token",
        error: "Bearer secret-token",
        errorType: "ProviderError",
        attempt: 2,
        nested: { recipient: "person@example.com", state: "retry" },
      })
    ).toEqual({ attempt: 2, errorType: "ProviderError" });
  });

  it("redacts dynamic error text before it reaches persisted logs", () => {
    expect(
      sanitizeLogText("Failed for person@example.com token=top-secret")
    ).toBe("Failed for [redacted email] token=[redacted]");
    expect(sanitizeLogText("private\nmail body")).toBe("[redacted text]");
  });

  it("sanitizes every persisted entry boundary", () => {
    expect(
      sanitizeLogEntry({
        level: "error",
        message: "Could not send to person@example.com",
        metadata: { authorization: "Bearer secret" },
        timestamp: new Date("2026-08-23T00:00:00Z"),
      })
    ).toMatchObject({
      message: "Could not send to [redacted email]",
      metadata: {},
    });
  });
});
