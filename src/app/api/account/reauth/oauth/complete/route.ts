import { NextRequest, NextResponse } from "next/server";

import {
  REAUTH_CHALLENGE_COOKIE,
  completeOAuthReauthentication,
} from "@/services/account/account-reauthentication";

import { authenticateAccountRequest } from "@/lib/auth/account-request-auth";

export async function GET(request: NextRequest) {
  const auth = await authenticateAccountRequest(request);
  const redirect = new URL("/settings#account", request.url);
  if (auth.response) return NextResponse.redirect(redirect);
  const challenge = request.cookies.get(REAUTH_CHALLENGE_COOKIE)?.value;
  if (!challenge) {
    redirect.searchParams.set("reauth", "failed");
    return NextResponse.redirect(redirect);
  }
  try {
    await completeOAuthReauthentication(
      auth.user.id,
      auth.sessionHash,
      challenge
    );
  } catch {
    redirect.searchParams.set("reauth", "failed");
  }
  const response = NextResponse.redirect(redirect);
  response.cookies.set(REAUTH_CHALLENGE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/api/account/reauth/oauth",
    maxAge: 0,
  });
  return response;
}
