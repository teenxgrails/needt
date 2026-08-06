import { NextRequest, NextResponse } from "next/server";

import { getPublishedPage } from "@/services/pages/page-publication-service";

type RouteContext = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { token } = await params;
  const page = await getPublishedPage(token);
  if (!page) {
    return NextResponse.json(
      { error: "This Page is not published" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    { page },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
