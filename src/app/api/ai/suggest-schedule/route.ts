import { NextRequest, NextResponse } from "next/server";

import { getConfiguredSchedulerAI } from "@/services/ai/settings";
import { AISuggestion, SchedulingContext } from "@/services/ai/types";
import { getCalibrationContext } from "@/services/time-tracking/calibration";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "ai-suggest-schedule-api";
const FALLBACK: AISuggestion = {
  summary: "Deterministic schedule kept.",
  moves: [],
  warnings: ["AI was unavailable, so Flowday kept the deterministic schedule."],
};

export async function POST(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;

    const context = (await request.json()) as SchedulingContext;
    context.calibration = await getCalibrationContext(auth.userId);
    const { settings, ai } = await getConfiguredSchedulerAI(auth.userId);

    if (settings.provider === "NONE") {
      return NextResponse.json({ suggestion: FALLBACK, fallback: true });
    }

    try {
      const suggestion = await ai.suggestSchedule(context);
      return NextResponse.json({ suggestion, fallback: false });
    } catch (error) {
      logger.warn(
        "AI schedule suggestion failed, falling back",
        { error: error instanceof Error ? error.message : String(error) },
        LOG_SOURCE
      );
      return NextResponse.json({ suggestion: FALLBACK, fallback: true });
    }
  } catch (error) {
    logger.error(
      "Failed to suggest schedule",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to suggest schedule" },
      { status: 500 }
    );
  }
}
