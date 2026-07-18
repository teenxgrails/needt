import { NextRequest, NextResponse } from "next/server";

import { getTodayScheduleSummary } from "@/services/ai/context";

import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "ai-briefing-status";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const status = await getTodayScheduleSummary(auth.userId);
  return NextResponse.json({
    overloaded: status.overloaded,
    scheduledMinutes: status.scheduledMinutes,
    workMinutes: status.workMinutes,
    suggestedPrompt: status.overloaded
      ? "My day is overloaded. Show me what to defer or reschedule, but do not change anything yet."
      : null,
  });
}
