import { NextRequest, NextResponse } from "next/server";

import {
  getPublishedPage,
  getPublishedPageAvailability,
} from "@/services/pages/page-publication-service";

type RouteContext = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const page = await getPublishedPage(token);
  if (!page) {
    const availability = await getPublishedPageAvailability(token);
    return NextResponse.json(
      {
        error:
          availability === "revoked"
            ? "This Page is no longer available"
            : "Page not found",
      },
      {
        status: availability === "revoked" ? 410 : 404,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
  return NextResponse.json(
    { page },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
