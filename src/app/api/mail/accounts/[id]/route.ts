import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";
import { removeMailSyncSchedule } from "@/lib/queue/enqueue";

const LOG_SOURCE = "MailAccountAPI";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const { id } = await params;
    const account = await prisma.mailAccount.findFirst({
      where: { id, userId: auth.userId },
    });
    if (!account) {
      return NextResponse.json(
        { error: "Mail account not found." },
        { status: 404 }
      );
    }
    await prisma.mailAccount.update({
      where: { id },
      data: { status: "DISCONNECTED" },
    });
    await removeMailSyncSchedule(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to disconnect mail account",
      LOG_SOURCE,
      "Could not disconnect this mail account."
    );
  }
}
