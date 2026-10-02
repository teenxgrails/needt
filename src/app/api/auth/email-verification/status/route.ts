import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

import { authSecret } from "@/lib/auth/auth-secret";
import { getEmailVerificationStatus } from "@/lib/auth/email-verification-access";

export async function GET(request: NextRequest) {
  const token = await getToken({ req: request, secret: authSecret() });
  if (!token?.sub) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getEmailVerificationStatus(token.sub));
}
