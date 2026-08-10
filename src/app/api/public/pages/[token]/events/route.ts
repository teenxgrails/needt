import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { pagePublicationChannel } from "@/lib/pages/page-publication-realtime";
import { prisma } from "@/lib/prisma";
import { createRedisSubscriber } from "@/lib/queue/connection";
import { getPublishedPageAvailability } from "@/services/pages/page-publication-service";

const LOG_SOURCE = "PublicPageEventsAPI";
const VALIDATE_INTERVAL_MS = 2_000;
type RouteContext = { params: Promise<{ token: string }> };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const availability = await getPublishedPageAvailability(token);
  if (availability !== "active") {
    return NextResponse.json(
      {
        error:
          availability === "revoked"
            ? "This Page is no longer available"
            : "Page not found",
      },
      {
        status: availability === "revoked" ? 410 : 404,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }

  const encoder = new TextEncoder();
  const subscriber = process.env.REDIS_URL?.trim()
    ? createRedisSubscriber()
    : null;
  let cleanupStream: (() => Promise<void>) | null = null;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false;
      let validating = false;
      const send = (value: string) => {
        if (!closed) controller.enqueue(encoder.encode(value));
      };
      const cleanup = async () => {
        if (closed) return;
        closed = true;
        clearInterval(validationInterval);
        if (subscriber) {
          subscriber.removeAllListeners("message");
          try {
            await subscriber.unsubscribe(pagePublicationChannel(token));
            await subscriber.quit();
          } catch {
            subscriber.disconnect();
          }
        }
        try {
          controller.close();
        } catch {
          // The browser may already have closed the stream.
        }
      };
      const revoke = () => {
        send("event: revoked\ndata: {}\n\n");
        void cleanup();
      };
      const validate = async () => {
        if (closed || validating) return;
        validating = true;
        try {
          const active = await prisma.pagePublication.findFirst({
            where: { token, revokedAt: null, page: { trashedAt: null } },
            select: { id: true },
          });
          if (!active) revoke();
        } finally {
          validating = false;
        }
      };
      const validationInterval = setInterval(
        () => void validate(),
        VALIDATE_INTERVAL_MS
      );
      cleanupStream = cleanup;
      request.signal.addEventListener("abort", () => void cleanup());
      send("event: ready\ndata: {}\n\n");

      if (subscriber) {
        try {
          await subscriber.connect();
          await subscriber.subscribe(pagePublicationChannel(token));
          subscriber.on("message", () => revoke());
        } catch (error) {
          await logger.warn(
            "Public Page revocation stream is using database polling",
            { error: error instanceof Error ? error.message : String(error) },
            LOG_SOURCE
          );
        }
      }
    },
    async cancel() {
      await cleanupStream?.();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
