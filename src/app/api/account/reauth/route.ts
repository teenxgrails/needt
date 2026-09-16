import { NextRequest, NextResponse } from "next/server";

import { recordCredentialReauthentication } from "@/services/account/account-reauthentication";
import { z } from "zod";

import { authenticateAccountRequest } from "@/lib/auth/account-request-auth";
import { authenticateUser } from "@/lib/auth/credentials-provider";
import {
  accountRule,
  enforceRateLimits,
  ipRule,
} from "@/lib/security/rate-limit";

const requestSchema = z.object({ password: z.string().min(1).max(128) });

export async function POST(request: NextRequest) {
  const auth = await authenticateAccountRequest(request);
  if (auth.response) return auth.response;
  const limited = await enforceRateLimits(
    [
      ipRule(request, "account-reauth:ip", 20, 15 * 60),
      accountRule(auth.user.id, "account-reauth:user", 5, 15 * 60),
    ],
    { route: request.nextUrl.pathname }
  );
  if (limited) return limited;
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success || !auth.user.email) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const authenticated = await authenticateUser(
    auth.user.email,
    parsed.data.password
  );
  if (!authenticated || authenticated.id !== auth.user.id) {
    return NextResponse.json(
      { error: "Password is incorrect" },
      { status: 401 }
    );
  }
  await recordCredentialReauthentication(auth.user.id, auth.sessionHash);
  return NextResponse.json({ reauthenticated: true });
}
