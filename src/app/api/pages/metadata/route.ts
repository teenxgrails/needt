import { NextRequest, NextResponse } from "next/server";

import {
  createPageFolder,
  createPageSmartFolder,
  createPageTag,
  listPageMetadata,
} from "@/services/pages/page-metadata-service";
import { WorkspaceRole } from "@prisma/client";
import { z } from "zod";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "PageMetadataAPI";
const metadataSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("folder"),
    name: z.string().trim().min(1).max(80),
    color: z.string().trim().max(32).nullable().optional(),
  }),
  z.object({
    kind: z.literal("tag"),
    name: z.string().trim().min(1).max(80),
    color: z.string().trim().max(32).nullable().optional(),
  }),
  z.object({
    kind: z.literal("smart-folder"),
    name: z.string().trim().min(1).max(80),
    query: z.object({}).passthrough(),
  }),
]);

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    return NextResponse.json(await listPageMetadata(auth));
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to list Page metadata",
      LOG_SOURCE,
      "Could not load Page organization."
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE, {
    requiredRole: WorkspaceRole.EDITOR,
  });
  if ("response" in auth) return auth.response;
  try {
    const input = metadataSchema.parse(await request.json());
    if (input.kind === "folder") {
      return NextResponse.json(
        { folder: await createPageFolder(auth, input) },
        { status: 201 }
      );
    }
    if (input.kind === "tag") {
      return NextResponse.json(
        { tag: await createPageTag(auth, input) },
        { status: 201 }
      );
    }
    return NextResponse.json(
      { smartFolder: await createPageSmartFolder(auth, input) },
      { status: 201 }
    );
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to create Page metadata",
      LOG_SOURCE,
      "Could not create Page organization."
    );
  }
}
