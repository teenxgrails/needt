import { NextRequest, NextResponse } from "next/server";

import { getCalibrationContext } from "@/services/time-tracking/calibration";

import { authenticateRequest } from "@/lib/auth/api-auth";

const LOG_SOURCE = "calibration-route";

export async function GET(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;

  return NextResponse.json(await getCalibrationContext(auth.userId));
}
