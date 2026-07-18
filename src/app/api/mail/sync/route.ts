import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { enqueueMailSync } from "@/lib/queue/enqueue";

const LOG_SOURCE = "MailSyncAPI";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const { accountId } = (await request.json()) as { accountId?: string };
    const accounts = await prisma.mailAccount.findMany({
      where: {
        userId: auth.userId,
        status: "ACTIVE",
        ...(accountId && { id: accountId }),
      },
      select: { id: true },
    });
    const jobs = await Promise.all(
      accounts.map((account) => enqueueMailSync(account.id))
    );
    const queued = jobs.filter(Boolean).length;
    if (accounts.length > 0 && queued === 0) {
      return NextResponse.json(
        { error: "Mail sync is not configured." },
        { status: 503 }
      );
    }
    return NextResponse.json({ queued });
  } catch (error) {
    await logger.error(
      "Failed to enqueue mail sync",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Could not start mail sync." },
      { status: 500 }
    );
  }
}
