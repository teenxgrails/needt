import { PageAuthor, PageBlockType } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { replacePageBlocks } from "@/services/pages/page-service";

const LOG_SOURCE = "PageBlocksAPI";
type RouteContext = { params: Promise<{ id: string }> };
const blockTypes = new Set(Object.values(PageBlockType));

export async function PUT(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const body = await request.json().catch(() => ({}));
    if (!Array.isArray(body.blocks)) {
      return NextResponse.json({ error: "Blocks are required" }, { status: 400 });
    }
    const blocks = body.blocks.map((block: unknown, index: number) => {
      if (!block || typeof block !== "object") throw new Error("Invalid block");
      const candidate = block as Record<string, unknown>;
      if (typeof candidate.type !== "string" || !blockTypes.has(candidate.type as PageBlockType)) {
        throw new Error("Unsupported block type");
      }
      const content = candidate.content;
      if (content === undefined || typeof content === "function") throw new Error("Block content is required");
      return {
        type: candidate.type as PageBlockType,
        content: JSON.parse(JSON.stringify(content)),
        position: typeof candidate.position === "number" ? candidate.position : (index + 1) * 1024,
        createdBy: candidate.createdBy === PageAuthor.AI ? PageAuthor.AI : PageAuthor.HUMAN,
      };
    });
    const page = await replacePageBlocks(auth.userId, id, blocks);
    if (!page) return NextResponse.json({ error: "Page not found" }, { status: 404 });
    return NextResponse.json({ page });
  } catch (error) {
    return routeErrorResponse(error, "Failed to save page blocks", LOG_SOURCE, "Could not save page.");
  }
}
