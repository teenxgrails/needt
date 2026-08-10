import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { authenticateRequest } from "@/lib/auth/api-auth";
import { sanitizeDailyAgendaContent } from "@/lib/daily-agenda-content";
import { prisma } from "@/lib/prisma";
import {
  claimOfflineMutation,
  completeOfflineMutation,
  failOfflineMutation,
  offlineRevisionConflict,
  replayOfflineMutation,
} from "@/lib/pwa/offline-mutation";

const LOG_SOURCE = "daily-agenda-route";
const dateKeySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const payloadSchema = z.object({
  date: dateKeySchema,
  content: z.string().max(250_000),
  documentFormatVersion: z.union([z.literal(1), z.literal(2)]).default(1),
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
    select: { content: true, updatedAt: true, documentFormatVersion: true },
  });

  return NextResponse.json({
    date: parsedKey.data,
    content: agenda?.content ?? "",
    updatedAt: agenda?.updatedAt ?? null,
    documentFormatVersion: agenda?.documentFormatVersion ?? 1,
  });
}

export async function PUT(request: NextRequest) {
  let offlineRecordId: string | null = null;
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  const body = await request.json().catch(() => null);
  const payload = payloadSchema.safeParse(body);
  const date = payload.success ? agendaDate(payload.data.date) : null;
  if (!payload.success || !date) {
    return new NextResponse("Invalid agenda payload", { status: 400 });
  }

  try {
    const current = await prisma.dailyAgenda.findUnique({
      where: { userId_date: { userId: auth.userId, date } },
      select: { updatedAt: true },
    });
    const operation = `SAVE_DAILY_AGENDA:${payload.data.date}`;
    const replay = await replayOfflineMutation({
      request,
      userId: auth.userId,
      operation,
    });
    if (replay) return replay;
    const conflict = offlineRevisionConflict(
      request,
      current?.updatedAt ?? null
    );
    if (conflict) return conflict;
    const claim = await claimOfflineMutation({
      request,
      userId: auth.userId,
      operation,
    });
    if (claim.response) return claim.response;
    offlineRecordId = claim.recordId;

    const content = sanitizeDailyAgendaContent(payload.data.content);
    const agenda = await prisma.dailyAgenda.upsert({
      where: { userId_date: { userId: auth.userId, date } },
      create: {
        userId: auth.userId,
        date,
        content,
        documentFormatVersion: payload.data.documentFormatVersion,
      },
      update: {
        content,
        documentFormatVersion: payload.data.documentFormatVersion,
      },
      select: { content: true, updatedAt: true, documentFormatVersion: true },
    });

    const result = {
      date: payload.data.date,
      content: agenda.content,
      updatedAt: agenda.updatedAt,
      documentFormatVersion: agenda.documentFormatVersion,
    };
    await completeOfflineMutation(offlineRecordId);
    return NextResponse.json(result);
  } catch (error) {
    await failOfflineMutation(offlineRecordId);
    throw error;
  }
}
