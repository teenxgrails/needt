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
    { error: error instanceof Error ? error.message : String(error) },
    source
  );
  return NextResponse.json({ error: publicMessage }, { status: 500 });
}
