import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { ServerLogger } from "@/lib/logger/server";
import { LogEntry, LogLevel, LogMetadata } from "@/lib/logger/types";

const LOG_SOURCE = "logs-batch-route";
const MAX_BATCH_SIZE = 20;
const MAX_MESSAGE_LENGTH = 1024;
const MAX_SOURCE_LENGTH = 128;
const MAX_METADATA_BYTES = 4096;
const LOG_LEVELS: ReadonlySet<LogLevel> = new Set([
  "debug",
  "info",
  "warn",
  "error",
]);

function parseLogEntry(value: unknown): LogEntry | null {
  if (!value || typeof value !== "object") return null;
  const entry = value as Record<string, unknown>;
  if (
    typeof entry.message !== "string" ||
    entry.message.length === 0 ||
    entry.message.length > MAX_MESSAGE_LENGTH ||
    typeof entry.level !== "string" ||
    !LOG_LEVELS.has(entry.level as LogLevel) ||
    (entry.source !== undefined &&
      (typeof entry.source !== "string" ||
        entry.source.length > MAX_SOURCE_LENGTH))
  ) {
    return null;
  }

  const timestamp = new Date(String(entry.timestamp));
  if (Number.isNaN(timestamp.getTime())) return null;
  const metadata = entry.metadata;
  if (
    metadata !== undefined &&
    (!metadata || typeof metadata !== "object" || Array.isArray(metadata) ||
      JSON.stringify(metadata).length > MAX_METADATA_BYTES)
  ) {
    return null;
  }

  return {
    level: entry.level as LogLevel,
    message: entry.message,
    metadata: metadata as LogMetadata | undefined,
    source: entry.source as string | undefined,
    timestamp,
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if (auth.response) return auth.response;

    const contentLength = Number(request.headers.get("content-length") || "0");
    if (contentLength > MAX_BATCH_SIZE * MAX_METADATA_BYTES) {
      return NextResponse.json({ error: "Log batch is too large" }, { status: 413 });
    }

    const rawEntries = await request.json();

    if (!Array.isArray(rawEntries) || rawEntries.length > MAX_BATCH_SIZE) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const entries: LogEntry[] = [];
    for (const rawEntry of rawEntries) {
      const entry = parseLogEntry(rawEntry);
      if (!entry) {
        return NextResponse.json(
          { error: "Invalid log entry" },
          { status: 400 }
        );
      }
      entries.push(entry);
    }

    const logger = new ServerLogger();
    const result = await logger.writeBatch(entries);

    return NextResponse.json(result);
  } catch {
    console.error("Failed to process batch logs");
    return NextResponse.json(
      { error: "Failed to process logs" },
      { status: 500 }
    );
  }
}
