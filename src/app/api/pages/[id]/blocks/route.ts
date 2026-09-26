import { NextRequest, NextResponse } from "next/server";

import {
  PageBlockIdentityError,
  PageCollaborationActiveError,
  PageRevisionConflictError,
  writePageBlocks,
} from "@/services/pages/page-write-path";
import { PageAccessRole, PageAuthor, PageBlockType } from "@prisma/client";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { resolvePageAccess } from "@/lib/auth/page-auth";
import { prisma } from "@/lib/prisma";
import {
  claimOfflineMutation,
  completeOfflineMutation,
  failOfflineMutation,
  replayOfflineMutation,
} from "@/lib/pwa/offline-mutation";

const LOG_SOURCE = "PageBlocksAPI";
type RouteContext = { params: Promise<{ id: string }> };
const blockTypes = new Set(Object.values(PageBlockType));

export async function PUT(request: NextRequest, { params }: RouteContext) {
  let offlineRecordId: string | null = null;
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    if (!(await resolvePageAccess(auth, id, PageAccessRole.EDITOR))) {
      return NextResponse.json(
        { error: "Page access denied" },
        { status: 403 }
      );
    }
    const body = await request.json().catch(() => ({}));
    if (!Array.isArray(body.blocks)) {
      return NextResponse.json(
        { error: "Blocks are required" },
        { status: 400 }
      );
    }
    const blocks = body.blocks.map((block: unknown, index: number) => {
      if (!block || typeof block !== "object") throw new Error("Invalid block");
      const candidate = block as Record<string, unknown>;
      if (
        typeof candidate.type !== "string" ||
        !blockTypes.has(candidate.type as PageBlockType)
      ) {
        throw new Error("Unsupported block type");
      }
      const content = candidate.content;
      if (content === undefined || typeof content === "function")
        throw new Error("Block content is required");
      return {
        id: typeof candidate.id === "string" ? candidate.id : undefined,
        parentBlockId:
          typeof candidate.parentBlockId === "string"
            ? candidate.parentBlockId
            : null,
        type: candidate.type as PageBlockType,
        content: JSON.parse(JSON.stringify(content)),
        position:
          typeof candidate.position === "number"
            ? candidate.position
            : (index + 1) * 1024,
        createdBy:
          candidate.createdBy === PageAuthor.AI
            ? PageAuthor.AI
            : PageAuthor.HUMAN,
      };
    });
    const documentFormatVersion = body.documentFormatVersion === 2 ? 2 : 1;
    const current = await prisma.page.findFirst({
      where: { id, trashedAt: null },
      select: { contentRevision: true },
    });
    if (!current)
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    const operation = `SAVE_PAGE_BLOCKS:${auth.workspace?.workspaceId}:${id}`;
    const replay = await replayOfflineMutation({
      request,
      userId: auth.userId,
      operation,
    });
    if (replay) return replay;
    const claim = await claimOfflineMutation({
      request,
      userId: auth.userId,
      operation,
    });
    if (claim.response) return claim.response;
    offlineRecordId = claim.recordId;
    const revisionHeader = request.headers
      .get("if-match")
      ?.replace(/^"|"$/g, "");
    const requestedRevision = revisionHeader
      ? Number.parseInt(revisionHeader, 10)
      : null;
    if (
      revisionHeader &&
      (!/^\d+$/.test(revisionHeader) || !Number.isSafeInteger(requestedRevision))
    ) {
      return NextResponse.json(
        { error: "If-Match must be a page content revision" },
        { status: 400 }
      );
    }
    const expectedContentRevision =
      requestedRevision ??
      (request.headers.has("x-needt-offline-scope")
        ? -1
        : current.contentRevision);
    const page = await writePageBlocks(
      auth,
      id,
      blocks,
      PageAuthor.HUMAN,
      documentFormatVersion,
      expectedContentRevision
    );
    if (!page) {
      await failOfflineMutation(offlineRecordId);
      return NextResponse.json({ error: "Page not found" }, { status: 404 });
    }
    await completeOfflineMutation(offlineRecordId);
    return NextResponse.json({ page });
  } catch (error) {
    await failOfflineMutation(offlineRecordId);
    if (error instanceof PageBlockIdentityError) {
      return NextResponse.json(
        { error: error.code, message: error.message, repairable: true },
        { status: 409 }
      );
    }
    if (error instanceof PageCollaborationActiveError) {
      return NextResponse.json(
        {
          error: error.code,
          message: "This page is being edited live. Reconnect to continue.",
          repairable: true,
        },
        { status: 409 }
      );
    }
    if (error instanceof PageRevisionConflictError) {
      return NextResponse.json(
        { error: error.code, repairable: true },
        { status: 409 }
      );
    }
    return routeErrorResponse(
      error,
      "Failed to save page blocks",
      LOG_SOURCE,
      "Could not save page."
    );
  }
}
