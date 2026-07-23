import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "PageAssetsAPI";
const MAX_ASSET_BYTES = 10 * 1024 * 1024;
type RouteContext = { params: Promise<{ id: string }> };

async function ownedPage(userId: string, pageId: string) {
  return prisma.page.findFirst({
    where: { id: pageId, userId, trashedAt: null },
    select: { id: true },
  });
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!(await ownedPage(auth.userId, id))) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }
  const assets = await prisma.pageAsset.findMany({
    where: { pageId: id, userId: auth.userId },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ assets });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  if (!(await ownedPage(auth.userId, id))) {
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  }
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "Choose a file" }, { status: 400 });
  }
  if (file.size > MAX_ASSET_BYTES) {
    return NextResponse.json(
      { error: "Page assets must be 10 MB or smaller" },
      { status: 413 }
    );
  }
  const asset = await prisma.pageAsset.create({
    data: {
      pageId: id,
      userId: auth.userId,
      originalName: file.name.slice(0, 240) || "attachment",
      mimeType: file.type.slice(0, 120) || "application/octet-stream",
      size: file.size,
      bytes: Buffer.from(await file.arrayBuffer()),
    },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      size: true,
      createdAt: true,
    },
  });
  return NextResponse.json(
    { asset, url: `/api/pages/${id}/assets/${asset.id}` },
    { status: 201 }
  );
}
