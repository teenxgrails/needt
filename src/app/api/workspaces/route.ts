import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { logger } from "@/lib/logger";
import { workspaceApiError } from "@/lib/workspaces/api-response";
import {
  createSharedWorkspace,
  listUserWorkspaces,
} from "@/services/workspaces/workspace-service";

const LOG_SOURCE = "workspaces-route";
const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
});

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    return NextResponse.json({
      workspaces: await listUserWorkspaces(auth.userId),
    });
  } catch (error) {
    logger.error(
      "Failed to list workspaces",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  try {
    const input = createWorkspaceSchema.parse(await request.json());
    const workspace = await createSharedWorkspace(auth.userId, input.name);
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    const response = workspaceApiError(error);
    if (response) return response;
    logger.error(
      "Failed to create workspace",
      { error: error instanceof Error ? error.message : String(error) },
      LOG_SOURCE
    );
    return NextResponse.json({ error: "INTERNAL_ERROR" }, { status: 500 });
  }
}
