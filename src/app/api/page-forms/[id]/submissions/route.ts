import { NextRequest, NextResponse } from "next/server";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "PageFormSubmissionsAPI";
type RouteContext = { params: Promise<{ id: string }> };

type FormField = {
  id: string;
  type: string;
  required?: boolean;
};

export async function GET(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const form = await prisma.pageForm.findFirst({
    where: { id, page: { userId: auth.userId } },
    select: { id: true },
  });
  if (!form)
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  const submissions = await prisma.pageFormSubmission.findMany({
    where: { formId: id },
    orderBy: { submittedAt: "desc" },
  });
  return NextResponse.json({ submissions });
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const form = await prisma.pageForm.findFirst({
    where: { id, isActive: true, page: { userId: auth.userId } },
  });
  if (!form)
    return NextResponse.json({ error: "Form not found" }, { status: 404 });
  const body = (await request.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  const values =
    body.values &&
    typeof body.values === "object" &&
    !Array.isArray(body.values)
      ? (body.values as Record<string, unknown>)
      : null;
  const fields =
    form.schema &&
    typeof form.schema === "object" &&
    !Array.isArray(form.schema) &&
    Array.isArray((form.schema as { fields?: unknown }).fields)
      ? ((form.schema as { fields: FormField[] }).fields ?? [])
      : [];
  if (
    !values ||
    fields.some(
      (field) =>
        field.required &&
        (values[field.id] === undefined ||
          values[field.id] === null ||
          values[field.id] === "")
    )
  ) {
    return NextResponse.json(
      { error: "Complete all required fields" },
      { status: 400 }
    );
  }
  const allowed = new Set(fields.map((field) => field.id));
  const safeValues = Object.fromEntries(
    Object.entries(values)
      .filter(([key]) => allowed.has(key))
      .map(([key, value]) => [key, JSON.parse(JSON.stringify(value))])
  );
  const submission = await prisma.pageFormSubmission.create({
    data: {
      formId: id,
      userId: auth.userId,
      values: safeValues,
    },
  });
  return NextResponse.json({ submission }, { status: 201 });
}
