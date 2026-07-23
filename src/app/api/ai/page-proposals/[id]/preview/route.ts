import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getAiProposal } from "@/services/pages/page-service";

const LOG_SOURCE = "AiPageProposalPreviewAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const proposal = await getAiProposal(auth.userId, id);
    if (!proposal) return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    return NextResponse.json({ proposal });
  } catch (error) {
    return routeErrorResponse(error, "Failed to preview AI proposal", LOG_SOURCE, "Could not load proposal.");
  }
}
