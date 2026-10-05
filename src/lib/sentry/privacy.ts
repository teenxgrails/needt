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
  exception?: {
    values?: Array<{
      type?: string;
      module?: string;
      stacktrace?: { frames?: Array<SentryFrameLike> };
    }>;
  };
};

/**
 * A stack frame as Sentry models it. Only the fields naming our own source are
 * copied forward; `vars` in particular is never carried, because local
 * variables are where a user's data would be sitting.
 */
type SentryFrameLike = {
  filename?: string;
  function?: string;
  module?: string;
  lineno?: number;
  colno?: number;
  in_app?: boolean;
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

function scrubFrame(frame: SentryFrameLike): SentryFrameLike {
  return omitUndefined({
    filename: frame.filename,
    function: frame.function,
    module: frame.module,
    lineno: frame.lineno,
    colno: frame.colno,
    in_app: frame.in_app,
  });
}

/**
 * Keep error events useful for triage without exporting request, page, mail,
 * token, or account data to a third-party service.
 *
 * Stack frames are carried because they name our own source — file, function,
 * line — and an exception type on its own cannot be acted on. The exception's
 * `value` and the event `message` are still dropped: those are written by our
 * code and by libraries, and either can quote the data that caused the error.
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
      ? {
          values: event.exception.values.map((value) =>
            omitUndefined({
              type: value.type,
              module: value.module,
              stacktrace: value.stacktrace?.frames
                ? { frames: value.stacktrace.frames.map(scrubFrame) }
                : undefined,
            })
          ),
        }
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
