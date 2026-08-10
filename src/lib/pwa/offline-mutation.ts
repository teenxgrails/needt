import { NextRequest, NextResponse } from "next/server";

import { IdempotencyStatus, Prisma } from "@prisma/client";

import { newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1_000;

type StoredResponse = {
  status: number;
  body: Prisma.JsonValue;
};

function storedResponse(value: Prisma.JsonValue | null): StoredResponse | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const status = value.status;
  if (typeof status !== "number") return null;
  return { status, body: value.body ?? null };
}

function replayResponse(response: StoredResponse) {
  if (response.status === 204) return new NextResponse(null, { status: 204 });
  return NextResponse.json(response.body, { status: response.status });
}

export function offlineRevisionConflict(
  request: NextRequest,
  updatedAt: Date | null
): NextResponse | null {
  if (!request.headers.has("x-needt-offline-scope")) return null;
  const candidate = request.headers.get("if-match")?.replace(/^"|"$/g, "");
  const expected = updatedAt?.toISOString() ?? "none";
  if (candidate === expected) return null;
  return NextResponse.json(
    { error: "OFFLINE_REVISION_CONFLICT", repairable: true },
    { status: 409 }
  );
}

export async function claimOfflineMutation(input: {
  request: NextRequest;
  userId: string;
  operation: string;
}): Promise<
  | { recordId: string | null; response?: undefined }
  | { response: NextResponse; recordId?: undefined }
> {
  const key = input.request.headers.get("x-idempotency-key")?.trim();
  if (!key) return { recordId: null };
  if (key.length > 200) {
    return {
      response: NextResponse.json(
        { error: "INVALID_IDEMPOTENCY_KEY" },
        { status: 400 }
      ),
    };
  }

  const replay = await replayOfflineMutation(input);
  if (replay) return { response: replay };

  try {
    const record = await prisma.idempotencyRecord.create({
      data: {
        userId: input.userId,
        operation: input.operation,
        key,
        expiresAt: newDate(newDate().getTime() + IDEMPOTENCY_TTL_MS),
      },
      select: { id: true },
    });
    return { recordId: record.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        response: NextResponse.json(
          { error: "OFFLINE_REPLAY_PENDING", repairable: true },
          { status: 409 }
        ),
      };
    }
    throw error;
  }
}

export async function replayOfflineMutation(input: {
  request: NextRequest;
  userId: string;
  operation: string;
}): Promise<NextResponse | null> {
  const key = input.request.headers.get("x-idempotency-key")?.trim();
  if (!key) return null;
  if (key.length > 200) {
    return NextResponse.json(
      { error: "INVALID_IDEMPOTENCY_KEY" },
      { status: 400 }
    );
  }
  const existing = await prisma.idempotencyRecord.findUnique({
    where: {
      userId_operation_key: {
        userId: input.userId,
        operation: input.operation,
        key,
      },
    },
  });
  if (!existing) return null;
  const saved = storedResponse(existing.result);
  if (existing.status === IdempotencyStatus.SUCCEEDED && saved) {
    return replayResponse(saved);
  }
  return NextResponse.json(
    { error: "OFFLINE_REPLAY_PENDING", repairable: true },
    { status: 409 }
  );
}

export async function completeOfflineMutation(recordId: string | null) {
  if (!recordId) return;
  await prisma.idempotencyRecord.update({
    where: { id: recordId },
    data: {
      status: IdempotencyStatus.SUCCEEDED,
      result: {
        status: 202,
        body: { queued: true, replayed: true },
      },
    },
  });
}

export async function failOfflineMutation(recordId: string | null) {
  if (!recordId) return;
  await prisma.idempotencyRecord.deleteMany({
    where: { id: recordId, status: IdempotencyStatus.IN_PROGRESS },
  });
}

export async function reapExpiredIdempotencyRecords() {
  return prisma.idempotencyRecord.deleteMany({
    where: { expiresAt: { lt: newDate() } },
  });
}
