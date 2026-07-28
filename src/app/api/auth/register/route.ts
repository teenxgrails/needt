import { NextRequest, NextResponse } from "next/server";

import { Prisma } from "@prisma/client";
import { hash } from "bcryptjs";
import { z } from "zod";

import { isPublicSignupEnabled } from "@/lib/auth/public-signup";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import {
  accountRule,
  enforceRateLimits,
  ipRule,
} from "@/lib/security/rate-limit";

const LOG_SOURCE = "RegisterAPI";

const registrationSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().trim().max(100).optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (!(await isPublicSignupEnabled())) {
      logger.warn(
        "Registration attempted while public signup is disabled",
        {},
        LOG_SOURCE
      );
      return NextResponse.json(
        { error: "Public registration is currently disabled" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid registration request" },
        { status: 400 }
      );
    }

    const parsed = registrationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error:
            parsed.error.issues[0]?.message || "Invalid registration details",
        },
        { status: 400 }
      );
    }

    const email = parsed.data.email.toLowerCase();
    const limited = await enforceRateLimits(
      [
        ipRule(request, "register:ip", 5, 60 * 60),
        accountRule(email, "register:account", 3, 60 * 60),
      ],
      { route: request.nextUrl.pathname }
    );
    if (limited) return limited;

    const passwordHash = await hash(parsed.data.password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        name: parsed.data.name || email.split("@")[0],
        accounts: {
          create: {
            type: "credentials",
            provider: "credentials",
            providerAccountId: email,
            id_token: passwordHash,
          },
        },
        userSettings: {
          create: {
            theme: "dark",
            timeZone: "UTC",
          },
        },
      },
      select: { id: true },
    });

    logger.info(
      "User registered successfully",
      { userId: user.id },
      LOG_SOURCE
    );
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: true },
        { status: 201 }
      );
    }

    logger.error(
      "Registration failed",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}
