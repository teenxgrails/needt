import { NextRequest, NextResponse } from "next/server";

import { PageAccessRole } from "@prisma/client";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { resolvePageAccess } from "@/lib/auth/page-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "PageFormAPI";
type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const existing = await prisma.pageForm.findFirst({
    where: { id },
  });
  if (!existing)
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  if (
    !(await resolvePageAccess(auth, existing.pageId, PageAccessRole.EDITOR))
  ) {
    return NextResponse.json({ error: "Page access denied" }, { status: 403 });
  }
  const form = await prisma.pageForm.update({
    where: { id },
    data: {
      ...(typeof body.title === "string"
        ? { title: body.title.trim().slice(0, 160) || existing.title }
        : {}),
      ...(typeof body.isActive === "boolean"
        ? { isActive: body.isActive }
        : {}),
    },
  });
  return NextResponse.json({ form });
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const form = await prisma.pageForm.findUnique({
    where: { id },
    select: { pageId: true },
  });
  if (!form) {
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  }
  if (!(await resolvePageAccess(auth, form.pageId, PageAccessRole.EDITOR))) {
    return NextResponse.json({ error: "Page access denied" }, { status: 403 });
  }
  await prisma.pageForm.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
