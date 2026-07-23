import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "PageTemplatesAPI";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const templates = await prisma.pageTemplate.findMany({
    where: { userId: auth.userId },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, 500)
      : null;
  const pageId = typeof body.pageId === "string" ? body.pageId : "";
  if (!name || name.length > 120 || !pageId) {
    return NextResponse.json(
      { error: "Template name and source page are required" },
      { status: 400 }
    );
  }
  const page = await prisma.page.findFirst({
    where: { id: pageId, userId: auth.userId, trashedAt: null },
    include: { blocks: { orderBy: { position: "asc" } } },
  });
  if (!page)
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  const template = await prisma.pageTemplate.upsert({
    where: { userId_name: { userId: auth.userId, name } },
    create: {
      userId: auth.userId,
      name,
      description,
      snapshot: {
        title: page.title,
        icon: page.icon,
        coverUrl: page.coverUrl,
        blocks: page.blocks.map((block) => ({
          type: block.type,
          content: block.content,
          position: block.position,
          createdBy: block.createdBy,
        })),
      },
    },
    update: {
      description,
      snapshot: {
        title: page.title,
        icon: page.icon,
        coverUrl: page.coverUrl,
        blocks: page.blocks.map((block) => ({
          type: block.type,
          content: block.content,
          position: block.position,
          createdBy: block.createdBy,
        })),
      },
    },
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return NextResponse.json({ template }, { status: 201 });
}
