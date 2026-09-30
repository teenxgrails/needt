import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { canAddCalendar } from "@/lib/entitlements";
import { createGoogleOAuthClient } from "@/lib/google";
import { GOOGLE_CALENDAR_SCOPES } from "@/lib/google-oauth-scopes";
import { buildCalendarOAuthRedirectUrl } from "@/lib/oauth-redirects";

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

  const redirectUrl = buildCalendarOAuthRedirectUrl("google");
  const oauth2Client = await createGoogleOAuthClient({ redirectUrl });

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: [...GOOGLE_CALENDAR_SCOPES],
    include_granted_scopes: true,
    prompt: "consent",
  });

  return NextResponse.redirect(url);
}
