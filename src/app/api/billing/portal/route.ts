import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { getCreemClient } from "@/lib/creem/client";
import { isCreemClientConfigured } from "@/lib/creem/config";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "CreemPortalAPI";

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  if (!isCreemClientConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 503 }
    );
  }

  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: auth.userId },
      select: { creemCustomerId: true },
    });
    if (!subscription?.creemCustomerId) {
      return NextResponse.json(
        { error: "No Creem billing account is connected." },
        { status: 404 }
      );
    }

    const portal = await getCreemClient().customers.generateBillingLinks({
      customerId: subscription.creemCustomerId,
    });
    return NextResponse.json({ url: portal.customerPortalLink });
  } catch (error) {
    await logger.error(
      "Failed to create Creem portal link",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Could not open billing management." },
      { status: 502 }
    );
  }
}
