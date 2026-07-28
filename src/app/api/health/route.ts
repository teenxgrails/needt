import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      db: "ok",
      buildSha:
        process.env.NEEDT_BUILD_SHA ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
        "local",
      latencyMs: Date.now() - startedAt,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        db: "error",
        error: error instanceof Error ? error.message : String(error),
        buildSha:
          process.env.NEEDT_BUILD_SHA ||
          process.env.VERCEL_GIT_COMMIT_SHA ||
          process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
          "local",
      },
      { status: 503 }
    );
  }
}
