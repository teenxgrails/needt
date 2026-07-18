import { NextRequest, NextResponse } from "next/server";

import { GaxiosError } from "gaxios";
import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { registerCalendarWebhookBestEffort } from "@/lib/calendar-webhooks/register";
import { newDate } from "@/lib/date-utils";
import { canAddCalendar } from "@/lib/entitlements";
import { createGoogleOAuthClient } from "@/lib/google";
import { getGoogleCalendarClient } from "@/lib/google-calendar";
import { syncGoogleCalendar } from "@/lib/google-sync";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { TokenManager } from "@/lib/token-manager";

const LOG_SOURCE = "GoogleCalendarAPI";

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;
    const entitlement = await canAddCalendar(auth.userId);
    if (!entitlement.allowed) {
      return NextResponse.json(
        { error: "Calendar limit reached.", entitlement },
        { status: 403 }
      );
    }

    const oauth2Client = await createGoogleOAuthClient({
      redirectUrl: `${process.env.NEXTAUTH_URL}/api/calendar/google`,
    });
    const tokenResponse = await oauth2Client.getToken(code);
    const tokens = tokenResponse.tokens;
    oauth2Client.setCredentials(tokens);

    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    if (!userInfo.data.email || !tokens.access_token) {
      return NextResponse.json(
        { error: "Could not retrieve Google account details" },
        { status: 400 }
      );
    }

    const tokenManager = TokenManager.getInstance();
    const accountId = await tokenManager.storeTokens(
      "GOOGLE",
      userInfo.data.email,
      {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? undefined,
        expiresAt: newDate(
          tokens.expiry_date ?? newDate().getTime() + 3_600_000
        ),
      },
      auth.userId
    );

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const calendarList = await calendar.calendarList.list();
    const feedIds: string[] = [];

    for (const googleCalendar of calendarList.data.items ?? []) {
      if (!googleCalendar.id || !googleCalendar.summary) continue;
      const existingFeed = await prisma.calendarFeed.findFirst({
        where: {
          type: "GOOGLE",
          url: googleCalendar.id,
          accountId,
          userId: auth.userId,
        },
      });
      const feed =
        existingFeed ??
        (await prisma.calendarFeed.create({
          data: {
            id: uuidv4(),
            name: googleCalendar.summary,
            url: googleCalendar.id,
            type: "GOOGLE",
            color: googleCalendar.backgroundColor ?? undefined,
            accountId,
            userId: auth.userId,
          },
        }));
      feedIds.push(feed.id);
    }

    await Promise.all(
      feedIds.map((feedId) =>
        registerCalendarWebhookBestEffort(feedId, "GOOGLE")
      )
    );

    return NextResponse.redirect(
      new URL("/settings#calendars", process.env.NEXTAUTH_URL!)
    );
  } catch (error) {
    await logger.error(
      "Google Calendar OAuth callback failed",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to authenticate with Google" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;
    const { accountId, calendarId, name, color } = (await request.json()) as {
      accountId?: string;
      calendarId?: string;
      name?: string;
      color?: string;
    };
    if (!accountId || !calendarId) {
      return NextResponse.json(
        { error: "Account ID and Calendar ID are required" },
        { status: 400 }
      );
    }

    const account = await prisma.connectedAccount.findUnique({
      where: { id: accountId, userId: auth.userId },
    });
    if (!account || account.provider !== "GOOGLE") {
      return NextResponse.json(
        { error: "Invalid Google account" },
        { status: 400 }
      );
    }

    const existingFeed = await prisma.calendarFeed.findFirst({
      where: {
        type: "GOOGLE",
        url: calendarId,
        accountId,
        userId: auth.userId,
      },
    });
    if (existingFeed) return NextResponse.json(existingFeed);

    const calendar = await getGoogleCalendarClient(accountId, auth.userId);
    await calendar.calendars.get({ calendarId });
    const feed = await prisma.calendarFeed.create({
      data: {
        id: uuidv4(),
        name: name || "Google Calendar",
        url: calendarId,
        type: "GOOGLE",
        color,
        accountId,
        userId: auth.userId,
      },
    });

    await syncGoogleCalendar(feed, { forceFullSync: true });
    await registerCalendarWebhookBestEffort(feed.id, "GOOGLE");
    return NextResponse.json(feed);
  } catch (error) {
    await logger.error(
      "Failed to add Google calendar",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    if (error instanceof GaxiosError && Number(error.code) === 401) {
      return NextResponse.json(
        { error: "Authentication failed. Please try signing in again." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to add calendar" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;
    const { feedId } = (await request.json()) as { feedId?: string };
    if (!feedId) {
      return NextResponse.json(
        { error: "Feed ID is required" },
        { status: 400 }
      );
    }

    const feed = await prisma.calendarFeed.findUnique({
      where: { id: feedId, userId: auth.userId },
    });
    if (!feed || feed.type !== "GOOGLE" || !feed.accountId || !feed.url) {
      return NextResponse.json({ error: "Feed not found" }, { status: 404 });
    }

    const result = await syncGoogleCalendar(feed);
    return NextResponse.json({
      success: true,
      processedEvents: result.processedEventIds.size,
    });
  } catch (error) {
    await logger.error(
      "Failed to sync Google calendar",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    if (error instanceof GaxiosError && Number(error.code) === 401) {
      return NextResponse.json(
        { error: "Authentication failed. Please try signing in again." },
        { status: 401 }
      );
    }
    return NextResponse.json(
      { error: "Failed to sync calendar" },
      { status: 500 }
    );
  }
}
