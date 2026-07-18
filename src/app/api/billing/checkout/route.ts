import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { getCreemClient } from "@/lib/creem/client";
import {
  BillingCheckoutSelection,
  getCreemProductId,
  isCreemConfigured,
} from "@/lib/creem/config";
import { newDate } from "@/lib/date-utils";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "CreemCheckoutAPI";

const checkoutSchema = z.discriminatedUnion("plan", [
  z.object({
    plan: z.literal("pro"),
    interval: z.enum(["month", "year"]),
  }),
  z.object({
    plan: z.literal("lifetime"),
  }),
]);

function checkoutRequestId(
  userId: string,
  selection: BillingCheckoutSelection,
  date = newDate()
) {
  const interval = selection.plan === "pro" ? selection.interval : "once";
  return `needt-${userId}-${selection.plan}-${interval}-${date
    .toISOString()
    .slice(0, 16)}`;
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  if (!isCreemConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured." },
      { status: 503 }
    );
  }

  const parsed = checkoutSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid billing plan selection." },
      { status: 400 }
    );
  }

  try {
    const selection = parsed.data as BillingCheckoutSelection;
    const productId = getCreemProductId(selection);
    if (!productId) {
      return NextResponse.json(
        { error: "This billing option is not configured." },
        { status: 503 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { email: true, name: true },
    });
    if (!user?.email) {
      return NextResponse.json(
        { error: "A verified account email is required for checkout." },
        { status: 400 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      process.env.NEXTAUTH_URL?.trim() ||
      request.nextUrl.origin;
    const successUrl = new URL("/settings", appUrl);
    successUrl.searchParams.set("billing", "success");
    successUrl.hash = "billing";

    const checkout = await getCreemClient().checkouts.create({
      productId,
      requestId: checkoutRequestId(auth.userId, selection),
      customer: {
        email: user.email,
        ...(user.name ? { name: user.name } : {}),
      },
      successUrl: successUrl.toString(),
      metadata: {
        referenceId: auth.userId,
        userId: auth.userId,
        plan: selection.plan,
        interval: selection.plan === "pro" ? selection.interval : "once",
      },
    });
    if (!checkout.checkoutUrl) {
      throw new Error("Creem did not return a checkout URL.");
    }

    return NextResponse.json({ url: checkout.checkoutUrl });
  } catch (error) {
    await logger.error(
      "Failed to create Creem checkout",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Could not start checkout." },
      { status: 502 }
    );
  }
}
