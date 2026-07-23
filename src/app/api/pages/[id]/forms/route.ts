import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "PageFormsAPI";
type RouteContext = { params: Promise<{ id: string }> };

function validSchema(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const fields = (value as { fields?: unknown }).fields;
  if (!Array.isArray(fields) || fields.length === 0 || fields.length > 100)
    return null;
  const normalized = fields.flatMap((field) => {
    if (!field || typeof field !== "object" || Array.isArray(field)) return [];
    const candidate = field as Record<string, unknown>;
    const id = typeof candidate.id === "string" ? candidate.id.trim() : "";
    const label =
      typeof candidate.label === "string" ? candidate.label.trim() : "";
    const type =
      typeof candidate.type === "string" ? candidate.type.toLowerCase() : "";
    if (
      !id ||
      !label ||
      !["text", "textarea", "email", "number", "date", "checkbox"].includes(
        type
      )
    )
      return [];
    return [{ id, label, type, required: candidate.required === true }];
  });
  return normalized.length === fields.length ? { fields: normalized } : null;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const forms = await prisma.pageForm.findMany({
    where: { pageId: id, page: { userId: auth.userId, trashedAt: null } },
    include: { _count: { select: { submissions: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ forms });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const schema = validSchema(body.schema);
  const page = await prisma.page.findFirst({
    where: { id, userId: auth.userId, trashedAt: null },
    select: { id: true },
  });
  if (!page)
    return NextResponse.json({ error: "Page not found" }, { status: 404 });
  if (!title || !schema) {
    return NextResponse.json(
      { error: "A title and valid form fields are required" },
      { status: 400 }
    );
  }
  const form = await prisma.pageForm.create({
    data: {
      pageId: id,
      title: title.slice(0, 160),
      schema,
    },
  });
  return NextResponse.json({ form }, { status: 201 });
}
