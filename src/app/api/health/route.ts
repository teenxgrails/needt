import { NextResponse } from "next/server";

import { isBuildShaAllowed, resolveBuildSha } from "@/lib/health/build-sha";
import { getMigrationStatus } from "@/lib/health/migrations";
import { readWorkerReleaseBuildSha } from "@/lib/health/worker-release";

export const runtime = "nodejs";

async function getWorkerBuildSha(buildSha: string) {
  try {
    return await readWorkerReleaseBuildSha(buildSha);
  } catch {
    return null;
  }
}

export async function GET() {
  const startedAt = Date.now();
  const buildSha = resolveBuildSha();
  if (!isBuildShaAllowed(buildSha)) {
    return NextResponse.json(
      {
        ok: false,
        db: "unchecked",
        buildSha,
        workerBuildSha: null,
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 }
    );
  }

  try {
    const [{ pending }, workerBuildSha] = await Promise.all([
      getMigrationStatus(),
      getWorkerBuildSha(buildSha),
    ]);

    if (pending.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          db: "migrations-pending",
          buildSha,
          workerBuildSha,
          latencyMs: Date.now() - startedAt,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      db: "ok",
      buildSha,
      workerBuildSha,
      latencyMs: Date.now() - startedAt,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        db: "error",
        buildSha,
        workerBuildSha: null,
        latencyMs: Date.now() - startedAt,
      },
      { status: 503 }
    );
  }
}
