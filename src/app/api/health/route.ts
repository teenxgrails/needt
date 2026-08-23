import { NextResponse } from "next/server";

import { getMigrationStatus } from "@/lib/health/migrations";

export const runtime = "nodejs";

function getBuildSha() {
  return (
    process.env.NEEDT_BUILD_SHA ||
    process.env.VERCEL_GIT_COMMIT_SHA ||
    process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
    "local"
  );
}

export async function GET() {
  const startedAt = Date.now();
  try {
    const { pending } = await getMigrationStatus();

    if (pending.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          db: "migrations-pending",
          buildSha: getBuildSha(),
          latencyMs: Date.now() - startedAt,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      db: "ok",
      buildSha: getBuildSha(),
      latencyMs: Date.now() - startedAt,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        db: "error",
        buildSha: getBuildSha(),
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 }
    );
  }
}
