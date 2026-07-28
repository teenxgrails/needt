import { BugReportSeverity } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { routeErrorResponse } from "@/lib/api/route-error";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  accountRule,
  enforceByteBudget,
  enforceRateLimits,
  ipRule,
  requestIp,
} from "@/lib/security/rate-limit";
import { createBugReport } from "@/services/bug-reports/bug-report-service";

const LOG_SOURCE = "BugReportsAPI";
const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = await authenticateRequest(request, LOG_SOURCE);
  if ("response" in auth) return auth.response;
  const limited = await enforceRateLimits(
    [
      ipRule(request, "bug-report:ip", 20, 60 * 60),
      accountRule(auth.userId, "bug-report:account", 5, 60 * 60),
    ],
    { route: request.nextUrl.pathname, userId: auth.userId }
  );
  if (limited) return limited;
  try {
    const form = await request.formData();
    const title = form.get("title");
    const description = form.get("description");
    if (typeof title !== "string" || !title.trim() || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
    }
    const severityValue = String(form.get("severity") ?? "MEDIUM").toUpperCase();
    const severity = Object.values(BugReportSeverity).includes(severityValue as BugReportSeverity)
      ? (severityValue as BugReportSeverity)
      : BugReportSeverity.MEDIUM;
    const file = form.get("attachment");
    if (file instanceof File && file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: "Attachment must be 5 MB or smaller" }, { status: 413 });
    }
    if (file instanceof File && file.size > 0) {
      const byteLimited =
        (await enforceByteBudget({
          namespace: "bug-report:attachment:ip",
          identifier: requestIp(request),
          bytes: file.size,
          limitBytes: 20 * 1024 * 1024,
          windowSeconds: 60 * 60,
          route: request.nextUrl.pathname,
          userId: auth.userId,
        })) ??
        (await enforceByteBudget({
          namespace: "bug-report:attachment:account",
          identifier: auth.userId,
          bytes: file.size,
          limitBytes: 10 * 1024 * 1024,
          windowSeconds: 60 * 60,
          route: request.nextUrl.pathname,
          userId: auth.userId,
        }));
      if (byteLimited) return byteLimited;
    }
    const report = await createBugReport(auth.userId, {
      title,
      description,
      reproductionSteps: String(form.get("reproductionSteps") ?? ""),
      expectedBehavior: String(form.get("expectedBehavior") ?? ""),
      actualBehavior: String(form.get("actualBehavior") ?? ""),
      severity,
      route: String(form.get("route") ?? ""),
      appVersion: String(form.get("appVersion") ?? ""),
      viewport: String(form.get("viewport") ?? ""),
      theme: String(form.get("theme") ?? ""),
      browser: String(form.get("browser") ?? ""),
      ...(file instanceof File && file.size > 0
        ? {
            attachment: {
              fileName: file.name,
              mimeType: file.type || "application/octet-stream",
              data: new Uint8Array(await file.arrayBuffer()),
            },
          }
        : {}),
    });
    return NextResponse.json({ report }, { status: 201 });
  } catch (error) {
    return routeErrorResponse(error, "Failed to create bug report", LOG_SOURCE, "Could not submit report.");
  }
}
