import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { requireCronSecret } from "@/lib/cron/auth";
import { newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

async function cleanup(request: NextRequest) {
  const cronDenied = requireCronSecret(request);
  if (cronDenied) {
    const adminDenied = await requireAdmin(request);
    if (adminDenied) return adminDenied;
  }
  try {
    // Delete all expired logs
    const { count } = await prisma.log.deleteMany({
      where: {
        expiresAt: {
          lt: newDate(),
        },
      },
    });

    return NextResponse.json({
      message: `Cleaned up ${count} expired logs`,
      count,
    });
  } catch (error) {
    console.error("Failed to cleanup logs:", error);
    return NextResponse.json(
      { error: "Failed to cleanup logs" },
      { status: 500 }
    );
  }
}

export const GET = cleanup;
export const POST = cleanup;
