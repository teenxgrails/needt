import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "customization-api";

const DEFAULT_CUSTOMIZATION = {
  accentColor: "#6366F1",
  backgroundTint: "#1B1D1E",
  density: "comfortable",
  sidebarWidth: 244,
  radius: 8,
  fontFamily: "system",
  eventChipStyle: "flat",
  animationsEnabled: true,
  themePreset: "flowday",
};

function cleanHex(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback;
}

function cleanChoice(value: unknown, allowed: string[], fallback: string) {
  return typeof value === "string" && allowed.includes(value)
    ? value
    : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const customization = await prisma.userCustomization.upsert({
      where: { userId: auth.userId },
      update: {},
      create: { userId: auth.userId, ...DEFAULT_CUSTOMIZATION },
    });

    return NextResponse.json(customization);
  } catch (error) {
    logger.error(
      "Failed to fetch customization settings",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to fetch customization settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const body = await request.json();
    const sidebarWidth = Number(body.sidebarWidth);
    const radius = Number(body.radius);

    const data = {
      accentColor: cleanHex(body.accentColor, DEFAULT_CUSTOMIZATION.accentColor),
      backgroundTint: cleanHex(
        body.backgroundTint,
        DEFAULT_CUSTOMIZATION.backgroundTint
      ),
      density: cleanChoice(body.density, ["compact", "comfortable", "spacious"], "comfortable"),
      sidebarWidth:
        Number.isFinite(sidebarWidth) && sidebarWidth >= 220 && sidebarWidth <= 320
          ? Math.round(sidebarWidth)
          : DEFAULT_CUSTOMIZATION.sidebarWidth,
      radius:
        Number.isFinite(radius) && radius >= 4 && radius <= 16
          ? Math.round(radius)
          : DEFAULT_CUSTOMIZATION.radius,
      fontFamily: cleanChoice(body.fontFamily, ["system", "rounded", "mono"], "system"),
      eventChipStyle: cleanChoice(body.eventChipStyle, ["flat", "outlined", "filled"], "flat"),
      animationsEnabled: body.animationsEnabled !== false,
      themePreset: "flowday",
    };

    const customization = await prisma.userCustomization.upsert({
      where: { userId: auth.userId },
      update: data,
      create: { userId: auth.userId, ...data },
    });

    return NextResponse.json(customization);
  } catch (error) {
    logger.error(
      "Failed to update customization settings",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to update customization settings" },
      { status: 500 }
    );
  }
}
