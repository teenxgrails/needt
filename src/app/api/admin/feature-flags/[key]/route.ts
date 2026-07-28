import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ key: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { key } = await params;
  const flag = await prisma.featureFlag.findUnique({
    where: { key },
    include: { overrides: true },
  });
  if (!flag) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ flag });
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const denied = await requireAdmin(request);
  if (denied) return denied;
  const { key } = await params;
  const body = (await request.json()) as {
    enabled?: unknown;
    rolloutPercentage?: unknown;
    userId?: unknown;
    userEnabled?: unknown;
  };
  if (typeof body.userId === "string" && typeof body.userEnabled === "boolean") {
    const override = await prisma.featureFlagOverride.upsert({
      where: { flagKey_userId: { flagKey: key, userId: body.userId } },
      update: { enabled: body.userEnabled },
      create: {
        flagKey: key,
        userId: body.userId,
        enabled: body.userEnabled,
      },
    });
    return NextResponse.json({ override });
  }
  const rolloutPercentage =
    typeof body.rolloutPercentage === "number"
      ? Math.max(0, Math.min(100, Math.round(body.rolloutPercentage)))
      : undefined;
  const flag = await prisma.featureFlag.update({
    where: { key },
    data: {
      enabled: typeof body.enabled === "boolean" ? body.enabled : undefined,
      rolloutPercentage,
    },
  });
  return NextResponse.json({ flag });
}
