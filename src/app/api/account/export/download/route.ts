import { NextRequest, NextResponse } from "next/server";

import { hashAccountExportToken } from "@/services/account/account-export";
import { DataExportStatus } from "@prisma/client";

import { newDate } from "@/lib/date-utils";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")?.trim();
  if (!token) {
    return NextResponse.json({ error: "Invalid export link" }, { status: 400 });
  }
  const tokenHash = hashAccountExportToken(token);
  const archive = await prisma.$transaction(async (tx) => {
    const record = await tx.dataExportRequest.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        archive: true,
        expiresAt: true,
        status: true,
        downloadedAt: true,
      },
    });
    if (!record) return null;
    if (!record.expiresAt || record.expiresAt <= newDate()) {
      await tx.dataExportRequest.update({
        where: { id: record.id },
        data: {
          status: DataExportStatus.EXPIRED,
          archive: null,
          tokenHash: null,
        },
      });
      return null;
    }
    if (
      !record.archive ||
      record.downloadedAt ||
      record.status !== DataExportStatus.READY
    ) {
      return null;
    }
    const consumed = await tx.dataExportRequest.updateMany({
      where: {
        id: record.id,
        status: DataExportStatus.READY,
        downloadedAt: null,
      },
      data: {
        status: DataExportStatus.DOWNLOADED,
        downloadedAt: newDate(),
        archive: null,
        tokenHash: null,
      },
    });
    return consumed.count === 1 ? record.archive : null;
  });
  if (!archive) {
    return NextResponse.json(
      { error: "This export link is invalid, expired, or already used" },
      { status: 410 }
    );
  }
  return new Response(new Uint8Array(archive), {
    headers: {
      "Content-Type": "application/gzip",
      "Content-Disposition": `attachment; filename="needt-account-export.json.gz"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
