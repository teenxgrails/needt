import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "PageAssetAPI";
type RouteContext = {
  params: Promise<{ id: string; assetId: string }>;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id, assetId } = await params;
  const asset = await prisma.pageAsset.findFirst({
    where: { id: assetId, pageId: id, userId: auth.userId },
  });
  if (!asset) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
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
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id, assetId } = await params;
  const result = await prisma.pageAsset.deleteMany({
    where: { id: assetId, pageId: id, userId: auth.userId },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Asset not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
