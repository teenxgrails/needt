import { NextRequest, NextResponse } from "next/server";

import { updatePageOrganization } from "@/services/pages/page-metadata-service";
import { z } from "zod";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "PageOrganizationAPI";
type RouteContext = { params: Promise<{ id: string }> };
const organizationSchema = z.object({
  folderId: z.string().min(1).nullable().optional(),
  tagIds: z.array(z.string().min(1)).max(32).optional(),
});

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  try {
    const [{ id }, input] = await Promise.all([
      params,
      request.json().then((body) => organizationSchema.parse(body)),
    ]);
    return NextResponse.json({
      page: await updatePageOrganization(auth, id, input),
    });
  } catch (error) {
    return routeErrorResponse(
      error,
      "Failed to organize Page",
      LOG_SOURCE,
      "Could not update Page organization."
    );
  }
}
