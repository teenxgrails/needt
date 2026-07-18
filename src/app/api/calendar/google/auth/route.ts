import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { canAddCalendar } from "@/lib/entitlements";
import { createGoogleOAuthClient } from "@/lib/google";

const LOG_SOURCE = "GoogleCalendarOAuthStart";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const entitlement = await canAddCalendar(auth.userId);
  if (!entitlement.allowed) {
    return NextResponse.json(
      { error: "Calendar limit reached.", entitlement },
      { status: 403 }
    );
  }

  const redirectUrl = `${process.env.NEXTAUTH_URL}/api/calendar/google`;
  const oauth2Client = await createGoogleOAuthClient({ redirectUrl });

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [
      "https://www.googleapis.com/auth/calendar",
      "https://www.googleapis.com/auth/calendar.events",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/tasks",
    ],
    prompt: "consent",
  });

  return NextResponse.redirect(url);
}
