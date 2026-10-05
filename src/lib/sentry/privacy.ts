type SentryEventLike = {
  event_id?: string;
  timestamp?: number;
  start_timestamp?: number;
  level?: unknown;
  platform?: string;
  logger?: string;
  release?: string;
  dist?: string;
  environment?: string;
  type?: unknown;
  tags?: Record<string, unknown>;
  exception?: { values?: Array<{ type?: string }> };
};

type SentrySpanLike = {
  data: unknown;
  span_id: string;
  start_timestamp: number;
  trace_id: string;
  timestamp?: number;
  op?: string;
  status?: string;
  origin?: string;
};

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined)
  ) as T;
}

/**
 * Keep error events useful for release-level triage without exporting request,
 * page, mail, token, or account data to a third-party service.
 */
export function scrubSentryEvent<T extends SentryEventLike>(event: T): T {
  const service = event.tags?.service;

  return omitUndefined({
    event_id: event.event_id,
    timestamp: event.timestamp,
    start_timestamp: event.start_timestamp,
    level: event.level,
    platform: event.platform,
    logger: event.logger,
    release: event.release,
    dist: event.dist,
    environment: event.environment,
    type: event.type,
    tags: typeof service === "string" ? { service } : undefined,
    exception: event.exception?.values
      ? { values: event.exception.values.map(({ type }) => ({ type })) }
      : undefined,
  }) as T;
}

/** Drop all breadcrumb payloads rather than attempting to classify user data. */
export function dropSentryBreadcrumb(): null {
  return null;
}

/** Remove trace names, attributes, links, and measurements before export. */
export function scrubSentrySpan<T extends SentrySpanLike>(span: T): T {
  return omitUndefined({
    data: {},
    span_id: span.span_id,
    start_timestamp: span.start_timestamp,
    trace_id: span.trace_id,
    timestamp: span.timestamp,
    op: span.op,
    status: span.status,
    origin: span.origin,
  }) as T;
}
