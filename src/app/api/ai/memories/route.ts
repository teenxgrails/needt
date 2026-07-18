import { NextRequest, NextResponse } from "next/server";

import {
  clearAgentMemories,
  forgetForUser,
  listAgentMemories,
} from "@/services/ai/memory";
import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "ai-memories-api";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  return NextResponse.json({
    memories: await listAgentMemories(auth.userId),
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await authenticateRequest(request, LOG_SOURCE);
    if ("response" in auth) return auth.response;
    const input = z
      .object({
        memoryId: z.string().min(1).optional(),
        all: z.boolean().optional(),
      })
      .parse(await request.json());
    if (input.all) {
      const result = await clearAgentMemories(auth.userId);
      return NextResponse.json({ deleted: result.count });
    }
    if (!input.memoryId) {
      return NextResponse.json(
        { error: "memoryId is required" },
        { status: 400 }
      );
    }
    return NextResponse.json({
      deleted: (await forgetForUser(auth.userId, input.memoryId)) ? 1 : 0,
    });
  } catch (error) {
    logger.error(
      "Failed to delete AI memory",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json(
      { error: "Failed to delete memory" },
      { status: 400 }
    );
  }
}
