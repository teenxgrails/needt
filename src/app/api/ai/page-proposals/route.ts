import { NextRequest, NextResponse } from "next/server";

import { createAiProposal } from "@/services/pages/page-service";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "AiPageProposalsAPI";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const pageId = request.nextUrl.searchParams.get("pageId");
  if (!pageId) {
    return NextResponse.json({ error: "pageId is required" }, { status: 400 });
  }
  const proposals = await prisma.aiPageChangeProposal.findMany({
    where: { userId: auth.userId, pageId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return NextResponse.json({ proposals });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.pageId !== "string" || typeof body.summary !== "string") {
      return NextResponse.json(
        { error: "pageId and summary are required" },
        { status: 400 }
      );
    }
    const proposal = await createAiProposal(auth.userId, body.pageId, {
      summary: body.summary,
      operations: JSON.parse(JSON.stringify(body.operations ?? [])),
    });
    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to create AI proposal",
      LOG_SOURCE,
      "Could not create proposal."
    );
  }
}
