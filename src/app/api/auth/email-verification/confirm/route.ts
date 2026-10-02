import { NextRequest, NextResponse } from "next/server";

import { confirmEmailVerification } from "@/lib/email/email-verification";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "EmailVerificationConfirmAPI";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as {
    email?: unknown;
    token?: unknown;
  } | null;
  const email = typeof body?.email === "string" ? body.email : "";
  const token = typeof body?.token === "string" ? body.token : "";
  if (!email || !token) {
    return NextResponse.json({ status: "invalid" }, { status: 400 });
  }

  try {
    return NextResponse.json(await confirmEmailVerification({ email, token }));
  } catch (error) {
    await logger.error(
      "Email verification confirmation failed",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}
