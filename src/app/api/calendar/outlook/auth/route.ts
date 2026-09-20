import { NextRequest, NextResponse } from "next/server";

import { getOutlookCredentials } from "@/lib/auth";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  calendarOAuthCookieOptions,
  calendarOAuthStateCookie,
  calendarOAuthStateCookieValue,
  createCalendarOAuthState,
} from "@/lib/calendar-oauth";
import { canAddCalendar } from "@/lib/entitlements";
import { logger } from "@/lib/logger";
import { buildCalendarOAuthRedirectUrl } from "@/lib/oauth-redirects";
import {
  MICROSOFT_GRAPH_AUTH_ENDPOINTS,
  MICROSOFT_GRAPH_SCOPES,
} from "@/lib/outlook";
import { publicAppUrl } from "@/lib/public-url";

const LOG_SOURCE = "OutlookCalendarOAuthStart";

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;
    const entitlement = await canAddCalendar(auth.userId);
    if (!entitlement.allowed) {
      return NextResponse.json(
        { error: "Calendar limit reached.", entitlement },
        { status: 403 }
      );
    }

    const { clientId } = await getOutlookCredentials();
    const redirectUrl = buildCalendarOAuthRedirectUrl("outlook");
    const state = createCalendarOAuthState();

    // Construct the authorization URL
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: "code",
      redirect_uri: redirectUrl,
      scope: MICROSOFT_GRAPH_SCOPES.join(" "),
      response_mode: "query",
      prompt: "consent",
      state,
    });

    const authUrl = `${
      MICROSOFT_GRAPH_AUTH_ENDPOINTS.auth
    }?${params.toString()}`;
    const response = NextResponse.redirect(authUrl);
    response.cookies.set(
      calendarOAuthStateCookie("outlook"),
      calendarOAuthStateCookieValue(state, auth.userId),
      calendarOAuthCookieOptions()
    );
    return response;
  } catch (error) {
    await logger.error(
      "Failed to generate Outlook auth URL",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    const url = publicAppUrl("/settings", request);
    url.searchParams.set("provider", "outlook");
    url.searchParams.set("calendarError", "callback_failed");
    url.hash = "calendars";
    return NextResponse.redirect(url);
  }
}
