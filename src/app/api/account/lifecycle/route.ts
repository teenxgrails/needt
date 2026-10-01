import { NextRequest, NextResponse } from "next/server";

import { AccountDeletionStatus } from "@prisma/client";

import { authenticateAccountRequest } from "@/lib/auth/account-request-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await authenticateAccountRequest(request);
  if (auth.response) return auth.response;
  const [accounts, deletion] = await Promise.all([
    prisma.account.findMany({
      where: { userId: auth.user.id },
      select: { provider: true },
    }),
    prisma.accountDeletionRequest.findUnique({
      where: { userId: auth.user.id },
      select: { status: true, scheduledFor: true },
    }),
  ]);
  return NextResponse.json({
    providers: [...new Set(accounts.map(({ provider }) => provider))],
    deletion:
      deletion?.status === AccountDeletionStatus.SCHEDULED ? deletion : null,
  });
}
