import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "FeedSyncAPI";

interface CalendarEventInput {
  start: string | Date;
  end: string | Date;
  created?: string | Date;
  lastModified?: string | Date;
  [key: string]: unknown;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) {
      return auth.response;
    }

    const userId = auth.userId;

    const { events } = await request.json();
    const { id: feedId } = await params;

    // Verify the feed belongs to the current user
    const feed = await prisma.calendarFeed.findUnique({
      where: {
        id: feedId,
        userId,
      },
    });

    if (!feed) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    // Start a transaction to ensure data consistency
    await prisma.$transaction(async (tx) => {
      const tombstones = await tx.calendarEvent.findMany({
        where: { feedId, archivedAt: { not: null } },
        select: { externalEventId: true },
      });
      const tombstonedExternalIds = new Set(
        tombstones.flatMap((event) =>
          event.externalEventId ? [event.externalEventId] : []
        )
      );

      const incomingExternalIds = (events || []).flatMap(
        (event: CalendarEventInput) =>
          typeof event.externalEventId === "string"
            ? [event.externalEventId]
            : []
      );
      await tx.calendarEvent.updateMany({
        where: {
          feedId,
          archivedAt: null,
          externalEventId:
            incomingExternalIds.length > 0
              ? { notIn: incomingExternalIds }
              : { not: null },
        },
        data: { archivedAt: newDate() },
      });

      for (const event of events || []) {
        const externalEventId =
          typeof event.externalEventId === "string"
            ? event.externalEventId
            : null;
        if (externalEventId && tombstonedExternalIds.has(externalEventId)) {
          continue;
        }
        const data = {
          ...event,
          feedId,
          start: newDate(event.start),
          end: newDate(event.end),
          created: event.created ? newDate(event.created) : undefined,
          lastModified: event.lastModified
            ? newDate(event.lastModified)
            : undefined,
        };
        const existing = externalEventId
          ? await tx.calendarEvent.findFirst({
              where: { feedId, externalEventId, archivedAt: null },
              select: { id: true },
            })
          : null;
        if (existing) {
          await tx.calendarEvent.update({
            where: { id: existing.id },
            data,
          });
        } else {
          await tx.calendarEvent.create({ data });
        }
      }

      // Update feed's lastSync timestamp
      await tx.calendarFeed.update({
        where: { id: feedId, userId },
        data: { lastSync: newDate() },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error(
      "Failed to sync feed events:",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to sync feed events" },
      { status: 500 }
    );
  }
}
