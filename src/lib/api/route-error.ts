import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export async function routeErrorResponse(
  error: unknown,
  message: string,
  source: string,
  publicMessage = "The request could not be completed."
) {
  await logger.error(
    message,
    { errorType: error instanceof Error ? error.name : "UnknownError" },
    source
  );
  return NextResponse.json({ error: publicMessage }, { status: 500 });
}
