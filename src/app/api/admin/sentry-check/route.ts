import { NextRequest, NextResponse } from "next/server";

import * as Sentry from "@sentry/nextjs";

import { requireAdmin } from "@/lib/auth/api-auth";
import { resolveBuildSha } from "@/lib/health/build-sha";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "SentryCheckAPI";

/**
 * Prove that error reporting actually reaches Sentry.
 *
 * Having a DSN set is not the same as events arriving: a wrong project, a
 * blocked egress, or a filter that discards everything all look identical from
 * inside the app, and the difference only shows up the first time something
 * breaks and nothing is waiting in the inbox. This sends one deliberate
 * exception and reports the id it was given, so the result can be matched
 * against the Sentry issue stream.
 *
 * The thrown error is caught here on purpose — the point is the transport, not
 * a crash.
 */
export async function POST(request: NextRequest) {
  const denied = await requireAdmin(request);
  if (denied) return denied;

  const configured = Boolean(process.env.SENTRY_DSN?.trim());
  if (!configured) {
    return NextResponse.json(
      {
        delivered: false,
        reason: "SENTRY_DSN is not set, so nothing is being reported at all.",
      },
      { status: 503 }
    );
  }

  const marker = `sentry-check ${new Date().toISOString()}`;
  const eventId = Sentry.captureException(new Error(marker), {
    tags: { service: "web", diagnostic: "sentry-check" },
  });
  // Serverless-style runtimes can exit before the queue drains, so wait for it.
  const flushed = await Sentry.flush(5_000);

  void logger.info(
    "Sentry delivery check sent",
    { eventId, flushed, release: resolveBuildSha() },
    LOG_SOURCE
  );

  return NextResponse.json({
    delivered: flushed,
    eventId,
    release: resolveBuildSha(),
    environment: process.env.SENTRY_ENVIRONMENT ?? null,
    // Stack frames survive the privacy filter; the message does not, so look
    // the event up by this id rather than by its text.
    lookUpBy: "eventId",
  });
}
