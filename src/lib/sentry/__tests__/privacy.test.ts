import {
  dropSentryBreadcrumb,
  scrubSentryEvent,
  scrubSentrySpan,
} from "@/lib/sentry/privacy";

describe("Sentry privacy filtering", () => {
  it("keeps only release triage metadata from an error event", () => {
    const event = scrubSentryEvent({
      event_id: "event-1",
      level: "error",
      release: "abc123",
      environment: "production",
      tags: { service: "worker", email: "person@example.com" },
      request: { url: "https://use.needt.app/mail?token=secret" },
      user: { email: "person@example.com" },
      extra: { body: "private mail body", token: "secret" },
      breadcrumbs: [{ message: "private page content" }],
      message: "person@example.com reset token secret",
      transaction: "/mail/private-thread",
      exception: {
        values: [
          { type: "Error", value: "secret", stacktrace: { frames: [] } },
        ],
      },
    });

    expect(event).toEqual({
      event_id: "event-1",
      level: "error",
      release: "abc123",
      environment: "production",
      tags: { service: "worker" },
      exception: { values: [{ type: "Error" }] },
    });
  });

  it("drops every breadcrumb and trace attribute", () => {
    expect(dropSentryBreadcrumb()).toBeNull();
    expect(
      scrubSentrySpan({
        data: { "http.url": "https://use.needt.app/mail?token=secret" },
        description: "/mail/private-thread",
        span_id: "span-1",
        start_timestamp: 1,
        trace_id: "trace-1",
        links: [{ attributes: { email: "person@example.com" } }],
      })
    ).toEqual({
      data: {},
      span_id: "span-1",
      start_timestamp: 1,
      trace_id: "trace-1",
    });
  });
});
