import { NextRequest, NextResponse } from "next/server";

import { DataExportStatus } from "@prisma/client";

import { authenticateAccountRequest } from "@/lib/auth/account-request-auth";
import { prisma } from "@/lib/prisma";
import { enqueueAccountExport, isQueueConfigured } from "@/lib/queue/enqueue";
import {
  accountRule,
  enforceRateLimits,
  ipRule,
} from "@/lib/security/rate-limit";

export async function POST(request: NextRequest) {
  const auth = await authenticateAccountRequest(request);
  if (auth.response) return auth.response;
  const limited = await enforceRateLimits(
    [
      ipRule(request, "account-export:ip", 10, 60 * 60),
      accountRule(auth.user.id, "account-export:user", 3, 24 * 60 * 60),
    ],
    { route: request.nextUrl.pathname }
  );
  if (limited) return limited;
  if (!auth.user.email) {
    return NextResponse.json(
      { error: "An account email is required" },
      { status: 400 }
    );
  }
  if (!isQueueConfigured()) {
    return NextResponse.json(
      { error: "Account export is temporarily unavailable" },
      { status: 503 }
    );
  }

  const active = await prisma.dataExportRequest.findFirst({
    where: {
      userId: auth.user.id,
      status: { in: [DataExportStatus.PENDING, DataExportStatus.PROCESSING] },
    },
    orderBy: { createdAt: "desc" },
  });
  if (active) {
    return NextResponse.json({ requestId: active.id, status: active.status });
  }

  const exportRequest = await prisma.dataExportRequest.create({
    data: { userId: auth.user.id },
  });
  const job = await enqueueAccountExport(exportRequest.id).catch(() => null);
  if (!job) {
    await prisma.dataExportRequest.update({
      where: { id: exportRequest.id },
      data: {
        status: DataExportStatus.FAILED,
        errorCode: "QUEUE_UNAVAILABLE",
      },
    });
    return NextResponse.json(
      { error: "Account export is temporarily unavailable" },
      { status: 503 }
    );
  }
  return NextResponse.json(
    { requestId: exportRequest.id, status: exportRequest.status },
    { status: 202 }
  );
}
