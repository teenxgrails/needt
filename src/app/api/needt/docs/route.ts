import { NextRequest, NextResponse } from "next/server";

import { listPageMetadata } from "@/services/pages/page-metadata-service";
import { WorkspaceRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prismaDataSource } from "@/lib/needt/prisma-source";

const LOG_SOURCE = "NeedtDocsAPI";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const workspace = auth.workspace;
  if (!workspace) {
    return NextResponse.json(
      { error: "Workspace unavailable" },
      { status: 400 }
    );
  }

  const tagIds = request.nextUrl.searchParams.getAll("tagId").filter(Boolean);
  const source = prismaDataSource(auth.userId, workspace);
  const [docs, metadata] = await Promise.all([
    source.getDocuments({
      search: request.nextUrl.searchParams.get("q") ?? undefined,
      collectionId: request.nextUrl.searchParams.get("folderId") ?? undefined,
      tagIds,
      favorites: request.nextUrl.searchParams.get("favorites") === "true",
      privateOnly: request.nextUrl.searchParams.get("privateOnly") === "true",
    }),
    listPageMetadata(auth),
  ]);

  return NextResponse.json(
    {
      workspaceId: workspace.workspaceId,
      canCreate: workspace.role !== WorkspaceRole.VIEWER,
      docs,
      metadata,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
