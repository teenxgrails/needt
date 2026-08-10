import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ token: string; assetId: string }> };

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const { token, assetId } = await params;
  const asset = await prisma.pageAsset.findFirst({
    where: {
      id: assetId,
      page: {
        trashedAt: null,
        publication: { token, revokedAt: null },
      },
    },
  });
  if (!asset) {
    return NextResponse.json(
      { error: "Published asset not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }
  const disposition = asset.mimeType.startsWith("image/")
    ? "inline"
    : "attachment";
  const safeName = asset.originalName.replace(/["\r\n]/g, "_");
  return new NextResponse(asset.bytes, {
    headers: {
      "Content-Type": asset.mimeType,
      "Content-Length": String(asset.size),
      "Content-Disposition": `${disposition}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
