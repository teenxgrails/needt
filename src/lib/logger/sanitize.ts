import { LogEntry, LogMetadata } from "./types";

const SENSITIVE_METADATA_KEY =
  /(?:authorization|body|content|cookie|detail|email|html|mail|message|page|password|payload|request|response|secret|subject|text|token|url)/i;
const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const SECRET_VALUE_PATTERN =
  /\b((?:access[ _-]?token|api[ _-]?key|authorization|password|secret|token)\s*[=:]\s*)[^\s,;]+/gi;
const BEARER_TOKEN_PATTERN = /\bBearer\s+[^\s,;]+/gi;
const MAX_LOG_TEXT_LENGTH = 512;
const MAX_METADATA_DEPTH = 4;

type SanitizedMetadataValue = string | number | boolean | null | string[];

export function sanitizeLogText(value: string): string {
  if (value.length > MAX_LOG_TEXT_LENGTH || /[\r\n]/.test(value)) {
    return "[redacted text]";
  }

  return value
    .replace(EMAIL_PATTERN, "[redacted email]")
    .replace(SECRET_VALUE_PATTERN, "$1[redacted]")
    .replace(BEARER_TOKEN_PATTERN, "Bearer [redacted]");
}

function sanitizeMetadataValue(
  value: unknown,
  depth: number
): SanitizedMetadataValue | undefined {
  if (value === null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") return sanitizeLogText(value);
  if (depth >= MAX_METADATA_DEPTH) return "[redacted nested value]";
  if (Array.isArray(value)) {
    if (!value.every((item) => typeof item === "string")) return undefined;
    return value.map(sanitizeLogText);
  }
  return undefined;
}

export function sanitizeLogMetadata(
  metadata: Record<string, unknown> | undefined,
  depth = 0
): LogMetadata {
  if (!metadata) return {};

  return Object.fromEntries(
    Object.entries(metadata).flatMap(([key, value]) => {
      if (key === "error" || SENSITIVE_METADATA_KEY.test(key)) return [];
      const sanitized = sanitizeMetadataValue(value, depth);
      return sanitized === undefined ? [] : [[key, sanitized]];
    })
  ) as LogMetadata;
}

export function sanitizeLogEntry(entry: LogEntry): LogEntry {
  return {
    ...entry,
    message: sanitizeLogText(entry.message),
    metadata: sanitizeLogMetadata(entry.metadata),
  };
}
