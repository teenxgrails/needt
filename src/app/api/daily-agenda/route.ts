import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { sanitizeDailyAgendaContent } from "@/lib/daily-agenda-content";
import { prisma } from "@/lib/prisma";

const LOG_SOURCE = "daily-agenda-route";
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const payloadSchema = z.object({
  date: dateKeySchema,
  content: z.string().max(250_000),
});

function agendaDate(date: string): Date | null {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
    ? null
    : parsed;
}

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const parsedKey = dateKeySchema.safeParse(
    request.nextUrl.searchParams.get("date")
  );
  const date = parsedKey.success ? agendaDate(parsedKey.data) : null;
  if (!date) return new NextResponse("Invalid agenda date", { status: 400 });

  const agenda = await prisma.dailyAgenda.findUnique({
    where: { userId_date: { userId: auth.userId, date } },
    select: { content: true, updatedAt: true },
  });

  return NextResponse.json({
    date: parsedKey.data,
    content: agenda?.content ?? "",
    updatedAt: agenda?.updatedAt ?? null,
  });
}

export async function PUT(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const payload = payloadSchema.safeParse(await request.json());
  const date = payload.success ? agendaDate(payload.data.date) : null;
  if (!payload.success || !date) {
    return new NextResponse("Invalid agenda payload", { status: 400 });
  }

  const content = sanitizeDailyAgendaContent(payload.data.content);
  const agenda = await prisma.dailyAgenda.upsert({
    where: { userId_date: { userId: auth.userId, date } },
    create: { userId: auth.userId, date, content },
    update: { content },
    select: { content: true, updatedAt: true },
  });

  return NextResponse.json({
    date: payload.data.date,
    content: agenda.content,
    updatedAt: agenda.updatedAt,
  });
}
